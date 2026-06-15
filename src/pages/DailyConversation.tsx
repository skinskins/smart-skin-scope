import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhase } from "@/utils/cycle";
import { useRoutineProducts } from "@/hooks/useRoutineProducts";
import { useSaveWeather } from "@/hooks/useSaveWeather";

type InciVerdict = { verdict: "danger" | "warning"; reason: string };
type RawIncompat = { product_name: string; action: "remove" | "keep"; reason: string };

// Génère silencieusement la routine du jour (inci-analysis) et les conseils
// (generate-advice), puis redirige vers le player. Plus d'UI conversationnelle.
export default function DailyConversation() {
  const navigate = useNavigate();

  const [cyclePhase, setCyclePhase] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [uvIndex, setUvIndex] = useState<number | null>(null);
  const [tempC, setTempC] = useState<number | null>(null);
  const [usedWeeklyIds, setUsedWeeklyIds] = useState<Set<string>>(new Set());
  const [usedMonthlyIds, setUsedMonthlyIds] = useState<Set<string>>(new Set());
  const [initDone, setInitDone] = useState(false);
  const [preComputedRaw, setPreComputedRaw] = useState<RawIncompat[] | null>(null);
  const [inciVerdicts, setInciVerdicts] = useState<Record<string, InciVerdict>>({});
  const [verdictsReady, setVerdictsReady] = useState(false);

  const inciAnalysisStarted = useRef(false);
  const persistedRef = useRef(false);

  useSaveWeather();

  const isMorning = new Date().getHours() < 18;
  const { morning, evening, loading: productsLoading } = useRoutineProducts();

  const routineProducts = useMemo(() => {
    const source = isMorning ? morning : evening;
    return source.filter(p => {
      if (!p.frequency || p.frequency === "daily") return true;
      if (p.frequency === "weekly")  return !usedWeeklyIds.has(p.id);
      if (p.frequency === "monthly") return !usedMonthlyIds.has(p.id);
      return true;
    });
  }, [isMorning, morning, evening, usedWeeklyIds, usedMonthlyIds]);

  const displayedProducts = useMemo(() =>
    routineProducts.filter(p => {
      const v = inciVerdicts[p.id] ?? inciVerdicts[p.product_name];
      return !v || v.verdict !== "danger";
    }), [routineProducts, inciVerdicts]);

  const explanationSentence = useMemo(() => {
    const removed = routineProducts.filter(p => {
      const v = inciVerdicts[p.id] ?? inciVerdicts[p.product_name];
      return v?.verdict === "danger";
    });
    if (removed.length === 0) return null;
    const names = removed.map(p => p.product_name).join(", ");
    const reason = (inciVerdicts[removed[0].id] ?? inciVerdicts[removed[0].product_name])?.reason
      ?? "ta peau a besoin de douceur";
    return `J'ai retiré ${names} — ${reason}.`;
  }, [routineProducts, inciVerdicts]);

  // Charger profil (cycle, type de peau), météo du jour et historique de fréquence
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo  = new Date(Date.now() - 7  * 86400000).toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const [profileRes, logsRes, weatherRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("last_period_date, cycle_duration, skin_type")
          .eq("id", session.user.id)
          .single(),
        (supabase as any)
          .from("routine_product_logs")
          .select("product_id, date")
          .eq("user_id", session.user.id)
          .gte("date", thirtyDaysAgo),
        (supabase as any)
          .from("daily_weather")
          .select("uv_index, temp_c")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);

      if (weatherRes.data?.uv_index != null) setUvIndex(weatherRes.data.uv_index);
      if (weatherRes.data?.temp_c  != null) setTempC(weatherRes.data.temp_c);

      const weekly = new Set<string>();
      const monthly = new Set<string>();
      for (const log of (logsRes.data ?? [])) {
        monthly.add(log.product_id);
        if (log.date >= sevenDaysAgo) weekly.add(log.product_id);
      }
      setUsedWeeklyIds(weekly);
      setUsedMonthlyIds(monthly);

      if (profileRes.data?.last_period_date) {
        const duration = profileRes.data.cycle_duration ?? 28;
        const calc = calculateCyclePhase(profileRes.data.last_period_date, duration, 5);
        if (calc?.phase) setCyclePhase(calc.phase);
      }
      if (profileRes.data?.skin_type) setSkinType(profileRes.data.skin_type);

      setInitDone(true);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dès que le profil est chargé et les produits disponibles → analyse INCI de la routine
  useEffect(() => {
    if (!initDone || productsLoading || inciAnalysisStarted.current) return;
    inciAnalysisStarted.current = true;

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPreComputedRaw([]); return; }

      const products = routineProducts.map(p => ({
        product_name: p.product_name,
        brand: p.brand,
        ingredients: p.ingredients,
      }));

      const body = isMorning
        ? { morningProducts: products, eveningProducts: [], cyclePhase, uvIndex, tempC, skinType, factors: [] }
        : { eveningProducts: products, morningProducts: [], cyclePhase, uvIndex, tempC, skinType, factors: [] };

      try {
        const { data: result, error } = await (supabase as any).functions.invoke("inci-analysis", { body });
        if (error || !result) { setPreComputedRaw([]); return; }

        const rawAdjustments: RawIncompat[] = result.adjustments ?? [];
        const today = new Date().toISOString().split("T")[0];

        for (const adj of rawAdjustments) {
          if (adj.action !== "remove") continue;
          const b = adj.product_name.toLowerCase().trim();
          const matched = routineProducts.find(p => {
            const a = p.product_name.toLowerCase().trim();
            return a === b || a.includes(b) || b.includes(a);
          });
          (supabase as any).from("daily_inci_verdicts").insert({
            user_id: session.user.id,
            date: today,
            product_id: matched?.id ?? null,
            product_name: adj.product_name,
            verdict: "danger",
            reason: adj.reason,
            rule_id: null,
          });
        }

        setPreComputedRaw(rawAdjustments);
      } catch (err) {
        console.error("[inci-analysis] DailyConversation:", err);
        setPreComputedRaw([]);
      }
    };
    run();
  }, [initDone, productsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dès que l'analyse INCI est disponible → calculer les verdicts (produits à retirer)
  useEffect(() => {
    if (preComputedRaw === null) return;
    const map: Record<string, InciVerdict> = {};
    for (const inc of preComputedRaw) {
      if (inc.action !== "remove") continue;
      const b = inc.product_name.toLowerCase().trim();
      const matched = routineProducts.find(p => {
        const a = p.product_name.toLowerCase().trim();
        return a === b || a.includes(b) || b.includes(a);
      });
      const key = matched?.id ?? inc.product_name;
      map[key] = { verdict: "danger", reason: inc.reason };
      if (matched) map[matched.product_name] = { verdict: "danger", reason: inc.reason };
    }
    setInciVerdicts(map);
    setVerdictsReady(true);
  }, [preComputedRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verdicts prêts → sauvegarder la routine du jour, déclencher les conseils, ouvrir le player
  useEffect(() => {
    if (!verdictsReady || persistedRef.current) return;
    persistedRef.current = true;

    const finalize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/dashboard", { replace: true }); return; }

      const today = new Date().toISOString().split("T")[0];

      await (supabase as any).from("daily_routine_log").upsert(
        {
          user_id: session.user.id,
          date: today,
          period: isMorning ? "morning" : "evening",
          product_ids: displayedProducts.map(p => p.id),
          inci_message: explanationSentence ?? null,
        },
        { onConflict: "user_id,date,period" }
      );

      const { data: existingAdvice } = await (supabase as any)
        .from("daily_advice_log")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();

      if (!existingAdvice) {
        (supabase as any).functions.invoke("generate-advice", {
          body: { user_id: session.user.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch((err: unknown) => console.error("[generate-advice] DailyConversation:", err));
      }

      navigate("/routine-player", { replace: true });
    };
    finalize();
  }, [verdictsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex items-center justify-center bg-[#F0EBE3]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

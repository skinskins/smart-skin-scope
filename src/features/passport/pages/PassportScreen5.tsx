import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Droplets, Salad, Moon, Heart, Wine, Dumbbell, Sun, Wind, Thermometer, Cloud } from "lucide-react";
import PassportShareButton from "@/features/passport/components/PassportShareButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface CheckinRow {
  stress_level: number | null;
  sleep_hours: number | null;
  water_glasses: number | null;
  food_quality: string | null;
  did_sport: boolean | null;
  alcohol_drinks: number | null;
  date: string;
}

interface RoutineRow {
  makeup_removed: boolean | null;
  morning_routine_done: boolean | null;
  spf_applied: boolean | null;
  date: string;
}

const avg = (vals: (number | null)[]): number => {
  const defined = vals.filter((v) => v !== null) as number[];
  if (!defined.length) return 0;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
};

const mode = <T,>(vals: (T | null)[]): T | null => {
  const defined = vals.filter((v) => v !== null) as T[];
  if (!defined.length) return null;
  const freq: Map<T, number> = new Map();
  defined.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const formatSleep = (h: number) => {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h ${String(mins).padStart(2, "0")}` : `${hours}h`;
};

const routineInsight = (score: number, total: number) => {
  const pct = score / total;
  if (pct >= 25 / 30) return "Excellente régularité.";
  if (pct >= 15 / 30) return "Bonne régularité, quelques oublis.";
  return "À améliorer — oublis fréquents.";
};

const foodLabel = (val: string | null) => {
  if (!val) return "—";
  if (val.toLowerCase().includes("sucr") || val.toLowerCase().includes("grass")) return "Sucrée";
  if (val.toLowerCase().includes("quilibr")) return "Équilibrée";
  if (val.toLowerCase().includes("pic")) return "À surveiller";
  return val;
};

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
}

const MetricCard = ({ label, value, sub, subColor = "#71727a" }: MetricCardProps) => (
  <div className="bg-white rounded-[16px] shadow-sm p-[14px] flex flex-col gap-[8px]">
    <p className="text-[#71727a] text-[12px]">{label}</p>
    <p className="text-[#1f2024] text-[18px] font-semibold leading-tight">{value}</p>
    <p className="text-[12px]" style={{ color: subColor }}>{sub}</p>
  </div>
);

export default function PassportScreen5() {
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const from = new Date();
      from.setDate(from.getDate() - 29);
      const fromStr = from.toISOString().split("T")[0];

      const [{ data: c }, { data: r }] = await Promise.all([
        (supabase as any)
          .from("daily_checkins")
          .select("date, stress_level, sleep_hours, water_glasses, food_quality, did_sport, alcohol_drinks")
          .eq("user_id", session.user.id)
          .gte("date", fromStr)
          .order("date", { ascending: true }),
        (supabase as any)
          .from("routine_logs")
          .select("date, makeup_removed, morning_routine_done, spf_applied")
          .eq("user_id", session.user.id)
          .gte("date", fromStr)
          .order("date", { ascending: true }),
      ]);

      setCheckins(c ?? []);
      setRoutines(r ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // ── Facteurs computation ───────────────────────────────────────
  const waterAvg = avg(checkins.map((c) => c.water_glasses));
  const waterPct = Math.min(100, Math.round((waterAvg / 8) * 100));
  const waterLast7 = avg(checkins.slice(-7).map((c) => c.water_glasses));
  const waterPrev7 = avg(checkins.slice(-14, -7).map((c) => c.water_glasses));
  const waterSub = waterPct < 50 ? "Insuffisant" : waterLast7 > waterPrev7 ? "En amélioration" : "Correct";
  const waterSubColor = waterPct < 50 ? "#EF4444" : waterLast7 > waterPrev7 ? "#1eb500" : "#71727a";

  const sleepAvg = avg(checkins.map((c) => c.sleep_hours));
  const sleepSub = sleepAvg < 7 ? "Insuffisant" : "Bon";
  const sleepSubColor = sleepAvg < 7 ? "#EF4444" : "#1eb500";

  const stressAvg = avg(checkins.map((c) => c.stress_level));
  const stressSub = stressAvg > 6 ? "Élevé" : stressAvg >= 4 ? "Modéré" : "Faible";
  const stressSubColor = stressAvg > 6 ? "#EF4444" : stressAvg >= 4 ? "#EAB308" : "#1eb500";

  const foodMode = mode(checkins.map((c) => c.food_quality));

  const alcoholMode = mode(checkins.map((c) => c.alcohol_drinks));
  const alcoholSub = !alcoholMode || alcoholMode === 0 ? "Aucun" : `${alcoholMode} verre(s)/jour moy.`;

  const sportLast7 = checkins.slice(-7).filter((c) => c.did_sport === true).length;

  // ── Routine computation ────────────────────────────────────────
  const total = 30;
  const scoreOf = (fn: (r: RoutineRow) => boolean | null) =>
    routines.filter((r) => fn(r) === true).length;

  const makeupScore = scoreOf((r) => r.makeup_removed);
  const morningScore = scoreOf((r) => r.morning_routine_done);
  const spfScore = scoreOf((r) => r.spf_applied);

  if (loading) {
    return (
      <div className="bg-[#f2f2f7] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1f2024] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#f2f2f7] min-h-screen relative w-full pb-[100px]">
      {/* Header */}
      <div className="bg-[#f2f2f7] sticky top-0 z-10 flex items-center justify-center px-[28px] pt-[14px] pb-[14px] w-full">
        <button onClick={() => navigate("/passport/visual")} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
        <PassportShareButton />
      </div>

      <div className="flex flex-col gap-[20px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">
        <p className="font-medium text-[#1f2024] text-[16px]">5. Détails</p>

        <Tabs defaultValue="facteurs" className="w-full">
          <TabsList className="w-full bg-white rounded-[12px] shadow-sm mb-[4px] h-[44px]">
            <TabsTrigger value="facteurs" className="flex-1 text-[13px] rounded-[10px]">
              Facteurs externes
            </TabsTrigger>
            <TabsTrigger value="routine" className="flex-1 text-[13px] rounded-[10px]">
              Routine
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Facteurs externes ── */}
          <TabsContent value="facteurs" className="flex flex-col gap-[16px] mt-[12px]">
            {/* 3-column metric row: Sommeil / Stress / Hydratation */}
            <div className="grid grid-cols-3 gap-[10px]">
              <MetricCard
                label="Sommeil"
                value={sleepAvg > 0 ? formatSleep(sleepAvg) : "—"}
                sub={sleepAvg > 0 ? sleepSub : "—"}
                subColor={sleepAvg > 0 ? sleepSubColor : "#71727a"}
              />
              <MetricCard
                label="Stress"
                value={checkins.length > 0 ? `${stressAvg.toFixed(1)}/10` : "—"}
                sub={checkins.length > 0 ? stressSub : "—"}
                subColor={checkins.length > 0 ? stressSubColor : "#71727a"}
              />
              <MetricCard
                label="Hydratation"
                value={`${waterPct}%`}
                sub={waterSub}
                subColor={waterSubColor}
              />
            </div>

            {/* Simple list: Alimentation / Alcool / Sport */}
            <div className="bg-white rounded-[16px] shadow-sm w-full overflow-hidden">
              {[
                { label: "Alimentation", value: foodLabel(foodMode) || "—" },
                { label: "Alcool", value: checkins.length > 0 ? alcoholSub : "—" },
                { label: "Sport", value: `${sportLast7} séance${sportLast7 > 1 ? "s" : ""} cette semaine` },
              ].map(({ label, value }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between px-[16px] py-[13px]">
                    <p className="text-[#3b3b3d] text-[14px]">{label}</p>
                    <p className="text-[#71727a] text-[14px]">{value}</p>
                  </div>
                  {i < arr.length - 1 && <div className="h-[1px] bg-[#f2f2f7] mx-[16px]" />}
                </div>
              ))}
            </div>

            {/* Environment list — TODO: replace with real weather API data from daily_checkins */}
            <div className="bg-white rounded-[16px] shadow-sm w-full overflow-hidden">
              <p className="text-[#71727a] text-[12px] px-[16px] pt-[14px] pb-[8px] uppercase tracking-wide">
                Environnement (moyennes)
              </p>
              {[
                { icon: <Sun className="w-4 h-4 text-[#EAB308]" />, label: "UV moyen", value: "0.1 — faible", danger: false },
                { icon: <Wind className="w-4 h-4 text-[#71727a]" />, label: "Qualité de l'air", value: "Critique", danger: true },
                { icon: <Thermometer className="w-4 h-4 text-[#EF4444]" />, label: "Température moy.", value: "16°C", danger: false },
                { icon: <Cloud className="w-4 h-4 text-[#3892f2]" />, label: "Humidité moy.", value: "52%", danger: false },
              ].map(({ icon, label, value, danger }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between px-[16px] py-[13px]">
                    <div className="flex items-center gap-[10px]">
                      {icon}
                      <p className="text-[#3b3b3d] text-[14px]">{label}</p>
                    </div>
                    <p className={`text-[14px] ${danger ? "text-[#EF4444] font-medium" : "text-[#71727a]"}`}>{value}</p>
                  </div>
                  {i < arr.length - 1 && <div className="h-[1px] bg-[#f2f2f7] mx-[16px]" />}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB 2: Routine ── */}
          <TabsContent value="routine" className="flex flex-col gap-[12px] mt-[12px]">
            {/* TODO: add products when products table is created */}
            {[
              { label: "Démaquillage", score: makeupScore },
              { label: "Nettoyage du visage", score: morningScore },
              { label: "Hydratation matin", score: morningScore },
              { label: "Protection solaire", score: spfScore },
            ].map(({ label, score }) => (
              <div key={label} className="bg-white rounded-[16px] shadow-sm p-[16px] flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <p className="text-[#3b3b3d] text-[15px]">{label}</p>
                  <p className="text-[#1f2024] text-[18px] font-bold">{score}/{total}</p>
                </div>
                <div className="bg-[#f5f4ed] h-[8px] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(score / total) * 100}%`,
                      backgroundColor:
                        score >= 25 ? "#1d9e75" : score >= 15 ? "#ef9f27" : "#e24b4a",
                    }}
                  />
                </div>
                <p className="text-[#71727a] text-[13px]">{routineInsight(score, total)}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button
          onClick={() => navigate("/passport/visual")}
          className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm"
        >
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>

        <div className="flex gap-[8px] items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-full ${i === 4 ? "bg-[#7d7d7d] h-[8px] w-[20px]" : "bg-[#d4d6dd] h-[8px] w-[8px]"}`}
            />
          ))}
        </div>

        <button
          disabled
          className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm opacity-30 cursor-not-allowed"
        >
          <ChevronRight className="w-[20px] h-[20px] text-[#71727a]" />
        </button>
      </div>
    </div>
  );
}

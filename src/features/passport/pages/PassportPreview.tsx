import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import PassportShareButton from "@/features/passport/components/PassportShareButton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type JaugeProps = {
  className?: string;
  percentage: number;
};

function Jauge({ className, percentage }: JaugeProps) {
  const color = percentage >= 70 ? "#1d9e75" : percentage >= 40 ? "#ef9f27" : "#e24b4a";
  return (
    <div className={className ?? "bg-[#f5f4ed] h-[10px] overflow-clip relative rounded-[22px] w-[110px]"}>
      <div
        className="absolute h-full left-0 rounded-[22px] top-0 transition-all"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

type Status = "En amélioration" | "Stable" | "À surveiller";

interface PassportData {
  initials: string;
  fullName: string;
  description: string;
  skinType: string;
  period: number;
  concerns: string[];
  goals: string[];
  status: Status;
  statusText: string;
  observance: number;
  nettoyage: number;
  demaquillage: number;
  hydratation: number;
  spf: number;
  alertText: string | null;
}

const pct = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count / total) * 100);

const computeStatus = (rows: { trend: string | null }[]): Status => {
  const counts = { moins: 0, pareil: 0, plus: 0 };
  for (const r of rows) {
    if (r.trend === "moins") counts.moins++;
    else if (r.trend === "plus") counts.plus++;
    else if (r.trend === "pareil") counts.pareil++;
  }
  const max = Math.max(counts.moins, counts.pareil, counts.plus);
  if (max === 0) return "Stable";
  if (counts.moins === max) return "En amélioration";
  if (counts.plus === max) return "À surveiller";
  return "Stable";
};

const statusMeta: Record<Status, { dot: string; text: string; body: string }> = {
  "En amélioration": {
    dot: "#1eb500",
    text: "#1eb500",
    body: "Les symptômes cutanés montrent une tendance positive sur les 7 derniers jours.",
  },
  "Stable": {
    dot: "#1eb500",
    text: "#1eb500",
    body: "La peau est globalement stable. Continuez votre routine actuelle.",
  },
  "À surveiller": {
    dot: "#ef9f27",
    text: "#ef9f27",
    body: "Certains symptômes sont en hausse. Consultez votre professionnel si ça persiste.",
  },
};

export default function PassportPreview() {
  const navigate = useNavigate();
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const from30 = new Date();
      from30.setDate(from30.getDate() - 29);
      const from30Str = from30.toISOString().split("T")[0];

      const from7 = new Date();
      from7.setDate(from7.getDate() - 6);
      const from7Str = from7.toISOString().split("T")[0];

      const [
        { data: profile },
        { data: routineLogs },
        { data: symptoms },
        { data: checkins },
      ] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("first_name, last_name, skin_type, skin_problems, skin_goals, age, gender")
          .eq("id", session.user.id)
          .single(),
        (supabase as any)
          .from("routine_logs")
          .select("makeup_removed, morning_routine_done, spf_applied")
          .eq("user_id", session.user.id)
          .gte("date", from30Str),
        (supabase as any)
          .from("symptom_tracking")
          .select("symptom, trend")
          .eq("user_id", session.user.id)
          .gte("date", from7Str),
        (supabase as any)
          .from("daily_checkins")
          .select("date")
          .eq("user_id", session.user.id)
          .gte("date", from30Str),
      ]);

      const logs = routineLogs ?? [];
      const total = 30;

      // Overall observance: rows where ≥ 2 of 3 tracked booleans are true
      const observanceDays = logs.filter((r: any) => {
        const trues = [r.makeup_removed, r.morning_routine_done, r.spf_applied].filter(Boolean).length;
        return trues >= 2;
      }).length;

      const nettoyagePct  = pct(logs.filter((r: any) => r.morning_routine_done).length, total);
      const demaquillagePct = pct(logs.filter((r: any) => r.makeup_removed).length, total);
      const hydratationPct  = nettoyagePct; // same field per spec
      const spfPct          = pct(logs.filter((r: any) => r.spf_applied).length, total);

      const status = computeStatus(symptoms ?? []);

      // Alert: show for lowest metric if < 40%
      const metrics = [
        { label: "la protection solaire", pct: spfPct },
        { label: "l'hydratation matinale", pct: hydratationPct },
        { label: "le démaquillage", pct: demaquillagePct },
      ];
      const lowest = metrics.sort((a, b) => a.pct - b.pct)[0];
      const alertText = lowest.pct < 40
        ? `${lowest.label.charAt(0).toUpperCase() + lowest.label.slice(1)} est insuffisant${lowest.label.startsWith("la") ? "e" : ""} (${lowest.pct}%). Point à aborder en consultation.`
        : null;

      const first = profile?.first_name ?? "";
      const last  = (profile?.last_name ?? "").toUpperCase();
      const initials = `${first[0] ?? ""}${(profile?.last_name ?? "")[0] ?? ""}`.toUpperCase();
      const age = profile?.age ? `${profile.age} ans` : null;
      const gender = profile?.gender ?? null;
      const description = [age, gender].filter(Boolean).join(" · ");

      setData({
        initials,
        fullName: `${first} ${last}`.trim() || "—",
        description: description || "—",
        skinType: profile?.skin_type ?? "—",
        period: Math.min((checkins ?? []).length, 30),
        concerns: profile?.skin_problems ?? [],
        goals: profile?.skin_goals ?? [],
        status,
        statusText: statusMeta[status].body,
        observance: pct(observanceDays, total),
        nettoyage: nettoyagePct,
        demaquillage: demaquillagePct,
        hydratation: hydratationPct,
        spf: spfPct,
        alertText,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#f2f2f7] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1f2024] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data;
  const meta = statusMeta[d?.status ?? "Stable"];
  const barClass = "w-[100px] h-[8px] bg-[#f5f4ed] rounded-full overflow-hidden relative";

  return (
    <div className="bg-[#f2f2f7] min-h-screen relative w-full pb-[100px]">
      {/* Header */}
      <div className="bg-[#f2f2f7] sticky top-0 z-10 flex items-center justify-center px-[28px] pt-[14px] pb-[14px] w-full">
        <button onClick={() => navigate(-1)} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
        <PassportShareButton />
      </div>

      <div className="flex flex-col gap-[23px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">

        {/* Section 1: Résumé */}
        <div className="flex flex-col gap-[16px] items-start w-full">
          <p className="font-medium text-[#1f2024] text-[16px]">1. Résumé</p>

          <div className="bg-white flex flex-col gap-[16px] items-start p-[16px] rounded-[16px] w-full shadow-sm">
            {/* User info */}
            <div className="flex gap-[16px] items-center w-full">
              <div className="bg-[#9747ff]/20 flex items-center justify-center rounded-full size-[44px] shrink-0">
                <span className="font-semibold text-[#3b3b3d] text-[14px]">{d?.initials ?? "—"}</span>
              </div>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[#3b3b3d] text-[18px]">{d?.fullName}</p>
                <p className="text-[#71727a] text-[14px]">{d?.description}</p>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full" />

            {/* Skin type + period */}
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-[4px] w-1/2">
                <p className="text-[#71727a] text-[14px]">Type de peau</p>
                <p className="text-[#3b3b3d] text-[16px]">{d?.skinType}</p>
              </div>
              <div className="flex flex-col gap-[4px] w-1/2">
                <p className="text-[#71727a] text-[14px]">Période</p>
                <p className="text-[#3b3b3d] text-[16px]">{d?.period ?? 0} jours</p>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full" />

            {/* Concerns */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="text-[#71727a] text-[14px]">Préoccupations</p>
              <div className="flex flex-wrap gap-[8px]">
                {d?.concerns?.length ? d.concerns.map((c) => (
                  <div key={c} className="bg-[#1f2024] px-[12px] py-[6px] rounded-full">
                    <p className="text-[12px] text-white">{c}</p>
                  </div>
                )) : <p className="text-[#71727a] text-[14px]">—</p>}
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full" />

            {/* Goals */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="text-[#71727a] text-[14px]">Objectifs</p>
              <div className="flex flex-wrap gap-[8px]">
                {d?.goals?.length ? d.goals.map((g) => (
                  <div key={g} className="bg-[#eae6ca] px-[12px] py-[6px] rounded-full">
                    <p className="text-[12px] text-[#313131]">{g}</p>
                  </div>
                )) : <p className="text-[#71727a] text-[14px]">—</p>}
              </div>
            </div>
          </div>

          {/* Status card */}
          <div className="bg-white flex gap-[16px] items-start p-[16px] rounded-[16px] w-full shadow-sm">
            <div className="bg-[#3892f2]/10 border border-[#3892f2]/20 flex items-center justify-center rounded-[8px] size-[44px] shrink-0">
              <Sparkles className="w-[20px] h-[20px] text-[#1f2024]" />
            </div>
            <div className="flex flex-col gap-[8px] flex-1">
              <div className="flex gap-[6px] items-center px-[8px] py-[4px] rounded-full self-start" style={{ backgroundColor: `${meta.dot}1a` }}>
                <div className="rounded-full size-[6px]" style={{ backgroundColor: meta.dot }} />
                <p className="font-semibold text-[12px]" style={{ color: meta.text }}>{d?.status}</p>
              </div>
              <p className="text-[#3b3b3d] text-[15px] leading-snug">{d?.statusText}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Routine regularity */}
        <div className="flex flex-col gap-[16px] items-start w-full mt-[8px]">
          <p className="font-medium text-[#1f2024] text-[16px]">Régularité de la routine</p>

          <div className="bg-white flex flex-col gap-[16px] p-[16px] rounded-[16px] w-full shadow-sm">
            <div className="flex flex-col gap-[12px]">
              <p className="text-[#3b3b3d] text-[18px]">Observance globale</p>
              <div className="flex gap-[12px] items-center">
                <p className="font-bold text-[#3b3b3d] text-[24px]">{d?.observance ?? 0}%</p>
                <div className="bg-[#f5f4ed] h-[10px] rounded-full flex-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${d?.observance ?? 0}%`,
                      backgroundColor: (d?.observance ?? 0) >= 70 ? "#1d9e75" : (d?.observance ?? 0) >= 40 ? "#ef9f27" : "#e24b4a",
                    }}
                  />
                </div>
              </div>
              <p className="text-[#71727a] text-[15px] leading-snug">
                {(d?.observance ?? 0) >= 70
                  ? "Excellente régularité sur les 30 derniers jours."
                  : (d?.observance ?? 0) >= 40
                  ? "La routine est suivie la plupart du temps."
                  : "La routine nécessite plus de régularité."}
              </p>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full" />

            <div className="flex flex-col gap-[16px]">
              {[
                { label: "Nettoyage",        value: d?.nettoyage ?? 0 },
                { label: "Démaquillage",     value: d?.demaquillage ?? 0 },
                { label: "Hydratation matin",value: d?.hydratation ?? 0 },
                { label: "Protection SPF",   value: d?.spf ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[#71727a] text-[15px]">{label}</p>
                  <div className="flex items-center gap-[12px]">
                    <Jauge percentage={value} className={barClass} />
                    <p className="text-[#3b3b3d] text-[15px] w-[35px] text-right">{value}%</p>
                  </div>
                </div>
              ))}
            </div>

            {d?.alertText && (
              <div className="bg-[#e24b4a]/10 p-[12px] rounded-[12px] mt-[4px]">
                <p className="text-[#be0807] text-[14px]">{d.alertText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-transparent flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button disabled className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm opacity-30 cursor-not-allowed">
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>
        <div className="flex gap-[8px] items-center">
          <div className="bg-[#7d7d7d] h-[8px] w-[20px] rounded-full" />
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full" />
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full" />
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full" />
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full" />
        </div>
        <button onClick={() => navigate("/passport/symptoms")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>
    </div>
  );
}

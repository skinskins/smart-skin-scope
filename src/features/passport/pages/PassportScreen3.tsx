import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DayData {
  date: string;
  label: string;
  stress: number | null;
  sleep: number | null;
  acne: number | null;
  cycle: number | null;
  // raw for insight detection
  rawSleep: number | null;
  rawAcne: string | null;
  rawCycle: string | null;
}

const formatDateLabel = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const cycleToNum: Record<string, number> = {
  folliculaire: 1,
  ovulatoire: 2,
  "lutéal": 3,
  lutéale: 3,
  menstruation: 4,
  menstruelle: 4,
};

const acneToNum: Record<string, number> = {
  moins: 1,
  pareil: 2,
  plus: 3,
};

const yTickFormatter = (v: number) => {
  if (v === 0) return "Absent";
  if (v === 1) return "Léger";
  if (v === 2) return "Modéré";
  if (v === 3) return "Élevé";
  return "";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const fmt = (v: number | null) => {
    if (v === null || v === undefined) return "—";
    if (v === 0) return "Absent";
    if (v <= 1) return "Léger";
    if (v <= 2) return "Modéré";
    return "Élevé";
  };
  return (
    <div className="bg-white border border-[#e9e9e9] rounded-[10px] px-3 py-2 shadow-sm text-[12px]">
      <p className="text-[#71727a] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function PassportScreen3() {
  const navigate = useNavigate();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const from = new Date();
      from.setDate(from.getDate() - 29);
      const fromStr = from.toISOString().split("T")[0];

      const [{ data: checkins }, { data: symptoms }] = await Promise.all([
        (supabase as any)
          .from("daily_checkins")
          .select("date, stress_level, sleep_hours, cycle_phase")
          .eq("user_id", session.user.id)
          .gte("date", fromStr)
          .order("date", { ascending: true }),
        (supabase as any)
          .from("skin_symptoms")
          .select("date, acne_trend")
          .eq("user_id", session.user.id)
          .gte("date", fromStr)
          .order("date", { ascending: true }),
      ]);

      const symptomMap: Record<string, string> = {};
      (symptoms ?? []).forEach((r: any) => { symptomMap[r.date] = r.acne_trend; });

      const entries: DayData[] = (checkins ?? []).map((r: any) => {
        const rawAcne = symptomMap[r.date] ?? null;
        const rawCycle = (r.cycle_phase ?? "").toLowerCase();
        return {
          date: r.date,
          label: formatDateLabel(r.date),
          stress: r.stress_level != null ? +(r.stress_level / 2.5).toFixed(2) : null,
          sleep: r.sleep_hours != null ? +((r.sleep_hours / 8) * 4).toFixed(2) : null,
          acne: rawAcne ? acneToNum[rawAcne] ?? null : null,
          cycle: cycleToNum[rawCycle] ?? null,
          rawSleep: r.sleep_hours ?? null,
          rawAcne,
          rawCycle: r.cycle_phase ?? null,
        };
      });

      setData(entries);
      setLoading(false);
    };
    load();
  }, []);

  const isEmpty = !loading && data.length === 0;

  // ── Insight detection ──────────────────────────────────────────
  const insights: string[] = [];

  if (data.length > 0) {
    // 1. Stress peak (≥ 3 normalized = ≥ 7.5 raw) + acné "plus" same day
    const stressAcneDays = data.filter(
      (d) => (d.stress ?? 0) >= 3 && d.rawAcne === "plus"
    );
    if (stressAcneDays.length > 0) {
      insights.push(
        `Pic de stress corrélé à une poussée d'acné le ${formatDateLabel(stressAcneDays[0].date)}.`
      );
    } else {
      insights.push("Aucune corrélation stress / acné détectée sur la période.");
    }

    // 2. Sleep < 6h (< 3 normalized) followed by next-day acné "plus"
    const sleepAcneCount = data.filter((d, i) => {
      const nextDay = data[i + 1];
      return (d.rawSleep ?? 8) < 6 && nextDay?.rawAcne === "plus";
    }).length;
    if (sleepAcneCount > 0) {
      insights.push(
        `${sleepAcneCount} nuit${sleepAcneCount > 1 ? "s" : ""} courte${sleepAcneCount > 1 ? "s" : ""} (< 6h) suivie${sleepAcneCount > 1 ? "s" : ""} d'une hausse d'acné le lendemain.`
      );
    } else {
      insights.push("Pas de lien détecté entre nuits courtes et acné le lendemain.");
    }

    // 3. Phase lutéale + acné "plus"
    const lutealeAcne = data.filter(
      (d) =>
        (d.rawCycle ?? "").toLowerCase().includes("lut") && d.rawAcne === "plus"
    ).length;
    if (lutealeAcne > 0) {
      insights.push(
        `${lutealeAcne} jour${lutealeAcne > 1 ? "s" : ""} en phase lutéale avec poussée d'acné détecté${lutealeAcne > 1 ? "s" : ""}.`
      );
    } else {
      insights.push("Aucune corrélation phase lutéale / acné sur la période analysée.");
    }
  }

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
        <button onClick={() => navigate("/passport/symptoms")} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
      </div>

      <div className="flex flex-col gap-[20px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">
        <p className="font-medium text-[#1f2024] text-[16px]">3. Facteurs corrélés</p>

        {isEmpty ? (
          <div className="bg-white rounded-[16px] shadow-sm w-full flex flex-col items-center justify-center py-[60px] px-[24px] text-center gap-3">
            <Sparkles className="w-8 h-8 text-[#d4d6dd]" />
            <p className="text-[#3b3b3d] text-[15px] font-medium">Pas encore de données.</p>
            <p className="text-[#71727a] text-[14px] leading-relaxed">
              Renseignez vos facteurs lors du check-in quotidien.
            </p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="bg-white rounded-[16px] shadow-sm w-full p-[16px]">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#71727a" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3]}
                    tickFormatter={yTickFormatter}
                    tick={{ fontSize: 11, fill: "#71727a" }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(value) => <span style={{ color: "#3b3b3d" }}>{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="stress"
                    name="Stress"
                    stroke="#EAB308"
                    strokeWidth={2}
                    fill="url(#stressGrad)"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="cycle"
                    name="Cycle"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="acne"
                    name="Acné"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    name="Sommeil"
                    stroke="#22C55E"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Insights card */}
            <div className="bg-white rounded-[16px] shadow-sm w-full overflow-hidden">
              <div className="flex items-center gap-[12px] px-[16px] pt-[16px] pb-[14px]">
                <div className="bg-[#3892f2]/10 border border-[#3892f2]/20 flex items-center justify-center rounded-[8px] size-[36px] shrink-0">
                  <Sparkles className="w-[16px] h-[16px] text-[#1f2024]" />
                </div>
                <p className="font-medium text-[#1f2024] text-[15px]">Insights détectés</p>
              </div>

              {insights.map((text, i) => (
                <div key={i}>
                  {i > 0 && <div className="h-[1px] bg-[#f2f2f7] mx-[16px]" />}
                  <p className="text-[#3b3b3d] text-[14px] leading-snug px-[16px] py-[14px]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button onClick={() => navigate("/passport/symptoms")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>
        <div className="flex gap-[8px] items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-full ${i === 2 ? "bg-[#7d7d7d] h-[8px] w-[20px]" : "bg-[#d4d6dd] h-[8px] w-[8px]"}`} />
          ))}
        </div>
        <button onClick={() => navigate("/passport/visual")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>
    </div>
  );
}

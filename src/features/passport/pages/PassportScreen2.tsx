import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import PassportShareButton from "@/features/passport/components/PassportShareButton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type TrendValue = -1 | 0 | 1;

interface DayData {
  date: string;
  label: string;
  acne: TrendValue | null;
  redness: TrendValue | null;
  dryness: TrendValue | null;
}

const toValue = (t: string | null): TrendValue | null => {
  if (t === "moins") return -1;
  if (t === "plus") return 1;
  if (t === "pareil") return 0;
  return null;
};

const formatDateLabel = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const avg = (vals: (TrendValue | null)[]): number => {
  const defined = vals.filter((v) => v !== null) as number[];
  if (!defined.length) return 0;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
};

const trendLabel = (last7: number, prev7: number) => {
  const delta = last7 - prev7;
  if (delta < -0.15) return { icon: "↓", text: "En légère baisse" };
  if (delta > 0.15) return { icon: "↑", text: "En amélioration" };
  return { icon: "→", text: "Stable" };
};

const yTickFormatter = (v: number) => {
  if (v === -1) return "Baisse";
  if (v === 0) return "Stable";
  if (v === 1) return "Hausse";
  return "";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e9e9e9] rounded-[10px] px-3 py-2 shadow-sm text-[12px]">
      <p className="text-[#71727a] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value === -1 ? "Baisse" : p.value === 0 ? "Stable" : "Hausse"}
        </p>
      ))}
    </div>
  );
};

export default function PassportScreen2() {
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

      const { data: rows } = await (supabase as any)
        .from("symptom_tracking")
        .select("date, symptom, trend")
        .eq("user_id", session.user.id)
        .gte("date", fromStr)
        .order("date", { ascending: true });

      // Pivot: one row per day, keyed by symptom
      const byDate: Record<string, { acne: TrendValue | null; redness: TrendValue | null; dryness: TrendValue | null }> = {};
      for (const r of (rows ?? [])) {
        if (!byDate[r.date]) byDate[r.date] = { acne: null, redness: null, dryness: null };
        if (r.symptom === "acné")       byDate[r.date].acne    = toValue(r.trend);
        if (r.symptom === "rougeurs")   byDate[r.date].redness = toValue(r.trend);
        if (r.symptom === "sécheresse") byDate[r.date].dryness = toValue(r.trend);
      }

      const entries: DayData[] = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          label: formatDateLabel(date),
          acne:    vals.acne,
          redness: vals.redness,
          dryness: vals.dryness,
        }));

      setData(entries);
      setLoading(false);
    };
    load();
  }, []);

  const isEmpty = !loading && data.length === 0;

  // Summary: last 7 days vs previous 7 days
  const last7 = data.slice(-7);
  const prev7 = data.slice(-14, -7);
  const symptoms = [
    { key: "acne" as const, label: "Acné", color: "#3B82F6" },
    { key: "redness" as const, label: "Rougeurs", color: "#EF4444" },
    { key: "dryness" as const, label: "Sécheresse", color: "#22C55E" },
  ];

  // Insight: find day with highest acne value
  const insight = (() => {
    if (data.length < 1) return null;
    const peak = [...data].sort((a, b) => (b.acne ?? -2) - (a.acne ?? -2))[0];
    if (peak?.acne === 1)
      return `Pic d'acné détecté le ${formatDateLabel(peak.date)}.`;
    const allStable = data.every((d) => d.acne === 0 && d.redness === 0);
    if (allStable) return "Vos symptômes sont globalement stables sur les 30 derniers jours.";
    const improving = symptoms.filter(({ key }) => avg(last7.map((d) => d[key])) < avg(prev7.map((d) => d[key])));
    if (improving.length >= 2)
      return `${improving.map((s) => s.label).join(" et ")} en amélioration sur les 7 derniers jours.`;
    return "Continuez votre suivi quotidien pour affiner l'analyse.";
  })();

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
        <button onClick={() => navigate("/passport/preview")} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
        <PassportShareButton />
      </div>

      <div className="flex flex-col gap-[20px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">
        <p className="font-medium text-[#1f2024] text-[16px]">2. Évolution des symptômes</p>

        {isEmpty ? (
          <div className="bg-white rounded-[16px] shadow-sm w-full flex flex-col items-center justify-center py-[60px] px-[24px] text-center gap-3">
            <Sparkles className="w-8 h-8 text-[#d4d6dd]" />
            <p className="text-[#3b3b3d] text-[15px] font-medium">Pas encore de données.</p>
            <p className="text-[#71727a] text-[14px] leading-relaxed">
              Renseignez vos symptômes lors du check-in quotidien.
            </p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="bg-white rounded-[16px] shadow-sm w-full p-[16px]">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#71727a" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[-1, 1]}
                    ticks={[-1, 0, 1]}
                    tickFormatter={yTickFormatter}
                    tick={{ fontSize: 11, fill: "#71727a" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(value) => <span style={{ color: "#3b3b3d" }}>{value}</span>}
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
                    dataKey="redness"
                    name="Rougeurs"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="dryness"
                    name="Sécheresse"
                    stroke="#22C55E"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary list */}
            <div className="bg-white rounded-[16px] shadow-sm w-full divide-y divide-[#f2f2f7]">
              {symptoms.map(({ key, label, color }) => {
                const { icon, text } = trendLabel(
                  avg(last7.map((d) => d[key])),
                  avg(prev7.map((d) => d[key]))
                );
                return (
                  <div key={key} className="flex items-center justify-between px-[16px] py-[14px]">
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: color }} />
                      <p className="text-[#3b3b3d] text-[15px]">{label}</p>
                    </div>
                    <p className="text-[#71727a] text-[14px]">
                      {icon} {text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Insight card */}
            {insight && (
              <div className="bg-white rounded-[16px] shadow-sm w-full flex gap-[16px] items-start p-[16px]">
                <div className="bg-[#3892f2]/10 border border-[#3892f2]/20 flex items-center justify-center rounded-[8px] size-[44px] shrink-0">
                  <Sparkles className="w-[20px] h-[20px] text-[#1f2024]" />
                </div>
                <p className="text-[#3b3b3d] text-[15px] leading-snug flex-1 pt-[2px]">{insight}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button onClick={() => navigate("/passport/preview")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>
        <div className="flex gap-[8px] items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-full ${i === 1 ? "bg-[#7d7d7d] h-[8px] w-[20px]" : "bg-[#d4d6dd] h-[8px] w-[8px]"}`} />
          ))}
        </div>
        <button onClick={() => navigate("/passport/factors")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>
    </div>
  );
}

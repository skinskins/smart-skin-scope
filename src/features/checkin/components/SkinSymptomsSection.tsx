import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Trend = "moins" | "pareil" | "plus";

const TRENDS: { value: Trend; label: string; icon: string }[] = [
  { value: "moins", label: "Moins", icon: "↓" },
  { value: "pareil", label: "Pareil", icon: "→" },
  { value: "plus", label: "Plus", icon: "↑" },
];

const SYMPTOM_META: Record<string, { label: string; emoji: string }> = {
  "acné":        { label: "Acné",         emoji: "⚪" },
  "rougeurs":    { label: "Rougeurs",     emoji: "🔴" },
  "sécheresse":  { label: "Sécheresse",   emoji: "💧" },
  "taches":      { label: "Taches",       emoji: "🟤" },
  "points_noirs":{ label: "Points noirs", emoji: "⚫" },
  "rides":       { label: "Rides",        emoji: "〰️" },
  "cernes":      { label: "Cernes",       emoji: "😴" },
  "eczéma":      { label: "Eczéma",       emoji: "🌿" },
};

export default function SkinSymptomsSection() {
  // keyed by symptom dbKey, value is the selected trend
  const [symptoms, setSymptoms] = useState<Record<string, Trend | null>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("symptom_tracking")
        .select("symptom, trend")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .eq("period", "daily");

      if (error || !data) return;

      const map: Record<string, Trend | null> = {};
      for (const row of data) {
        map[row.symptom] = row.trend ?? null;
      }
      setSymptoms(map);
    };
    load();
  }, []);

  const handleSelect = async (symptom: string, value: Trend) => {
    setSymptoms(prev => ({ ...prev, [symptom]: value }));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date().toISOString().split("T")[0];
    await (supabase as any)
      .from("symptom_tracking")
      .upsert(
        { user_id: session.user.id, date: today, symptom, trend: value, zone: null, period: "daily" },
        { onConflict: "user_id,date,symptom,period" }
      );
  };

  const tracked = Object.keys(symptoms);
  if (tracked.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
        État de la peau
      </h2>

      <div className="bg-white border border-[#E5E5E5] p-6 space-y-6">
        <p className="text-xs font-mono text-[#888888] uppercase tracking-[0.1em] italic">
          Par rapport à hier, comment évoluent vos symptômes ?
        </p>

        {tracked.map(key => {
          const meta = SYMPTOM_META[key] ?? { label: key, emoji: "●" };
          const current = symptoms[key];
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{meta.emoji}</span>
                <p className="text-xs font-mono font-bold text-[#111111] uppercase tracking-[0.1em]">
                  {meta.label}
                </p>
                {current !== null && current !== undefined && (
                  <span className="ml-auto text-[10px] font-mono font-bold text-[#0052cc] uppercase tracking-[0.05em]">
                    {TRENDS.find(t => t.value === current)?.icon}{" "}
                    {TRENDS.find(t => t.value === current)?.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TRENDS.map(({ value, label, icon }) => {
                  const selected = current === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSelect(key, value)}
                      className={`py-3 border text-xs font-bold uppercase tracking-[0.05em] transition-all flex flex-col items-center gap-1 ${
                        selected
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white border-[#E5E5E5] text-[#AAAAAA] hover:border-[#111111] hover:text-[#111111]"
                      }`}
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

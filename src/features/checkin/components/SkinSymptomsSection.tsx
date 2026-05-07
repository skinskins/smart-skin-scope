import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Trend = "moins" | "pareil" | "plus";

interface Symptoms {
  acne: Trend | null;
  redness: Trend | null;
  dryness: Trend | null;
}

const TRENDS: { value: Trend; label: string; icon: string }[] = [
  { value: "moins", label: "Moins", icon: "↓" },
  { value: "pareil", label: "Pareil", icon: "→" },
  { value: "plus", label: "Plus", icon: "↑" },
];

const SYMPTOMS = [
  { key: "acne" as const, label: "Acné", emoji: "⚪", dbKey: "acne_trend" },
  { key: "redness" as const, label: "Rougeurs", emoji: "🔴", dbKey: "redness_trend" },
  { key: "dryness" as const, label: "Sécheresse", emoji: "💧", dbKey: "dryness_trend" },
];

export default function SkinSymptomsSection() {
  const [symptoms, setSymptoms] = useState<Symptoms>({
    acne: null,
    redness: null,
    dryness: null,
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("skin_symptoms")
        .select("acne_trend, redness_trend, dryness_trend")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();

      if (error) return;
      if (data) {
        setSymptoms({
          acne: data.acne_trend ?? null,
          redness: data.redness_trend ?? null,
          dryness: data.dryness_trend ?? null,
        });
      }
    };
    load();
  }, []);

  const handleSelect = async (symptom: keyof Symptoms, value: Trend) => {
    const next = { ...symptoms, [symptom]: value };
    setSymptoms(next);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date().toISOString().split("T")[0];
    const { error } = await (supabase as any)
      .from("skin_symptoms")
      .upsert(
        {
          user_id: session.user.id,
          date: today,
          acne_trend: next.acne,
          redness_trend: next.redness,
          dryness_trend: next.dryness,
        },
        { onConflict: "user_id,date" }
      );
  };

  return (
    <section className="mb-12">
      <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
        État de la peau
      </h2>

      <div className="bg-white border border-[#E5E5E5] p-6 space-y-6">
        <p className="text-xs font-mono text-[#888888] uppercase tracking-[0.1em] italic">
          Par rapport à hier, comment évoluent vos symptômes ?
        </p>

        {SYMPTOMS.map(({ key, label, emoji }) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{emoji}</span>
              <p className="text-xs font-mono font-bold text-[#111111] uppercase tracking-[0.1em]">
                {label}
              </p>
              {symptoms[key] !== null && (
                <span className="ml-auto text-[10px] font-mono font-bold text-[#0052cc] uppercase tracking-[0.05em]">
                  {TRENDS.find((t) => t.value === symptoms[key])?.icon}{" "}
                  {TRENDS.find((t) => t.value === symptoms[key])?.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {TRENDS.map(({ value, label: tLabel, icon }) => {
                const selected = symptoms[key] === value;
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
                    <span>{tLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ImageIcon } from "lucide-react";

type Trend = "moins" | "pareil" | "plus";

interface Answers {
  acne: Trend | null;
  redness: Trend | null;
  dryness: Trend | null;
}

const SYMPTOM_STEPS = [
  { key: "acne" as const, question: "Par rapport à hier,\nton acné est..." },
  { key: "redness" as const, question: "Par rapport à hier,\ntes rougeurs sont..." },
  { key: "dryness" as const, question: "Par rapport à hier,\nta peau est..." },
];

const TREND_OPTIONS: { value: Trend; label: string; icon: string }[] = [
  { value: "moins", label: "Moins", icon: "↓" },
  { value: "pareil", label: "Pareil", icon: "→" },
  { value: "plus", label: "Plus", icon: "↑" },
];

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

const today = new Date().toISOString().split("T")[0];

export default function SkinCheckIn() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction] = useState(1);
  const [answers, setAnswers] = useState<Answers>({ acne: null, redness: null, dryness: null });
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/checkin-advice", { replace: true }); return; }

      const { data } = await (supabase as any)
        .from("skin_symptoms")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();

      if (data) navigate("/checkin-advice", { replace: true });
    };
    check();
  }, [navigate]);

  const skip = () => {
    sessionStorage.setItem("skinCheckinSkippedDate", today);
    navigate("/checkin-advice", { replace: true });
  };

  const handleTrendSelect = (value: Trend) => {
    const key = SYMPTOM_STEPS[step].key;
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setStep(s => s + 1);
  };

  const complete = async (finalAnswers: Answers) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/checkin-advice", { replace: true }); return; }

    await (supabase as any).from("skin_symptoms").upsert(
      {
        user_id: session.user.id,
        date: today,
        acne_trend: finalAnswers.acne,
        redness_trend: finalAnswers.redness,
        dryness_trend: finalAnswers.dryness,
      },
      { onConflict: "user_id,date" }
    );

    navigate("/checkin-advice", { replace: true });
  };

  const handlePhotoUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { await complete(answers); return; }

    setUploading(true);
    try {
      const path = `${session.user.id}/${today}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("skin-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (!uploadError) {
        await (supabase as any).from("skin_photos").upsert(
          { user_id: session.user.id, date: today, storage_path: path },
          { onConflict: "user_id,date" }
        );
      }
    } catch (e) {
      console.error("[SkinCheckIn] photo upload error:", e);
    } finally {
      setUploading(false);
      await complete(answers);
    }
  };

  const totalSteps = 4;
  const isPhotoStep = step === 3;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-[#111111] w-8" : "bg-[#E5E5E5] w-4"
              }`}
            />
          ))}
          <span className="ml-3 text-[10px] font-mono font-bold text-[#888888] uppercase tracking-widest">
            {step + 1}/{totalSteps}
          </span>
        </div>
        {!isPhotoStep && (
          <button
            onClick={skip}
            className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-widest hover:text-[#111111] transition-colors"
          >
            Passer
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {!isPhotoStep ? (
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute inset-0 flex flex-col justify-center px-8 pb-16"
            >
              <h1 className="text-4xl font-display font-black text-[#111111] uppercase tracking-tight leading-tight mb-14 whitespace-pre-line">
                {SYMPTOM_STEPS[step].question}
              </h1>

              <div className="space-y-3">
                {TREND_OPTIONS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTrendSelect(value)}
                    className="w-full py-5 border border-[#E5E5E5] bg-white hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all flex items-center justify-between px-6 group"
                  >
                    <span className="text-sm font-mono font-bold uppercase tracking-[0.1em] text-[#111111] group-hover:text-white transition-colors">
                      {label}
                    </span>
                    <span className="text-lg text-[#111111] group-hover:text-white transition-colors">
                      {icon}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="photo"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute inset-0 flex flex-col justify-center px-8 pb-16"
            >
              <div className="text-5xl mb-6">📸</div>
              <h1 className="text-4xl font-display font-black text-[#111111] uppercase tracking-tight leading-tight mb-3">
                Ajoute une photo de ta peau
              </h1>
              <p className="text-sm text-[#888888] font-mono mb-12">
                Ajouter une photo booste votre suivi ✨
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 bg-[#111111] text-white flex items-center justify-between px-6 hover:bg-black transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-mono font-bold uppercase tracking-[0.1em]">
                    Prendre une photo
                  </span>
                  <Camera size={18} />
                </button>

                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 border border-[#111111] bg-white text-[#111111] flex items-center justify-between px-6 hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-mono font-bold uppercase tracking-[0.1em]">
                    Choisir depuis la galerie
                  </span>
                  <ImageIcon size={18} />
                </button>

                <button
                  onClick={() => complete(answers)}
                  disabled={uploading}
                  className="w-full pt-5 pb-2 text-xs font-mono font-bold text-[#AAAAAA] uppercase tracking-widest hover:text-[#111111] transition-colors"
                >
                  {uploading ? "Envoi en cours..." : "Passer pour aujourd'hui"}
                </button>
              </div>

              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

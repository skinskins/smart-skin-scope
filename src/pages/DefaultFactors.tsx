import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tag = {
  key: string;
  emoji: string;
  label: string;
  score: 1 | -1;
};

const TAGS: Tag[] = [
  { key: "poor_sleep",     emoji: "😴", label: "Manque de sommeil",       score: -1 },
  { key: "good_sleep",     emoji: "🌙", label: "Je dors bien",            score:  1 },
  { key: "high_stress",    emoji: "😤", label: "Stress élevé",            score: -1 },
  { key: "serene",         emoji: "😌", label: "Plutôt sereine",          score:  1 },
  { key: "high_sugar",     emoji: "🍬", label: "Beaucoup de sucre",       score: -1 },
  { key: "low_water",      emoji: "💧", label: "Je bois peu d'eau",       score: -1 },
  { key: "balanced_diet",  emoji: "🥗", label: "Alimentation équilibrée", score:  1 },
  { key: "sport",          emoji: "🏃", label: "Sport régulier",          score:  1 },
  { key: "sedentary",      emoji: "🛋️", label: "Sédentaire",              score: -1 },
  { key: "sun",            emoji: "☀️", label: "Soleil fréquent",         score: -1 },
  { key: "screens",        emoji: "📱", label: "Beaucoup d'écrans",       score: -1 },
  { key: "smoking",        emoji: "🚬", label: "Je fume",                 score: -1 },
  { key: "hormonal",       emoji: "💊", label: "Contraception hormonale", score: -1 },
];

const ORB_CONFIG = {
  positive: { gradient: "radial-gradient(circle at 38% 35%, #EEE5D5 0%, #D9C8A8 60%, #C4A882 100%)", shadow: "0 20px 60px rgba(196,168,130,0.5)" },
  neutral:  { gradient: "radial-gradient(circle at 38% 35%, #F0EBE3 0%, #D4C4B0 60%, #BFB09A 100%)", shadow: "0 20px 60px rgba(192,176,154,0.4)" },
  negative: { gradient: "radial-gradient(circle at 38% 35%, #F5ECEC 0%, #E8C8C8 60%, #D4A8A8 100%)", shadow: "0 20px 60px rgba(212,168,168,0.45)" },
};

type OrbState = "positive" | "neutral" | "negative";

export default function DefaultFactors() {
  const navigate = useNavigate();
  const orbRef   = useRef<HTMLDivElement>(null);
  const orbAnim  = useAnimation();

  const [absorbed, setAbsorbed] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);

  const wellbeingScore = absorbed.reduce((sum, key) => {
    const t = TAGS.find(t => t.key === key);
    return sum + (t?.score ?? 0);
  }, 0);

  const orbState: OrbState =
    wellbeingScore >=  2 ? "positive" :
    wellbeingScore <= -2 ? "negative" : "neutral";

  const { gradient, shadow } = ORB_CONFIG[orbState];

  useEffect(() => {
    if (orbState === "positive") {
      orbAnim.start({ scale: [1, 1.04, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } });
    } else if (orbState === "negative") {
      orbAnim.start({ scale: [1, 1.02, 1], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } });
    } else {
      orbAnim.stop();
      orbAnim.start({ scale: 1 });
    }
  }, [orbState, orbAnim]);

  const pulseOrb = () => {
    orbAnim.start({ scale: [1, 1.08, 1], transition: { duration: 0.4, ease: "easeOut" } });
  };

  const absorbTag = (key: string) => {
    setAbsorbed(prev => [...prev, key]);
    pulseOrb();
  };

  const removeTag = (key: string) => {
    setAbsorbed(prev => prev.filter(k => k !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const factors: Record<string, boolean> = {};
        for (const t of TAGS) factors[t.key] = absorbed.includes(t.key);
        await (supabase as any)
          .from("profiles")
          .update({ default_factors: factors })
          .eq("id", session.user.id);
      }
    } catch (_) {
      // non-bloquant
    }
    navigate("/dashboard");
  };

  const visibleTags = TAGS.filter(t => !absorbed.includes(t.key));

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden max-w-lg mx-auto px-5 pt-8 pb-10">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-border/40 bg-white/50 hover:bg-white transition-all shadow-sm shrink-0 mt-1"
        >
          <ArrowLeft size={18} strokeWidth={1.8} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-display text-foreground leading-tight mb-1">Ton quotidien</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Glisse vers Nacre ce qui façonne ta peau
          </p>
        </div>
      </div>

      {/* Orbe drop zone */}
      <div className="flex justify-center mb-6">
        <motion.div
          ref={orbRef}
          animate={orbAnim}
          className="relative flex items-center justify-center select-none"
          style={{ width: 160, height: 160 }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            animate={{ background: gradient, boxShadow: shadow }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {absorbed.length === 0 ? (
              <p className="text-[11px] text-foreground/30 text-center leading-snug px-4 font-medium">
                Glisse ici
              </p>
            ) : (
              <span className="text-3xl font-bold text-foreground/30">
                {absorbed.length}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tags absorbés */}
      <AnimatePresence>
        {absorbed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">
              Ce que tu as partagé
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {absorbed.map(key => {
                const t = TAGS.find(t => t.key === key)!;
                return (
                  <button
                    key={key}
                    onClick={() => removeTag(key)}
                    className="flex items-center gap-1 text-[12px] bg-muted/30 border border-border/30 rounded-full px-3 py-1.5 text-foreground/70 hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    {t.emoji} {t.label}
                    <span className="ml-1 text-muted-foreground/50 text-[10px]">×</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nuage de tags draggables */}
      <div className="flex-1 relative">
        <AnimatePresence>
          {visibleTags.length > 0 ? (
            <motion.div layout className="flex flex-wrap gap-2.5 justify-center">
              {visibleTags.map(tag => (
                <DraggableTag key={tag.key} tag={tag} orbRef={orbRef} onAbsorb={absorbTag} />
              ))}
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-muted-foreground py-4"
            >
              Tu as tout partagé avec Nacre 🌿
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={absorbed.length === 0 || saving}
          className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Enregistrement…" : "C'est parti →"}
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-[12px] text-muted-foreground hover:underline underline-offset-2 text-center py-1"
        >
          Passer cette étape
        </button>
      </div>

    </div>
  );
}

// ─── Composant tag draggable ──────────────────────────────────────────────────

type DraggableTagProps = {
  tag: Tag;
  orbRef: React.RefObject<HTMLDivElement>;
  onAbsorb: (key: string) => void;
};

function DraggableTag({ tag, orbRef, onAbsorb }: DraggableTagProps) {
  const [absorbed, setAbsorbed] = useState(false);

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    const orb = orbRef.current?.getBoundingClientRect();
    if (!orb) return;
    const { x, y } = info.point;
    const hit = x >= orb.left && x <= orb.right && y >= orb.top && y <= orb.bottom;
    if (hit) {
      setAbsorbed(true);
      onAbsorb(tag.key);
    }
  };

  if (absorbed) return null;

  return (
    <motion.button
      drag
      dragSnapToOrigin
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.1, zIndex: 50, cursor: "grabbing" }}
      whileHover={{ scale: 1.03 }}
      className="flex items-center gap-1.5 bg-white border border-border/30 rounded-full px-3.5 py-2 text-[13px] text-foreground shadow-sm cursor-grab select-none touch-none hover:border-primary/30 transition-colors"
      style={{ position: "relative", zIndex: 10 }}
    >
      <span>{tag.emoji}</span>
      <span>{tag.label}</span>
    </motion.button>
  );
}

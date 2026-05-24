import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const FACTORS = [
  { category: "Alimentation",          pills: ["Sucré/gras", "Alcool", "Peu d'eau"] },
  { category: "Stress & sommeil",      pills: ["Stress élevé", "Mauvaise nuit"] },
  { category: "Corps & environnement", pills: ["Sport intense", "Médicament", "Voyage", "Exposition solaire"] },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export const FactorsModal = ({ open, onClose, onSaved }: Props) => {
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsSaved, setFactorsSaved] = useState(false);

  const handleClose = () => {
    setSelectedFactors(new Set());
    setFactorsSaved(false);
    onClose();
  };

  const toggleFactor = (pill: string) => {
    setSelectedFactors(prev => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill); else next.add(pill);
      return next;
    });
  };

  const saveFactors = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onSaved(); return; }
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any).from("daily_checkins").upsert(
      {
        user_id:         session.user.id,
        date:            today,
        food_quality:    selectedFactors.has("Sucré/gras")       ? "Grasses / Sucrées" : null,
        alcohol_drinks:  selectedFactors.has("Alcool")            ? 1                   : null,
        water_glasses:   selectedFactors.has("Peu d'eau")         ? 2                   : null,
        stress_level:    selectedFactors.has("Stress élevé")      ? 4                   : null,
        sleep_hours:     selectedFactors.has("Mauvaise nuit")     ? 5                   : null,
        did_sport:       selectedFactors.has("Sport intense"),
        sport_intensity: selectedFactors.has("Sport intense")     ? "Intense"           : null,
        product_change:  selectedFactors.has("Nouveau produit"),
        extra_factors: {
          medication:    selectedFactors.has("Médicament"),
          travel:        selectedFactors.has("Voyage"),
          sun_exposure:  selectedFactors.has("Exposition solaire"),
          new_product:   selectedFactors.has("Nouveau produit"),
        },
      },
      { onConflict: "user_id,date" }
    );
    setFactorsSaved(true);
    setTimeout(() => {
      setFactorsSaved(false);
      setSelectedFactors(new Set());
      onSaved();
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm rounded-[32px] border-none premium-shadow p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-display text-foreground">Ta journée</DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-1">Quelque chose à noter ?</p>
        </DialogHeader>

        <div className="space-y-6 mb-8">
          {FACTORS.map(({ category, pills }) => (
            <div key={category}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{category}</p>
              <div className="flex flex-wrap gap-2">
                {pills.map(pill => {
                  const active = selectedFactors.has(pill);
                  return (
                    <button
                      key={pill}
                      onClick={() => toggleFactor(pill)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border/40 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {factorsSaved ? (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full h-12 flex items-center justify-center gap-2 bg-primary/10 rounded-full">
                <Check size={16} className="text-primary" />
                <span className="text-sm font-bold text-primary">Noté !</span>
              </motion.div>
            ) : (
              <motion.button key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={saveFactors}
                disabled={selectedFactors.size === 0}
                className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Enregistrer
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={handleClose}
            className="w-full h-10 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            Rien à noter aujourd'hui
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Zone {
  id: string; label: string; description: string; icon: string;
}

const faceZones: Zone[] = [
  { id: "forehead", label: "Front", icon: "🟡", description: "Zone fréquente pour les problèmes de texture, ridules et excès de sébum." },
  { id: "left-cheek", label: "Joue gauche", icon: "🔴", description: "Montre souvent rougeurs et sécheresse. Liée à la santé respiratoire." },
  { id: "right-cheek", label: "Joue droite", icon: "🔴", description: "Zone de contact téléphone — souvent boutons et irritation." },
  { id: "tzone", label: "Zone T", icon: "🟠", description: "Production de sébum maximale. Pores et points noirs concentrés ici." },
  { id: "chin", label: "Menton", icon: "🟣", description: "Les boutons hormonaux apparaissent ici, surtout en phase lutéale." },
  { id: "jaw", label: "Mâchoire", icon: "🟣", description: "Acné de stress et hormonale. Souvent lié au cycle et à l'alimentation." },
];

type DiagStep = "intro" | "zones" | "summary";

const Diagnosis = () => {
  const [step, setStep] = useState<DiagStep>("intro");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const reset = () => { setStep("intro"); setSelectedZone(null); };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Diagnostic</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Analysez votre peau zone par zone</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center">
            <div className="w-48 h-48 rounded-3xl bg-accent/50 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3 mb-6">
              <Stethoscope size={48} className="text-primary/40" />
              <span className="text-xs text-muted-foreground text-center px-4">Diagnostic guidé de votre peau</span>
            </div>
            <p className="text-center text-muted-foreground text-sm mb-5">
              Explorez chaque zone de votre visage pour comprendre ce qui s'y passe
            </p>
            <Button onClick={() => setStep("zones")} className="rounded-full px-8 py-5 bg-primary text-primary-foreground shadow-elevated">
              <Stethoscope size={18} className="mr-2" />Commencer le diagnostic
            </Button>
          </motion.div>
        )}

        {step === "zones" && (
          <motion.div key="zones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Info */}
            <div className="bg-accent rounded-xl p-3 mb-4 flex items-start gap-2">
              <Lock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                L'analyse IA n'est pas encore disponible. Appuyez sur une zone pour en savoir plus.
              </p>
            </div>

            {/* Zone list */}
            <div className="space-y-2 mb-4">
              {faceZones.map((zone, i) => (
                <motion.button
                  key={zone.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setSelectedZone(zone)}
                  className="w-full bg-card rounded-xl p-3 shadow-card flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity text-left"
                >
                  <span className="text-lg">{zone.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{zone.label}</p>
                    <p className="text-[10px] text-muted-foreground">Appuyez pour voir le détail</p>
                  </div>
                  <Lock size={12} className="text-muted-foreground" />
                  <ChevronRight size={14} className="text-muted-foreground" />
                </motion.button>
              ))}
            </div>

            {/* Comparison */}
            <div className="bg-card rounded-xl p-4 shadow-card mb-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">vs. dernier diagnostic :</span> Données enregistrées. Analyse complète bientôt disponible.
              </p>
            </div>

            <Button onClick={reset} variant="outline" className="w-full rounded-xl py-5">
              Recommencer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone detail dialog */}
      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span>{selectedZone?.icon}</span> {selectedZone?.label}
            </DialogTitle>
            <DialogDescription>{selectedZone?.description}</DialogDescription>
          </DialogHeader>
          <div className="bg-accent rounded-xl p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> L'analyse détaillée sera disponible quand le diagnostic IA sera activé.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diagnosis;

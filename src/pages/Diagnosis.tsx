import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Lock, ChevronRight, Sun, Droplets, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

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

const prepChecklist = [
  { icon: <Sun size={18} />, text: "Placez-vous dans une zone bien éclairée (lumière naturelle idéale)" },
  { icon: <Droplets size={18} />, text: "Visage propre et démaquillé" },
  { icon: <Sparkles size={18} />, text: "Pas de crème ni de sérum appliqué" },
  { icon: <ShieldCheck size={18} />, text: "Cheveux attachés, front dégagé" },
];

const analysisSteps = [
  "Détection du visage…",
  "Analyse de la texture…",
  "Mesure de l'hydratation…",
  "Évaluation des rougeurs…",
  "Analyse du sébum…",
  "Calcul du score global…",
];

type DiagStep = "prep" | "position" | "analyzing" | "zones";

const Diagnosis = () => {
  const [step, setStep] = useState<DiagStep>("prep");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);

  const reset = () => { setStep("prep"); setSelectedZone(null); setAnalysisProgress(0); setCurrentAnalysisStep(0); };

  // Simulated analysis
  useEffect(() => {
    if (step !== "analyzing") return;
    setAnalysisProgress(0);
    setCurrentAnalysisStep(0);

    const totalDuration = 4000;
    const stepInterval = totalDuration / analysisSteps.length;
    const progressInterval = 50;
    const progressIncrement = 100 / (totalDuration / progressInterval);

    const progressTimer = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) { clearInterval(progressTimer); return 100; }
        return Math.min(prev + progressIncrement, 100);
      });
    }, progressInterval);

    const stepTimer = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= analysisSteps.length - 1) { clearInterval(stepTimer); return prev; }
        return prev + 1;
      });
    }, stepInterval);

    const doneTimer = setTimeout(() => setStep("zones"), totalDuration + 300);

    return () => { clearInterval(progressTimer); clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, [step]);

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
        {/* Step 1: Preparation checklist */}
        {step === "prep" && (
          <motion.div key="prep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center">
            <div className="w-full bg-card rounded-2xl p-5 shadow-card mb-6">
              <p className="text-sm font-semibold text-foreground mb-4">Avant de commencer</p>
              <div className="space-y-3">
                {prepChecklist.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 bg-accent/50 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <p className="text-xs text-foreground">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep("position")} className="rounded-full px-8 py-5 bg-primary text-primary-foreground shadow-elevated w-full">
              Je suis prêt(e)
            </Button>
          </motion.div>
        )}

        {/* Step 2: Position face */}
        {step === "position" && (
          <motion.div key="position" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center">
            <div className="relative w-56 h-56 mb-6">
              {/* Oval guide */}
              <div className="absolute inset-0 rounded-[50%] border-[3px] border-dashed border-primary/40" />
              <div className="absolute inset-4 rounded-[50%] border-2 border-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">👤</div>
                  <p className="text-xs text-muted-foreground">Placez votre visage ici</p>
                </div>
              </div>
              {/* Animated scanning line */}
              <motion.div
                className="absolute left-4 right-4 h-0.5 bg-primary/40 rounded-full"
                animate={{ top: ["20%", "80%", "20%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-2">
              Tenez le téléphone à <span className="font-semibold text-foreground">30 cm</span> de votre visage
            </p>
            <p className="text-xs text-muted-foreground/60 text-center mb-6">
              Regardez droit devant, expression neutre
            </p>
            <Button onClick={() => setStep("analyzing")} className="rounded-full px-8 py-5 bg-primary text-primary-foreground shadow-elevated w-full">
              <Stethoscope size={18} className="mr-2" />Lancer l'analyse
            </Button>
            <button onClick={() => setStep("prep")} className="mt-3 text-xs text-muted-foreground underline">
              Retour
            </button>
          </motion.div>
        )}

        {/* Step 3: Analyzing */}
        {step === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-6"
            >
              <Loader2 size={48} className="text-primary" />
            </motion.div>
            <p className="text-lg font-display font-semibold text-foreground mb-2">Analyse en cours</p>
            <p className="text-sm text-primary font-medium mb-6">
              {analysisSteps[currentAnalysisStep]}
            </p>
            <div className="w-full max-w-xs mb-3">
              <Progress value={analysisProgress} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(analysisProgress)}%</p>
          </motion.div>
        )}

        {/* Step 4: Results / Zones */}
        {step === "zones" && (
          <motion.div key="zones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-primary/10 rounded-xl p-3 mb-4 text-center">
              <p className="text-sm font-semibold text-primary">✓ Analyse terminée</p>
              <p className="text-xs text-muted-foreground mt-1">Appuyez sur une zone pour voir les détails</p>
            </div>

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

            <div className="bg-card rounded-xl p-4 shadow-card mb-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">vs. dernier diagnostic :</span> Données enregistrées. Analyse complète bientôt disponible.
              </p>
            </div>

            <Button onClick={reset} variant="outline" className="w-full rounded-xl py-5">
              Nouveau diagnostic
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

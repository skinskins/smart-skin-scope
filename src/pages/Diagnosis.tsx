import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ChevronRight, Sun, Droplets, Sparkles, ShieldCheck, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import zoneForehead from "@/assets/zone-forehead.jpg";
import zoneLeftCheek from "@/assets/zone-left-cheek.jpg";
import zoneRightCheek from "@/assets/zone-right-cheek.jpg";
import zoneTzone from "@/assets/zone-tzone.jpg";
import zoneChin from "@/assets/zone-chin.jpg";
import zoneJaw from "@/assets/zone-jaw.jpg";
import { Progress } from "@/components/ui/progress";

interface ZoneResult {
  id: string;
  label: string;
  score: number;
  status: "good" | "warning" | "alert";
  trend: "up" | "down" | "stable";
  summary: string;
  detail: string;
  tips: string[];
  image: string;
}

const zoneResults: ZoneResult[] = [
  {
    id: "forehead", label: "Front", score: 72, status: "good", trend: "up",
    summary: "Texture lisse, légère brillance en zone T",
    detail: "La texture de votre front est globalement bonne. Légère surproduction de sébum détectée au niveau des pores, mais en amélioration par rapport au dernier scan.",
    tips: ["Appliquer un sérum matifiant le matin", "Exfolier 2x/semaine avec un AHA doux"],
    image: zoneForehead,
  },
  {
    id: "left-cheek", label: "Joue gauche", score: 58, status: "warning", trend: "down",
    summary: "Rougeurs diffuses, hydratation insuffisante",
    detail: "Rougeurs modérées détectées, probablement liées à la sensibilité cutanée ou au frottement de l'oreiller. Barrière cutanée légèrement altérée.",
    tips: ["Utiliser une crème apaisante au centella", "Changer de taie d'oreiller en soie"],
    image: zoneLeftCheek,
  },
  {
    id: "right-cheek", label: "Joue droite", score: 61, status: "warning", trend: "stable",
    summary: "Micro-boutons, zone de contact téléphone",
    detail: "Quelques imperfections liées au contact fréquent avec le téléphone. Pores légèrement dilatés dans la zone basse.",
    tips: ["Nettoyer votre téléphone quotidiennement", "Appliquer un soin anti-imperfections ciblé"],
    image: zoneRightCheek,
  },
  {
    id: "tzone", label: "Zone T", score: 45, status: "alert", trend: "down",
    summary: "Excès de sébum, pores visibles",
    detail: "Production de sébum élevée au niveau du nez et entre les sourcils. Points noirs concentrés sur les ailes du nez. À surveiller.",
    tips: ["Double nettoyage le soir", "Masque à l'argile 1x/semaine", "SPF matifiant le matin"],
    image: zoneTzone,
  },
  {
    id: "chin", label: "Menton", score: 52, status: "warning", trend: "stable",
    summary: "Boutons hormonaux actifs",
    detail: "Présence de boutons inflammatoires typiques de la zone hormonale. Corrélation possible avec la phase lutéale du cycle.",
    tips: ["Éviter de toucher cette zone", "Soin au niacinamide 10%"],
    image: zoneChin,
  },
  {
    id: "jaw", label: "Mâchoire", score: 78, status: "good", trend: "up",
    summary: "Zone saine, bonne élasticité",
    detail: "Aucune anomalie majeure. Peau bien hydratée avec une bonne élasticité. Continuez votre routine actuelle.",
    tips: ["Maintenir l'hydratation", "Massage lymphatique le matin"],
    image: zoneJaw,
  },
];

const globalScore = Math.round(zoneResults.reduce((sum, z) => sum + z.score, 0) / zoneResults.length);

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

type DiagStep = "prep" | "position" | "analyzing" | "results";

const statusConfig = {
  good: { color: "text-primary", bg: "bg-primary/10", icon: <CheckCircle2 size={14} />, label: "Bon" },
  warning: { color: "text-skin-oil", bg: "bg-skin-oil/10", icon: <AlertTriangle size={14} />, label: "Attention" },
  alert: { color: "text-destructive", bg: "bg-destructive/10", icon: <AlertTriangle size={14} />, label: "À traiter" },
};

const trendIcon = (trend: "up" | "down" | "stable") => {
  if (trend === "up") return <TrendingUp size={12} className="text-primary" />;
  if (trend === "down") return <TrendingDown size={12} className="text-destructive" />;
  return <Minus size={12} className="text-muted-foreground" />;
};

const ScoreBadge = ({ score }: { score: number }) => {
  const color = score >= 70 ? "text-primary" : score >= 50 ? "text-skin-oil" : "text-destructive";
  const bg = score >= 70 ? "bg-primary/10" : score >= 50 ? "bg-skin-oil/10" : "bg-destructive/10";
  return (
    <span className={`${color} ${bg} text-xs font-bold px-2 py-0.5 rounded-full`}>
      {score}
    </span>
  );
};

const Diagnosis = () => {
  const [step, setStep] = useState<DiagStep>("prep");
  const [selectedZone, setSelectedZone] = useState<ZoneResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);

  const reset = () => { setStep("prep"); setSelectedZone(null); setAnalysisProgress(0); setCurrentAnalysisStep(0); };

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

    const doneTimer = setTimeout(() => setStep("results"), totalDuration + 300);

    return () => { clearInterval(progressTimer); clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, [step]);

  const goodCount = zoneResults.filter(z => z.status === "good").length;
  const warningCount = zoneResults.filter(z => z.status === "warning").length;
  const alertCount = zoneResults.filter(z => z.status === "alert").length;

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
              <div className="absolute inset-0 rounded-[50%] border-[3px] border-dashed border-primary/40" />
              <div className="absolute inset-4 rounded-[50%] border-2 border-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">👤</div>
                  <p className="text-xs text-muted-foreground">Placez votre visage ici</p>
                </div>
              </div>
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
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="mb-6">
              <Loader2 size={48} className="text-primary" />
            </motion.div>
            <p className="text-lg font-display font-semibold text-foreground mb-2">Analyse en cours</p>
            <p className="text-sm text-primary font-medium mb-6">{analysisSteps[currentAnalysisStep]}</p>
            <div className="w-full max-w-xs mb-3">
              <Progress value={analysisProgress} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(analysisProgress)}%</p>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === "results" && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Global score hero */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-3xl p-6 shadow-card mb-4 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/30 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Score global</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-5xl font-display font-bold ${globalScore >= 70 ? 'text-primary' : globalScore >= 50 ? 'text-skin-oil' : 'text-destructive'}`}>
                    {globalScore}
                  </span>
                  <span className="text-lg text-muted-foreground font-medium">/100</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {globalScore >= 70 ? "Votre peau est en bonne santé ✨" : globalScore >= 50 ? "Quelques zones nécessitent attention 🔍" : "Plusieurs zones à traiter 🩹"}
                </p>

                {/* Status summary chips */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {goodCount > 0 && (
                    <span className="flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> {goodCount} OK
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 bg-skin-oil/10 text-skin-oil text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <AlertTriangle size={12} /> {warningCount} Attention
                    </span>
                  )}
                  {alertCount > 0 && (
                    <span className="flex items-center gap-1 bg-destructive/10 text-destructive text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <AlertTriangle size={12} /> {alertCount} À traiter
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Zone cards */}
            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Détail par zone</h2>
            <div className="space-y-2.5 mb-5">
              {zoneResults.map((zone, i) => {
                const config = statusConfig[zone.status];
                return (
                  <motion.button
                    key={zone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setSelectedZone(zone)}
                    className="w-full bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{zone.label}</p>
                          <div className="flex items-center gap-2">
                            {trendIcon(zone.trend)}
                            <ScoreBadge score={zone.score} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-11">{zone.summary}</p>
                    <div className="flex items-center justify-end mt-2 gap-1 text-[10px] text-primary font-medium">
                      <Info size={10} />
                      <span>Voir détail & conseils</span>
                      <ChevronRight size={12} />
                    </div>
                  </motion.button>
                );
              })}
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
              {selectedZone && (
                <>
                  <div className={`w-7 h-7 rounded-lg ${statusConfig[selectedZone.status].bg} flex items-center justify-center ${statusConfig[selectedZone.status].color}`}>
                    {statusConfig[selectedZone.status].icon}
                  </div>
                  {selectedZone.label}
                  <ScoreBadge score={selectedZone.score} />
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2">{selectedZone?.detail}</DialogDescription>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {trendIcon(selectedZone.trend)}
                <span>
                  {selectedZone.trend === "up" ? "En amélioration" : selectedZone.trend === "down" ? "En régression" : "Stable"} vs. dernier diagnostic
                </span>
              </div>
              <div className="bg-accent/50 rounded-xl p-3">
                <p className="text-xs font-semibold text-foreground mb-2">💡 Conseils personnalisés</p>
                <ul className="space-y-1.5">
                  {selectedZone.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diagnosis;

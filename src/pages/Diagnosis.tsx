import { useState, useEffect, useRef } from "react";
import { saveDiagnosisResult } from "@/hooks/useDiagnosisStore";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ChevronRight, Sun, Droplets, Sparkles, ShieldCheck, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Info, Camera, Upload, FlaskRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ZoneResult {
  id: string;
  label: string;
  score: number;
  status: "good" | "warning" | "alert";
  trend: "up" | "down" | "stable";
  summary: string;
  detail: string;
  tips: string[];
}

interface AIAnalysisResult {
  globalScore: number;
  summary: string;
  zones: ZoneResult[];
  correlations?: string[];
  ingredients?: string[];
}

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

type DiagStep = "prep" | "capture" | "analyzing" | "results";

const statusConfig = {
  good: { color: "text-primary", bg: "bg-primary/5", border: "border-primary/10", icon: <CheckCircle2 size={14} strokeWidth={1.5} />, label: "Optimal" },
  warning: { color: "text-foreground", bg: "bg-white/60", border: "border-border/40", icon: <AlertTriangle size={14} strokeWidth={1.5} />, label: "Attention" },
  alert: { color: "text-foreground", bg: "bg-primary/5", border: "border-primary/20", icon: <AlertTriangle size={14} strokeWidth={1.5} />, label: "Prioritaire" },
};

const trendIcon = (trend: "up" | "down" | "stable") => {
  if (trend === "up") return <TrendingUp size={12} className="text-[#111111]" />;
  if (trend === "down") return <TrendingDown size={12} className="text-[#111111]" />;
  return <Minus size={12} className="text-[#AAAAAA]" />;
};

const ScoreBadge = ({ score }: { score: number }) => {
  return (
    <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
      {score}/100
    </span>
  );
};

const Diagnosis = () => {
  // Try to load persisted session
  const persistedRaw = localStorage.getItem("currentDiagnosisSession");
  const persisted = persistedRaw ? JSON.parse(persistedRaw) : null;

  const [step, setStep] = useState<DiagStep>(persisted?.step || "prep");
  const [selectedZone, setSelectedZone] = useState<ZoneResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(persisted?.capturedImage || null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(persisted?.aiResult || null);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-save session when result or image changes significantly
  useEffect(() => {
    if (step === "results" && aiResult) {
      localStorage.setItem("currentDiagnosisSession", JSON.stringify({
        step: "results",
        capturedImage,
        aiResult
      }));
    }
  }, [step, aiResult, capturedImage]);

  const reset = () => {
    setStep("prep");
    setSelectedZone(null);
    setAnalysisProgress(0);
    setCurrentAnalysisStep(0);
    setCapturedImage(null);
    setImageBase64(null);
    setAiResult(null);
    setAiError(null);
    localStorage.removeItem("currentDiagnosisSession");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Veuillez sélectionner une image (JPG, PNG)", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "La taille maximum est 10 Mo", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!imageBase64) return;
    setStep("analyzing");
    setAiError(null);

    // Start progress animation
    setAnalysisProgress(0);
    setCurrentAnalysisStep(0);

    const progressInterval = 80;
    let progress = 0;
    const progressTimer = setInterval(() => {
      progress += 0.8;
      if (progress >= 95) {
        clearInterval(progressTimer);
        progress = 95;
      }
      setAnalysisProgress(progress);
    }, progressInterval);

    const stepTimer = setInterval(() => {
      setCurrentAnalysisStep((prev) => {
        if (prev >= analysisSteps.length - 2) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("skin-analysis", {
        body: {
          imageBase64,
          formData: {
            sleep: 7,
            hydration: 7,
            cycle: "none",
            pollution: 5,
            humidity: 50,
            uv: 3,
          },
        },
      });

      clearInterval(progressTimer);
      clearInterval(stepTimer);

      if (error) {
        throw new Error(error.message || "Erreur lors de l'analyse");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysisProgress(100);
      setCurrentAnalysisStep(analysisSteps.length - 1);

      const result = data as AIAnalysisResult;
      setAiResult(result);

      // Save to history
      saveDiagnosisResult(
        result.globalScore,
        result.zones.map((z) => ({ id: z.id, label: z.label, score: z.score, status: z.status }))
      );

      setTimeout(() => setStep("results"), 500);
    } catch (err: any) {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      console.error("Analysis error:", err);
      setAiError(err.message || "Erreur lors de l'analyse IA");
      toast({
        title: "Erreur d'analyse",
        description: err.message || "Impossible d'analyser la photo. Réessayez.",
        variant: "destructive",
      });
      setStep("capture");
    }
  };

  const globalScore = aiResult?.globalScore ?? 0;
  const zones = aiResult?.zones ?? [];
  const goodCount = zones.filter((z) => z.status === "good").length;
  const warningCount = zones.filter((z) => z.status === "warning").length;
  const alertCount = zones.filter((z) => z.status === "alert").length;

  return (
    <div className="min-h-screen bg-background pb-24 px-5 pt-10 max-w-lg mx-auto relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12 text-center relative z-10">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <FlaskRound size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display text-foreground leading-tight">Analyse IA</h1>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Diagnostic dermatologique de précision</p>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleImageUpload}
      />

      <AnimatePresence mode="wait">
        {/* Step 1: Preparation checklist */}
        {step === "prep" && (
          <motion.div key="prep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center relative z-10">
            <div className="premium-card p-8 mb-8 bg-white/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 ml-2">Protocole de préparation</p>
              <div className="space-y-6">
                {prepChecklist.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-border/40 flex items-center justify-center text-primary flex-shrink-0 group-hover:border-primary/40 transition-all shadow-sm">
                      {item.icon}
                    </div>
                    <p className="text-[13px] text-foreground font-medium leading-relaxed italic">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep("capture")} className="h-14 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded-full hover:opacity-90 w-full premium-shadow transition-all active:scale-[0.98]">
              Commencer
            </Button>
          </motion.div>
        )}

        {/* Step 2: Capture photo */}
        {step === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center relative z-10">

            {capturedImage ? (
              <div className="relative w-full mb-8 rounded-[40px] border border-border/40 overflow-hidden shadow-2xl">
                <img
                  src={capturedImage}
                  alt="Votre photo"
                  className="w-full h-80 object-cover"
                />
                <button
                  onClick={() => { setCapturedImage(null); setImageBase64(null); }}
                  className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-foreground shadow-lg hover:bg-white transition-all"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="w-full mb-8">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-80 bg-white/40 border-2 border-dashed border-primary/20 rounded-[40px] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/40 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors shadow-sm">
                    <Camera size={32} strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prendre une photo</p>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-2">Format portrait idéal</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-border/60 bg-white/50 h-14 text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-white transition-all"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Upload size={14} className="mr-3 opacity-60" />
                    Album
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-border/60 bg-white/50 h-14 text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-white transition-all"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute("capture", "user");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Camera size={14} className="mr-3 opacity-60" />
                    Appareil
                  </Button>
                </div>
              </div>
            )}

            {aiError && (
              <div className="w-full bg-red-50 border border-red-100 p-6 rounded-3xl mb-8">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest opacity-80">{aiError}</p>
              </div>
            )}

            <Button
              onClick={startAnalysis}
              disabled={!imageBase64}
              className="h-14 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded-full hover:opacity-90 w-full premium-shadow transition-all active:scale-[0.98] disabled:opacity-30"
            >
              Lancer l'Analyse
            </Button>
            <button onClick={() => setStep("prep")} className="mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors italic opacity-60">
              Retour
            </button>
          </motion.div>
        )}

        {/* Step 3: Analyzing */}
        {step === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20 relative z-10">
            {capturedImage && (
              <div className="relative w-48 h-48 rounded-full border border-primary/20 overflow-hidden mb-12 shadow-2xl">
                <img src={capturedImage} alt="" className="w-full h-full object-cover grayscale opacity-40" />
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-primary blur-[2px] opacity-60"
                  animate={{ top: ["20%", "80%", "20%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
            <h2 className="text-3xl font-display text-foreground leading-tight mb-3 text-center">Analyse en cours</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-12 italic opacity-60">{analysisSteps[currentAnalysisStep]}</p>

            <div className="w-full max-w-xs h-1.5 bg-muted/20 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-primary tracking-widest">{Math.round(analysisProgress)}%</p>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === "results" && aiResult && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10">

            {/* Photo + global score hero */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="premium-card p-10 mb-8 bg-white border-primary/10 text-center relative overflow-hidden">
              <div className="relative z-10">
                {capturedImage && (
                  <div className="w-32 h-32 rounded-full border border-primary/10 mx-auto mb-8 overflow-hidden shadow-sm">
                    <img src={capturedImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Score dermatologique global</p>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="text-8xl font-display text-primary leading-none">
                    {globalScore}
                  </span>
                  <span className="text-2xl font-display text-primary/30 mt-8">/100</span>
                </div>
                <p className="text-[15px] font-display text-foreground leading-relaxed italic max-w-xs mx-auto mb-10">{aiResult.summary}</p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {goodCount > 0 && (
                    <span className="bg-primary/5 text-primary text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest">
                      {goodCount} Zones Optimales
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="bg-white/40 border border-border/40 text-foreground text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-sm">
                      {warningCount} Vigilances
                    </span>
                  )}
                  {alertCount > 0 && (
                    <span className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest premium-shadow">
                      {alertCount} Prioritaires
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Correlations */}
            {aiResult.correlations && aiResult.correlations.length > 0 && (
              <div className="premium-card p-8 mb-6 bg-white/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 ml-1">Analyse des corrélations</p>
                <div className="space-y-4">
                  {aiResult.correlations.map((c, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary/20 mt-1.5 flex-shrink-0" />
                      <p className="text-[13px] text-foreground leading-relaxed italic">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended ingredients */}
            {aiResult.ingredients && aiResult.ingredients.length > 0 && (
              <div className="premium-card p-8 mb-8 bg-white/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 ml-1">Actifs recommandés</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.ingredients.map((ing, i) => (
                    <span key={i} className="bg-primary text-primary-foreground text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest premium-shadow">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zone cards */}
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6 px-1 ml-4">Cartographie cutanée</h2>
            <div className="space-y-4 mb-12">
              {zones.map((zone, i) => {
                const config = statusConfig[zone.status];
                return (
                  <motion.button
                    key={zone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full bg-white border border-border/40 p-8 rounded-[32px] text-left hover:border-primary/20 transition-all group relative overflow-hidden active:scale-[0.99]`}
                  >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${config.bg} ${config.color} group-hover:scale-110 transition-transform`}>
                                {config.icon}
                            </div>
                            <p className="text-[13px] font-bold text-foreground uppercase tracking-widest">{zone.label}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-1.5 rounded-lg bg-muted/15 group-hover:bg-primary/5 transition-colors">
                            {trendIcon(zone.trend)}
                            </div>
                            <ScoreBadge score={zone.score} />
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic truncate pr-8">{zone.summary}</p>
                    <div className="absolute bottom-8 right-8 text-primary/20 group-hover:text-primary transition-colors">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <Button onClick={reset} className="w-full h-14 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded-full hover:opacity-90 premium-shadow transition-all active:scale-[0.98]">
              Nouveau Diagnostic
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-sm rounded-[40px] border-none bg-background p-0 overflow-hidden">
          <div className="p-8 space-y-8">
            <DialogHeader className="space-y-6">
                <div className="flex items-center justify-between">
                    <DialogTitle className="text-4xl font-display text-foreground leading-none">
                        {selectedZone?.label}
                    </DialogTitle>
                    {selectedZone && <ScoreBadge score={selectedZone.score} />}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-primary uppercase tracking-widest pb-6 border-b border-primary/10">
                    {trendIcon(selectedZone?.trend || "stable")}
                    <span>
                    Tendance : {selectedZone?.trend === "up" ? "Amélioration" : selectedZone?.trend === "down" ? "Points de vigilance" : "Stable"}
                    </span>
                </div>
                <DialogDescription className="text-[13px] text-foreground leading-relaxed italic pt-2">
                    {selectedZone?.detail}
                </DialogDescription>
            </DialogHeader>

            {selectedZone && (
              <div className="space-y-6">
                <div className="premium-card p-8 bg-white/60 space-y-6">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Recommandations</p>
                    <ul className="space-y-6">
                        {selectedZone.tips.map((tip, i) => (
                            <li key={i} className="text-[12px] text-foreground leading-relaxed italic flex items-start gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-1.5 flex-shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diagnosis;

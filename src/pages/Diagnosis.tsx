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
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Diagnostic IA</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Analysez votre peau avec l'intelligence artificielle</p>
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
            <Button onClick={() => setStep("capture")} className="rounded-full px-8 py-5 bg-primary text-primary-foreground shadow-elevated w-full">
              Je suis prêt(e)
            </Button>
          </motion.div>
        )}

        {/* Step 2: Capture photo */}
        {step === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center">

            {capturedImage ? (
              <div className="relative w-full mb-5">
                <img
                  src={capturedImage}
                  alt="Votre photo"
                  className="w-full h-64 object-cover rounded-2xl shadow-card"
                />
                <button
                  onClick={() => { setCapturedImage(null); setImageBase64(null); }}
                  className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-foreground"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="w-full mb-5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 bg-card rounded-2xl shadow-card border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/60 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera size={28} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Prenez un selfie ou uploadez une photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG • Max 10 Mo</p>
                </div>

                <div className="flex gap-3 mt-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl py-4"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Upload size={16} className="mr-2" />
                    Galerie
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl py-4"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute("capture", "user");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Camera size={16} className="mr-2" />
                    Caméra
                  </Button>
                </div>
              </div>
            )}

            {aiError && (
              <div className="w-full bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-destructive">{aiError}</p>
              </div>
            )}

            <Button
              onClick={startAnalysis}
              disabled={!imageBase64}
              className="rounded-full px-8 py-5 bg-primary text-primary-foreground shadow-elevated w-full disabled:opacity-50"
            >
              <Stethoscope size={18} className="mr-2" />
              Lancer l'analyse IA
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
            {capturedImage && (
              <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 shadow-card">
                <img src={capturedImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-primary/60 rounded-full"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="mb-4">
              <Loader2 size={36} className="text-primary" />
            </motion.div>
            <p className="text-lg font-display font-semibold text-foreground mb-2">Analyse IA en cours</p>
            <p className="text-sm text-primary font-medium mb-6">{analysisSteps[currentAnalysisStep]}</p>
            <div className="w-full max-w-xs mb-3">
              <Progress value={analysisProgress} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(analysisProgress)}%</p>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === "results" && aiResult && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Photo + global score hero */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-3xl p-6 shadow-card mb-4 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/30 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                {capturedImage && (
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 shadow-card border-2 border-primary/20">
                    <img src={capturedImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-2 font-medium">Score global IA</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-5xl font-display font-bold ${globalScore >= 70 ? 'text-primary' : globalScore >= 50 ? 'text-skin-oil' : 'text-destructive'}`}>
                    {globalScore}
                  </span>
                  <span className="text-lg text-muted-foreground font-medium">/100</span>
                </div>
                <p className="text-sm text-muted-foreground">{aiResult.summary}</p>

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

            {/* Correlations */}
            {aiResult.correlations && aiResult.correlations.length > 0 && (
              <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
                <p className="text-xs font-semibold text-foreground mb-2">🔗 Corrélations détectées</p>
                <div className="space-y-1.5">
                  {aiResult.correlations.map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>{c}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended ingredients */}
            {aiResult.ingredients && aiResult.ingredients.length > 0 && (
              <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FlaskRound size={14} className="text-primary" />
                  Ingrédients recommandés
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.ingredients.map((ing, i) => (
                    <span key={i} className="bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-1 rounded-full">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zone cards */}
            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Détail par zone</h2>
            <div className="space-y-2.5 mb-5">
              {zones.map((zone, i) => {
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
              Refaire un diagnostic
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

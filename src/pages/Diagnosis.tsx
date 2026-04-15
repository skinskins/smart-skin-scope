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
  good: { color: "text-[#111111]", bg: "bg-white", border: "border-[#E5E5E5]", icon: <CheckCircle2 size={14} />, label: "BON" },
  warning: { color: "text-[#111111]", bg: "bg-white", border: "border-[#111111]", icon: <AlertTriangle size={14} />, label: "ATTENTION" },
  alert: { color: "text-[#111111]", bg: "bg-white", border: "border-[#111111] border-2", icon: <AlertTriangle size={14} />, label: "À TRAITER" },
};

const trendIcon = (trend: "up" | "down" | "stable") => {
  if (trend === "up") return <TrendingUp size={12} className="text-[#111111]" />;
  if (trend === "down") return <TrendingDown size={12} className="text-[#111111]" />;
  return <Minus size={12} className="text-[#AAAAAA]" />;
};

const ScoreBadge = ({ score }: { score: number }) => {
  return (
    <span className="text-[10px] font-mono font-bold text-[#111111] border border-[#111111] px-2 py-0.5 uppercase tracking-[0.1em]">
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
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 text-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Stethoscope size={24} className="text-[#111111]" />
          <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em]">L'ANALYSE IA</h1>
        </div>
        <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">Diagnostic dermatologique par intelligence artificielle</p>
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
            className="flex flex-col items-center">
            <div className="w-full bg-white border border-[#E5E5E5] p-6 mb-8">
              <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-6">Protocole de préparation</p>
              <div className="space-y-4">
                {prepChecklist.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 group">
                    <div className="w-10 h-10 border border-[#E5E5E5] flex items-center justify-center text-[#111111] flex-shrink-0 group-hover:border-[#111111] transition-colors">
                      {item.icon}
                    </div>
                    <p className="text-sm text-[#111111] font-medium leading-tight">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep("capture")} className="rounded-none h-14 bg-[#111111] text-white font-bold uppercase tracking-[0.1em] hover:bg-black w-full">
              S'identifier
            </Button>
          </motion.div>
        )}

        {/* Step 2: Capture photo */}
        {step === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center">

            {capturedImage ? (
              <div className="relative w-full mb-6 border border-[#111111]">
                <img
                  src={capturedImage}
                  alt="Votre photo"
                  className="w-full h-72 object-cover"
                />
                <button
                  onClick={() => { setCapturedImage(null); setImageBase64(null); }}
                  className="absolute top-4 right-4 bg-white border border-[#111111] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-[#111111]"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="w-full mb-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-72 bg-white border-2 border-dashed border-[#E5E5E5] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#111111] transition-colors"
                >
                  <Camera size={32} className="text-[#AAAAAA]" />
                  <div className="text-center">
                    <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Prendre une photo</p>
                    <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mt-1">JPG, PNG • MAX 10 MO</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-none border-[#E5E5E5] h-12 text-[10px] font-mono font-bold uppercase tracking-[0.1em] hover:border-[#111111]"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Upload size={14} className="mr-2" />
                    Album
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-none border-[#E5E5E5] h-12 text-[10px] font-mono font-bold uppercase tracking-[0.1em] hover:border-[#111111]"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute("capture", "user");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Camera size={14} className="mr-2" />
                    Appareil
                  </Button>
                </div>
              </div>
            )}

            {aiError && (
              <div className="w-full border border-red-500 p-4 mb-6">
                <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-[0.1em]">{aiError}</p>
              </div>
            )}

            <Button
              onClick={startAnalysis}
              disabled={!imageBase64}
              className="rounded-none h-14 bg-[#111111] text-white font-bold uppercase tracking-[0.1em] hover:bg-black w-full shadow-none disabled:opacity-30"
            >
              Lancer l'Analyse
            </Button>
            <button onClick={() => setStep("prep")} className="mt-4 text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] border-b border-transparent hover:border-[#AAAAAA]">
              Retour
            </button>
          </motion.div>
        )}

        {/* Step 3: Analyzing */}
        {step === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20">
            {capturedImage && (
              <div className="relative w-40 h-40 border border-[#111111] overflow-hidden mb-10">
                <img src={capturedImage} alt="" className="w-full h-full object-cover grayscale opacity-50" />
                <motion.div
                  className="absolute left-0 right-0 h-px bg-[#111111]"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
            <p className="text-2xl font-bold font-display text-[#111111] uppercase tracking-[0.1em] mb-2 text-center">ANALYSE EN COURS</p>
            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] mb-10">{analysisSteps[currentAnalysisStep]}</p>

            <div className="w-full max-w-xs border border-[#E5E5E5] p-1">
              <motion.div
                className="h-2 bg-[#111111]"
                initial={{ width: "0%" }}
                animate={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono font-bold text-[#111111] mt-4 tracking-[0.1em]">{Math.round(analysisProgress)}%</p>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === "results" && aiResult && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Photo + global score hero */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-[#111111] p-8 mb-6 text-center relative overflow-hidden">
              <div className="relative z-10">
                {capturedImage && (
                  <div className="w-24 h-24 border border-[#111111] mx-auto mb-6 overflow-hidden">
                    <img src={capturedImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] mb-4">SCORE DERMATOLOGIQUE</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-7xl font-bold text-[#111111] tracking-tighter">
                    {globalScore}
                  </span>
                  <span className="text-2xl font-mono text-[#AAAAAA] font-bold">/100</span>
                </div>
                <p className="text-sm text-[#111111] font-bold uppercase tracking-tight leading-snug max-w-xs mx-auto mb-8">{aiResult.summary}</p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {goodCount > 0 && (
                    <span className="border border-[#E5E5E5] text-[#111111] text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-[0.1em]">
                      {goodCount} OK
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="border border-[#111111] text-[#111111] text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-[0.1em]">
                      {warningCount} ATTENTION
                    </span>
                  )}
                  {alertCount > 0 && (
                    <span className="border-2 border-[#111111] text-[#111111] text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-[0.1em]">
                      {alertCount} PRIORITAIRE
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Correlations */}
            {aiResult.correlations && aiResult.correlations.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] p-6 mb-6">
                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-4">Corrélations détectées</p>
                <div className="space-y-3">
                  {aiResult.correlations.map((c, i) => (
                    <p key={i} className="text-xs text-[#111111] flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-[#111111] mt-1 flex-shrink-0" />
                      {c}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended ingredients */}
            {aiResult.ingredients && aiResult.ingredients.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] p-6 mb-6">
                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-4">Actifs recommandés</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.ingredients.map((ing, i) => (
                    <span key={i} className="border border-[#111111] text-[#111111] text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-[0.1em]">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zone cards */}
            <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] mb-6 px-1">Analyse par zone</h2>
            <div className="space-y-3 mb-10">
              {zones.map((zone, i) => {
                const config = statusConfig[zone.status];
                return (
                  <motion.button
                    key={zone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full bg-white border ${config.border} p-6 text-left hover:bg-muted/5 transition-colors group`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#111111] uppercase tracking-tight">{zone.label}</p>
                          <div className="flex items-center gap-3">
                            {trendIcon(zone.trend)}
                            <ScoreBadge score={zone.score} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#AAAAAA] font-medium leading-relaxed uppercase tracking-tight">{zone.summary}</p>
                    <div className="flex items-center justify-end mt-4 gap-2 text-[10px] text-[#111111] font-mono font-bold uppercase tracking-[0.1em]">
                      <span>Conseils</span>
                      <ChevronRight size={12} />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <Button onClick={reset} className="w-full rounded-none h-14 bg-[#111111] text-white font-bold uppercase tracking-[0.1em] hover:bg-black">
              Nouveau Diagnostic
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-sm rounded-none border border-[#111111]">
          <DialogHeader>
            <DialogTitle className="text-[#111111] flex items-center gap-3 uppercase tracking-tight font-bold">
              {selectedZone && (
                <>
                  {selectedZone.label}
                  <ScoreBadge score={selectedZone.score} />
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-4 text-sm text-[#111111] leading-relaxed uppercase tracking-tight">{selectedZone?.detail}</DialogDescription>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">
                {trendIcon(selectedZone.trend)}
                <span>
                  TENDANCE : {selectedZone.trend === "up" ? "AMÉLIORATION" : selectedZone.trend === "down" ? "RÉGRESSION" : "STABLE"}
                </span>
              </div>
              <div className="bg-white border border-[#E5E5E5] p-6">
                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-4">RECOMMANDATIONS</p>
                <ul className="space-y-3">
                  {selectedZone.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-[#111111] flex items-start gap-3 uppercase tracking-tight">
                      <span className="w-1.5 h-1.5 bg-[#111111] mt-1 flex-shrink-0" />
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

import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import type { ChangeEvent } from "react";
import type { SignupStepProps } from "@/pages/signup/types";

const inferSkinProblems = (analysis: any): string[] => {
    const problems: string[] = [];
    if ((analysis.acne?.score ?? 0) >= 1) problems.push("Acné");
    const maxRide = Math.max(analysis.rides?.periorbital ?? 0, analysis.rides?.front ?? 0, analysis.rides?.periorale ?? 0);
    if (maxRide >= 2) problems.push("Rides");
    if (analysis.pigmentation?.type && analysis.pigmentation.type !== "aucune") problems.push("Taches");
    if ((analysis.erytheme?.score ?? 0) >= 1 || analysis.conditions_detectees?.rosacea) problems.push("Rougeurs");
    if ((analysis.hydratation?.score ?? 0) >= 2) problems.push("Sécheresse");
    if ((analysis.cernes?.score ?? 0) >= 1) problems.push("Cernes");
    if (analysis.conditions_detectees?.eczema) problems.push("Eczéma");
    return problems;
};

const extractErrorMessage = async (error: any): Promise<string | null> => {
    const errorText = error.context
        ? await (error.context as Response).text().catch(() => error.message)
        : error.message;
    try {
        return JSON.parse(errorText)?.error ?? null;
    } catch {
        return null;
    }
};

const StepPhotoDiagnostic = ({ BackButton, age, onboardingPhotoBase64, setOnboardingPhotoBase64, setAnalysisLoading, photoCheckLoading, setPhotoCheckLoading, setOnboardingAnalysis, setCorrectedSkinType, setCorrectedProblems }: SignupStepProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const base64 = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 1200;
                const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
            };
            img.onerror = reject;
            img.src = url;
        });
        setOnboardingPhotoBase64(base64);
        setPhotoCheckLoading?.(true);

        // ── Phase 1 : vérification rapide de la qualité (retour quasi immédiat) ──
        // C'est ce qui bloque la navigation à cette étape : on ne laisse pas
        // l'utilisatrice avancer tant qu'on ne sait pas si la photo est exploitable.
        try {
            const { data, error } = await supabase.functions.invoke("skin-analysis", {
                body: { imageBase64: base64, age: age || undefined, qualityOnly: true },
            });

            if (error) {
                const parsedMessage = await extractErrorMessage(error);
                setOnboardingPhotoBase64(null);
                toast.error(parsedMessage ?? "Erreur lors de la vérification — réessaie plus tard.");
                setPhotoCheckLoading?.(false);
                return;
            }

            if (data?.rejected) {
                setOnboardingPhotoBase64(null);
                localStorage.setItem("nacre_photo_pending_retry", "1");
                toast.error(data.reason ?? "Photo non exploitable — reprends une photo bien éclairée, de face.");
                setPhotoCheckLoading?.(false);
                return;
            }

            localStorage.removeItem("nacre_photo_pending_retry");
            setPhotoCheckLoading?.(false);
        } catch {
            setOnboardingPhotoBase64(null);
            toast.error("Erreur lors de la vérification — réessaie plus tard.");
            setPhotoCheckLoading?.(false);
            return;
        }

        // ── Phase 2 : analyse complète en tâche de fond ──────────────────────────
        // La photo est déjà validée, l'utilisatrice peut avancer ; ce résultat n'est
        // consommé que plus tard, à l'étape de revue du diagnostic (StepDiagnosticReview).
        setAnalysisLoading(true);
        supabase.functions.invoke("skin-analysis", {
            body: { imageBase64: base64, age: age || undefined },
        }).then(({ data, error }) => {
            if (!error && data?.analysis) {
                setOnboardingAnalysis(data.analysis);
                setCorrectedSkinType(data.analysis.type_peau_detecte ?? "");
                setCorrectedProblems?.(inferSkinProblems(data.analysis));
            }
            setAnalysisLoading(false);
        }).catch(() => setAnalysisLoading(false));
    };

    return (
        <>
            <div className="mb-6 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-2">Obtenez votre analyse de peau</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Une simple photo suffit</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
                <div
                    className={`relative rounded-3xl overflow-hidden bg-muted/20 border border-border/40 ${photoCheckLoading ? "" : "cursor-pointer"}`}
                    style={{ height: 320 }}
                    onClick={() => !photoCheckLoading && fileInputRef.current?.click()}
                >
                    {onboardingPhotoBase64 ? (
                        <img src={`data:image/jpeg;base64,${onboardingPhotoBase64}`} alt="Photo peau" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
                            <Camera size={40} strokeWidth={1.2} />
                            <p className="text-sm">Visage démaquillé, face à la lumière</p>
                        </div>
                    )}
                    {photoCheckLoading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <p className="text-white text-sm font-medium">Vérification de la photo…</p>
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
                    Votre photo est utilisée uniquement pour l'analyse de peau, conformément à notre politique de confidentialité.
                </p>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoCheckLoading}
                    className={`w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest transition-all active:scale-[0.98] ${photoCheckLoading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:opacity-90"}`}
                >
                    <Camera size={18} strokeWidth={2} />
                    {onboardingPhotoBase64 ? "Reprendre la photo" : "Prendre une photo"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} disabled={photoCheckLoading} />
            </div>
        </>
    );
};

export default StepPhotoDiagnostic;

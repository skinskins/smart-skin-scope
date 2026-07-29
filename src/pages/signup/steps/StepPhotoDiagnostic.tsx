import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChangeEvent } from "react";
import type { SignupStepProps } from "@/pages/signup/types";

const StepPhotoDiagnostic = ({ BackButton, age, onboardingPhotoBase64, setOnboardingPhotoBase64, setAnalysisLoading, setOnboardingAnalysis, setCorrectedSkinType }: SignupStepProps) => {
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
        setAnalysisLoading(true);
        supabase.functions.invoke("skin-analysis", {
            body: { imageBase64: base64, age: age || undefined },
        }).then(({ data }) => {
            if (data?.rejected) {
                setOnboardingPhotoBase64(null);
                setAnalysisLoading(false);
                localStorage.setItem("nacre_photo_pending_retry", "1");
                toast.error(data.reason ?? "Photo non exploitable, reprends une photo bien eclairee.");
                return;
            }
            if (data?.analysis) {
                setOnboardingAnalysis(data.analysis);
                setCorrectedSkinType(data.analysis.type_peau_detecte ?? "");
                localStorage.removeItem("nacre_photo_pending_retry");
            }
            setAnalysisLoading(false);
        }).catch(() => setAnalysisLoading(false));
    };

    return (
        <>
            <div className="mb-6 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-2">Obtenez votre diagnostic de peau</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Une simple photo suffit</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
                <div className="relative rounded-3xl overflow-hidden bg-muted/20 border border-border/40" style={{ height: 320 }}>
                    {onboardingPhotoBase64 ? (
                        <img src={`data:image/jpeg;base64,${onboardingPhotoBase64}`} alt="Photo peau" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
                            <Camera size={40} strokeWidth={1.2} />
                            <p className="text-sm">Visage démaquillé, face à la lumière</p>
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
                    Votre photo est utilisée uniquement pour l'analyse de peau, conformément à notre politique de confidentialité.
                </p>

                <label className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all active:scale-[0.98]">
                    <Camera size={18} strokeWidth={2} />
                    {onboardingPhotoBase64 ? "Reprendre la photo" : "Prendre une photo"}
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
                </label>
            </div>
        </>
    );
};

export default StepPhotoDiagnostic;

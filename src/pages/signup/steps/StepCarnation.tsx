import type { SignupStepProps } from "@/pages/signup/types";

const swatches = [
    { value: "très_claire", label: "Très claire", color: "#F5E6D8" },
    { value: "claire", label: "Claire", color: "#EAC9A8" },
    { value: "beige_doré", label: "Beige dorée", color: "#C8924F" },
    { value: "olive_caramel", label: "Olive-Caramel", color: "#A0622A" },
    { value: "foncée", label: "Foncée", color: "#6B3A1F" },
    { value: "ébène", label: "Ébène", color: "#2C1810" },
];

const StepCarnation = ({ BackButton, carnation, setCarnation }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre carnation</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Personnalisation colorimétrique</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1">
                {swatches.map((swatch) => (
                    <button
                        type="button"
                        key={swatch.value}
                        onClick={() => setCarnation(swatch.value)}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${carnation === swatch.value ? "border-primary bg-primary/5 premium-shadow" : "border-border/40 bg-background/40"}`}
                    >
                        <div className="w-12 h-12 rounded-full shadow-sm" style={{ backgroundColor: swatch.color }} />
                        <p className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center leading-tight">{swatch.label}</p>
                    </button>
                ))}
            </div>
        </>
    );
};

export default StepCarnation;

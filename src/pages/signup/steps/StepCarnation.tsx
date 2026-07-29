import type { SignupStepProps } from "@/pages/signup/types";

const swatches = [
    { value: "très_claire", label: "Très claire", color: "#F5E6D8" },
    { value: "claire", label: "Claire", color: "#EAC9A8" },
    { value: "beige_doré", label: "Beige dorée", color: "#C8924F" },
    { value: "olive_caramel", label: "Olive-Caramel", color: "#A0622A" },
    { value: "foncée", label: "Foncée", color: "#6B3A1F" },
    { value: "ébène", label: "Ébène", color: "#2C1810" },
];

const SKIN_TYPES = ["Sèche", "Grasse", "Mixte", "Normale", "Sensible"];

const SKIN_PROBLEMS = ["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"];

const StepCarnation = ({ BackButton, carnation, setCarnation, skinType, setSkinType, skinProblems = [], toggleProblem }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre profil peau</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Pas de photo ? Renseigne-le manuellement</p>
                </div>
            </div>
            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Type de peau</label>
                    <div className="grid grid-cols-3 gap-3">
                        {SKIN_TYPES.map((type) => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setSkinType(type)}
                                className={`py-4 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${skinType === type ? "border-primary bg-primary/5 text-primary premium-shadow" : "border-border/40 bg-background/40 text-foreground/60"}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Carnation</label>
                    <div className="grid grid-cols-3 gap-4">
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
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sensibilités</label>
                    <div className="grid grid-cols-2 gap-3">
                        {SKIN_PROBLEMS.map((problem) => (
                            <button
                                type="button"
                                key={problem}
                                onClick={() => toggleProblem?.(problem)}
                                className={`py-4 px-2 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${skinProblems.includes(problem) ? "border-primary bg-primary/5 text-primary premium-shadow" : "border-border/40 bg-background/40 text-foreground/60"}`}
                            >
                                {problem}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StepCarnation;

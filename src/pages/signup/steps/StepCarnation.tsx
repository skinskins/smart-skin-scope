import SelectableOption from "@/pages/signup/components/SelectableOption";
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
                            <SelectableOption key={type} selected={skinType === type} onClick={() => setSkinType(type)}>
                                {type}
                            </SelectableOption>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Carnation</label>
                    <div className="grid grid-cols-3 gap-4">
                        {swatches.map((swatch) => (
                            <SelectableOption
                                key={swatch.value}
                                selected={carnation === swatch.value}
                                onClick={() => setCarnation(swatch.value)}
                                className="flex flex-col items-center gap-3 p-4"
                            >
                                <div className="w-12 h-12 rounded-full shadow-sm" style={{ backgroundColor: swatch.color }} />
                                <p className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center leading-tight">{swatch.label}</p>
                            </SelectableOption>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sensibilités</label>
                    <div className="grid grid-cols-2 gap-3">
                        {SKIN_PROBLEMS.map((problem) => (
                            <SelectableOption key={problem} selected={skinProblems.includes(problem)} onClick={() => toggleProblem?.(problem)}>
                                {problem}
                            </SelectableOption>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StepCarnation;

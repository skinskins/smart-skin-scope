import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import SelectableOption from "@/pages/signup/components/SelectableOption";
import type { SignupStepProps } from "@/pages/signup/types";

const StepProfilePhysical = ({ BackButton, age, setAge, gender, setGender }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Profil physique</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Personnalisation de l'analyse</p>
                </div>
            </div>
            <div className="space-y-8 flex-1">
                <div className="space-y-4 relative">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Âge</label>
                    <div className="relative">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                        <Input type="number" placeholder="ex: 28" min="10" max="120" className="pl-12" value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-6 pt-10 border-t border-border/40">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Sexe</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Femme', 'Homme', 'Autre'].map((g) => (
                            <SelectableOption key={g} selected={gender === g} onClick={() => setGender(g)}>
                                {g}
                            </SelectableOption>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StepProfilePhysical;

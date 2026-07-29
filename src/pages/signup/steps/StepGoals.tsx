import type { SignupStepProps } from "@/pages/signup/types";

const StepGoals = ({ BackButton, skinGoals, toggleGoal }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Vos objectifs</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Qu'est-ce qui compte le plus pour vous ?</p>
                </div>
            </div>
            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {['Hydratation', 'Anti-âge', 'Éclat / Glow', 'Anti-imperfections', 'Apaiser', 'Taches', 'Pores', 'Anti-cernes'].map((goal) => (
                        <button type="button" key={goal} onClick={() => toggleGoal(goal)} className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                            {goal}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default StepGoals;

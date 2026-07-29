import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { SignupStepProps } from "@/pages/signup/types";

const StepCycle = ({ BackButton, lastPeriodDate, setLastPeriodDate, cycleDuration, setCycleDuration }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre cycle menstruel</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Cycle menstruel</p>
                </div>
            </div>
            <div className="space-y-8 flex-1">
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Vos dernières règles</label>
                    <Input type="date" value={lastPeriodDate} onChange={(e) => setLastPeriodDate(e.target.value)} className="h-14 rounded-2xl font-mono" max={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-6 pt-6 border-t border-border/40">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Durée du cycle</label>
                        <span className="text-sm font-bold text-primary">{cycleDuration} jours</span>
                    </div>
                    <Slider value={[cycleDuration]} min={21} max={45} step={1} onValueChange={(v) => setCycleDuration(v[0])} />
                    <p className="text-[10px] text-muted-foreground text-center italic">21 jours — 45 jours · Défaut : 28 jours</p>
                </div>
                <div className="flex gap-3">
                    {['Je ne sais pas', 'Pas de règles'].map((opt) => (
                        <button key={opt} type="button" onClick={() => setLastPeriodDate("")} className="flex-1 py-3 rounded-2xl border border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:border-primary transition-all">
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default StepCycle;

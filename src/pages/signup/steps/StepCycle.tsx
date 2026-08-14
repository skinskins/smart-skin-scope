import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { SignupStepProps } from "@/pages/signup/types";

const CYCLE_OPTIONS: { label: string; value: "unknown" | "none" }[] = [
    { label: "Je ne sais pas", value: "unknown" },
    { label: "Pas de règles", value: "none" },
];

const StepCycle = ({ BackButton, lastPeriodDate, setLastPeriodDate, cycleDuration, setCycleDuration, cycleStatus, setCycleStatus }: SignupStepProps) => {
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
                    <Input
                        type="date"
                        value={lastPeriodDate}
                        onChange={(e) => {
                            setLastPeriodDate(e.target.value);
                            setCycleStatus(null);
                        }}
                        className="h-14 rounded-2xl font-mono"
                        max={new Date().toISOString().split("T")[0]}
                    />
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
                    {CYCLE_OPTIONS.map(({ label, value }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => {
                                setLastPeriodDate("");
                                setCycleStatus(value);
                            }}
                            className={cn(
                                "flex-1 py-3 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                cycleStatus === value ? "border-primary bg-primary/5 text-primary premium-shadow" : "border-border/40 bg-background/40 text-foreground/60"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default StepCycle;

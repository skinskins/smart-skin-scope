import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Info } from "lucide-react";
import type { ObjectivePlan } from "@/utils/objectivePlan";

const SCORE_COLORS: Record<string, string> = {
    hydratation: "bg-blue-400",
    eclat: "bg-amber-400",
    erytheme: "bg-red-400",
    sebum: "bg-yellow-400",
    acne: "bg-orange-400",
};

const ObjectivePlanCard = ({ plan, delay = 0 }: { plan: ObjectivePlan; delay?: number }) => {
    const hasNotes = plan.incompatibilityNote || plan.confoundingFactors.length > 0 || plan.precaution;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="flex flex-col gap-5 p-8 premium-card border-none bg-white/60"
        >
            <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-primary shrink-0" />
                <h3 className="font-display text-xl text-foreground italic">Votre plan personnalisé</h3>
            </div>

            {plan.skinTypeAdvice && (
                <p className="text-[13px] text-foreground/80 leading-relaxed italic">
                    <span className="font-semibold not-italic">{plan.skinTypeAdvice.title}.</span> {plan.skinTypeAdvice.content}
                </p>
            )}

            <div className="space-y-3 pt-3 border-t border-border/30">
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Dès les premiers jours</p>
                    <p className="text-[13px] text-foreground/80 leading-relaxed italic">{plan.expectedResults.shortTerm}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Résultat attendu</p>
                    <p className="text-[13px] text-foreground/80 leading-relaxed italic">{plan.expectedResults.longTerm}</p>
                </div>
            </div>

            {/* "Vos scores actuels" désactivé pour le moment (à la demande du produit) —
                logique et données restent disponibles dans plan.scoreTrends / plan.scoreDisclaimer
                si on veut le remettre plus tard.
            {plan.scoreTrends.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-border/30">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vos scores actuels</p>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/60" /> Aujourd'hui</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/30" /> Estimation</span>
                        </div>
                    </div>
                    {plan.scoreTrends.map((score) => {
                        const colorClass = SCORE_COLORS[score.key] ?? "bg-primary";
                        const hasEstimate = Number.isFinite(score.projected) && score.projected !== score.current;
                        return (
                            <div key={score.key}>
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-[12px] font-semibold text-foreground">{score.label}</span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {score.current}/{score.max}
                                        {hasEstimate && (
                                            <span className="text-primary font-bold"> → {score.projected}/{score.max}</span>
                                        )}
                                    </span>
                                </div>
                                <div className="relative h-2.5 bg-muted/30 rounded-full overflow-hidden">
                                    {hasEstimate && (
                                        <div
                                            className={`absolute inset-y-0 left-0 rounded-full ${colorClass} opacity-30`}
                                            style={{ width: `${(score.projected / score.max) * 100}%` }}
                                        />
                                    )}
                                    <div
                                        className={`absolute inset-y-0 left-0 ${hasEstimate ? "rounded-l-full" : "rounded-full"} ${colorClass}`}
                                        style={{ width: `${(score.current / score.max) * 100}%` }}
                                    />
                                </div>
                                {score.reason && (
                                    <p className="text-[11px] text-muted-foreground italic mt-1">{score.reason}</p>
                                )}
                            </div>
                        );
                    })}
                    {plan.scoreDisclaimer && (
                        <div className="flex items-start gap-2 pt-1">
                            <Info size={12} className="text-muted-foreground/70 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground/80 italic leading-relaxed">{plan.scoreDisclaimer}</p>
                        </div>
                    )}
                </div>
            )}
            */}

            {plan.integrationPlan.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Votre plan d'intégration</p>
                    {plan.integrationPlan.map((phase, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-primary/40 mt-1.5" />
                                {idx < plan.integrationPlan.length - 1 && <div className="w-px flex-1 bg-primary/10 mt-1" />}
                            </div>
                            <div className="pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{phase.timing}</p>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide bg-muted/30 rounded-full px-2 py-0.5">{phase.goal}</span>
                                </div>
                                <p className="text-[13px] font-semibold text-foreground capitalize mt-0.5">{phase.active}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">Résultat</p>
                                <p className="text-[12px] text-foreground/70 italic">{phase.result}</p>
                                {phase.caution && (
                                    <p className="text-[11px] text-muted-foreground italic mt-1">⚠ {phase.caution}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {hasNotes && (
                <div className="space-y-2 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-muted-foreground shrink-0" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">À garder en tête</p>
                    </div>
                    {plan.precaution && (
                        <p className="text-[12px] text-foreground/70 leading-relaxed italic">{plan.precaution}</p>
                    )}
                    {plan.incompatibilityNote && (
                        <p className="text-[12px] text-foreground/70 leading-relaxed italic">{plan.incompatibilityNote}</p>
                    )}
                    {plan.confoundingFactors.map((factor, idx) => (
                        <p key={idx} className="text-[12px] text-foreground/70 leading-relaxed italic">{factor}</p>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default ObjectivePlanCard;

import { motion } from "framer-motion";
import { ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import skincareMatrix from "@/data/skincare_matrix.json";

// ─── Types ───────────────────────────────────────────────────
interface AdviceItem {
    iconStr: string;
    title: string;
    text: string;
    tip: string;
    group: "g1" | "g2" | "g3";
}

interface Context {
    skinType: string;
    uvIndex: number;
    tempC: number;
    humidity: number;
    aqi: number;
    sleepHours: number;
    stressLevel: number;
    alcoholLastNight: number;
    removedMakeupLastNight: boolean;
    didSportToday: boolean;
    cycleDay: number | null;
}

// ─── Moteur de matching ──────────────────────────────────────
type TriggerCondition = boolean | { gte?: number; lte?: number };

function evaluateTrigger(ctx: Context, trigger: Record<string, TriggerCondition>): boolean {
    for (const [key, cond] of Object.entries(trigger)) {
        const val = ctx[key as keyof Context];

        if (typeof cond === "boolean") {
            if (val !== cond) return false;
        } else if (typeof cond === "object" && cond !== null) {
            const numVal = val as number;
            if (numVal === null || numVal === undefined) return false;
            if (cond.gte !== undefined && numVal < cond.gte) return false;
            if (cond.lte !== undefined && numVal > cond.lte) return false;
        }
    }
    return true;
}

function getActiveAdvice(ctx: Context): AdviceItem[] {
    const results: AdviceItem[] = [];
    const skinType = ctx.skinType as "dry" | "oily" | "combo" | "normal";

    // G3 en priorité (scénarios combinés)
    for (const scenario of skincareMatrix.groups.g3.scenarios) {
        if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
            const spec = scenario.advice[skinType];
            if (spec) {
                results.push({ iconStr: scenario.icon, title: spec.title, text: spec.body, tip: spec.tip, group: "g3" });
            }
        }
    }

    // G1 — facteurs auto-détectés (API météo / qualité air)
    for (const scenario of skincareMatrix.groups.g1.scenarios) {
        if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
            const spec = scenario.advice[skinType];
            if (spec) {
                results.push({ iconStr: scenario.icon, title: spec.title, text: spec.body, tip: spec.tip, group: "g1" });
            }
        }
    }

    // G2 — facteurs déclarés par l'utilisatrice
    for (const scenario of skincareMatrix.groups.g2.scenarios) {
        if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
            const spec = scenario.advice[skinType];
            if (spec) {
                results.push({ iconStr: scenario.icon, title: spec.title, text: spec.body, tip: spec.tip, group: "g3" });
            }
        }
    }

    return results;
}

// ─── Mapping type de peau UI → clé JSON ─────────────────────
const SKIN_TYPE_MAP: Record<string, string> = {
    "Sèche": "dry",
    "Grasse": "oily",
    "Mixte": "combo",
    "Normale": "normal",
};

// ─── Composant principal ─────────────────────────────────────
const CheckinAdvice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const firstName = location.state?.firstName || "";

    const [isSuccessStep, setIsSuccessStep] = useState(isOnboarding);
    const [adviceList, setAdviceList] = useState<AdviceItem[]>([]);

    // Transition onboarding → conseils
    useEffect(() => {
        if (isSuccessStep) {
            const timer = setTimeout(() => setIsSuccessStep(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccessStep]);

    // Calcul des conseils depuis les données du check-in
    useEffect(() => {
        const dataStr = localStorage.getItem("dailyCheckinData");
        const guestStr = localStorage.getItem("guestProfile");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            const guest = guestStr ? JSON.parse(guestStr) : {};

            const skinType = SKIN_TYPE_MAP[guest.skin_type] ?? "normal";

            const ctx: Context = {
                skinType,
                uvIndex: data.weather?.uv ?? 0,
                tempC: data.weather?.temp ?? 20,
                humidity: data.weather?.humidity ?? 50,
                aqi: data.weather?.aqiScore ?? 25,
                sleepHours: data.sleepHours ?? 8,
                stressLevel: data.stressLevel ?? 1,
                alcoholLastNight: data.alcoholDrinks ?? 0,
                removedMakeupLastNight: data.makeupRemoved ?? true,
                didSportToday: data.didSport ?? ((data.workoutMinutes ?? 0) > 0),
                cycleDay: data.cyclePhase === "Menstruel" ? 2 : null,
            };

            console.log("✅ Skin Matrix Context:", ctx);

            const advice = getActiveAdvice(ctx);

            if (advice.length === 0) {
                advice.push({
                    iconStr: "✨",
                    title: "Tout va bien",
                    text: "Vos indicateurs sont au vert ! Maintenez votre belle routine actuelle.",
                    tip: "Continuez de bien hydrater votre peau chaque matin.",
                    group: "g1",
                });
            }

            setAdviceList(advice);
        } catch (e) {
            console.error("Erreur parsing check-in data", e);
        }
    }, []);

    // ── Écran de chargement (onboarding) ──
    if (isSuccessStep) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="bg-card p-8 rounded-3xl shadow-card z-10 flex flex-col items-center text-center max-w-sm w-full"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">Analyse en cours...</h2>
                    <p className="text-muted-foreground text-sm">
                        Merci {firstName}.<br />Vos conseils sont en cours de préparation.
                    </p>
                    <div className="mt-8 relative w-full h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.2, ease: "linear" }}
                            className="absolute top-0 left-0 bottom-0 bg-primary"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">Génération des conseils...</p>
                </motion.div>
            </div>
        );
    }

    // ── Écran des conseils ──
    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

            {/* Header */}
            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full"
                >
                    <ArrowLeft size={20} className="text-foreground" />
                </motion.button>
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                <div className="mb-6">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">
                        Vos Conseils du Jour
                    </h1>
                    <p className="text-muted-foreground text-sm">Basés sur vos réponses d'aujourd'hui</p>
                </div>

                {/* Cartes de conseils */}
                <div className="space-y-4 flex-1">
                    {adviceList.map((advice, idx) => {
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-card p-5 rounded-3xl shadow-sm border border-border/50"
                            >

                                <div className="flex gap-4">
                                    {/* Icône */}
                                    <div className="flex-shrink-0 text-3xl leading-none pt-0.5">
                                        {advice.iconStr}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Titre */}
                                        <h3 className="font-semibold text-foreground mb-1 leading-snug">
                                            {advice.title}
                                        </h3>

                                        {/* Corps du conseil */}
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {advice.text}
                                        </p>

                                        {/* Tip */}
                                        {advice.tip && (
                                            <div className="mt-3 bg-primary/5 p-3 rounded-xl border border-primary/20">
                                                <p className="text-xs text-foreground font-medium flex gap-2 items-start">
                                                    <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
                                                    {advice.tip}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};

export default CheckinAdvice;

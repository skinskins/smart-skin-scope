import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Info, Droplets, Moon, Flame, Activity, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const CheckinAdvice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const firstName = location.state?.firstName || "";

    const [isSuccessStep, setIsSuccessStep] = useState(isOnboarding);
    const [adviceList, setAdviceList] = useState<{ icon: any, text: string, title: string, color: string }[]>([]);

    useEffect(() => {
        if (isSuccessStep) {
            const timer = setTimeout(() => {
                setIsSuccessStep(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccessStep]);

    useEffect(() => {
        const dataStr = localStorage.getItem("dailyCheckinData");
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                const advice = [];

                if (data.waterGlasses < 6) {
                    advice.push({
                        icon: Droplets,
                        title: "Hydratation Insuffisante",
                        text: "Votre peau risque d'être plus sèche aujourd'hui. Pensez à boire régulièrement pour maintenir son élasticité et son éclat.",
                        color: "text-blue-500"
                    });
                } else {
                    advice.push({
                        icon: Droplets,
                        title: "Bonne Hydratation",
                        text: "Super ! Continuez à bien vous hydrater, c'est le secret #1 d'une peau lumineuse.",
                        color: "text-blue-500"
                    });
                }

                if (data.sleepHours < 7) {
                    advice.push({
                        icon: Moon,
                        title: "Manque de Sommeil",
                        text: "La nuit a été courte. N'hésitez pas à utiliser un contour des yeux drainant ou frais pour réduire les signes de fatigue.",
                        color: "text-indigo-400"
                    });
                }

                if (data.stressLevel >= 4) {
                    advice.push({
                        icon: Flame,
                        title: "Pic de Stress",
                        text: "Le stress augmente la production de sébum et les inflammations. Prenez 5 minutes pour respirer profondément.",
                        color: "text-rose-500"
                    });
                }

                if (data.cyclePhase === "Lutéal" || data.cyclePhase === "Menstruel") {
                    advice.push({
                        icon: Activity,
                        title: "Sensibilité Hormonale",
                        text: "La période est propice aux petites imperfections ou à la sensibilité. Évitez les gommages trop agressifs.",
                        color: "text-purple-400"
                    });
                }

                if (advice.length === 0) {
                    advice.push({
                        icon: Info,
                        title: "Tout va bien",
                        text: "Vos indicateurs sont au vert ! Maintenez votre belle routine actuelle.",
                        color: "text-green-500"
                    });
                }

                setAdviceList(advice);
            } catch (e) {
                console.error("Error parsing checkin data", e);
            }
        }
    }, []);

    const handleContinue = () => {
        if (isOnboarding) {
            navigate("/setup-routine");
        } else {
            navigate("/dashboard");
        }
    };

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
                    <p className="text-muted-foreground text-sm">Merci {firstName}. <br></br> Vos conseils sont en cours de préparation.</p>
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

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

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
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Vos Conseils du Jour</h1>
                    <p className="text-muted-foreground text-sm">Basés sur vos réponses d'aujourd'hui</p>
                </div>

                <div className="space-y-4 flex-1">
                    {adviceList.map((advice, idx) => {
                        const Icon = advice.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 flex gap-4"
                            >
                                <div className="flex-shrink-0 pt-1">
                                    <Icon className={advice.color} size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{advice.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {advice.text}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* <div className="pt-6">
                    <button
                        onClick={handleContinue}
                        className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        Continuer <ChevronRight size={18} />
                    </button>
                </div> */}
            </motion.div>
        </div>
    );
};

export default CheckinAdvice;

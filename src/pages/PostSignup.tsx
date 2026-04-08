import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Calendar, Briefcase, Activity, Droplets } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const skinTypes = ["Mixte", "Normale", "Sèche", "Grasse", "Sensible"];
const skinProblemsList = ["Acné", "Rides", "Taches brunes", "Rougeurs", "Points noirs", "Eczéma", "Rosacée", "Teint terne", "Aucun"];
const professions = [
    "Étudiant(e)",
    "Domaine Médical",
    "Informatique / Tech",
    "Enseignement / Recherche",
    "Employé(e) / Bureau",
    "Cadre / Direction",
    "Artisan / Commerçant",
    "Indépendant(e) / Freelance",
    "Sans emploi",
    "Retraité(e)",
    "Autre"
];

const PostSignup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1
    const [age, setAge] = useState("");
    const [profession, setProfession] = useState("");

    // Step 2
    const [skinType, setSkinType] = useState("");
    const [skinProblems, setSkinProblems] = useState<string[]>([]);

    const toggleProblem = (problem: string) => {
        setSkinProblems(prev =>
            prev.includes(problem)
                ? prev.filter(p => p !== problem)
                : [...prev, problem]
        );
    };

    const handleNext = () => {
        setStep(2);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData?.session) throw new Error("Votre session est expirée.");

            // @ts-ignore
            const { error } = await supabase.from("profiles").update({
                age: age ? parseInt(age) : null,
                profession: profession || null,
                skin_type: skinType || null,
                skin_problems: skinProblems.length > 0 ? skinProblems : null,
            }).eq("id", sessionData.session.user.id);

            if (error) throw error;
            navigate("/checkin", { state: { isOnboarding: true } });
        } catch (error: any) {
            toast.error(error.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        if (step === 1) {
            setStep(2);
            setAge("");
            setProfession("");
        } else {
            handleFinish();
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            {/* Decorative Backgrounds */}
            <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-primary/20 rounded-full blur-[80px]" />

            <div className="flex-1 flex flex-col justify-center z-10 max-w-sm mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Mieux vous connaître</h1>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Ces informations (facultatives) sont récoltées uniquement à des fins statistiques pour nous aider à mieux comprendre les besoins de nos utilisateurs.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Âge</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input
                                            type="number"
                                            placeholder="Ex: 28"
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Catégorie socio-professionnelle</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <select
                                            className="w-full pl-11 py-3 h-[52px] bg-card rounded-2xl border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-sm appearance-none"
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                        >
                                            <option value="" disabled className="text-muted-foreground">Sélectionner une catégorie</option>
                                            {professions.map(prof => (
                                                <option key={prof} value={prof}>{prof}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleNext}
                                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    Suivant <ArrowRight size={18} />
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="w-full text-muted-foreground py-3 rounded-2xl font-medium text-sm hover:bg-muted/50 transition-colors"
                                >
                                    Passer cette étape
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre peau</h1>
                                <p className="text-muted-foreground text-sm">Dites-nous en plus sur les besoins spécifiques de votre peau (facultatif).</p>
                            </div>

                            <div className="space-y-6 flex-1 flex flex-col min-h-0">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Type de peau</label>
                                    <div className="relative">
                                        <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <select
                                            className="w-full pl-11 py-3 h-[52px] bg-card rounded-2xl border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-sm appearance-none"
                                            value={skinType}
                                            onChange={(e) => setSkinType(e.target.value)}
                                        >
                                            <option value="" disabled className="text-muted-foreground">Sélectionner votre type</option>
                                            {skinTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Problèmes rencontrés</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {skinProblemsList.map(problem => {
                                            const isSelected = skinProblems.includes(problem);
                                            return (
                                                <button
                                                    key={problem}
                                                    onClick={() => toggleProblem(problem)}
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isSelected
                                                        ? "bg-primary text-primary-foreground shadow-md"
                                                        : "bg-card text-foreground hover:bg-muted/80 border border-border"
                                                        }`}
                                                >
                                                    {problem}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? "Enregistrement..." : "Terminer"}
                                </button>
                                <button
                                    onClick={handleSkip}
                                    disabled={loading}
                                    className="w-full text-muted-foreground py-3 rounded-2xl font-medium text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                                >
                                    Passer
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PostSignup;

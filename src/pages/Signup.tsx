import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock, Sparkles, Shield, Info, ArrowRight, Lightbulb, Activity, Droplets, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import matrixData from "@/data/skincare_matrix.json";

const matrix = (matrixData as any).skincare_matrix;

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

const channels = ["Instagram", "LinkedIn", "TikTok", "Facebook", "Twitter/X", "Bouche à oreille", "Recherche Google", "Autre"];

const BASELINE_MAP: Record<string, string> = {
    "Légère": "moins", "Légères": "moins",
    "Modérée": "pareil", "Modérées": "pareil",
    "Forte": "plus", "Fortes": "plus",
};

const Signup = () => {
    const navigate = useNavigate();

    // Step 4: Identifiants
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Step 1: Socio-pro et Canaux
    const [profession, setProfession] = useState("");
    const [usedChannels, setUsedChannels] = useState<string[]>([]);
    const [otherChannel, setOtherChannel] = useState("");

    // Step 2: Âge et Sexe
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    // Step 3: Diagnostic peau + Objectifs
    const [skinType, setSkinType] = useState("");
    const [skinProblems, setSkinProblems] = useState<string[]>([]);
    const [skinGoals, setSkinGoals] = useState<string[]>([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizStep, setQuizStep] = useState(1);
    const [quizAnswers, setQuizAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });

    // Step 3.1: Skin State Baselines (Amira branch)
    const [acneBaseline, setAcneBaseline] = useState("");
    const [rednessBaseline, setRednessBaseline] = useState("");
    const [drynessBaseline, setDrynessBaseline] = useState("");

    const [step, setStep] = useState(1);
    const [showSkinState, setShowSkinState] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single();
                if (data) {
                    if (data.first_name) setFirstName(data.first_name);
                    if (data.last_name) setLastName(data.last_name);
                    if (data.profession) setProfession(data.profession);
                    if (data.used_channels) setUsedChannels(data.used_channels);
                    if (data.age) setAge(data.age.toString());
                    if (data.gender) setGender(data.gender);
                    if (data.skin_type) setSkinType(data.skin_type);
                    if (data.skin_problems) setSkinProblems(data.skin_problems);
                    if (data.skin_goals) setSkinGoals(data.skin_goals);

                    if (data.skin_goals && (data.skin_goals as any).length > 0) {
                        navigate("/dashboard");
                    }
                }
            }
        };
        checkSession();
    }, [navigate]);

    const toggleChannel = (ch: string) => {
        if (usedChannels.includes(ch)) {
            setUsedChannels(usedChannels.filter(c => c !== ch));
        } else {
            setUsedChannels([...usedChannels, ch]);
        }
    };

    const toggleProblem = (prob: string) => {
        if (skinProblems.includes(prob)) {
            setSkinProblems(skinProblems.filter(p => p !== prob));
        } else {
            setSkinProblems([...skinProblems, prob]);
        }
    };

    const toggleGoal = (goal: string) => {
        if (skinGoals.includes(goal)) {
            setSkinGoals(skinGoals.filter(g => g !== goal));
        } else {
            setSkinGoals([...skinGoals, goal]);
        }
    };

    const generateAdvice = () => {
        const advices: { title: string, content: string, iconStr: string }[] = [];

        // 1. Type Advice
        const typeInfo = matrix.types_de_peau.find((t: any) => t.type === skinType);
        if (typeInfo) {
            advices.push({
                title: `Peau ${skinType}`,
                content: `Votre priorité est de cibler : ${typeInfo.signal_prioritaire}. Privilégiez des actifs comme ${typeInfo.ingredients_a_privilegier.slice(0, 2).join(' ou ')}.`,
                iconStr: "🛡️"
            });
        }

        // 2. Intensity-based advice (The new matrix section)
        if (acneBaseline) {
            const acneInfo = matrix.intensite_sensibilites.acne.find((a: any) => a.niveau === acneBaseline);
            if (acneInfo) {
                let content = `${acneInfo.description}. Misez sur ${acneInfo.actifs_recommandes.slice(0, 2).join(' et ')}.`;
                if (acneInfo.regles_coherence?.si_type_peau_seche && skinType === "Sèche") {
                    content += ` Note : ${acneInfo.regles_coherence.si_type_peau_seche}`;
                }
                if (acneInfo.alerte) content += ` Important : ${acneInfo.alerte}`;
                advices.push({ title: `Acné ${acneBaseline}`, content, iconStr: "🩹" });
            }
        }

        if (rednessBaseline) {
            const rednessInfo = matrix.intensite_sensibilites.rougeurs.find((r: any) => r.niveau === rednessBaseline);
            if (rednessInfo) {
                let content = `${rednessInfo.description}. Incorporez ${rednessInfo.actifs_recommandes.slice(0, 2).join(' ou ')}.`;
                if (rednessInfo.alerte) content += ` Important : ${rednessInfo.alerte}`;
                advices.push({ title: `Rougeurs ${rednessBaseline}`, content, iconStr: "🌿" });
            }
        }

        if (drynessBaseline) {
            const drynessInfo = matrix.intensite_sensibilites.deshydratation.find((d: any) => d.niveau === drynessBaseline);
            if (drynessInfo) {
                let content = `${drynessInfo.description}. ${drynessInfo.routine_cle}.`;
                advices.push({ title: `Sécheresse ${drynessBaseline}`, content, iconStr: "💧" });
            }
        }

        // 3. Goals Advice
        skinGoals.forEach(goal => {
            const goalInfo = matrix.objectifs.find((o: any) => o.objectif === goal);
            if (goalInfo) {
                let content = `Pour votre objectif ${goal}, misez sur ${goalInfo.actifs_cles.slice(0, 2).join(' et ')}.`;
                if (goalInfo.regles.includes("SPF obligatoire")) {
                    content += " N'oubliez jamais votre protection SPF le matin pour protéger vos résultats.";
                }
                advices.push({
                    title: goal,
                    content,
                    iconStr: "✨"
                });
            }
        });

        // 4. Special Rules
        if (skinType === "Sensible" || skinProblems.includes("Eczéma")) {
            advices.push({
                title: "Précaution",
                content: "Votre peau étant réactive, effectuez toujours un patch test 24h avant d'introduire un nouvel actif.",
                iconStr: "🩺"
            });
        }

        return advices.slice(0, 4); // Show up to 4 advices
    };

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        // New logic: Step 3 -> Step 3.1 (Skin State)
        if (step === 3 && !showSkinState && !showPreview) {
            const hasAcne = skinProblems.includes("Acné") || skinProblems.includes("Points noirs") || skinType === "Acnéique";
            const hasRedness = skinProblems.includes("Rougeurs") || skinProblems.includes("Eczéma");
            const hasDryness = skinProblems.includes("Déshydratation") || skinType === "Sèche";

            if (hasAcne || hasRedness || hasDryness) {
                setShowSkinState(true);
                window.scrollTo(0, 0);
                return;
            } else {
                setShowPreview(true);
                window.scrollTo(0, 0);
                return;
            }
        }

        if (showSkinState) {
            setShowSkinState(false);
            setShowPreview(true);
            window.scrollTo(0, 0);
            return;
        }

        if (step === 3 && showPreview) {
            setStep(4);
            setShowPreview(false);
            window.scrollTo(0, 0);
            return;
        }

        if (step < 4) {
            setStep(step + 1);
            setShowPreview(false);
            setShowSkinState(false);
            window.scrollTo(0, 0);
            return;
        }

        // Step 4: Final Signup
        if (!firstName || !lastName || !email || !password) return;
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { first_name: firstName, last_name: lastName } }
            });

            if (authError) {
                toast.error(authError.message);
                setLoading(false);
                return;
            }

            const userId = authData.user?.id;
            if (!userId) {
                toast.error("Erreur lors de la création du compte.");
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split("T")[0];

            const { error: profileError } = await (supabase as any).from("profiles").upsert({
                id: userId,
                first_name: firstName,
                last_name: lastName,
                profession: profession || null,
                used_channels: usedChannels.length > 0 ? usedChannels.map(c => c === "Autre" ? `Autre: ${otherChannel}` : c) : null,
                age: age ? parseInt(age) : null,
                gender: gender || null,
                skin_type: skinType || null,
                skin_problems: skinProblems.length > 0 ? skinProblems : null,
                skin_goals: skinGoals.length > 0 ? skinGoals : null
            });

            // Save skin state baselines to symptom_tracking
            const baselinePromises = [
                acneBaseline && (supabase as any).from("symptom_tracking").upsert({ user_id: userId, date: today, symptom: "acné", trend: BASELINE_MAP[acneBaseline], period: "daily" }),
                rednessBaseline && (supabase as any).from("symptom_tracking").upsert({ user_id: userId, date: today, symptom: "rougeurs", trend: BASELINE_MAP[rednessBaseline], period: "daily" }),
                drynessBaseline && (supabase as any).from("symptom_tracking").upsert({ user_id: userId, date: today, symptom: "sécheresse", trend: BASELINE_MAP[drynessBaseline], period: "daily" }),
            ].filter(Boolean);

            await Promise.all(baselinePromises);

            if (profileError) {
                console.error("Profile update error:", profileError);
                toast.error("Profil créé mais erreur lors de la sauvegarde des réponses.");
            }

            setLoading(false);
            localStorage.removeItem("guestProfile");
            navigate("/dashboard", { state: { isOnboarding: true, firstName } });
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("Une erreur est survenue lors de l'inscription.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                        if (showPreview) {
                            if (acneBaseline || rednessBaseline || drynessBaseline) setShowSkinState(true);
                            else setShowPreview(false);
                        }
                        else if (showSkinState) setShowSkinState(false);
                        else if (step > 1) setStep(step - 1);
                        else navigate("/onboarding");
                    }}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-border/60 bg-white/50 hover:bg-white transition-all shadow-sm"
                >
                    <ArrowLeft size={18} strokeWidth={1.5} className="text-foreground" />
                </motion.button>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] bg-white/40 px-5 py-2.5 rounded-full border border-border/40 backdrop-blur-sm">
                    {showPreview ? "Aperçu Lab" : showSkinState ? "État Actuel" : `Étape ${step} / 4`}
                </div>
            </div>

            <motion.div
                key={showPreview ? "preview" : showSkinState ? "skin-state" : step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                {showPreview ? (
                    <div className="space-y-8 h-full flex flex-col">
                        <div className="mb-6">
                            <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Analyse Préliminaire</h1>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Basé sur vos réponses</p>
                        </div>

                        <div className="space-y-4 flex-1 relative">
                            {generateAdvice().map((advice, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + idx * 0.05 }}
                                    className="flex flex-col gap-4 p-8 premium-card border-none bg-white/60 group transition-all hover:bg-white/40"
                                >
                                    <div className="flex gap-6">
                                        <span className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">{advice.iconStr}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-display text-xl text-foreground italic">{advice.title}</h3>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                            </div>
                                            <p className="text-[13px] text-foreground/80 leading-relaxed italic">{advice.content}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-10 pointer-events-none" />
                            
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 p-8 rounded-[32px] bg-primary/5 border border-primary/10 relative overflow-hidden backdrop-blur-sm z-20"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <Lock size={16} className="text-primary/30" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="bg-white rounded-full p-2 text-primary shadow-sm h-fit shrink-0"><Lightbulb size={16} strokeWidth={2.5} /></div>
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Optimisation Lab</h3>
                                        <p className="text-[12px] text-foreground/70 leading-relaxed italic">
                                            Débloquez <span className="text-primary font-bold">12 analyses supplémentaires</span> incluant votre cycle hormonal et l'impact de la météo en temps réel après l'inscription.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-30">
                            <button
                                onClick={handleNext}
                                className="w-full h-16 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                CONTINUER <ArrowRight size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ) : showSkinState ? (
                    <div className="space-y-8 h-full flex flex-col">
                        <div className="mb-6">
                            <h1 className="text-4xl font-display text-foreground leading-tight mb-3">État actuel</h1>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Votre point de départ aujourd'hui</p>
                        </div>

                        <div className="space-y-10 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                            {(skinProblems.includes("Acné") || skinProblems.includes("Points noirs") || skinType === "Acnéique") && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-4">
                                        <Activity size={14} className="text-primary/60" />
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Intensité de l'acné</label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Légère", "Modérée", "Forte"].map(lvl => (
                                            <button key={lvl} onClick={() => setAcneBaseline(lvl)}
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${acneBaseline === lvl ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(skinProblems.includes("Rougeurs") || skinProblems.includes("Eczéma")) && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-4">
                                        <Flame size={14} className="text-primary/60" />
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Intensité des rougeurs</label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Légères", "Modérées", "Fortes"].map(lvl => (
                                            <button key={lvl} onClick={() => setRednessBaseline(lvl)}
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${rednessBaseline === lvl ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(skinProblems.includes("Déshydratation") || skinType === "Sèche") && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-4">
                                        <Droplets size={14} className="text-primary/60" />
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Niveau de sécheresse</label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Légère", "Modérée", "Forte"].map(lvl => (
                                            <button key={lvl} onClick={() => setDrynessBaseline(lvl)}
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${drynessBaseline === lvl ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-30">
                            <button
                                onClick={handleNext}
                                className="w-full h-16 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                CONTINUER <ArrowRight size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleNext} className="space-y-6 h-full flex flex-col">
                        {step === 1 && (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Socio-professsionnel</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">(Optionnel) Données statistiques</p>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-4 relative">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Catégorie professionnelle</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <select
                                                className="w-full pl-12 h-14 bg-white border border-border/60 rounded-full focus:outline-none focus:border-primary text-xs font-bold tracking-tight appearance-none transition-all shadow-sm"
                                                value={profession}
                                                onChange={(e) => setProfession(e.target.value)}
                                            >
                                                <option value="">Sélectionner (optionnel)</option>
                                                {professions.map(prof => (
                                                    <option key={prof} value={prof}>{prof}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Canaux de découverte</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {channels.map(ch => (
                                                <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${usedChannels.includes(ch) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {ch}
                                                </button>
                                            ))}
                                        </div>
                                        <AnimatePresence>
                                            {usedChannels.includes("Autre") && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 overflow-hidden">
                                                    <Input
                                                        type="text"
                                                        placeholder="Veuillez préciser..."
                                                        value={otherChannel}
                                                        onChange={(e) => setOtherChannel(e.target.value)}
                                                        className="h-14"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Profil physique</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Personnalisation de l'analyse</p>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-4 relative">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Âge</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input type="number" placeholder="ex: 28" min="10" max="120"
                                                className="pl-12"
                                                value={age} onChange={(e) => setAge(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Sexe</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["Femme", "Homme", "Autre"].map(g => (
                                                <button type="button" key={g} onClick={() => setGender(g)}
                                                    className={`py-4 px-2 border rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${gender === g ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Diagnostic & Objectifs</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identification et priorités</p>
                                </div>
                                <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Type de peau</label>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                                                <button type="button" key={type} onClick={() => { setSkinType(type); setQuizStarted(false); }}
                                                    className={`py-5 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinType === type && !quizStarted ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <button type="button" onClick={() => { setQuizStarted(!quizStarted); setSkinType(""); setQuizStep(1); }}
                                            className={`w-full py-4 px-4 border rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${quizStarted ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-white text-primary border-primary hover:bg-primary/5'}`}>
                                            Diagnostic assisté
                                        </button>

                                        <AnimatePresence>
                                            {quizStarted && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="premium-card p-6 mt-6 overflow-hidden bg-white/40 border-primary/10">
                                                    {quizStep === 1 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">1. Réaction après nettoyage</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Elle tiraille et est inconfortable", val: "Sèche" },
                                                                    { label: "Elle brille sur tout le visage", val: "Grasse" },
                                                                    { label: "Seulement la zone T brille", val: "Mixte" },
                                                                    { label: "Elle est confortable et équilibrée", val: "Normale" },
                                                                    { label: "Elle est rouge ou chauffe", val: "Sensible" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q1: opt.val }); setQuizStep(2); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 2 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">2. Apparence des pores</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Presque invisibles", val: "Sèche" },
                                                                    { label: "Larges sur tout le visage", val: "Grasse" },
                                                                    { label: "Visibles uniquement sur le nez", val: "Mixte" },
                                                                    { label: "Petits mais réguliers", val: "Normale" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q2: opt.val }); setQuizStep(3); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 3 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">3. Fréquence des imperfections</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Rarement ou jamais", val: "Sèche" },
                                                                    { label: "Très souvent (points noirs, boutons)", val: "Grasse" },
                                                                    { label: "Localisées sur le front ou le nez", val: "Mixte" },
                                                                    { label: "Ma peau réagit aux produits", val: "Sensible" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q3: opt.val }); setQuizStep(4); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 4 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">4. Texture au toucher</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Rugueuse ou squameuse", val: "Sèche" },
                                                                    { label: "Épaisse et souvent huileuse", val: "Grasse" },
                                                                    { label: "Variable (grasse et sèche)", val: "Mixte" },
                                                                    { label: "Lisse, douce et souple", val: "Normale" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => {
                                                                        const finalAnswers = { ...quizAnswers, q4: opt.val };
                                                                        setQuizAnswers(finalAnswers);
                                                                        const scores = { Sèche: 0, Grasse: 0, Mixte: 0, Normale: 0, Sensible: 0 };
                                                                        if (finalAnswers.q1 === "Sèche") scores.Sèche += 2;
                                                                        if (finalAnswers.q1 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q1 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q1 === "Normale") scores.Normale += 2;
                                                                        if (finalAnswers.q1 === "Sensible") scores.Sensible += 2;
                                                                        if (finalAnswers.q2 === "Sèche") { scores.Sèche += 1; scores.Normale += 1; }
                                                                        if (finalAnswers.q2 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q2 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q2 === "Normale") scores.Normale += 2;
                                                                        if (finalAnswers.q3 === "Sèche") { scores.Sèche += 1; scores.Normale += 1; }
                                                                        if (finalAnswers.q3 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q3 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q3 === "Sensible") scores.Sensible += 2;
                                                                        if (finalAnswers.q4 === "Sèche") scores.Sèche += 2;
                                                                        if (finalAnswers.q4 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q4 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q4 === "Normale") scores.Normale += 2;
                                                                        let winner = "Normale";
                                                                        let maxScore = -1;
                                                                        Object.entries(scores).forEach(([type, score]) => {
                                                                            if (score > maxScore) {
                                                                                maxScore = score;
                                                                                winner = type;
                                                                            }
                                                                        });
                                                                        setSkinType(winner);
                                                                        setQuizStep(5);
                                                                    }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 5 && (
                                                        <div className="space-y-6 text-center py-4">
                                                            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                                                <CheckCircle2 size={40} strokeWidth={1.5} />
                                                            </div>
                                                            <h3 className="text-xl font-display text-foreground leading-tight">Analyse terminée</h3>
                                                            <div className="p-6 rounded-3xl bg-white border border-primary/10 premium-shadow">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Type détecté</p>
                                                                <p className="text-2xl font-display text-primary">{skinType}</p>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground leading-relaxed italic px-4">
                                                                Votre peau semble être de type {skinType}.
                                                                Validez pour enregistrer.
                                                            </p>
                                                            <div className="flex flex-col gap-4 mt-8">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuizStarted(false)}
                                                                    className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow"
                                                                >
                                                                    Valider
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuizStep(1)}
                                                                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                                                >
                                                                    Recommencer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Sensibilités prioritaires</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"].map(prob => (
                                                <button type="button" key={prob} onClick={() => toggleProblem(prob)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {prob}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Objectifs & Priorités</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                                                <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {goal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-20 flex flex-col gap-4">
                            {step === 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step + 1)}
                                    className="w-full text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                >
                                    Passer cette étape
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={
                                    (loading) ||
                                    (step === 1 && usedChannels.includes('Autre') && !otherChannel) ||
                                    (step === 2 && (!age || !gender)) ||
                                    (step === 3 && (!skinType || skinGoals.length === 0)) ||
                                    (step === 4 && (!firstName || !lastName || !email || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)))
                                }
                                className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? "ENREGISTREMENT..." : step === 4 ? "TERMINER" : "SUIVANT"} <ChevronRight size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default Signup;

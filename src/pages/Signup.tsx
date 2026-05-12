import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock, Sparkles, Shield, Info, ArrowRight, Lightbulb, Activity, Droplets, Flame, Check, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

    // Pricing Step State
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

    const [step, setStep] = useState(1);
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);

    const PLANS = {
        monthly: { id: "monthly_plan", price: "4,99€", period: "/mois", subtext: "Facturé mensuellement" },
        yearly: { id: "yearly_plan", price: "2,99€", period: "/mois", subtext: "35,99€ facturés une fois par an", badge: "-40%" }
    };

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

        // 2. Goals Advice
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

        // 3. Special Rules
        if (skinType === "Sensible" || skinProblems.includes("Eczéma")) {
            advices.push({
                title: "Précaution",
                content: "Votre peau étant réactive, effectuez toujours un patch test 24h avant d'introduire un nouvel actif.",
                iconStr: "🩺"
            });
        }

        return advices.slice(0, 4); // Show up to 4 advices
    };

    const BackButton = () => (
        <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
                e.preventDefault();
                if (showPreview) setShowPreview(false);
                else if (step === 6) setStep(5);
                else if (step === 5) setStep(4);
                else if (step === 4) setShowPreview(true);
                else if (step > 1) setStep(step - 1);
                else navigate("/onboarding");
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-border/40 bg-white/50 hover:bg-white transition-all shadow-sm shrink-0 mt-1"
        >
            <ArrowLeft size={16} strokeWidth={1.5} className="text-foreground" />
        </motion.button>
    );

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

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 3 && !showPreview) {
            setShowPreview(true);
            window.scrollTo(0, 0);
            return;
        }

        if (showPreview) {
            setShowPreview(false);
            setStep(4);
            window.scrollTo(0, 0);
            return;
        }

        if (step < 6) { // Account creation is now step 6
            setStep(step + 1);
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

            const baselinePromises: any[] = [];

            await Promise.all(baselinePromises);

            if (profileError) {
                console.error("Profile update error:", profileError);
                toast.error("Profil créé mais erreur lors de la sauvegarde des réponses.");
            }

            setLoading(false);
            localStorage.removeItem("guestProfile");
            navigate("/dashboard");
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("Une erreur est survenue lors de l'inscription.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <motion.div
                key={showPreview ? "preview" : step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                {showPreview ? (
                    <div className="space-y-8 h-full flex flex-col">
                        <div className="mb-6 flex items-start gap-4">
                            <BackButton />
                            <div>
                                <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Analyse Préliminaire</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Basé sur vos réponses</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 relative overflow-y-auto custom-scrollbar pr-1">
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
                                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Accédez à une analyse complète</h3>
                                        <p className="text-[12px] text-foreground/70 leading-relaxed italic">
                                            Accédez à une <span className="text-primary font-bold">analyse complète</span>. Débloquez des conseils ultra-personnalisés incluant l'impact de votre cycle, la météo et votre routine après l'inscription.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-30">
                            <button
                                type="button"
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
                            <div className="mb-10 flex items-start gap-4">
                                <BackButton />
                                <div>
                                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Socio-professsionnel</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">(Optionnel) Données statistiques</p>
                                </div>
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
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${usedChannels.includes(ch) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
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
                                                className={`py-4 px-2 border rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${gender === g ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
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
                            <div className="mb-10 flex items-start gap-4">
                                <BackButton />
                                <div>
                                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Diagnostic & Objectifs</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identification et priorités</p>
                                </div>
                            </div>
                            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                <div className="space-y-6">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Type de peau</label>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                                            <button type="button" key={type} onClick={() => { setSkinType(type); setQuizStarted(false); }}
                                                className={`py-5 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinType === type && !quizStarted ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
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
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
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
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 h-full flex flex-col">
                            <div className="mb-6 flex items-start gap-4">
                                <BackButton />
                                <div>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-4">VOTRE ACCÈS PREMIUM ✦</p>
                                    <h1 className="text-2xl font-display text-foreground leading-tight italic">Prenez soin de vous, sans limites</h1>
                                </div>
                            </div>

                            <div className="flex-1 space-y-12 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                <Card className="premium-card aspect-video flex items-center justify-center bg-card/20 border-none shadow-none mt-2 overflow-hidden">
                                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Sparkles size={48} strokeWidth={1} />
                                    </div>
                                </Card>

                                <div className="space-y-6">
                                    {[
                                        { icon: <Shield size={18} strokeWidth={1.5} />, label: "Analyse illimitée", desc: "Diagnostics complets chaque jour." },
                                        { icon: <Clock size={18} strokeWidth={1.5} />, label: "Suivi historique", desc: "Visualisez l'évolution sur le long terme." },
                                        { icon: <Sparkles size={18} strokeWidth={1.5} />, label: "Conseils exclusifs", desc: "Accès à toute la matrice scientifique." },
                                    ].map((benefit, idx) => (
                                        <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }} className="flex gap-4 items-center">
                                            <div className="text-primary p-2 bg-primary/5 rounded-full shrink-0">{benefit.icon}</div>
                                            <div>
                                                <p className="text-[13px] font-bold text-foreground uppercase tracking-tight">{benefit.label}</p>
                                                <p className="text-[12px] text-muted-foreground italic leading-tight">{benefit.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="pt-8">
                                    <button
                                        type="submit"
                                        className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                    >
                                        CONTINUER <ChevronRight size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-8 h-full flex flex-col">
                            <div className="mb-4 flex items-center gap-4">
                                <BackButton />
                                <h2 className="text-2xl font-display text-foreground italic">Choisissez votre abonnement</h2>
                            </div>

                            {/* Segmented Control */}
                            <div className="bg-muted/20 p-1.5 rounded-full flex mb-8 relative border border-border/40">
                                <motion.div
                                    className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
                                    animate={{ x: selectedPlan === 'yearly' ? '100%' : '0%' }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                                <button type="button" onClick={() => setSelectedPlan("monthly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Mensuel</button>
                                <button type="button" onClick={() => setSelectedPlan("yearly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${selectedPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                                    Annuel
                                    <Badge className="absolute -top-3 -right-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">{PLANS.yearly.badge}</Badge>
                                </button>
                            </div>

                            {/* Price Display */}
                            <motion.div layout className="bg-primary/5 p-8 rounded-[40px] border border-primary/10 text-center mb-6 relative overflow-hidden shadow-sm">
                                <AnimatePresence mode="wait">
                                    <motion.div key={selectedPlan} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                                        {selectedPlan === 'yearly' && (
                                            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-2 shadow-sm">
                                                <span>-40%</span>
                                                <span className="w-1 h-1 bg-white/40 rounded-full" />
                                                <span>Offre de lancement</span>
                                            </div>
                                        )}
                                        <div className="flex items-baseline justify-center gap-2">
                                            <span className="text-5xl font-display text-foreground italic leading-none">{PLANS[selectedPlan].price}</span>
                                            <span className="text-xl text-muted-foreground italic">{PLANS[selectedPlan].period}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[13px] text-muted-foreground italic tracking-tight leading-relaxed font-medium">{PLANS[selectedPlan].subtext}</p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>

                            <div className="space-y-4 mb-8">
                                {["Accès illimité", "Sans engagement", "Aucun débit maintenant"].map((text, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Check size={12} strokeWidth={3} /></div>
                                        <span className="text-[13px] font-medium text-foreground italic">{text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    SOUSCRIRE À L'OFFRE
                                </Button>
                                <button
                                    type="submit"
                                    className="w-full text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-center hover:text-primary transition-colors py-2"
                                >
                                    Continuer gratuitement
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <>
                            <div className="mb-10 flex items-start gap-4">
                                <BackButton />
                                <div>
                                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Identifiants</h1>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Dernière étape : créer votre compte</p>
                                </div>
                            </div>
                            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Prénom</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-12" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Nom</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-12" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12" />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12" />
                                    </div>
                                    <div className="px-4 space-y-2">
                                        <p className={`text-[9px] flex items-center gap-2 ${password.length >= 8 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                            <CheckCircle2 size={10} /> 8 caractères minimum
                                        </p>
                                        <p className={`text-[9px] flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                            <CheckCircle2 size={10} /> Une majuscule
                                        </p>
                                        <p className={`text-[9px] flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                            <CheckCircle2 size={10} /> Un chiffre
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-10 flex items-start gap-4 px-4 bg-muted/15 rounded-[32px] p-6 border border-border/20">
                                    <Shield className="text-primary shrink-0" size={20} />
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        Vos données sont sécurisées et conformes au RGPD. Nous ne partageons jamais vos informations personnelles.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {step !== 4 && step !== 5 && (
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
                                    (step === 3 && !showPreview && (!skinType || skinGoals.length === 0)) ||
                                    (step === 6 && (!firstName || !lastName || !email || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)))
                                }
                                className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? "ENREGISTREMENT..." : step === 6 ? "TERMINER" : "SUIVANT"} <ChevronRight size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </form>
            )}
        </motion.div>
    </div>
    );
};

export default Signup;

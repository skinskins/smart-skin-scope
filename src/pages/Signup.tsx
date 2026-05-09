import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const Signup = () => {
    const navigate = useNavigate();

    // Step 1: Identifiants
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Step 2: Socio-pro et Canaux
    const [profession, setProfession] = useState("");
    const [usedChannels, setUsedChannels] = useState<string[]>([]);

    // Step 3: Âge et Sexe
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    // Step 4: Type de peau et problemes
    const [skinType, setSkinType] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const [skinProblems, setSkinProblems] = useState<string[]>([]);
    const [skinGoals, setSkinGoals] = useState<string[]>([]);
    const [otherChannel, setOtherChannel] = useState("");
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizStep, setQuizStep] = useState(1);
    const [quizAnswers, setQuizAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });

    const [step, setStep] = useState(1);
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
                    } else if (data.skin_type) {
                        setStep(5);
                    } else if (data.age) {
                        setStep(4);
                    } else if (data.profession) {
                        setStep(3);
                    } else {
                        setStep(2);
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

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1) {
            if (!firstName || !lastName || !email || !password) return;
            setLoading(true);
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { first_name: firstName, last_name: lastName } }
            });
            setLoading(false);
            if (authError) {
                toast.error(authError.message);
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Step 2 is now optional
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // @ts-ignore
                await supabase.from("profiles").upsert({
                    id: session.user.id,
                    profession: profession || null,
                    used_channels: usedChannels.length > 0 ? usedChannels.map(c => c === "Autre" ? `Autre: ${otherChannel}` : c) : null
                });
            }
            setLoading(false);
            setStep(3);
        } else if (step === 3) {
            if (!age || !gender) return;
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // @ts-ignore
                await supabase.from("profiles").upsert({
                    id: session.user.id,
                    age: parseInt(age),
                    gender
                });
            }
            setLoading(false);
            setStep(4);
        } else if (step === 4) {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // @ts-ignore
                await supabase.from("profiles").upsert({
                    id: session.user.id,
                    skin_type: skinType,
                    skin_problems: skinProblems
                });
            }
            setLoading(false);
            setStep(5);
        } else if (step === 5) {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // @ts-ignore
                await (supabase as any).from("profiles").upsert({
                    id: session.user.id,
                    skin_goals: skinGoals
                });
            }
            setLoading(false);
            localStorage.removeItem("guestProfile");
            navigate("/dashboard", { state: { isOnboarding: true, firstName } });
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
                        if (step > 1) setStep(step - 1);
                        else navigate("/onboarding");
                    }}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-border/60 bg-white/50 hover:bg-white transition-all shadow-sm"
                >
                    <ArrowLeft size={18} strokeWidth={1.5} className="text-foreground" />
                </motion.button>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] bg-white/40 px-5 py-2.5 rounded-full border border-border/40 backdrop-blur-sm">
                    Étape {step} / 5
                </div>
            </div>

            <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                <form onSubmit={handleNext} className="space-y-6 h-full flex flex-col">
                    {step === 1 && (
                        <>
                            <div className="mb-10">
                                <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Inscription</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Créez votre profil biologique</p>
                            </div>
                            <div className="space-y-6 flex-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="text" placeholder="John" required
                                            className="pl-12"
                                            value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Nom</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="text" placeholder="Doe" required
                                            className="pl-12"
                                            value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="email" placeholder="email@example.com" required
                                            className="pl-12"
                                            value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                        <Input type="password" placeholder="••••••••" required
                                            className="pl-12"
                                            value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="px-4 space-y-2.5 mt-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${password.length >= 8 ? 'text-primary' : 'text-muted-foreground/40'}`}>8 caractères min.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${/[A-Z]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>Une majuscule</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${/[0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>Un chiffre</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-border/40">
                                <p className="text-[9px] font-bold text-muted-foreground text-center leading-relaxed tracking-widest uppercase opacity-60 px-4">
                                    En créant un compte, vous acceptez notre{" "}
                                    <button type="button" onClick={() => navigate("/rgpd")} className="text-primary hover:opacity-70 transition-all underline underline-offset-4">politique de confidentialité</button>
                                </p>
                            </div>
                            <div className="pt-6 text-center">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Déjà un compte ?{" "}
                                    <button type="button" onClick={() => navigate("/login")} className="text-primary border-b border-primary/20 ml-2 hover:border-primary transition-all">
                                        Se connecter
                                    </button>
                                </p>
                            </div>
                        </>
                    )}

                    {step === 2 && (
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

                    {step === 3 && (
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

                    {step === 4 && (
                        <>
                            <div className="mb-10">
                                <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Diagnostic peau</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identification du type cutané</p>
                            </div>
                            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar">
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
                            </div>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <div className="mb-10">
                                <h1 className="text-4xl font-display text-foreground leading-tight mb-3">Objectifs</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Quels sont vos objectifs ?</p>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                                        <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                            className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                            {goal}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-20 flex flex-col gap-4">
                        {step === 2 && (
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
                                (step === 1 && (!firstName || !lastName || !email || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))) ||
                                (step === 2 && usedChannels.includes('Autre') && !otherChannel) ||
                                (step === 3 && (!age || !gender)) ||
                                (step === 4 && !skinType) ||
                                (step === 5 && skinGoals.length === 0)
                            }
                            className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? "ENREGISTREMENT..." : step === 5 ? "TERMINER" : "SUIVANT"} <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;

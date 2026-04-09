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
                const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
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
                        navigate("/checkin-advice");
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
                await supabase.from("profiles").upsert({
                    id: session.user.id,
                    skin_goals: skinGoals
                });
            }
            setLoading(false);
            localStorage.removeItem("guestProfile");
            navigate("/checkin-advice", { state: { isOnboarding: true, firstName } });
        }
    };


    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                        if (step > 1) setStep(step - 1);
                        else navigate("/onboarding");
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full"
                >
                    <ArrowLeft size={20} className="text-foreground" />
                </motion.button>
                <div className="text-sm font-semibold text-muted-foreground bg-muted pt-1 pb-1 px-3 rounded-full">
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
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Faisons connaissance</h1>
                                <p className="text-muted-foreground text-sm">Renseignez vos identifiants pour commencer.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="text" placeholder="Votre prénom" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nom de famille</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="text" placeholder="Votre nom" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="email" placeholder="vous@email.com" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="password" placeholder="••••••••" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="px-1 space-y-1">
                                        <p className={`text-[10px] flex items-center gap-1 ${password.length >= 8 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                            {password.length >= 8 ? <CheckCircle2 size={10} /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                                            8 caractères minimum
                                        </p>
                                        <p className={`text-[10px] flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                            {/[A-Z]/.test(password) ? <CheckCircle2 size={10} /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                                            Une majuscule
                                        </p>
                                        <p className={`text-[10px] flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                            {/[0-9]/.test(password) ? <CheckCircle2 size={10} /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                                            Un chiffre
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-border/50">
                                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                                    En créant un compte, vous acceptez notre{" "}
                                    <button type="button" onClick={() => navigate("/rgpd")} className="underline hover:text-primary">politique de confidentialité</button>.
                                    Vos données sont protégées et peuvent être supprimées à tout moment sur simple demande <a href="mailto:nacre_care@gmail.com" className="font-bold hover:text-primary">nacre_care@gmail.com</a>.
                                </p>
                            </div>
                            <div className="pt-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                    Déjà un compte ?{" "}
                                    <button type="button" onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
                                        Se connecter
                                    </button>
                                </p>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre Profil Professionnel <span className="text-sm font-normal text-muted-foreground">(Optionnel)</span></h1>
                                <p className="text-muted-foreground text-sm">Ces informations sont récoltées uniquement à des fins informatives pour nous aider à mieux vous comprendre.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Catégorie socio-professionnelle</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <select
                                            className="w-full pl-11 py-3 h-[52px] bg-card rounded-2xl border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-sm appearance-none"
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                        >
                                            <option value="" className="text-muted-foreground">Sélectionner une catégorie (Optionnel)</option>
                                            {professions.map(prof => (
                                                <option key={prof} value={prof}>{prof}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                                        <Share2 size={16} /> Quels canaux (réseaux sociaux, etc.) utilisez-vous ?
                                    </label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {channels.map(ch => (
                                            <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                                                className={`py-2 px-4 rounded-full text-xs font-semibold transition-all border ${usedChannels.includes(ch) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {ch}
                                            </button>
                                        ))}
                                    </div>
                                    <AnimatePresence>
                                        {usedChannels.includes("Autre") && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                                                <Input
                                                    type="text"
                                                    placeholder="Veuillez préciser..."
                                                    value={otherChannel}
                                                    onChange={(e) => setOtherChannel(e.target.value)}
                                                    className="bg-card rounded-xl border-border/50 focus-visible:ring-primary/30"
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
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">À propos de vous</h1>
                                <p className="text-muted-foreground text-sm">Ces informations aident à personnaliser vos conseils santé.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Âge</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="number" placeholder="Ex: 28" min="10" max="120"
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={age} onChange={(e) => setAge(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Sexe</label>
                                    <div className="flex gap-2">
                                        {["Femme", "Homme", "Autre"].map(g => (
                                            <button type="button" key={g} onClick={() => setGender(g)}
                                                className={`flex-1 py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${gender === g ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
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
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre Peau</h1>
                                <p className="text-muted-foreground text-sm">Sélectionnez le type qui vous correspond le plus.</p>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold text-foreground">Type de Peau</label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                                            <button type="button" key={type} onClick={() => { setSkinType(type); setQuizStarted(false); }}
                                                className={`py-6 px-2 rounded-2xl text-sm font-semibold transition-all border ${skinType === type && !quizStarted ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => { setQuizStarted(!quizStarted); setSkinType(""); setQuizStep(1); }}
                                        className={`w-full py-4 px-4 rounded-2xl text-sm font-semibold transition-all border mb-6 ${quizStarted ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                        🤷‍♀️ Je ne sais pas, aidez-moi
                                    </button>

                                    <AnimatePresence>
                                        {quizStarted && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/5 p-5 rounded-2xl border border-primary/20 mb-6 overflow-hidden">
                                                {quizStep === 1 && (
                                                    <div className="space-y-4">
                                                        <p className="font-semibold text-sm text-foreground">1. Comment réagit votre peau quelques heures après le nettoyage ?</p>
                                                        <div className="flex flex-col gap-2">
                                                            {[
                                                                { label: "Elle tiraille et manque de confort", val: "Sèche" },
                                                                { label: "Elle brille sur tout le visage", val: "Grasse" },
                                                                { label: "Elle brille au milieu (front, nez, menton)", val: "Mixte" },
                                                                { label: "Elle reste confortable et normale", val: "Normale" }
                                                            ].map(opt => (
                                                                <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q1: opt.val }); setQuizStep(2); }}
                                                                    className="text-left py-3 px-4 rounded-xl text-xs font-medium bg-background border border-border/50 hover:border-primary transition-colors text-foreground">
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {quizStep === 2 && (
                                                    <div className="space-y-4">
                                                        <p className="font-semibold text-sm text-foreground">2. Comment décririez-vous vos pores ?</p>
                                                        <div className="flex flex-col gap-2">
                                                            {[
                                                                { label: "Invisibles ou presque à l'œil nu", val: "Sèche" },
                                                                { label: "Bien visibles sur tout le visage", val: "Grasse" },
                                                                { label: "Visibles surtout sur le nez et le front", val: "Mixte" },
                                                                { label: "Normaux, peu visibles", val: "Normale" }
                                                            ].map(opt => (
                                                                <button type="button" key={opt.label} onClick={() => { setQuizAnswers({ ...quizAnswers, q2: opt.val }); setQuizStep(3); }}
                                                                    className="text-left py-3 px-4 rounded-xl text-xs font-medium bg-background border border-border/50 hover:border-primary transition-colors text-foreground">
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {quizStep === 3 && (
                                                    <div className="space-y-4">
                                                        <p className="font-semibold text-sm text-foreground">3. À quelle fréquence avez-vous des boutons ou imperfections ?</p>
                                                        <div className="flex flex-col gap-2">
                                                            {[
                                                                { label: "Très souvent", val: "Grasse" },
                                                                { label: "Parfois (règles, stress, zone T)", val: "Mixte" },
                                                                { label: "Rarement ou jamais", val: "Normale" },
                                                                { label: "Jamais, ma peau est plutôt rêche", val: "Sèche" }
                                                            ].map(opt => (
                                                                <button type="button" key={opt.label} onClick={() => { setQuizAnswers({ ...quizAnswers, q3: opt.val }); setQuizStep(4); }}
                                                                    className="text-left py-3 px-4 rounded-xl text-xs font-medium bg-background border border-border/50 hover:border-primary transition-colors text-foreground">
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {quizStep === 4 && (
                                                    <div className="space-y-4">
                                                        <p className="font-semibold text-sm text-foreground">4. Votre peau rougit-elle facilement ou réagit-elle fortement (produits, température) ?</p>
                                                        <div className="flex flex-col gap-2">
                                                            {["Oui, très souvent", "Non, rarement"].map(val => (
                                                                <button type="button" key={val} onClick={() => {
                                                                    const finalAnsw = { ...quizAnswers, q4: val };
                                                                    let type = "Normale";
                                                                    if (finalAnsw.q4 === "Oui, très souvent") {
                                                                        type = "Sensible";
                                                                    } else {
                                                                        const counts: Record<string, number> = { Sèche: 0, Grasse: 0, Mixte: 0, Normale: 0 };
                                                                        counts[finalAnsw.q1] += 2;
                                                                        counts[finalAnsw.q2] += 1;
                                                                        counts[finalAnsw.q3] += 1;
                                                                        type = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                                                                    }

                                                                    setSkinType(type);
                                                                    setQuizStarted(false);
                                                                    setQuizStep(1);
                                                                    setQuizAnswers({ q1: "", q2: "", q3: "", q4: "" });
                                                                    toast.success(`Diagnostic : Votre type de peau est ${type} !`, { duration: 5000 });
                                                                }}
                                                                    className="text-left py-3 px-4 rounded-xl text-xs font-medium bg-background border border-border/50 hover:border-primary transition-colors text-foreground">
                                                                    {val}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        Problèmes rencontrés
                                    </label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {["Acné", "Rougeurs", "Taches brunes", "Points noirs", "Déshydratation", "Rides fixes", "Cernes / Poches", "Eczéma", "Rosacée", "Sensibilité extrême"].map(prob => (
                                            <button type="button" key={prob} onClick={() => toggleProblem(prob)}
                                                className={`py-2 px-4 rounded-full text-xs font-semibold transition-all border ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
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
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Vos Objectifs</h1>
                                <p className="text-muted-foreground text-sm">Sélectionnez ce que vous souhaitez améliorer.</p>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Réduire les taches", "Resserrer les pores", "Anti-cernes"].map(goal => (
                                        <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                            className={`py-3 px-5 rounded-full text-sm font-semibold transition-all border ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                            {goal}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="w-full text-center mb-4 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-2 uppercase tracking-widest"
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
                            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {loading ? "Enregistrement..." : step === 5 ? "Terminer" : "Suivant"} <ChevronRight size={18} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;

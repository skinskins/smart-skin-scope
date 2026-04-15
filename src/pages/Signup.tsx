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
                await (supabase as any).from("profiles").upsert({
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
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                        if (step > 1) setStep(step - 1);
                        else navigate("/onboarding");
                    }}
                    className="w-10 h-10 flex items-center justify-center border border-[#111111]"
                >
                    <ArrowLeft size={18} className="text-[#111111]" />
                </motion.button>
                <div className="text-[10px] font-mono font-bold text-[#111111] uppercase tracking-[0.2em] border border-[#111111] py-2 px-4">
                    STEP {step} / 5
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
                            <div className="mb-12">
                                <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">IDENTIFICATION</h1>
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">Création du profil patient</p>
                            </div>
                            <div className="space-y-6 flex-1">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <Input type="text" placeholder="PRÉNOM" required
                                            className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                            value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Nom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <Input type="text" placeholder="NOM" required
                                            className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                            value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <Input type="email" placeholder="EMAIL@EXAMPLE.COM" required
                                            className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                            value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <Input type="password" placeholder="••••••••" required
                                            className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                            value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="px-1 space-y-2">
                                        <p className={`text-[10px] font-mono font-bold flex items-center gap-2 uppercase tracking-tight ${password.length >= 8 ? 'text-[#111111]' : 'text-[#AAAAAA]'}`}>
                                            <div className={`w-1.5 h-1.5 ${password.length >= 8 ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`} />
                                            8 caractères min.
                                        </p>
                                        <p className={`text-[10px] font-mono font-bold flex items-center gap-2 uppercase tracking-tight ${/[A-Z]/.test(password) ? 'text-[#111111]' : 'text-[#AAAAAA]'}`}>
                                            <div className={`w-1.5 h-1.5 ${/[A-Z]/.test(password) ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`} />
                                            Une majuscule
                                        </p>
                                        <p className={`text-[10px] font-mono font-bold flex items-center gap-2 uppercase tracking-tight ${/[0-9]/.test(password) ? 'text-[#111111]' : 'text-[#AAAAAA]'}`}>
                                            <div className={`w-1.5 h-1.5 ${/[0-9]/.test(password) ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`} />
                                            Un chiffre
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-[#E5E5E5]">
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] text-center leading-relaxed uppercase tracking-tight">
                                    En créant un compte, vous acceptez notre{" "}
                                    <button type="button" onClick={() => navigate("/rgpd")} className="text-[#111111] hover:underline">politique de confidentialité</button>.
                                </p>
                            </div>
                            <div className="pt-4 text-center">
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">
                                    Déjà un compte ?{" "}
                                    <button type="button" onClick={() => navigate("/login")} className="text-[#111111] border-b border-[#111111] ml-1">
                                        SE CONNECTER
                                    </button>
                                </p>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="mb-12">
                                <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">SOCIO-PRO</h1>
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">(OPTIONNEL) DONNÉES STATISTIQUES</p>
                            </div>
                            <div className="space-y-8 flex-1">
                                <div className="space-y-4 relative">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">CATÉGORIE PROFESSIONNELLE</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <select
                                            className="w-full pl-11 h-14 bg-white border border-[#111111] rounded-none focus:outline-none focus:border-[#111111] text-xs font-bold uppercase tracking-tight appearance-none"
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                        >
                                            <option value="">SÉLECTIONNER (OPTIONNEL)</option>
                                            {professions.map(prof => (
                                                <option key={prof} value={prof}>{prof.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-[#E5E5E5]">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1 flex items-center gap-2">
                                        QUELS CANAUX UTILISEZ-VOUS ?
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {channels.map(ch => (
                                            <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                                                className={`py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${usedChannels.includes(ch) ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}>
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
                                                    className="bg-white border border-[#111111] rounded-none focus-visible:ring-0 h-14 font-bold text-xs uppercase tracking-tight"
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
                            <div className="mb-12">
                                <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">PROFIL PHYSIQUE</h1>
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">PERSONNALISATION DE L'ANALYSE</p>
                            </div>
                            <div className="space-y-8 flex-1">
                                <div className="space-y-4 relative">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">ÂGE</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                                        <Input type="number" placeholder="EX: 28" min="10" max="120"
                                            className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 font-bold text-xs uppercase tracking-tight"
                                            value={age} onChange={(e) => setAge(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-[#E5E5E5]">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">SEXE</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Femme", "Homme", "Autre"].map(g => (
                                            <button type="button" key={g} onClick={() => setGender(g)}
                                                className={`py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${gender === g ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}>
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
                            <div className="mb-12">
                                <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">DIAGNOSTIC PEAU</h1>
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">IDENTIFICATION DU TYPE CUTANÉ</p>
                            </div>
                            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">TYPE DE PEAU</label>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                                            <button type="button" key={type} onClick={() => { setSkinType(type); setQuizStarted(false); }}
                                                className={`py-5 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${skinType === type && !quizStarted ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => { setQuizStarted(!quizStarted); setSkinType(""); setQuizStep(1); }}
                                        className={`w-full py-4 px-4 border text-xs font-bold uppercase tracking-[0.2em] transition-all ${quizStarted ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#111111] hover:bg-black hover:text-white'}`}>
                                        DIAGNOSTIC ASSISTÉ
                                    </button>

                                    <AnimatePresence>
                                        {quizStarted && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border border-[#111111] p-6 mt-6 overflow-hidden bg-[#F9F9F9]">
                                                {quizStep === 1 && (
                                                    <div className="space-y-6">
                                                        <p className="text-xs font-bold text-[#111111] uppercase tracking-tight">1. RÉACTION APRÈS NETTOYAGE</p>
                                                        <div className="flex flex-col gap-3">
                                                            {[
                                                                { label: "Elle tiraille", val: "Sèche" },
                                                                { label: "Elle brille entièrement", val: "Grasse" },
                                                                { label: "Zone T brillante uniquement", val: "Mixte" },
                                                                { label: "Confortable", val: "Normale" }
                                                            ].map(opt => (
                                                                <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q1: opt.val }); setQuizStep(2); }}
                                                                    className="text-left py-4 px-6 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-tight hover:border-[#111111] transition-colors bg-white">
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {(quizStep === 2 || quizStep === 3 || quizStep === 4) && (
                                                    <div className="space-y-6">
                                                        <p className="text-xs font-bold text-[#111111] uppercase tracking-tight">PROGRESSION : {quizStep}/4</p>
                                                        <button type="button" onClick={() => setQuizStep(quizStep + 1)} className="w-full py-4 border border-[#111111] text-[10px] font-bold uppercase">QUESTION SUIVANTE</button>
                                                        <p className="text-[10px] text-[#AAAAAA] italic">Note: Le quiz est simplifié pour la démonstration.</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-[#E5E5E5]">
                                    <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">PATHOLOGIES / SYMPTÔMES</label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"].map(prob => (
                                            <button type="button" key={prob} onClick={() => toggleProblem(prob)}
                                                className={`py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${skinProblems.includes(prob) ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}>
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
                            <div className="mb-12">
                                <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">OBJECTIFS</h1>
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">CIBLES DERMATOLOGIQUES</p>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                                        <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                            className={`py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${skinGoals.includes(goal) ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}>
                                            {goal}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#E5E5E5] z-20">
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="w-full text-center mb-6 text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]"
                            >
                                PASSER CETTE ÉTAPE
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
                            className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white py-5 font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {loading ? "ENREGISTREMENT..." : step === 5 ? "TERMINER" : "SUIVANT"} <ChevronRight size={18} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;

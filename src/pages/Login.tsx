import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Bon retour parmi nous !");

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single();
            const profile = data as any;
            if (profile && profile.skin_goals && (profile.skin_goals as any).length > 0) {
                navigate("/checkin-advice");
            } else {
                navigate("/signup");
            }
        } else {
            navigate("/checkin-advice");
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Veuillez entrer votre email pour réinitialiser votre mot de passe.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Un email de réinitialisation vous a été envoyé.");
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate("/onboarding")}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-border/60 bg-white/50 mb-12 mt-4 z-10 relative hover:bg-white transition-all"
            >
                <ArrowLeft size={18} strokeWidth={1.5} className="text-foreground" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col justify-center z-10 max-w-sm mx-auto w-full"
            >
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-display text-foreground leading-tight mb-4">Connexion</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Heureux de vous revoir</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="pl-12"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={loading}
                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-70 disabled:opacity-50 transition-all"
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow mt-10 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? "AUTHENTIFICATION..." : "ACCÉDER"}
                    </button>
                </form>

                <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-auto pt-12">
                    PAS ENCORE DE COMPTE ?{" "}
                    <button onClick={() => navigate("/signup")} className="text-primary border-b border-primary/20 ml-2 hover:border-primary transition-all">
                        Créer un compte
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;

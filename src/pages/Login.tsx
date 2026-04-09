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
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
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
            {/* Decorative Blur Backgrounds */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

            {/* Header */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate("/onboarding")}
                className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full mb-8 mt-2 z-10 relative"
            >
                <ArrowLeft size={20} className="text-foreground" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col justify-center z-10 max-w-sm mx-auto w-full"
            >
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3">Ravi de vous revoir</h1>
                    <p className="text-muted-foreground text-sm">Connectez-vous pour retrouver votre routine et vos analyses de peau.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="email"
                                placeholder="vous@email.com"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={loading}
                            className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated mt-4 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Connexion en cours..." : "Se connecter"}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-auto pt-8">
                    Pas encore de compte ?{" "}
                    <button onClick={() => navigate("/signup")} className="text-primary font-semibold hover:underline">
                        Créer un compte
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;

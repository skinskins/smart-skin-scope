import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Mail, Trash2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RGPD = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(-1)}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-border/60 bg-white/50 mb-12 mt-4 z-10 relative hover:bg-white transition-all shadow-sm"
            >
                <ArrowLeft size={18} strokeWidth={1.5} className="text-foreground" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8 pb-20"
            >
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={36} strokeWidth={1.2} />
                    </div>
                    <h1 className="text-2xl font-display text-foreground leading-tight">Politique de Confidentialité</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Votre vie privée est notre priorité absolue</p>
                </div>

                <div className="grid gap-6">
                    <section className="premium-card p-8 bg-white/60 space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <Lock size={18} strokeWidth={1.5} />
                            <h2 className="text-[10px] font-bold uppercase tracking-widest">Protection des données</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground italic">
                            Chez Nacre, nous collectons uniquement les informations nécessaires pour vous fournir des conseils personnalisés sur votre routine de soin de la peau. Vos données de cycle, alimentation, et santé sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers à des fins commerciales.
                        </p>
                    </section>

                    <section className="premium-card p-8 bg-white/60 space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <Trash2 size={18} strokeWidth={1.5} />
                            <h2 className="text-[10px] font-bold uppercase tracking-widest">Droit à l'oubli</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground italic">
                            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.
                        </p>
                        <div className="bg-primary/5 p-6 rounded-3xl flex items-start gap-4 border border-primary/10 mt-6">
                            <Mail size={18} strokeWidth={1.5} className="text-primary mt-1" />
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Comment supprimer mon compte ?</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Pour supprimer l'intégralité de vos données, envoyez simplement un mail à :
                                    <a href="mailto:lulua.skin26@gmail.com" className="text-primary font-bold block mt-2 hover:opacity-70 transition-all underline underline-offset-4">
                                        lulua.skin26@gmail.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </motion.div>
        </div>
    );
};

export default RGPD;

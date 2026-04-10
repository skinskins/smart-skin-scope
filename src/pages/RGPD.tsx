import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Mail, Trash2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RGPD = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background p-6">
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-accent rounded-full transition-colors mb-6"
            >
                <ArrowLeft size={24} />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8 pb-20"
            >
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={32} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Politique de Confidentialité & RGPD</h1>
                    <p className="text-muted-foreground">Votre vie privée est notre priorité absolue chez Nacre.</p>
                </div>

                <div className="grid gap-6">
                    <section className="bg-card p-6 rounded-3xl border border-border/50 space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <Lock size={20} />
                            <h2 className="font-bold uppercase tracking-wider text-xs">Protection des données</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Chez Nacre, nous collectons uniquement les informations nécessaires pour vous fournir des conseils personnalisés sur votre routine de soin de la peau. Vos données de cycle, alimentation, et santé sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers à des fins commerciales.
                        </p>
                    </section>

                    <section className="bg-card p-6 rounded-3xl border border-border/50 space-y-4">
                        <div className="flex items-center gap-3 text-red-500">
                            <Trash2 size={20} />
                            <h2 className="font-bold uppercase tracking-wider text-xs">Droit à l'oubli</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.
                        </p>
                        <div className="bg-accent/50 p-4 rounded-2xl flex items-start gap-3 border border-border/50">
                            <Mail size={18} className="text-primary mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold">Comment supprimer mon compte ?</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Pour supprimer l'intégralité de vos données, envoyez simplement un mail à :
                                    <a href="mailto:lulua.skin26@gmail.com" className="text-primary font-bold block mt-1 hover:underline">
                                        lulua.skin26@gmail.com
                                    </a>
                                    Nous traiterons votre demande dans un délai maximum de 30 jours.
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

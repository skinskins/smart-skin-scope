import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background max-w-lg mx-auto pb-24">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-6 p-3"
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/20 transition-colors shrink-0"
                    aria-label="Retour"
                >
                    <ArrowLeft size={20} strokeWidth={1.5} className="text-foreground" />
                </button>
                <h1 className="text-2xl text-foreground">À propos</h1>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-col gap-6 px-5 pt-2"
            >
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 px-1">Nacre</p>
                    <p className="text-[14px] text-muted-foreground px-1">
                        Analyse IA et conseils personnalisés pour votre peau, adaptés à votre cycle et à votre quotidien.
                    </p>
                </div>

                <div className="flex gap-3 p-4 bg-muted/20 rounded-2xl">
                    <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">Disclaimer</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Les conseils proposés par Nacre sont fournis à titre informatif et ne constituent pas un avis, un diagnostic ou un traitement médical. Nacre ne remplace pas un médecin, un dermatologue ou tout autre professionnel de santé.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            En cas de problème de peau, de symptômes persistants ou de doute concernant votre santé, consultez un professionnel de santé avant de suivre les recommandations de l'application.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default About;

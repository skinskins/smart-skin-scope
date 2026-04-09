import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Droplets, Sparkles, Stethoscope, Camera } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const slides = [
    {
        title: "Votre Peau, comprise",
        description: "La peau est influencé par de nombreux facteurs internes comme externes. Apprenez à les comprendre et à en prendre soin grâce à notre analyse personnalisée.",
        icon: <Sparkles size={64} className="text-primary" />,
        color: "bg-primary/10",
    },
    {
        title: "Routine Adaptée au Climat",
        description: "Nous adaptons chaque jour nos recommandations selon la météo et la qualité de l'air de votre localisation.",
        icon: <Droplets size={64} className="text-skin-hydration" />,
        color: "bg-skin-hydration/10",
    },
    // {
    //     title: "Diagnostic en Temps Réel",
    //     description: "L'appareil photo de votre smartphone devient votre outil, scannez et comprenez vos imperfections.",
    //     icon: <Camera size={64} className="text-skin-glow" />,
    //     color: "bg-skin-glow/10",
    // },
    // {
    //     title: "Suivi",
    //     description: "Suivez vos progrès jour après jour et recevez des conseils.",
    //     icon: <Stethoscope size={64} className="text-skin-texture" />,
    //     color: "bg-skin-texture/10",
    // },
];

const Onboarding = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const navigate = useNavigate();

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide((prev) => prev + 1);
        } else {
            navigate("/signup");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Decorative Blur Backgrounds */}
            <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-primary/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-accent/40 rounded-full blur-[80px]" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 250, damping: 25 }}
                        className="flex flex-col items-center text-center max-w-sm w-full"
                    >
                        <div className={`w-40 h-40 flex items-center justify-center rounded-full mb-10 shadow-elevated ${slides[currentSlide].color}`}>
                            {slides[currentSlide].icon}
                        </div>

                        <h1 className="text-3xl font-display font-bold text-foreground mb-4">
                            {slides[currentSlide].title}
                        </h1>
                        <p className="text-muted-foreground leading-relaxed text-[15px]">
                            {slides[currentSlide].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation and Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 z-20 flex flex-col items-center gap-6">
                {/* Indicators */}
                <div className="flex gap-2 mb-2">
                    {slides.map((_, i) => (
                        <motion.div
                            key={i}
                            className={`h-2 rounded-full transition-colors ${i === currentSlide ? "bg-primary w-6" : "bg-muted-foreground/30 w-2"}`}
                            layoutId={`indicator-${i}`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={nextSlide}
                    className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                    {currentSlide === slides.length - 1 ? "Commencer" : "Continuer"}
                    <ChevronRight size={18} />
                </button>

                {/* Login Link */}
                <p className="text-sm text-muted-foreground">
                    Déjà un compte ?{" "}
                    <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
                        Se connecter
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Onboarding;

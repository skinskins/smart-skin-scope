import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 relative"
            >
                <h1 className="text-8xl font-display text-primary mb-4 opacity-20">404</h1>
                <div className="space-y-4 mb-12">
                    <h2 className="text-3xl font-display text-foreground leading-tight">Page introuvable</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">L'analyse biologique n'a pu aboutir</p>
                </div>
                
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] mx-auto"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                    Retour à l'accueil
                </button>
            </motion.div>
        </div>
    );
};

export default NotFound;

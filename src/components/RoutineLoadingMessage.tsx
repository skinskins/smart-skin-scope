import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Messages qui defilent pendant la curation (inci-analysis) — donne un retour plus
// vivant qu'un simple spinner statique sur un appel qui prend plusieurs secondes.
const LOADING_MESSAGES = [
  "Analyse de ton profil...",
  "Sélection des produits adaptés...",
  "Vérification des compatibilités...",
  "Finalisation de ta routine...",
];

const RoutineLoadingMessage = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {LOADING_MESSAGES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default RoutineLoadingMessage;

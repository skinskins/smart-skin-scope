import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Messages qui defilent pendant la curation (inci-analysis) — donne un retour plus
// vivant qu'un simple spinner statique sur un appel qui prend plusieurs secondes.
// Reutilise aussi pour la generation des conseils (generate-weekly-advice) via la prop
// `messages`.
export const ROUTINE_LOADING_MESSAGES = [
  "Analyse de ton profil...",
  "Sélection des produits adaptés...",
  "Vérification des compatibilités...",
  "Finalisation de ta routine...",
];

export const ADVICE_LOADING_MESSAGES = [
  "Analyse de ton profil...",
  "Étude de l'état de ta peau...",
  "Sélection des priorités de la semaine...",
  "Finalisation de tes conseils...",
];

// Version courte pour un bouton (une icone qui tourne fait deja office de spinner —
// pas besoin de repeter "..." plein) — utilisee par RotatingLabel.
export const ADVICE_BUTTON_MESSAGES = ["Analyse...", "Sélection...", "Finalisation..."];
export const ROUTINE_BUTTON_MESSAGES = ["Analyse...", "Sélection...", "Optimisation..."];

const DEFAULT_INTERVAL_MS = 2600;

const useRotatingIndex = (length: number, intervalMs: number) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [length, intervalMs]);

  return index;
};

const RoutineLoadingMessage = ({
  messages = ROUTINE_LOADING_MESSAGES,
  intervalMs = DEFAULT_INTERVAL_MS,
}: {
  messages?: string[];
  intervalMs?: number;
}) => {
  const index = useRotatingIndex(messages.length, intervalMs);

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
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// Texte seul (sans spinner) qui defile — pour un bouton qui a deja sa propre icone
// animee (ex. RefreshCw en rotation) juste a cote.
export const RotatingLabel = ({
  messages,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
}: {
  messages: string[];
  intervalMs?: number;
  className?: string;
}) => {
  const index = useRotatingIndex(messages.length, intervalMs);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.25 }}
        className={className}
      >
        {messages[index]}
      </motion.span>
    </AnimatePresence>
  );
};

export default RoutineLoadingMessage;

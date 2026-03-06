import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Question {
  id: string;
  text: string;
  options: { label: string; value: number }[];
}

const questions: Question[] = [
  { id: "water", text: "Combien de verres d'eau aujourd'hui ?", options: [
    { label: "0–2", value: 1 }, { label: "3–5", value: 2 }, { label: "6–8", value: 3 }, { label: "8+", value: 4 }
  ]},
  { id: "sunscreen", text: "Avez-vous appliqué de la crème solaire ?", options: [
    { label: "Non", value: 1 }, { label: "Une fois", value: 2 }, { label: "Réappliqué", value: 4 }
  ]},
  { id: "sleep", text: "Heures de sommeil cette nuit ?", options: [
    { label: "<5h", value: 1 }, { label: "5–6h", value: 2 }, { label: "7–8h", value: 3 }, { label: "8+", value: 4 }
  ]},
  { id: "stress", text: "Niveau de stress aujourd'hui ?", options: [
    { label: "Élevé", value: 1 }, { label: "Modéré", value: 2 }, { label: "Faible", value: 3 }, { label: "Aucun", value: 4 }
  ]},
  { id: "diet", text: "Qualité de votre alimentation ?", options: [
    { label: "Mauvaise", value: 1 }, { label: "Correcte", value: 2 }, { label: "Bonne", value: 3 }, { label: "Excellente", value: 4 }
  ]},
];

const tipMap: Record<string, string[]> = {
  water: ["Buvez 2 verres de plus avant ce soir.", "Bonne hydratation — continuez !", "Super apport en eau, votre peau va briller."],
  sunscreen: ["Appliquez du SPF 50 avant de sortir.", "Bon début, réappliquez toutes les 2h dehors.", "Protection solaire parfaite."],
  sleep: ["Visez 7h+ pour la réparation cutanée.", "Presque — évitez les écrans avant de dormir.", "Excellent sommeil pour le renouvellement cellulaire."],
  stress: ["Essayez 5 min de respiration.", "Stress modéré — faites des pauses.", "Peu de stress aide la barrière cutanée."],
  diet: ["Réduisez le sucre pour limiter les boutons.", "Ajoutez des aliments riches en oméga-3.", "Alimentation saine = peau nette."],
};

const Tips = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const current = questions[step];

  const answer = (qId: string, val: number) => {
    const newAnswers = { ...answers, [qId]: val };
    setAnswers(newAnswers);
    if (step < questions.length - 1) {
      setTimeout(() => setStep(s => s + 1), 300);
    } else {
      setTimeout(() => setDone(true), 300);
    }
  };

  const getTips = () => {
    return Object.entries(answers).map(([qId, val]) => {
      const tips = tipMap[qId];
      const idx = val <= 1 ? 0 : val <= 3 ? 1 : 2;
      return tips[idx];
    }).slice(0, 3);
  };

  const restart = () => { setStep(0); setAnswers({}); setDone(false); };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Quiz Peau</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Répondez rapidement pour des conseils personnalisés</p>
      </motion.div>

      {/* Barre de progression */}
      <div className="flex gap-1 mb-6">
        {questions.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
            i < step || done ? 'bg-primary' : i === step && !done ? 'bg-primary/40' : 'bg-muted'
          }`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <div className="bg-card rounded-2xl p-6 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">Question {step + 1}/{questions.length}</p>
              <h2 className="text-lg font-display font-semibold text-foreground mb-5">{current.text}</h2>
              <div className="space-y-2">
                {current.options.map(opt => (
                  <button key={opt.label} onClick={() => answer(current.id, opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                      answers[current.id] === opt.value
                        ? 'border-primary bg-accent text-primary'
                        : 'border-border text-foreground hover:border-primary/40'
                    }`}>
                    <div className="flex items-center justify-between">
                      {opt.label}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl p-6 mb-4" style={{ background: "var(--gradient-hero)" }}>
              <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider mb-2">Vos conseils</p>
              <div className="space-y-2">
                {getTips().map((tip, i) => (
                  <p key={i} className="text-primary-foreground text-sm font-medium flex gap-2">
                    <span>{i + 1}.</span><span>{tip}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card mb-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Score :</span>{" "}
                {Math.round((Object.values(answers).reduce((a, b) => a + b, 0) / (questions.length * 4)) * 100)}% — 
                {Object.values(answers).reduce((a, b) => a + b, 0) > 12 ? " Très bonnes habitudes !" : " Marge de progression."}
              </p>
            </div>

            <Button onClick={restart} variant="outline" className="w-full rounded-xl py-5">Refaire le quiz</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tips;

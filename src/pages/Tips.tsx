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
  { id: "water", text: "How many glasses of water today?", options: [
    { label: "0–2", value: 1 }, { label: "3–5", value: 2 }, { label: "6–8", value: 3 }, { label: "8+", value: 4 }
  ]},
  { id: "sunscreen", text: "Did you apply sunscreen?", options: [
    { label: "No", value: 1 }, { label: "Once", value: 2 }, { label: "Reapplied", value: 4 }
  ]},
  { id: "sleep", text: "Hours of sleep last night?", options: [
    { label: "<5h", value: 1 }, { label: "5–6h", value: 2 }, { label: "7–8h", value: 3 }, { label: "8+", value: 4 }
  ]},
  { id: "stress", text: "Stress level today?", options: [
    { label: "High", value: 1 }, { label: "Moderate", value: 2 }, { label: "Low", value: 3 }, { label: "None", value: 4 }
  ]},
  { id: "diet", text: "How clean was your diet?", options: [
    { label: "Poor", value: 1 }, { label: "Okay", value: 2 }, { label: "Good", value: 3 }, { label: "Great", value: 4 }
  ]},
];

const tipMap: Record<string, string[]> = {
  water: ["Drink 2 more glasses before evening.", "Good hydration — keep it up!", "Great water intake, skin will glow."],
  sunscreen: ["Apply SPF 50 before going out.", "Good start, reapply every 2h outdoors.", "Perfect sun protection routine."],
  sleep: ["Aim for 7h+ for skin repair.", "Almost there — avoid screens before bed.", "Great sleep supports cell renewal."],
  stress: ["Try 5 min breathing exercises.", "Moderate stress — take short breaks.", "Low stress helps skin barrier."],
  diet: ["Cut sugar to reduce breakouts.", "Add omega-3 rich foods this week.", "Clean diet = clear skin."],
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
          <h1 className="text-2xl font-display font-semibold text-foreground">Skin Quiz</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Answer quickly for personalized tips</p>
      </motion.div>

      {/* Progress bar */}
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
              <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider mb-2">Your Tips</p>
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
                <span className="font-semibold">Score:</span>{" "}
                {Math.round((Object.values(answers).reduce((a, b) => a + b, 0) / (questions.length * 4)) * 100)}% — 
                {Object.values(answers).reduce((a, b) => a + b, 0) > 12 ? " Great habits!" : " Room to improve."}
              </p>
            </div>

            <Button onClick={restart} variant="outline" className="w-full rounded-xl py-5">Retake Quiz</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tips;

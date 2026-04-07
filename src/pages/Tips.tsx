import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Droplets, Sun, Moon, Flame, Fingerprint, CircleDot, FlaskConical, ShieldCheck, Leaf, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiagnosisResult } from "@/hooks/useDiagnosisStore";

/* ─── Questions ─── */
interface Question {
  id: string;
  text: string;
  options: { label: string; value: number }[];
}

const questions: Question[] = [
  {
    id: "water", text: "Combien de verres d'eau aujourd'hui ?", options: [
      { label: "0–2", value: 1 }, { label: "3–5", value: 2 }, { label: "6–8", value: 3 }, { label: "8+", value: 4 }
    ]
  },
  {
    id: "sunscreen", text: "Avez-vous appliqué de la crème solaire ?", options: [
      { label: "Non", value: 1 }, { label: "Une fois", value: 2 }, { label: "Réappliqué", value: 4 }
    ]
  },
  {
    id: "sleep", text: "Heures de sommeil cette nuit ?", options: [
      { label: "<5h", value: 1 }, { label: "5–6h", value: 2 }, { label: "7–8h", value: 3 }, { label: "8+", value: 4 }
    ]
  },
  {
    id: "stress", text: "Niveau de stress aujourd'hui ?", options: [
      { label: "Élevé", value: 1 }, { label: "Modéré", value: 2 }, { label: "Faible", value: 3 }, { label: "Aucun", value: 4 }
    ]
  },
  {
    id: "diet", text: "Qualité de votre alimentation ?", options: [
      { label: "Mauvaise", value: 1 }, { label: "Correcte", value: 2 }, { label: "Bonne", value: 3 }, { label: "Excellente", value: 4 }
    ]
  },
];

/* ─── Dashboard metrics (simulated — same as Dashboard.tsx) ─── */
const dashboardMetrics = {
  hydratation: 72,
  eclat: 65,
  rougeurs: 28,
  texture: 80,
  sebum: 45,
  uv: 6,
  humidity: 55,
  sleepHours: 7.5,
  stressLevel: 3,
  waterGlasses: 6,
  alcohol: false,
  cyclePhase: "Folliculaire",
};

/* ─── Diagnosis zone data (simulated — same as Diagnosis.tsx) ─── */
const diagnosisZones = {
  forehead: { score: 62, status: "warning" as const, label: "Front" },
  leftCheek: { score: 45, status: "alert" as const, label: "Joue gauche" },
  rightCheek: { score: 48, status: "alert" as const, label: "Joue droite" },
  tzone: { score: 40, status: "alert" as const, label: "Zone T" },
  chin: { score: 78, status: "good" as const, label: "Menton" },
  jaw: { score: 76, status: "good" as const, label: "Mâchoire" },
};

/* ─── Tip generation engine ─── */
interface DetailedTip {
  icon: React.ReactNode;
  title: string;
  description: string;
  products: string[];
  ingredients: string[];
  priority: "high" | "medium" | "low";
  source: string; // what triggered this tip
}

function generateTips(answers: Record<string, number>): DetailedTip[] {
  const tips: DetailedTip[] = [];
  const hasDiag = true; // we always show diagnostic-based tips

  // ─── Quiz-based tips ───
  if (answers.water <= 2) {
    tips.push({
      icon: <Droplets size={18} />,
      title: "Hydratation insuffisante",
      description: "Votre apport en eau est trop faible. La déshydratation accentue les rides, ternit le teint et fragilise la barrière cutanée. Visez minimum 1,5L/jour en augmentant progressivement.",
      products: ["Sérum Hyaluronique Concentré", "Brume hydratante visage", "Crème riche en céramides"],
      ingredients: ["Acide hyaluronique (bas & haut poids moléculaire)", "Glycérine végétale", "Bétaïne", "Aloe vera"],
      priority: "high",
      source: "Quiz : faible hydratation",
    });
  } else if (answers.water === 3) {
    tips.push({
      icon: <Droplets size={18} />,
      title: "Hydratation à optimiser",
      description: "Votre consommation d'eau est correcte mais peut être améliorée. Pensez à boire avant d'avoir soif et à intégrer des aliments riches en eau (concombre, pastèque).",
      products: ["Sérum aqua-boost léger", "Lotion tonique hydratante"],
      ingredients: ["Acide hyaluronique", "Niacinamide", "Panthénol"],
      priority: "low",
      source: "Quiz : hydratation moyenne",
    });
  }

  if (answers.sunscreen <= 1) {
    tips.push({
      icon: <Sun size={18} />,
      title: "Protection solaire absente — URGENT",
      description: `Sans crème solaire avec un indice UV de ${dashboardMetrics.uv}, votre peau subit des dommages photo-induits : taches, rides prématurées et risque de mélanome. C'est le geste anti-âge n°1.`,
      products: ["SPF 50+ texture fluide (La Roche-Posay Shaka Fluid)", "Spray solaire réapplication (Bioderma Photoderm)", "Stick solaire zones sensibles"],
      ingredients: ["Filtres minéraux (oxyde de zinc, dioxyde de titane)", "Vitamine E (antioxydant)", "Tinosorb S (filtre photostable)"],
      priority: "high",
      source: `Quiz + UV actuel : ${dashboardMetrics.uv}`,
    });
  } else if (answers.sunscreen === 2) {
    tips.push({
      icon: <Sun size={18} />,
      title: "Réappliquez votre solaire",
      description: `Avec un UV de ${dashboardMetrics.uv}, une seule application ne suffit pas. La protection diminue après 2h d'exposition, la transpiration et le contact avec le visage.`,
      products: ["Brume solaire SPF50 pour réapplication", "Poudre solaire minérale (pratique en journée)"],
      ingredients: ["Filtres UVA/UVB photostables", "Niacinamide (anti-taches)"],
      priority: "medium",
      source: `Quiz + UV : ${dashboardMetrics.uv}`,
    });
  }

  if (answers.sleep <= 2) {
    tips.push({
      icon: <Moon size={18} />,
      title: "Sommeil insuffisant — impact majeur",
      description: "Moins de 6h de sommeil réduit de 30% la production de collagène nocturne et augmente le cortisol (stress cutané). Votre peau ne se régénère pas correctement.",
      products: ["Soin de nuit riche au rétinol", "Masque de nuit réparateur", "Huile visage nourrissante (avant le coucher)"],
      ingredients: ["Rétinol (0.3% pour débuter)", "Peptides de cuivre", "Squalane", "Beurre de karité"],
      priority: "high",
      source: "Quiz : sommeil < 6h",
    });
  }

  if (answers.stress <= 1) {
    tips.push({
      icon: <Flame size={18} />,
      title: "Stress élevé — peau réactive",
      description: `Votre niveau de stress (${dashboardMetrics.stressLevel}/5 sur le dashboard) combiné à votre réponse confirme un impact cutané : le cortisol augmente la production de sébum, fragilise la barrière et peut déclencher des poussées inflammatoires.`,
      products: ["Sérum apaisant anti-rougeurs", "Crème barrière réparatrice", "Roll-on huiles essentielles détente"],
      ingredients: ["Centella asiatica (cicatrisation)", "Bisabolol (anti-inflammatoire)", "Niacinamide B3 (renforce la barrière)", "CBD topique (apaisant)"],
      priority: "high",
      source: `Quiz stress + Dashboard stress : ${dashboardMetrics.stressLevel}/5`,
    });
  }

  if (answers.diet <= 2) {
    tips.push({
      icon: <Leaf size={18} />,
      title: "Alimentation à revoir",
      description: "Une alimentation riche en sucres rapides et produits transformés stimule la glycation (vieillissement) et l'inflammation. Privilégiez les antioxydants et les oméga-3.",
      products: ["Complément oméga-3 (huile de poisson ou algues)", "Sérum vitamine C topique le matin"],
      ingredients: ["Vitamine C (L-ascorbic acid 15-20%)", "Vitamine E", "Resvératrol", "Zinc (en complément oral)"],
      priority: "medium",
      source: "Quiz : alimentation médiocre",
    });
  }

  // ─── Dashboard metrics-based tips ───
  if (dashboardMetrics.rougeurs > 20) {
    tips.push({
      icon: <Flame size={18} />,
      title: "Rougeurs détectées sur le dashboard",
      description: `Votre indice de rougeurs est à ${dashboardMetrics.rougeurs}%. Cela indique une inflammation cutanée active, possiblement aggravée par le stress, l'alimentation ou des produits inadaptés.`,
      products: ["Crème anti-rougeurs (Avène Antirougeurs Fort)", "Eau micellaire ultra-douce", "Masque apaisant à l'avoine"],
      ingredients: ["Centella asiatica", "Allantoïne", "Bisabolol", "Avoine colloïdale"],
      priority: "medium",
      source: `Dashboard rougeurs : ${dashboardMetrics.rougeurs}%`,
    });
  }

  if (dashboardMetrics.sebum < 50) {
    // sebum ok but t-zone is alert
  }

  if (dashboardMetrics.eclat < 70) {
    tips.push({
      icon: <Sparkles size={18} />,
      title: "Éclat à booster",
      description: `Score éclat de ${dashboardMetrics.eclat}%. Le teint manque de luminosité, souvent lié au manque de sommeil, à la déshydratation et à l'accumulation de cellules mortes.`,
      products: ["Peeling doux AHA/PHA (The Ordinary 30% AHA)", "Sérum vitamine C 15%", "Masque éclat illuminateur"],
      ingredients: ["Acide glycolique (AHA 5-10%)", "Vitamine C stabilisée", "Niacinamide 5%", "Acide lactique"],
      priority: "medium",
      source: `Dashboard éclat : ${dashboardMetrics.eclat}%`,
    });
  }

  // ─── Diagnosis zone-based tips ───
  if (hasDiag) {
    if (diagnosisZones.tzone.status === "alert") {
      tips.push({
        icon: <CircleDot size={18} />,
        title: "Zone T critique — pores et sébum",
        description: `Score zone T : ${diagnosisZones.tzone.score}/100. Pores très dilatés et excès de sébum détectés. Le double nettoyage et les actifs sébo-régulateurs sont essentiels.`,
        products: ["Huile démaquillante (1er nettoyage)", "Gel nettoyant salicylique (2e nettoyage)", "Sérum niacinamide 10% + zinc", "Masque argile verte Cattier"],
        ingredients: ["BHA / Acide salicylique 2%", "Niacinamide + Zinc PCA", "Argile verte / kaolin", "Charbon actif"],
        priority: "high",
        source: `Diagnostic zone T : ${diagnosisZones.tzone.score}/100`,
      });
    }

    if (diagnosisZones.leftCheek.status === "alert" || diagnosisZones.rightCheek.status === "alert") {
      tips.push({
        icon: <AlertTriangle size={18} />,
        title: "Joues irritées — barrière fragilisée",
        description: `Joue gauche ${diagnosisZones.leftCheek.score}/100, joue droite ${diagnosisZones.rightCheek.score}/100. Rougeurs et boutons inflammatoires. La barrière cutanée est compromise. Simplifiez votre routine et renforcez la barrière.`,
        products: ["Crème réparatrice barrière (CeraVe, La Roche-Posay Cicaplast)", "Taie d'oreiller en soie", "Nettoyant surgras sans sulfates"],
        ingredients: ["Céramides (NP, AP, EOP)", "Panthénol / provitamine B5", "Madécassoside", "Squalane"],
        priority: "high",
        source: `Diagnostic joues : ${diagnosisZones.leftCheek.score} & ${diagnosisZones.rightCheek.score}/100`,
      });
    }

    if (diagnosisZones.forehead.status === "warning") {
      tips.push({
        icon: <Fingerprint size={18} />,
        title: "Front — rides et déshydratation",
        description: `Score front : ${diagnosisZones.forehead.score}/100. Les rides d'expression sont accentuées par la déshydratation. Un combo hydratation intense + anti-rides ciblé est recommandé.`,
        products: ["Sérum hyaluronique multi-poids", "Crème au rétinol 0.5% (le soir)", "Patchs hydrogel front"],
        ingredients: ["Rétinol / rétinaldéhyde", "Acide hyaluronique", "Peptides (Matrixyl, Argireline)", "Vitamine E"],
        priority: "medium",
        source: `Diagnostic front : ${diagnosisZones.forehead.score}/100`,
      });
    }
  }

  // ─── Cycle-based tips ───
  if (dashboardMetrics.cyclePhase === "Folliculaire") {
    tips.push({
      icon: <FlaskConical size={18} />,
      title: "Phase folliculaire — profitez-en",
      description: "Les œstrogènes remontent : c'est le meilleur moment pour les exfoliants et traitements actifs (rétinol, AHA). Votre peau tolère mieux les actifs puissants pendant cette phase.",
      products: ["Peeling AHA 10%", "Sérum rétinol", "Masque purifiant"],
      ingredients: ["Acide glycolique", "Rétinol", "BHA", "Vitamine C"],
      priority: "low",
      source: `Dashboard cycle : ${dashboardMetrics.cyclePhase}`,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}

/* ─── UI Components ─── */
const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "Prioritaire" },
  medium: { color: "text-skin-oil", bg: "bg-skin-oil/10", label: "Recommandé" },
  low: { color: "text-primary", bg: "bg-primary/10", label: "Bonus" },
};

const TipCard = ({ tip, index }: { tip: DetailedTip; index: number }) => {
  const [open, setOpen] = useState(false);
  const config = priorityConfig[tip.priority];
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl shadow-card overflow-hidden"
    >
      {/* Collapsed summary — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center ${config.color} flex-shrink-0`}>
          {tip.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{tip.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color} flex-shrink-0`}>
              {config.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">{tip.source}</p>
        </div>
        <ChevronRight size={16} className={`text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>

              {/* Products */}
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-primary" />
                  Produits recommandés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tip.products.map((p, i) => (
                    <span key={i} className="text-[10px] bg-accent text-foreground px-2.5 py-1 rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <FlaskConical size={12} className="text-primary" />
                  Ingrédients à privilégier
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tip.ingredients.map((ing, i) => (
                    <span key={i} className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Main component ─── */
const Tips = () => {
  const persistedRaw = localStorage.getItem("currentTipsSession");
  const persisted = persistedRaw ? JSON.parse(persistedRaw) : null;

  const [step, setStep] = useState(persisted?.step || 0);
  const [answers, setAnswers] = useState<Record<string, number>>(persisted?.answers || {});
  const [done, setDone] = useState(persisted?.done || false);
  const diagResult = useDiagnosisResult();

  useEffect(() => {
    localStorage.setItem("currentTipsSession", JSON.stringify({ step, answers, done }));
  }, [step, answers, done]);

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

  const tips = done ? generateTips(answers) : [];
  const quizScore = done ? Math.round((Object.values(answers).reduce((a, b) => a + b, 0) / (questions.length * 4)) * 100) : 0;
  const highCount = tips.filter(t => t.priority === "high").length;

  const restart = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
    localStorage.removeItem("currentTipsSession");
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Quiz Peau</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Répondez pour des conseils ultra-personnalisés</p>
      </motion.div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {questions.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step || done ? 'bg-primary' : i === step && !done ? 'bg-primary/40' : 'bg-muted'
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
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${answers[current.id] === opt.value
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

            {/* Score summary */}
            <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: "var(--gradient-hero)" }}>
              <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider mb-2">Votre bilan personnalisé</p>
              <p className="text-primary-foreground/80 text-sm mb-3">
                {quizScore > 75 ? "Excellentes habitudes au quotidien ✨" : quizScore > 50 ? "Bonnes bases, quelques ajustements à faire 🔍" : "Plusieurs axes d'amélioration importants 🩹"}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 bg-white/20 text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {tips.length} conseils
                </span>
                {highCount > 0 && (
                  <span className="flex items-center gap-1 bg-destructive/30 text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    <AlertTriangle size={10} /> {highCount} prioritaire{highCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Data sources info */}
            <div className="bg-accent/50 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 Ces conseils sont générés à partir de <strong>vos réponses au quiz</strong>, de vos <strong>paramètres du dashboard</strong> (météo, cycle, stress, sommeil) et des <strong>résultats de votre dernier diagnostic</strong> zone par zone.
              </p>
            </div>

            {/* Tips list */}
            <div className="space-y-3 mb-5">
              {tips.map((tip, i) => (
                <TipCard key={i} tip={tip} index={i} />
              ))}
            </div>

            <Button onClick={restart} variant="outline" className="w-full rounded-xl py-5">Refaire le quiz</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tips;

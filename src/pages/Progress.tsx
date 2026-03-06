import { motion } from "framer-motion";
import { TrendingUp, Users, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { useState } from "react";

const weeklyData = [
  { day: "Lun", hydration: 65, glow: 55, redness: 40, texture: 70 },
  { day: "Mar", hydration: 68, glow: 58, redness: 38, texture: 72 },
  { day: "Mer", hydration: 60, glow: 60, redness: 42, texture: 68 },
  { day: "Jeu", hydration: 72, glow: 62, redness: 35, texture: 75 },
  { day: "Ven", hydration: 70, glow: 63, redness: 30, texture: 78 },
  { day: "Sam", hydration: 75, glow: 65, redness: 28, texture: 80 },
  { day: "Dim", hydration: 72, glow: 65, redness: 28, texture: 80 },
];

const metrics = [
  { key: "hydration", label: "Hydratation", color: "hsl(200, 60%, 55%)" },
  { key: "glow", label: "Éclat", color: "hsl(45, 80%, 65%)" },
  { key: "redness", label: "Rougeurs", color: "hsl(0, 70%, 60%)" },
  { key: "texture", label: "Texture", color: "hsl(280, 30%, 55%)" },
];

const cohortData = [
  { metric: "Hydrat.", you: 72, avg: 65 },
  { metric: "Éclat", you: 65, avg: 60 },
  { metric: "Roug.", you: 28, avg: 35 },
  { metric: "Text.", you: 80, avg: 70 },
  { metric: "Sébum", you: 45, avg: 50 },
];

const predictionData = [
  { day: "Auj.", score: 74 },
  { day: "+1", score: 73 },
  { day: "+2", score: 76 },
  { day: "+3", score: 72 },
  { day: "+4", score: 78 },
  { day: "+5", score: 75 },
  { day: "+6", score: 79 },
  { day: "+7", score: 80 },
];

const predictionFactors = [
  { factor: "Météo", impact: "UV ↑ → risque de rougeurs" },
  { factor: "Cycle", impact: "Folliculaire → meilleur éclat" },
  { factor: "Sommeil", impact: "Moy. 7,2h → bonne récupération" },
];

type Tab = "trends" | "compare" | "predict";

const Progress = () => {
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["hydration", "texture"]);
  const [tab, setTab] = useState<Tab>("trends");

  const toggleMetric = (key: string) => {
    setActiveMetrics(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Progression</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Suivre, comparer & prédire</p>
      </motion.div>

      {/* Onglets */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5">
        {([["trends", "Tendances", TrendingUp], ["compare", "Cohorte", Users], ["predict", "Prédiction", Zap]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "trends" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h3 className="font-display font-semibold text-foreground mb-3">Tendances hebdo</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {metrics.map(m => (
                <button key={m.key} onClick={() => toggleMetric(m.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    activeMetrics.includes(m.key) ? "border-transparent text-primary-foreground" : "border-border text-muted-foreground bg-transparent"
                  }`} style={activeMetrics.includes(m.key) ? { backgroundColor: m.color } : {}}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "11px" }} />
                  {metrics.filter(m => activeMetrics.includes(m.key)).map(m => (
                    <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={{ r: 2.5, fill: m.color }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {tab === "compare" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h3 className="font-display font-semibold text-foreground mb-1">Vous vs. Cohorte</h3>
            <p className="text-xs text-muted-foreground mb-3">Femmes 25–30 ans, peau mixte</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "11px" }} />
                  <Bar dataKey="you" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Vous" />
                  <Bar dataKey="avg" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Moyenne" opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-foreground">
              Vous êtes <span className="text-primary font-semibold">au-dessus de la moyenne</span> en hydratation & texture. Rougeurs en dessous — bravo !
            </p>
          </div>
        </motion.div>
      )}

      {tab === "predict" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h3 className="font-display font-semibold text-foreground mb-1">Prédiction 7 jours</h3>
            <p className="text-xs text-muted-foreground mb-3">Basée sur les tendances + facteurs</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[60, 90]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h3 className="font-display font-semibold text-foreground mb-2">Facteurs d'ajustement</h3>
          <div className="space-y-2 mb-4">
            {predictionFactors.map((f, i) => (
              <motion.div key={f.factor} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-card rounded-xl p-3 shadow-card flex items-center gap-3">
                <Zap size={14} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.factor}</p>
                  <p className="text-xs text-muted-foreground">{f.impact}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-foreground">
              Tendance prédite : <span className="text-primary font-semibold">↑ en amélioration</span>. Baisse possible J+3 (pic UV).
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Progress;

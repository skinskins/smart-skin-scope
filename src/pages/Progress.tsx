import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";

const weeklyData = [
  { day: "Mon", hydration: 65, glow: 55, redness: 40, texture: 70 },
  { day: "Tue", hydration: 68, glow: 58, redness: 38, texture: 72 },
  { day: "Wed", hydration: 60, glow: 60, redness: 42, texture: 68 },
  { day: "Thu", hydration: 72, glow: 62, redness: 35, texture: 75 },
  { day: "Fri", hydration: 70, glow: 63, redness: 30, texture: 78 },
  { day: "Sat", hydration: 75, glow: 65, redness: 28, texture: 80 },
  { day: "Sun", hydration: 72, glow: 65, redness: 28, texture: 80 },
];

const metrics = [
  { key: "hydration", label: "Hydration", color: "hsl(200, 60%, 55%)" },
  { key: "glow", label: "Glow", color: "hsl(45, 80%, 65%)" },
  { key: "redness", label: "Redness", color: "hsl(0, 70%, 60%)" },
  { key: "texture", label: "Texture", color: "hsl(280, 30%, 55%)" },
];

const skinLog = [
  { date: "Today", score: 74, note: "Good day, applied sunscreen", emoji: "😊" },
  { date: "Yesterday", score: 71, note: "Slight dryness on cheeks", emoji: "😐" },
  { date: "2 days ago", score: 68, note: "Breakout on chin area", emoji: "😔" },
  { date: "3 days ago", score: 73, note: "Used new hydrating mask", emoji: "😊" },
  { date: "4 days ago", score: 76, note: "Skin felt amazing today", emoji: "✨" },
];

const Progress = () => {
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["hydration", "texture"]);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Progress</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Track your skin journey over time</p>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-5 shadow-card mb-4"
      >
        <h3 className="font-display font-semibold text-foreground mb-4">Weekly Trends</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                activeMetrics.includes(m.key)
                  ? "border-transparent text-primary-foreground"
                  : "border-border text-muted-foreground bg-transparent"
              }`}
              style={activeMetrics.includes(m.key) ? { backgroundColor: m.color } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              {metrics
                .filter((m) => activeMetrics.includes(m.key))
                .map((m) => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: m.color }}
                    activeDot={{ r: 5 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Skin Log */}
      <h3 className="font-display font-semibold text-foreground mb-3 mt-6">Skin Journal</h3>
      <div className="space-y-2">
        {skinLog.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3"
          >
            <span className="text-2xl">{entry.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{entry.date}</span>
                <span className="text-sm font-semibold text-primary">{entry.score}</span>
              </div>
              <p className="text-sm text-foreground truncate">{entry.note}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Progress;

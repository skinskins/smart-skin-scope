import { motion } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";

const metrics = [
  { label: "Hydration", value: 72, color: "hsl(200, 60%, 55%)", icon: <Droplets size={18} />, trend: "up" as const },
  { label: "Glow", value: 65, color: "hsl(45, 80%, 65%)", icon: <Sun size={18} />, trend: "stable" as const },
  { label: "Redness", value: 28, color: "hsl(0, 70%, 60%)", icon: <Flame size={18} />, trend: "down" as const },
  { label: "Texture", value: 80, color: "hsl(280, 30%, 55%)", icon: <Fingerprint size={18} />, trend: "up" as const },
  { label: "Oiliness", value: 45, color: "hsl(35, 70%, 55%)", icon: <CircleDot size={18} />, trend: "stable" as const },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-muted-foreground text-sm font-medium">Good morning ✨</p>
        <h1 className="text-2xl font-display font-semibold text-foreground mt-1">Your Skin Today</h1>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center bg-card rounded-3xl p-8 shadow-card mb-6"
      >
        <SkinScoreRing score={74} />
        <p className="mt-4 text-sm text-muted-foreground">Your skin is looking <span className="text-primary font-semibold">good</span> today</p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Calendar size={14} />
          <span>Last scan: 2 hours ago</span>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-4">Skin Metrics</h2>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <MetricCard {...metric} />
          </motion.div>
        ))}
      </div>

      {/* Quick Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-6 bg-card rounded-2xl p-5 shadow-card"
      >
        <h3 className="font-display font-semibold text-foreground mb-3">Quick Log</h3>
        <div className="flex flex-wrap gap-2">
          {["💧 Drank water", "☀️ Used sunscreen", "🧴 Applied moisturizer", "😴 Slept 8h", "🥗 Ate clean"].map((tag) => (
            <button
              key={tag}
              className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

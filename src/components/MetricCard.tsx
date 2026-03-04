import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
}

const MetricCard = ({ label, value, maxValue = 100, color, icon, trend }: MetricCardProps) => {
  const percentage = (value / maxValue) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-display font-semibold text-foreground">{value}</span>
        <span className="text-muted-foreground text-sm mb-1">/ {maxValue}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      {trend && (
        <div className="mt-2 text-xs text-muted-foreground">
          {trend === "up" && "↑ Improving"}
          {trend === "down" && "↓ Declining"}
          {trend === "stable" && "→ Stable"}
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;

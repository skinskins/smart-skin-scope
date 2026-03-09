import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Trend = "up" | "down" | "stable";
type TrendTone = "positive" | "neutral" | "negative";

interface MetricCardProps {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
  icon: ReactNode;
  trend?: Trend;
  trendTone?: TrendTone;
  detail?: string;
}

const trendText: Record<Trend, { label: string; desc: string }> = {
  up: { label: "↑ En hausse", desc: "Cette métrique s'améliore sur les 7 derniers jours." },
  down: { label: "↓ En baisse", desc: "Cette métrique a diminué par rapport à votre moyenne récente." },
  stable: { label: "→ Stable", desc: "Aucun changement significatif détecté récemment." },
};

const MetricCard = ({
  label,
  value,
  maxValue = 100,
  color,
  icon,
  trend,
  trendTone,
  detail,
}: MetricCardProps) => {
  const [open, setOpen] = useState(false);
  const percentage = (value / maxValue) * 100;
  const level = percentage >= 70 ? "Bon" : percentage >= 40 ? "Modéré" : "Faible";

  const computedTone: TrendTone | undefined = trend
    ? (trendTone ?? (trend === "stable" ? "neutral" : trend === "up" ? "positive" : "negative"))
    : undefined;

  const toneClass =
    computedTone === "positive"
      ? "text-primary"
      : computedTone === "neutral"
        ? "text-skin-glow"
        : computedTone === "negative"
          ? "text-destructive"
          : "";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-5 shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
        onClick={() => setOpen(true)}
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
          <div className={`mt-2 text-xs font-medium ${toneClass || "text-muted-foreground"}`}>
            {trendText[trend].label}
          </div>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/60">Appuyez pour le détail</p>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {icon} {label}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Détail complet</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valeur actuelle</span>
              <span className="text-lg font-semibold text-foreground">
                {value}/{maxValue}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${percentage}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Niveau</span>
              <span className="text-sm font-medium" style={{ color }}>
                {level}
              </span>
            </div>
            {trend && (
              <div className="bg-accent rounded-xl p-3">
                <p className={`text-xs font-semibold ${toneClass || "text-accent-foreground"}`}>
                  {trendText[trend].label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{trendText[trend].desc}</p>
              </div>
            )}
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold">Ce qui influence :</span>{" "}
                {label === "Hydratation" && "Apport en eau, humidité, crème hydratante, alcool."}
                {label === "Éclat" && "Qualité du sommeil, sérums vitamine C, fréquence d'exfoliation."}
                {label === "Rougeurs" && "Stress, exposition UV, produits agressifs, allergies."}
                {label === "Texture" && "Rétinol, exfoliation, niveaux d'hydratation."}
                {label === "Sébum" && "Alimentation, hormones, type de nettoyant, humidité."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MetricCard;


import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
        className="premium-card p-5 hover:border-primary/40 transition-all cursor-pointer h-full group relative overflow-hidden"
        onClick={() => setOpen(true)}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-border/40 group-hover:bg-primary/20 transition-colors" style={{ backgroundColor: color + '15' }} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div style={{ color }} className="transition-transform group-hover:scale-110 duration-200 opacity-80">
              {icon}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
          {trend && (
            <div className={cn(
              "px-2 py-0.5 rounded-full border border-border/40 font-medium text-[8px] uppercase tracking-wide",
              computedTone === "positive" ? "text-primary bg-primary/5" :
                computedTone === "negative" ? "text-destructive bg-destructive/5" :
                  "text-muted-foreground bg-muted/20"
            )}>
              {trend}
            </div>
          )}
        </div>
        <div className="flex items-end gap-1.5 mb-4">
          <span className="text-4xl font-display text-foreground leading-none">{value}</span>
          <span className="text-muted-foreground/60 font-medium text-[10px] mb-1">/{maxValue}</span>
        </div>
        <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color, opacity: 0.7 }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[8px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Voir détails →</p>
        </div>
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
              <div className="bg-accent  p-3">
                <p className={`text-xs font-semibold ${toneClass || "text-accent-foreground"}`}>
                  {trendText[trend].label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{trendText[trend].desc}</p>
              </div>
            )}
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            <div className="bg-muted  p-3">
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


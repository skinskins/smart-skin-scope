import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForecastDay, NightDecision } from "../types";

interface Props {
  decision: NightDecision;
  forecast?: ForecastDay[];
  /** Compact rendering for dense screens (e.g. Dashboard) — hides the forecast toggle/strip. */
  compact?: boolean;
}

const CATEGORY_LABEL_FR: Record<NightDecision["category"], string> = {
  retinol: "Rétinol",
  exfoliant: "Exfoliant",
  recovery: "Recovery",
};

const dayLabelFr = (dateISO: string): string => {
  const d = new Date(dateISO + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
};

const NightRecommendationBanner = ({ decision, forecast = [], compact = false }: Props) => {
  const [showForecast, setShowForecast] = useState(false);
  const isRecovery = decision.category === "recovery";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("premium-card mb-4", compact ? "p-3" : "p-4")}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "rounded-full flex items-center justify-center flex-shrink-0",
          compact ? "w-7 h-7" : "w-9 h-9",
          isRecovery ? "bg-muted/30" : "bg-primary/10",
        )}>
          {isRecovery ? (
            <Moon size={compact ? 13 : 16} className="text-muted-foreground" strokeWidth={2} />
          ) : (
            <Sparkles size={compact ? 13 : 16} className="text-primary" strokeWidth={2} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {!compact && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Ce soir
            </p>
          )}
          <p className={cn("font-semibold text-foreground leading-snug", compact ? "text-xs" : "text-sm")}>
            {decision.justificationFr}
          </p>
        </div>
      </div>

      {!compact && forecast.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowForecast((s) => !s)}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
          >
            Voir les prochains jours
            <ChevronDown size={12} className={cn("transition-transform", showForecast && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showForecast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-3">
                  {forecast.map((day) => (
                    <div
                      key={day.date}
                      title={day.justificationFr}
                      className={cn(
                        "flex-1 rounded-lg py-2 px-1 text-center border",
                        day.category === "recovery"
                          ? "bg-muted/15 border-border/30"
                          : "bg-primary/5 border-primary/20",
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase text-muted-foreground/70">
                        {dayLabelFr(day.date)}
                      </p>
                      <p className="text-[10px] font-semibold text-foreground mt-0.5 truncate">
                        {CATEGORY_LABEL_FR[day.category]}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-2 italic">
                  Indicatif — s'ajuste chaque soir selon ta peau, le cycle et la météo.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default NightRecommendationBanner;

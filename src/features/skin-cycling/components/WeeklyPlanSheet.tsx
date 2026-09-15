import { Moon, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { RoutineCard } from "@/components/RoutineCard";
import { cn } from "@/lib/utils";
import type { RoutineProduct } from "@/hooks/useRoutineProducts";
import type { ForecastDay } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  forecast: ForecastDay[];
  /** Routine du matin — ne varie pas selon le cycle, affichée une seule fois en haut du plan. */
  morningProducts: RoutineProduct[];
}

const CATEGORY_LABEL_FR: Record<ForecastDay["category"], string> = {
  retinol: "Rétinol",
  exfoliant: "Exfoliant",
  recovery: "Recovery",
};

const dayLabelFr = (dateISO: string): string => {
  const d = new Date(dateISO + "T00:00:00");
  const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const WeeklyPlanSheet = ({ open, onClose, forecast, morningProducts }: Props) => {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="px-6 pb-10 max-h-[85vh]">
        <DrawerHeader className="text-left px-0 pt-2 pb-4">
          <DrawerTitle className="text-xl font-display text-foreground">Plan de la semaine</DrawerTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            Indicatif — s'ajuste chaque soir selon ta peau, ton cycle et la météo.
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto space-y-5">
          {morningProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                Routine du matin — identique chaque jour
              </p>
              <RoutineCard products={morningProducts} showPhotos />
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Routine du soir — jour par jour
            </p>
            <div className="space-y-2">
              {forecast.map((day) => {
                const isRecovery = day.category === "recovery";
                return (
                  <div
                    key={day.date}
                    className="flex items-start gap-3 rounded-2xl border border-border/15 p-3.5"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isRecovery ? "bg-muted/30" : "bg-primary/10",
                    )}>
                      {isRecovery ? (
                        <Moon size={14} className="text-muted-foreground" strokeWidth={2} />
                      ) : (
                        <Sparkles size={14} className="text-primary" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                        {dayLabelFr(day.date)}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {CATEGORY_LABEL_FR[day.category]}
                        {day.productName ? ` — ${day.productName}` : ""}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                        {day.justificationFr}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default WeeklyPlanSheet;

import { useMemo, useRef, useState } from "react";
import { Moon, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ProductPhoto } from "@/components/ProductPhoto";
import { cn } from "@/lib/utils";
import type { RoutineProduct } from "@/hooks/useRoutineProducts";
import type { ForecastDay } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  forecast: ForecastDay[];
  /** Routine du matin — ne varie pas selon le jour, répétée sur chaque carte. */
  morningProducts: RoutineProduct[];
  /** Produits du soir hors actif fort (ex. crème hydratante) — appliqués chaque soir, répétés sur chaque carte. */
  steadyEveningProducts: RoutineProduct[];
  /** Tous les produits soir pouvant être l'actif fort du jour, pour retrouver photo/marque via ForecastDay.productId. */
  eveningActiveProducts: RoutineProduct[];
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

const MiniProductRow = ({ product, tag }: { product: RoutineProduct; tag?: string }) => (
  <div className="flex items-center gap-2.5 py-1.5">
    <div className="w-8 h-8 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 flex-shrink-0">
      <ProductPhoto url={product.photo_url} name={product.product_name} type={product.product_type} iconSize={12} showPhoto={false} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-medium text-foreground truncate">{product.product_name}</p>
      {product.brand && <p className="text-[10px] text-muted-foreground truncate">{product.brand}</p>}
    </div>
    {tag && (
      <span className="text-[9px] font-bold text-primary-foreground bg-primary rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
        {tag}
      </span>
    )}
  </div>
);

const WeeklyPlanSheet = ({ open, onClose, forecast, morningProducts, steadyEveningProducts, eveningActiveProducts }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeProductsById = useMemo(
    () => new Map(eveningActiveProducts.map((p) => [p.id, p])),
    [eveningActiveProducts],
  );

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 12; // + gap
    setActiveIndex(Math.round(el.scrollLeft / cardWidth));
  };

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el || !el.children[index]) return;
    (el.children[index] as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="pb-8 max-h-[88vh]">
        <DrawerHeader className="text-left pb-3">
          <DrawerTitle className="text-xl font-display text-foreground">Plan de la semaine</DrawerTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            Indicatif — s'ajuste chaque soir selon ta peau, ton cycle et la météo. Glisse pour voir les prochains jours.
          </p>
        </DrawerHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-6 pb-2 scrollbar-hide"
        >
          {forecast.map((day) => {
            const isRecovery = day.category === "recovery";
            const activeProduct = day.productId ? activeProductsById.get(day.productId) : undefined;

            return (
              <div
                key={day.date}
                className="shrink-0 w-[82%] snap-center rounded-2xl border border-border/15 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    isRecovery ? "bg-muted/30" : "bg-primary/10",
                  )}>
                    {isRecovery ? (
                      <Moon size={13} className="text-muted-foreground" strokeWidth={2} />
                    ) : (
                      <Sparkles size={13} className="text-primary" strokeWidth={2} />
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">{dayLabelFr(day.date)}</p>
                </div>

                {morningProducts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Matin</p>
                    <div className="divide-y divide-border/10">
                      {morningProducts.map((p) => <MiniProductRow key={p.id} product={p} />)}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Soir</p>
                  <div className="divide-y divide-border/10">
                    {steadyEveningProducts.map((p) => <MiniProductRow key={p.id} product={p} />)}
                    {activeProduct && (
                      <MiniProductRow product={activeProduct} tag={CATEGORY_LABEL_FR[day.category]} />
                    )}
                    {!activeProduct && steadyEveningProducts.length === 0 && (
                      <p className="text-[12px] text-muted-foreground italic py-1.5">Routine douce</p>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 leading-snug italic">
                  {day.justificationFr}
                </p>
              </div>
            );
          })}
        </div>

        {forecast.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {forecast.map((day, i) => (
              <button
                key={day.date}
                onClick={() => scrollToIndex(i)}
                aria-label={`Aller au jour ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default WeeklyPlanSheet;

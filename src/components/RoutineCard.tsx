import { Check } from "lucide-react";
import type { RoutineProduct } from "@/hooks/useRoutineProducts";
import { ProductPhoto } from "@/components/ProductPhoto";

interface RoutineCardProps {
  products: RoutineProduct[];
  checkedIds?: Set<string>;
  onToggle?: (id: string) => void;
  showPhotos?: boolean;
  emptyMessage?: string;
}

export const RoutineCard = ({
  products,
  checkedIds,
  onToggle,
  showPhotos = false,
  emptyMessage = "Aucun produit dans cette routine",
}: RoutineCardProps) => {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border/15 py-6">
        <p className="text-sm text-muted-foreground text-center">{emptyMessage}</p>
      </div>
    );
  }

  const interactive = !!onToggle;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/15">
      {products.map((product, i) => {
        const isChecked = !!checkedIds?.has(product.id);
        const rowClass = `w-full flex items-center gap-3 py-3.5 px-4 text-left transition-colors ${
          i < products.length - 1 ? "border-b border-border/15" : ""
        }`;

        const content = (
          <>
            {showPhotos ? (
              <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 flex-shrink-0">
                <ProductPhoto url={product.photo_url} name={product.product_name} iconSize={14} />
              </div>
            ) : interactive ? (
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                isChecked ? "bg-[#1a1a1a] border-[#1a1a1a]" : "border-border/40"
              }`}>
                {isChecked && <Check size={10} strokeWidth={3} className="text-white" />}
              </div>
            ) : null}

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium transition-all ${
                isChecked && interactive ? "line-through text-muted-foreground/50" : "text-foreground"
              }`}>
                {product.product_name}
              </p>
              {product.brand && (
                <p className="text-[11px] text-muted-foreground">{product.brand}</p>
              )}
            </div>

            {showPhotos && interactive && (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isChecked ? "bg-primary border-primary" : "border-border/60"
              }`}>
                {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
              </div>
            )}

            {product.frequency === "weekly" && (
              <span className="text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                → Cette semaine
              </span>
            )}
            {product.frequency === "monthly" && (
              <span className="text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                → Ce mois
              </span>
            )}
          </>
        );

        if (interactive) {
          return (
            <button key={product.id} onClick={() => onToggle(product.id)} className={`${rowClass} hover:bg-muted/5`}>
              {content}
            </button>
          );
        }
        return (
          <div key={product.id} className={rowClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

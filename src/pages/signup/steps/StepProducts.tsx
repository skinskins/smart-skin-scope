import { Check, Plus, Scan, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductPhoto } from "@/components/ProductPhoto";
import type { SignupStepProps } from "@/pages/signup/types";

const StepProducts = ({ BackButton, productSearchQuery, setProductSearchQuery, productCatalogResults, selectedOnboardingProducts, onboardingScanLoading, onboardingScanMessage, handleOnboardingProductScan, toggleOnboardingProduct }: SignupStepProps) => {
    return (
        <>
            <div className="mb-6 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Ajouter vos produits</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Votre routine actuelle</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar space-y-4 pr-1">
                <div className="premium-card p-0 overflow-hidden">
                    <div className="p-5 bg-background/50 border-b border-border/50">
                        <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">Rechercher un produit</h2>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Chercher un produit ou marque..." className="pl-10 text-sm rounded-xl py-6 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary" />
                            </div>
                            <label className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center text-foreground/60 hover:bg-muted/40 transition-colors flex-shrink-0 self-center cursor-pointer">
                                {onboardingScanLoading ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Scan size={18} strokeWidth={1.5} />}
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOnboardingProductScan} />
                            </label>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        {productCatalogResults.length > 0 ? (
                            <div className="grid gap-3">
                                {productCatalogResults.map((p: any) => {
                                    const isAdded = selectedOnboardingProducts.some((s: any) => s.id === p.id);
                                    return (
                                        <div key={p.id} className="justify-center flex gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/30 shadow-sm sm:flex-row sm:items-center sm:gap-3">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className="w-14 h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                                                    <ProductPhoto url={p.photo_url} name={p.product_name} type={p.product_type} iconSize={18} />
                                                </div>
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <p className="text-xs font-bold text-foreground break-words">{p.product_name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter break-words">{p.brand}</p>
                                                    {p.product_type && <p className="text-[10px] text-primary/70 mt-0.5 break-words">{p.product_type}</p>}
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => toggleOnboardingProduct(p)} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 self-end sm:self-auto ml-auto sm:ml-0 transition-all ${isAdded ? 'bg-primary/10 text-primary cursor-default' : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'}`}>
                                                {isAdded ? <Check size={16} /> : <Plus size={16} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-[11px] text-muted-foreground italic py-2">Tapez le nom d'un produit ou d'une marque pour rechercher</p>
                        )}
                    </div>
                </div>

                {selectedOnboardingProducts.length > 0 && (
                    <div className="premium-card p-5 max-w-full">
                        <p className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">{selectedOnboardingProducts.length} produit{selectedOnboardingProducts.length > 1 ? 's' : ''} sélectionné{selectedOnboardingProducts.length > 1 ? 's' : ''}</p>
                        <div className="grid gap-2">
                            {selectedOnboardingProducts.map((p: any) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl shadow-sm w-full max-w-full">
                                    <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                                        <ProductPhoto url={p.photo_url} name={p.product_name} type={p.product_type} iconSize={14} showPhoto={false} />
                                    </div>
                                    <div className="flex flex-1 min-w-0 flex-col">
                                        <p className="text-xs font-bold text-foreground break-words">{p.product_name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter break-words">{p.brand}</p>
                                    </div>
                                    <button type="button" onClick={() => toggleOnboardingProduct(p)} className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shrink-0 flex-shrink-0">
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {onboardingScanMessage && (
                <div className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto bg-foreground text-background text-sm rounded-2xl px-4 py-3 text-center z-40">
                    {onboardingScanMessage}
                </div>
            )}
        </>
    );
};

export default StepProducts;

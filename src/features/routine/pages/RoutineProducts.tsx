import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Check, ImageOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  source: "catalog" | "obf";
  // catalog-specific
  catalogRow?: UserProduct;
  // display fields (unified)
  key: string;
  product_name: string;
  brand: string | null;
  photo_url: string | null;
  product_type: string | null;
  ingredients: string | null;
  open_beauty_facts_id: string | null;
}

interface UserProduct {
  id: string;
  open_beauty_facts_id: string | null;
  product_name: string;
  brand: string | null;
  product_type: string | null;
  photo_url: string | null;
  morning_use: boolean;
  evening_use: boolean;
  is_active: boolean;
}

const TYPE_ORDER = ["démaquillant", "nettoyant", "hydratant", "spf", "sérum", "autre"];
const FILTER_CHIPS = ["Tous", ...TYPE_ORDER];

const groupByType = (products: UserProduct[]): [string, UserProduct[]][] => {
  const map: Record<string, UserProduct[]> = {};
  for (const p of products) {
    const key = p.product_type?.toLowerCase() ?? "autre";
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return TYPE_ORDER
    .filter((t) => map[t]?.length)
    .map((t) => [t, map[t]])
    .concat(
      Object.entries(map).filter(([k]) => !TYPE_ORDER.includes(k))
    );
};

// ── Swipeable product card ────────────────────────────────────────
interface ProductCardProps {
  product: UserProduct;
  isSwiped: boolean;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
  onArchive: (id: string) => void;
  onToggle: (id: string, field: "morning_use" | "evening_use", val: boolean) => void;
}

function ProductCard({ product, isSwiped, onSwipeOpen, onSwipeClose, onArchive, onToggle }: ProductCardProps) {
  const startX = useRef(0);
  const dragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = false;
    longPressTimer.current = setTimeout(() => {
      onSwipeOpen(product.id);
    }, 500);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const delta = e.clientX - startX.current;
    if (delta < -50) {
      dragging.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      onSwipeOpen(product.id);
    } else if (delta > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  };

  const onPointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!dragging.current && !isSwiped) onSwipeClose();
  };

  return (
    <div className="relative overflow-hidden border-b border-[#E5E5E5] last:border-b-0">
      {/* Archive strip — revealed on swipe */}
      <div className="absolute inset-y-0 right-0 w-20 bg-[#111111] flex items-center justify-center">
        <button
          onClick={() => onArchive(product.id)}
          className="text-white text-[10px] font-bold uppercase tracking-widest"
        >
          Retirer
        </button>
      </div>

      {/* Card — slides left on swipe */}
      <div
        className="relative bg-white flex items-center gap-3 px-4 py-3 transition-transform duration-200 select-none"
        style={{ transform: isSwiped ? "translateX(-80px)" : "translateX(0)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Photo */}
        <div className="w-11 h-11 border border-[#E5E5E5] flex-shrink-0 overflow-hidden bg-[#F9F9F9] flex items-center justify-center">
          {product.photo_url ? (
            <img
              src={product.photo_url}
              alt={product.product_name}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <ImageOff size={13} className="text-[#CCCCCC]" />
          )}
        </div>

        {/* Name + brand */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#111111] truncate leading-tight">
            {product.product_name}
          </p>
          {product.brand && (
            <p className="text-[10px] font-mono text-[#888888] uppercase tracking-[0.05em] truncate">
              {product.brand}
            </p>
          )}
        </div>

        {/* Morning / Evening toggles */}
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(product.id, "morning_use", !product.morning_use); }}
            className={`px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.05em] border transition-colors ${
              product.morning_use
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white text-[#AAAAAA] border-[#E5E5E5] hover:border-[#111111]"
            }`}
          >
            Matin
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(product.id, "evening_use", !product.evening_use); }}
            className={`px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.05em] border transition-colors ${
              product.evening_use
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white text-[#AAAAAA] border-[#E5E5E5] hover:border-[#111111]"
            }`}
          >
            Soir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function RoutineProducts() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [myProducts, setMyProducts] = useState<UserProduct[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("Tous");
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user's products
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await (supabase as any)
        .from("user_products")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("added_at", { ascending: false });

      if (data) {
        setMyProducts(data);
        setAddedIds(new Set(data.map((p: UserProduct) => p.product_name.toLowerCase())));
      }
    };
    load();
  }, []);

  // Debounced search: catalog first, OBF fallback
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Step 1 — curated catalog
        const { data: catalogRows } = await (supabase as any)
          .from("user_products")
          .select("*")
          .is("user_id", null)
          .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(10);

        const catalogResults: SearchResult[] = (catalogRows ?? []).map((row: UserProduct) => ({
          source: "catalog" as const,
          catalogRow: row,
          key: `catalog-${row.id}`,
          product_name: row.product_name,
          brand: row.brand,
          photo_url: row.photo_url,
          product_type: row.product_type,
          ingredients: row.ingredients ?? null,
          open_beauty_facts_id: row.open_beauty_facts_id,
        }));

        // Step 2 — OBF fallback only if catalog returned < 3
        let obfResults: SearchResult[] = [];
        if (catalogResults.length < 3) {
          try {
            const res = await fetch(
              `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&tagtype_0=categories&tag_contains_0=contains&tag_0=face-care&json=true&page_size=20`
            );
            const json = await res.json();
            const catalogNames = new Set(catalogResults.map((r) => r.product_name.toLowerCase()));
            obfResults = (json.products ?? [])
              .filter((p: any) => !!p.product_name && !catalogNames.has(p.product_name.toLowerCase()))
              .map((p: any) => ({
                source: "obf" as const,
                key: `obf-${p.code || p.product_name}`,
                product_name: p.product_name,
                brand: p.brands || null,
                photo_url: p.image_front_url || null,
                product_type: null,
                ingredients: p.ingredients_text || null,
                open_beauty_facts_id: p.code || null,
              }));
          } catch {
            // OBF unavailable — catalog results alone are fine
          }
        }

        setResults([...catalogResults, ...obfResults]);
      } catch {
        toast.error("Erreur lors de la recherche.");
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAdd = async (result: SearchResult) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload =
      result.source === "catalog" && result.catalogRow
        ? {
            user_id: session.user.id,
            open_beauty_facts_id: result.catalogRow.open_beauty_facts_id,
            product_name: result.catalogRow.product_name,
            brand: result.catalogRow.brand,
            product_type: result.catalogRow.product_type,
            morning_use: result.catalogRow.morning_use,
            evening_use: result.catalogRow.evening_use,
            photo_url: result.catalogRow.photo_url,
            ingredients: result.catalogRow.ingredients ?? null,
          }
        : {
            user_id: session.user.id,
            open_beauty_facts_id: result.open_beauty_facts_id,
            product_name: result.product_name,
            brand: result.brand,
            product_type: result.product_type,
            photo_url: result.photo_url,
            ingredients: result.ingredients,
          };

    const { data, error } = await (supabase as any)
      .from("user_products")
      .insert(payload)
      .select()
      .single();

    if (error) { toast.error("Erreur lors de l'ajout."); return; }

    setMyProducts((prev) => [data, ...prev]);
    setAddedIds((prev) => new Set([...prev, result.product_name.toLowerCase()]));
    toast.success(`${result.product_name} ajouté.`);
  };

  const handleArchive = async (id: string) => {
    await (supabase as any)
      .from("user_products")
      .update({ is_active: false })
      .eq("id", id);
    setMyProducts((prev) => prev.filter((p) => p.id !== id));
    setSwipedId(null);
    toast.success("Produit retiré.");
  };

  const handleToggle = async (id: string, field: "morning_use" | "evening_use", val: boolean) => {
    setMyProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, [field]: val } : p)
    );
    await (supabase as any)
      .from("user_products")
      .update({ [field]: val })
      .eq("id", id);
  };

  const filtered = filter === "Tous"
    ? myProducts
    : myProducts.filter((p) => (p.product_type?.toLowerCase() ?? "autre") === filter);

  const groups = groupByType(filtered);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted transition-colors">
          <ArrowLeft size={20} className="text-[#111111]" />
        </button>
        <h1 className="text-xl font-display font-black text-[#111111] uppercase tracking-tight">
          Ma Routine
        </h1>
      </div>

      <div className="flex flex-col gap-8 px-6">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] bg-white text-sm text-[#111111] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#111111] transition-colors"
          />
        </div>

        {/* Search results */}
        {(searching || results.length > 0) && (
          <div className="flex flex-col border border-[#E5E5E5] bg-white divide-y divide-[#E5E5E5]">
            {searching && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!searching && results.map((result) => {
              const alreadyAdded = addedIds.has(result.product_name.toLowerCase());
              return (
                <div key={result.key} className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 border border-[#E5E5E5] flex-shrink-0 overflow-hidden bg-[#F9F9F9] flex items-center justify-center">
                    {result.photo_url ? (
                      <img
                        src={result.photo_url}
                        alt={result.product_name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <ImageOff size={18} className="text-[#CCCCCC]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#111111] truncate">{result.product_name}</p>
                    {result.brand && (
                      <p className="text-xs text-[#888888] font-mono uppercase tracking-[0.05em] truncate">{result.brand}</p>
                    )}
                  </div>
                  <button
                    onClick={() => !alreadyAdded && handleAdd(result)}
                    disabled={alreadyAdded}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                      alreadyAdded
                        ? "bg-[#F2F2F2] text-[#AAAAAA] cursor-default"
                        : "bg-[#111111] text-white hover:bg-black"
                    }`}
                  >
                    {alreadyAdded ? <Check size={12} /> : <Plus size={12} />}
                    {alreadyAdded ? "Ajouté" : "+ Ajouter"}
                  </button>
                </div>
              );
            })}
            {!searching && results.length === 0 && query.trim() && (
              <p className="text-xs font-mono text-[#888888] uppercase tracking-[0.1em] text-center py-8">
                Aucun résultat pour "{query}"
              </p>
            )}
          </div>
        )}

        {/* My products section */}
        <div onClick={() => swipedId && setSwipedId(null)}>
          <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
            Mes produits
          </h2>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
            {FILTER_CHIPS.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.1em] border transition-colors ${
                  filter === type
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "bg-white text-[#888888] border-[#E5E5E5] hover:border-[#111111]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Hint */}
          <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-widest mb-4">
            ← Glisser pour retirer
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 border border-dashed border-[#E5E5E5]">
              <p className="text-sm font-bold text-[#111111] uppercase tracking-[0.1em]">
                Aucun produit ajouté
              </p>
              <p className="text-xs font-mono text-[#888888] uppercase tracking-[0.05em] text-center max-w-[220px]">
                Recherchez vos produits ci-dessus et ajoutez-les à votre routine.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(([type, products]) => (
                <div key={type}>
                  <p className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-widest mb-2 pl-1">
                    {type}
                  </p>
                  <div className="border border-[#E5E5E5] bg-white">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSwiped={swipedId === product.id}
                        onSwipeOpen={(id) => setSwipedId(id)}
                        onSwipeClose={() => setSwipedId(null)}
                        onArchive={handleArchive}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

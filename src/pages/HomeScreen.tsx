import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Check, X, ChevronRight, Sparkles, Sun, Leaf, Target, Plane } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdviceCardData {
  subtitle: string;
  text: string;
  product: string;
  number: string;
}

interface RoutineProduct {
  name: string;
  recommended: boolean;
}

interface PourVousCardData {
  tag: string;
  title: string;
  bg: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const ADVICE_CARDS: AdviceCardData[] = [
  {
    subtitle: "UV élevé · Protection solaire",
    text: "Les UVA traversent les nuages et accélèrent le vieillissement cutané. Une protection quotidienne est indispensable même par temps couvert.",
    product: "La Roche-Posay Anthelios UV Mune 400",
    number: "01",
  },
  {
    subtitle: "Sommeil · Récupération",
    text: "Moins de 7h de sommeil augmente la production de cortisol et favorise l'apparition d'imperfections. La peau se régénère profondément la nuit.",
    product: "Nuxe Nuit Merveilleuse — Sérum réparateur nocturne",
    number: "02",
  },
  {
    subtitle: "Hydratation · Barrière cutanée",
    text: "Votre apport hydrique influence directement la fermeté et l'éclat. Renforcez votre barrière avec un sérum à l'acide hyaluronique.",
    product: "Vichy Minéral 89 — Acide hyaluronique 89 %",
    number: "03",
  },
];

const POUR_VOUS: PourVousCardData[] = [
  { tag: "Vacances", title: "Routine voyage", bg: "#FFF9F0", Icon: Plane },
  { tag: "Suivi", title: "Programme anti-acné", bg: "#F3F0FF", Icon: Target },
  { tag: "Objectif", title: "Éclat & Glow", bg: "#F0FFF4", Icon: Sparkles },
  { tag: "Produit", title: "SPF quotidien", bg: "#FFF0F0", Icon: Sun },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const ShellIllustration = ({ number }: { number: string }) => (
  <div className="flex items-end gap-2 mt-auto pt-5">
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 3C8.8 3 3 8.8 3 16c0 4.5 2.2 8.5 5.6 11L16 30l7.4-3C26.8 24.5 29 20.5 29 16c0-7.2-5.8-13-13-13z"
        stroke="#D9C5B0"
        strokeWidth="1.5"
        fill="#F8F4EF"
      />
      <path
        d="M10 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="#C8A882"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M13 22c0-1.7 1.3-3 3-3s3 1.3 3 3"
        stroke="#C8A882"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
    <span className="text-4xl font-black text-[#EDE8E3] font-display leading-none select-none">
      {number}
    </span>
  </div>
);

const CardBack = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF6F1] to-[#F0E8DC] gap-5">
    <svg width="68" height="68" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="35" stroke="#E8DDD3" strokeWidth="1.5" strokeDasharray="3 3" />
      <path
        d="M40 14C26.7 14 16 24.7 16 38c0 8 4.5 15 11.3 19L40 61l12.7-4C59.5 53 64 46 64 38c0-13.3-10.7-24-24-24z"
        fill="#F5EDE3"
        stroke="#D9C5B0"
        strokeWidth="1.5"
      />
      <path
        d="M28 40c0-6.6 5.4-12 12-12s12 5.4 12 12"
        stroke="#C8A882"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M33 51c0-3.9 3.1-7 7-7s7 3.1 7 7"
        stroke="#C8A882"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="40" cy="40" r="2.5" fill="#D9C5B0" opacity="0.6" />
    </svg>
    <div className="text-center space-y-1">
      <p className="text-[10px] font-mono font-bold text-[#C8A882] uppercase tracking-[0.2em]">Nacre</p>
      <p className="text-[9px] font-mono text-[#D9C5B0] uppercase tracking-[0.15em]">Votre conseil vous attend</p>
    </div>
  </div>
);

interface AdviceCardProps {
  card: AdviceCardData;
  isFlipped: boolean;
  isActive: boolean;
  isEmpty: boolean;
}

const AdviceCard = ({ card, isFlipped, isActive, isEmpty }: AdviceCardProps) => (
  <div className="w-full h-full" style={{ perspective: "1000px" }}>
    <motion.div
      animate={{ rotateY: isFlipped ? 0 : 180 }}
      initial={false}
      transition={{ duration: 0.65, type: "spring", stiffness: 75, damping: 16 }}
      style={{ transformStyle: "preserve-3d", width: "100%", height: "100%", position: "relative" }}
    >
      {/* Front — advice content */}
      <div
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        className={`absolute inset-0 rounded-2xl p-5 flex flex-col bg-white ${
          isActive ? "border-[3px] border-[#FF6B35]" : "border border-[#E5E5E5]"
        }`}
      >
        <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.15em] mb-3">
          {card.subtitle}
        </p>
        <p className="text-sm text-[#111111] leading-relaxed flex-1">{card.text}</p>
        <p className="text-sm font-bold italic text-[#111111] mt-3 leading-snug">{card.product}</p>
        <ShellIllustration number={card.number} />
      </div>

      {/* Back — illustration or neutral grey */}
      <div
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}
        className={`absolute inset-0 rounded-2xl overflow-hidden ${
          isEmpty
            ? "bg-[#F1F1F1] border-[6px] border-[#D9D9D9]"
            : isActive
            ? "border-[3px] border-[#FF6B35]"
            : "border border-[#E5E5E5]"
        }`}
      >
        {!isEmpty && <CardBack />}
      </div>
    </motion.div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const CARD_W = 248;
const CARD_H = 308;
const SIDE_OFFSET = 198;

const HomeScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeCard, setActiveCard] = useState(0);
  const [flipped, setFlipped] = useState([false, false, false]);
  const [showReady, setShowReady] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [amProducts, setAmProducts] = useState<RoutineProduct[]>([]);

  // Initialise check-in state + routine products
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const checkedIn = localStorage.getItem("lastCheckinDate") === today;
    setHasCheckedIn(checkedIn);

    if (checkedIn && !location.state?.justCompleted) {
      setFlipped([true, false, false]);
    }

    const saved = localStorage.getItem("local_am_routine");
    const raw: string[] = saved
      ? JSON.parse(saved)
      : ["Nettoyant", "Hydratant", "SPF 50"];
    const factors = JSON.parse(localStorage.getItem("dailyCheckinData") || "{}");
    const uv = factors.weather?.uv ?? 0;
    const skip = uv >= 3 ? ["Rétinol"] : [];
    setAmProducts(raw.map((name) => ({ name, recommended: !skip.includes(name) })));

    supabase.auth.getSession().then(({ data: { session } }) => {
      const fn = session?.user?.user_metadata?.first_name;
      if (fn) setUserName(fn);
    });
  }, []);

  // "Tes conseils sont prêts" transition when arriving from check-in
  useEffect(() => {
    if (!location.state?.justCompleted) return;
    const today = new Date().toISOString().split("T")[0];
    setHasCheckedIn(localStorage.getItem("lastCheckinDate") === today);
    setShowReady(true);
    setActiveCard(0);
    const t1 = setTimeout(() => setShowReady(false), 2200);
    const t2 = setTimeout(() => setFlipped([true, false, false]), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.state?.justCompleted]);

  const goToCard = useCallback(
    (idx: number) => {
      if (idx === activeCard) return;
      setActiveCard(idx);
      if (hasCheckedIn) {
        setFlipped((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      }
    },
    [activeCard, hasCheckedIn]
  );

  const next = useCallback(() => goToCard((activeCard + 1) % 3), [activeCard, goToCard]);
  const prev = useCallback(() => goToCard((activeCard + 2) % 3), [activeCard, goToCard]);

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -45 || info.velocity.x < -250) next();
    else if (info.offset.x > 45 || info.velocity.x > 250) prev();
  };

  // Compute card's animated transform based on its relation to activeCard
  const cardProps = (index: number) => {
    const rel = ((index - activeCard) + 3) % 3;
    const adj = rel > 1 ? rel - 3 : rel; // -1, 0, 1
    if (adj === 0) return { x: 0, rotate: 0, scale: 1, zIndex: 10 };
    if (adj === -1) return { x: -SIDE_OFFSET, rotate: -8, scale: 0.88, zIndex: 5 };
    return { x: SIDE_OFFSET, rotate: 8, scale: 0.88, zIndex: 5 };
  };

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-2">
        <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">
          {greeting}{userName ? `, ${userName}` : ""} ✨
        </p>
        <h1 className="text-2xl font-display font-black text-[#111111] uppercase tracking-tight mt-1">
          Accueil
        </h1>
      </div>

      {/* ── Advice Cards Carousel ──────────────────────────────── */}
      <section className="mt-6 mb-8">
        <div className="px-5 mb-4">
          <h2 className="text-base font-display font-bold text-[#111111] uppercase tracking-[0.05em]">
            Mes conseils
          </h2>
        </div>

        {/* "Tes conseils sont prêts" banner */}
        <AnimatePresence>
          {showReady && (
            <motion.div
              key="ready-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-5 mb-3 py-3 bg-[#111111] text-white text-center"
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em]">
                Tes conseils sont prêts ✨
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card stack */}
        <div className="relative" style={{ height: CARD_H + 20 }}>
          <motion.div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onPanEnd={handlePanEnd}
            style={{ touchAction: "pan-y" }}
          >
            {ADVICE_CARDS.map((card, index) => {
              const anim = cardProps(index);
              const rel = ((index - activeCard) + 3) % 3;
              const adj = rel > 1 ? rel - 3 : rel;
              const isSide = adj !== 0;

              return (
                <motion.div
                  key={index}
                  animate={{ x: anim.x, rotate: anim.rotate, scale: anim.scale }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  style={{
                    position: "absolute",
                    width: CARD_W,
                    height: CARD_H,
                    left: "50%",
                    marginLeft: -CARD_W / 2,
                    top: 10,
                    zIndex: anim.zIndex,
                  }}
                  onClick={isSide ? () => goToCard(index) : undefined}
                  className={isSide ? "cursor-pointer" : ""}
                >
                  <AdviceCard
                    card={card}
                    isFlipped={hasCheckedIn && flipped[index]}
                    isActive={index === activeCard}
                    isEmpty={!hasCheckedIn}
                  />
                </motion.div>
              );
            })}
          </motion.div>

          {/* CTA overlay — empty state only */}
          <AnimatePresence>
            {!hasCheckedIn && !showReady && (
              <motion.div
                key="checkin-cta"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
              >
                <button
                  className="pointer-events-auto px-8 py-4 bg-[#111111] text-white text-xs font-bold uppercase tracking-[0.15em] shadow-xl hover:bg-black transition-colors"
                  onClick={() => navigate("/checkin")}
                >
                  Faire mon check-in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => goToCard(i)}
              className={`transition-all rounded-full ${
                i === activeCard
                  ? "w-5 h-2 bg-[#111111]"
                  : "w-2 h-2 bg-[#D9D9D9] hover:bg-[#AAAAAA]"
              }`}
              aria-label={`Carte ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Morning Routine ────────────────────────────────────── */}
      <section className="mx-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-display font-bold text-[#111111] uppercase tracking-[0.05em]">
            Ma routine du matin
          </h2>
          <span className="text-[11px] font-mono text-[#AAAAAA] font-bold uppercase tracking-[0.1em]">
            {amProducts.filter((p) => p.recommended).length} produits
          </span>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-4">
          {amProducts.length === 0 ? (
            <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-[0.1em] italic py-2">
              Aucun produit configuré
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {amProducts.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-1.5 border-b border-[#F5F5F5] last:border-0"
                >
                  <span
                    className={`text-sm font-medium ${
                      p.recommended ? "text-[#111111]" : "line-through text-[#BBBBBB]"
                    }`}
                  >
                    {p.name}
                  </span>
                  {p.recommended ? (
                    <Check size={15} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <X size={15} className="text-[#FF3B30] flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/routine/products")}
            className="w-full py-3 border border-[#111111] text-[#111111] text-xs font-bold uppercase tracking-[0.1em] hover:bg-[#111111] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            Démarrer ma routine
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* ── Pour Vous ─────────────────────────────────────────── */}
      <section className="mx-5 mb-8">
        <h2 className="text-base font-display font-bold text-[#111111] uppercase tracking-[0.05em] mb-1">
          Pour vous…
        </h2>
        <p className="text-xs text-[#AAAAAA] font-mono uppercase tracking-[0.1em] mb-4">
          programmes, objectifs
        </p>

        <div className="grid grid-cols-2 gap-3">
          {POUR_VOUS.map((card, i) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              style={{ backgroundColor: card.bg }}
              className="border border-[#E5E5E5] p-4 text-left hover:shadow-sm transition-shadow active:scale-[0.98]"
            >
              <span className="text-[9px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] mb-2 block">
                {card.tag}
              </span>
              <p className="text-sm font-display font-bold text-[#111111] leading-tight mb-4">
                {card.title}
              </p>
              <card.Icon size={20} className="text-[#CCCCCC]" />
            </motion.button>
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomeScreen;

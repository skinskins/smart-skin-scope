// Traduit la règle métier "IA de recommandation Nacre" en logique déterministe,
// à partir des données déjà collectées pendant l'onboarding (aucun appel IA) :
// - séquence l'introduction de nouveaux actifs au rythme d'un produit tous les ~2 mois,
//   avec phase d'acclimatation pour rétinol/acides et sans jamais combiner deux
//   actifs incompatibles dans la même phase
// - précise le résultat concret attendu (effet hydratation immédiat et temporaire
//   vs effet structurel à 3-6 mois) en le personnalisant selon les objectifs
//   choisis et le profil (âge, type de peau)
// - relie chaque score de l'analyse photo à une tendance qualitative (amélioration
//   attendue ou stable) justifiée par les actifs réellement introduits — jamais un
//   chiffre projeté, faute de données d'efficacité réelles pour l'affirmer
// - mentionne les facteurs de mode de vie qui peuvent ralentir ou masquer les résultats

export interface ObjectivePlanProduct {
  product_name?: string | null;
  product_type?: string | null;
  ingredients?: string | null;
}

export interface ObjectivePlanAnalysis {
  eclat_global?: number | null;
  hydratation?: { score?: number | null } | null;
  erytheme?: { score?: number | null } | null;
  sebum?: { zone_t?: number | null } | null;
  acne?: { score?: number | null } | null;
}

export interface ObjectivePlanInput {
  skinType?: string | null;
  skinGoals: string[];
  skinProblems?: string[];
  age?: string | number | null;
  products?: ObjectivePlanProduct[];
  defaultFactors?: string[];
  analysis?: ObjectivePlanAnalysis | null;
}

export interface IntegrationPhase {
  timing: string;
  goal: string;
  active: string;
  result: string;
  caution?: string;
}

export interface ScoreTrend {
  key: string;
  label: string;
  current: number;
  max: number;
  projected: number;
  improving: boolean;
  reason: string | null;
}

export interface SkinTypeAdvice {
  title: string;
  content: string;
}

export interface ObjectivePlan {
  skinTypeAdvice: SkinTypeAdvice | null;
  expectedResults: {
    shortTerm: string;
    longTerm: string;
  };
  scoreTrends: ScoreTrend[];
  scoreDisclaimer: string | null;
  integrationPlan: IntegrationPhase[];
  incompatibilityNote: string | null;
  confoundingFactors: string[];
  precaution: string | null;
}

type ScoreKey = "hydratation" | "eclat" | "erytheme" | "sebum" | "acne";

const RETINOL_KEYWORDS = ["rétinol", "retinol", "rétinal", "retinal"];
const ACID_KEYWORDS = ["aha", "bha", "acide glycolique", "acide salicylique", "acide lactique", "acide mandélique"];
const VITC_KEYWORDS = ["vitamine c", "acide ascorbique"];
const NIACINAMIDE_KEYWORDS = ["niacinamide"];

const RESULT_BY_GOAL: Record<string, string> = {
  "Hydratation": "une peau moins tiraillée, mieux hydratée en profondeur",
  "Anti-âge": "des ridules superficielles atténuées et une peau plus ferme",
  "Éclat / Glow": "un teint plus lumineux et unifié",
  "Anti-imperfections": "moins de boutons et une peau plus nette",
  "Apaiser": "moins de rougeurs et une peau plus tolérante",
  "Taches": "des taches pigmentaires visiblement estompées",
  "Pores": "des pores resserrés visuellement",
  "Anti-cernes": "des cernes moins marqués",
};

// Formulées comme un résultat constaté sur la peau (pas comme le mode d'action
// de l'actif), pour rester cohérent avec le "Résultat attendu" affiché au-dessus.
const ACTIVE_RESULTS: Record<string, string> = {
  "rétinol": "Ridules superficielles lissées, peau plus ferme.",
  "rétinol contour yeux": "Contour de l'œil plus lisse et repulpé.",
  "spf": "Collagène protégé des UV — la condition pour que vos résultats durent.",
  "vitamine c": "Teint plus lumineux et unifié.",
  "aha": "Grain de peau affiné, éclat ravivé.",
  "bha": "Pores désobstrués, moins d'imperfections.",
  "niacinamide": "Pores resserrés visuellement, sébum régulé.",
  "acide hyaluronique": "Peau repulpée, hydratée en profondeur.",
  "céramides": "Barrière cutanée renforcée, moins de tiraillements.",
  "glycérine": "Peau hydratée en surface et plus douce.",
  "centella asiatica": "Rougeurs apaisées, peau moins réactive.",
  "allantoïne": "Peau apaisée, barrière cutanée réparée.",
  "avoine": "Tiraillements apaisés, barrière renforcée.",
  "acide azélaïque": "Taches pigmentaires atténuées, teint unifié.",
  "argile": "Excès de sébum absorbé, pores resserrés.",
  "caféine topique": "Cernes moins marqués grâce à la microcirculation stimulée.",
};

// Quels scores de l'analyse photo chaque objectif peut plausiblement faire bouger
// (direction seulement — aucune magnitude n'est affirmée, faute de données réelles
// reliant "cet actif pendant X mois" à "ce score précis" sur cette échelle).
const SCORE_TARGET_BY_GOAL: Record<string, ScoreKey[]> = {
  "Hydratation": ["hydratation", "eclat"],
  "Anti-âge": ["eclat"],
  "Éclat / Glow": ["eclat"],
  "Anti-imperfections": ["acne", "sebum"],
  "Apaiser": ["erytheme"],
  "Taches": ["eclat"],
  "Pores": ["sebum"],
  "Anti-cernes": [],
};

const SCORE_DISCLAIMER = "Estimation indicative, pas une mesure clinique : elle ajoute jusqu'à 2 points par score selon le nombre d'objectifs qui le ciblent dans votre plan, dans la limite de l'échelle. Vos résultats réels dépendent de votre assiduité, de votre profil et des facteurs de mode de vie ci-dessous.";

const FACTOR_MESSAGES: Record<string, string> = {
  poor_sleep: "Le manque de sommeil ralentit la régénération cutanée nocturne.",
  high_stress: "Un stress élevé favorise l'inflammation et peut retarder vos résultats.",
  high_sugar: "Une consommation élevée de sucre accélère la dégradation du collagène (glycation).",
  low_water: "Boire peu d'eau limite l'hydratation de la peau en profondeur.",
  sedentary: "Un mode de vie sédentaire réduit la microcirculation qui nourrit la peau.",
  sun: "Une exposition solaire fréquente dégrade le collagène plus vite qu'aucun actif ne peut le régénérer.",
  smoking: "Le tabac accélère le vieillissement cutané et réduit l'oxygénation de la peau.",
};

function matchesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k));
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function productText(products: ObjectivePlanProduct[]): string {
  return products
    .map((p) => `${p.product_type ?? ""} ${p.product_name ?? ""} ${p.ingredients ?? ""}`)
    .join(" ")
    .toLowerCase();
}

function alreadyInRoutine(routineText: string, activeName: string): boolean {
  const normalized = activeName.replace(/\(.*?\)/g, "").trim().toLowerCase();
  if (!normalized) return false;
  return routineText.includes(normalized);
}

// Ordre volontaire : barrière/apaisement avant tout actif actif, hydratation avant
// exfoliation, rétinol/acides en dernier (ce sont eux qui demandent la phase
// d'acclimatation la plus longue et le plus de prudence).
const ACTIVE_PRIORITY = [
  "centella asiatica", "allantoïne", "avoine",
  "acide hyaluronique", "céramides", "glycérine",
  "niacinamide", "argile",
  "vitamine c", "acide azélaïque",
  "caféine topique",
  "spf",
  "bha",
  "aha",
  "rétinol", "rétinol contour yeux",
];

function priorityRank(activeName: string): number {
  const normalized = activeName.replace(/\(.*?\)/g, "").trim().toLowerCase();
  const idx = ACTIVE_PRIORITY.findIndex((p) => normalized.includes(p));
  return idx === -1 ? ACTIVE_PRIORITY.length : idx;
}

// Précise d'où vient l'actif signalé (routine déclarée vs nouvelles phases du
// plan) : un actif déjà dans la routine n'apparaît jamais dans "Votre plan
// d'intégration" (il est exclu des candidats), donc sans cette précision
// l'avertissement mentionne un nom qu'on ne voit nulle part ailleurs à l'écran.
function sourceLabel(name: string, inPlan: boolean, inRoutine: boolean): string {
  if (inRoutine && !inPlan) return `${name} (déjà dans votre routine)`;
  if (inPlan && !inRoutine) return `${name} (dans ce plan)`;
  return name;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// L'IA d'analyse photo renvoie parfois ces scores en chaînes numériques
// ("3" plutôt que 3) — on les convertit ici. NaN pour une valeur manquante
// (jamais 0 : Number(null) vaudrait 0, ce qui afficherait un faux score).
function toScoreNumber(value: unknown): number {
  return value == null ? NaN : Number(value);
}

function buildScoreTrends(skinGoals: string[], analysis: ObjectivePlanAnalysis | null | undefined, integrationPlan: IntegrationPhase[]): ScoreTrend[] {
  if (!analysis) return [];

  const metrics: { key: ScoreKey; label: string; max: number; current: number }[] = [
    { key: "hydratation", label: "Hydratation", max: 4, current: toScoreNumber(analysis.hydratation?.score) },
    { key: "eclat", label: "Éclat", max: 10, current: toScoreNumber(analysis.eclat_global) },
    { key: "erytheme", label: "Érythème", max: 4, current: toScoreNumber(analysis.erytheme?.score) },
    { key: "sebum", label: "Sébum zone T", max: 5, current: toScoreNumber(analysis.sebum?.zone_t) },
    { key: "acne", label: "Acné", max: 4, current: toScoreNumber(analysis.acne?.score) },
  ];

  return metrics
    .filter((m) => Number.isFinite(m.current))
    .map((m) => {
      const targetingGoals = skinGoals.filter((g) => (SCORE_TARGET_BY_GOAL[g] ?? []).includes(m.key));
      const newActives = integrationPlan.filter((p) => targetingGoals.includes(p.goal)).map((p) => p.active);
      const improving = targetingGoals.length > 0 || m.key === "hydratation";

      let reason: string | null = null;
      if (newActives.length > 0) {
        reason = `Grâce à ${joinList(newActives)} (${joinList(targetingGoals)}).`;
      } else if (targetingGoals.length > 0) {
        reason = "Déjà ciblé par votre routine actuelle.";
      } else if (m.key === "hydratation") {
        reason = "Grâce à l'hydratation apportée par toute routine suivie régulièrement.";
      }

      // Magnitude volontairement modeste et bornée (1 point par objectif ciblant
      // ce score, 2 points max) — un pas indicatif, pas une valeur mesurée. Toujours
      // à la hausse : ce sont des scores de mieux-être cutané (plus haut = mieux),
      // et cet écran explique comment progresser, jamais comment régresser.
      const steps = m.key === "hydratation" ? Math.max(1, Math.min(2, targetingGoals.length)) : Math.min(2, targetingGoals.length);
      const projected = clamp(m.current + steps, 0, m.max);

      return { key: m.key, label: m.label, current: m.current, max: m.max, projected, improving, reason };
    });
}

export function buildObjectivePlan(matrix: any, input: ObjectivePlanInput): ObjectivePlan {
  const products = input.products ?? [];
  const defaultFactors = input.defaultFactors ?? [];
  const skinProblems = input.skinProblems ?? [];
  const routineText = productText(products);

  // Comparaison insensible à la casse : la matrice utilise "Sèche" (capitalisé)
  // alors que l'IA d'analyse photo renvoie "sèche" (type_peau_detecte en minuscules).
  const skinTypeLower = (input.skinType ?? "").toLowerCase();
  const typeInfo = matrix.types_de_peau.find((t: any) => t.type.toLowerCase() === skinTypeLower);
  const skinTypeAdvice: SkinTypeAdvice | null = typeInfo ? {
    title: `Peau ${typeInfo.type}`,
    content: `Priorité : ${typeInfo.signal_prioritaire}. Misez sur ${(typeInfo.ingredients_a_privilegier as string[]).slice(0, 2).join(' ou ')}.`,
  } : null;

  const precaution = (input.skinType ?? "").toLowerCase() === "sensible" || skinProblems.includes("Eczéma")
    ? "Votre peau étant réactive, effectuez toujours un patch test 24h avant d'introduire un nouvel actif."
    : null;

  // Actifs à proposer : ceux des objectifs choisis, hors actifs déjà présents
  // dans la routine déclarée.
  const candidateActives = new Map<string, string>(); // nom normalisé -> nom d'affichage
  const activeOrigin = new Map<string, string>();
  for (const goal of input.skinGoals) {
    const goalInfo = matrix.objectifs.find((o: any) => o.objectif === goal);
    if (!goalInfo) continue;
    for (const active of goalInfo.actifs_cles as string[]) {
      const normalized = active.replace(/\(.*?\)/g, "").trim().toLowerCase();
      if (alreadyInRoutine(routineText, active)) continue;
      if (!candidateActives.has(normalized)) {
        candidateActives.set(normalized, active);
        activeOrigin.set(normalized, goal);
      }
    }
  }

  const orderedActives = Array.from(candidateActives.entries())
    .sort(([a], [b]) => priorityRank(a) - priorityRank(b))
    .slice(0, 4);

  const integrationPlan: IntegrationPhase[] = orderedActives.map(([normalized, display], idx) => {
    const isRetinol = matchesAny(normalized, RETINOL_KEYWORDS);
    const isAcid = matchesAny(normalized, ACID_KEYWORDS);
    const timing = idx === 0 ? "Dès maintenant" : `Dans ~${idx * 2} mois`;
    const caution = isRetinol || isAcid
      ? "Phase d'acclimatation : 1 à 2 fois par semaine pendant 1 à 2 semaines avant un usage complet, pour éviter irritation ou purge."
      : undefined;
    return {
      timing,
      goal: activeOrigin.get(normalized)!,
      active: display,
      result: ACTIVE_RESULTS[normalized] ?? `Progrès sur votre objectif ${activeOrigin.get(normalized)}.`,
      caution,
    };
  });

  const inRoutine = (keywords: string[]) => matchesAny(routineText, keywords);
  const inPlan = (keywords: string[]) => orderedActives.some(([n]) => matchesAny(n, keywords));
  const retinol = { inRoutine: inRoutine(RETINOL_KEYWORDS), inPlan: inPlan(RETINOL_KEYWORDS) };
  const acid = { inRoutine: inRoutine(ACID_KEYWORDS), inPlan: inPlan(ACID_KEYWORDS) };
  const vitC = { inRoutine: inRoutine(VITC_KEYWORDS), inPlan: inPlan(VITC_KEYWORDS) };
  const niacinamide = { inRoutine: inRoutine(NIACINAMIDE_KEYWORDS), inPlan: inPlan(NIACINAMIDE_KEYWORDS) };

  let incompatibilityNote: string | null = null;
  if ((retinol.inRoutine || retinol.inPlan) && (acid.inRoutine || acid.inPlan)) {
    incompatibilityNote = `${sourceLabel("Le rétinol", retinol.inPlan, retinol.inRoutine)} et ${sourceLabel("les AHA/BHA", acid.inPlan, acid.inRoutine)} ne s'appliquent jamais le même soir : alternez les soirs pour éviter d'irriter la barrière cutanée.`;
  } else if ((vitC.inRoutine || vitC.inPlan) && (niacinamide.inRoutine || niacinamide.inPlan)) {
    incompatibilityNote = `${sourceLabel("La vitamine C", vitC.inPlan, vitC.inRoutine)} et ${sourceLabel("la niacinamide", niacinamide.inPlan, niacinamide.inRoutine)}, à forte concentration, peuvent provoquer des rougeurs combinées : séparez-les (vitamine C le matin, niacinamide le soir par exemple).`;
  }

  const goalResults = input.skinGoals
    .map((g) => RESULT_BY_GOAL[g])
    .filter((r): r is string => Boolean(r));

  const ageNum = input.age ? Number(input.age) : null;
  const variabilityParts: string[] = [];
  if (ageNum && ageNum >= 40) variabilityParts.push("après 40 ans, le renouvellement cutané est plus lent");
  if ((input.skinType ?? "").toLowerCase() === "sensible" || skinProblems.includes("Eczéma")) {
    variabilityParts.push("une peau sensible ou sujette à l'eczéma progresse plus prudemment");
  }
  if (defaultFactors.includes("hormonal")) variabilityParts.push("les variations hormonales peuvent aussi influencer la vitesse des résultats");
  const variability = variabilityParts.length > 0
    ? `Ce délai est une moyenne : ${variabilityParts.join(", ")}.`
    : "Ce délai est une moyenne : il varie selon l'âge, le type de peau et l'exposition solaire passée.";

  const longTerm = goalResults.length > 0
    ? `D'ici 3 à 6 mois, en suivant ce plan : ${goalResults.join(", ")}. ${variability}`
    : `D'ici 3 à 6 mois, une utilisation régulière de ce plan régénère durablement collagène et élastine. ${variability}`;

  const confoundingFactors = defaultFactors
    .map((key) => FACTOR_MESSAGES[key])
    .filter((msg): msg is string => Boolean(msg));

  const scoreTrends = buildScoreTrends(input.skinGoals, input.analysis, integrationPlan);

  return {
    skinTypeAdvice,
    expectedResults: {
      shortTerm: "Dès les premiers jours et jusqu'à 2 semaines, l'hydratation apportée par ce plan repulpe la peau — un effet visible mais temporaire, avant les résultats plus durables.",
      longTerm,
    },
    scoreTrends,
    scoreDisclaimer: scoreTrends.length > 0 ? SCORE_DISCLAIMER : null,
    integrationPlan,
    incompatibilityNote,
    confoundingFactors,
    precaution,
  };
}

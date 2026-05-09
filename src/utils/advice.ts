import skincareMatrix from "@/data/skincare_matrix_v3.json";

export interface AdviceItem {
    iconStr: string;
    title: string;
    text: string;
    tip: string;
    group: "g1" | "g2" | "g3" | "g4";
    priority: "high" | "medium" | "low";
    ingredients?: string[];
    spfData?: any;
}

export interface Context {
    skinType: string;
    uvIndex: number;
    tempC: number;
    humidity: number;
    aqi: number;
    sleepHours: number;
    stressLevel: number;
    alcoholLastNight: number;
    removedMakeupLastNight: boolean;
    didSportToday: boolean;
    cycleDay: number | null;
    symptoms?: Record<string, string>;
}

type TriggerCondition = boolean | { gte?: number; lte?: number };

export function evaluateTrigger(ctx: Context, trigger: Record<string, TriggerCondition>): boolean {
    for (const [key, cond] of Object.entries(trigger)) {
        const val = ctx[key as keyof Context];

        if (typeof cond === "boolean") {
            if (val !== cond) return false;
        } else if (typeof cond === "object" && cond !== null) {
            const numVal = val as number;
            if (numVal === null || numVal === undefined) return false;
            const triggerObj = cond as { gte?: number; lte?: number };
            if (triggerObj.gte !== undefined && numVal < triggerObj.gte) return false;
            if (triggerObj.lte !== undefined && numVal > triggerObj.lte) return false;
        }
    }
    return true;
}

export function getActiveAdvice(ctx: Context): AdviceItem[] {
    const results: AdviceItem[] = [];
    const skinType = ctx.skinType as "dry" | "oily" | "combo" | "normal";

    const processGroup = (groupKey: "g1" | "g2" | "g3" | "g4", priority: "high" | "medium" | "low") => {
        // @ts-ignore
        const group = skincareMatrix.groups[groupKey];
        if (!group) return;

        for (const scenario of group.scenarios) {
            if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
                // @ts-ignore
                const spec = scenario.advice[skinType] as { title: string; body: string; tip: string; ingredients?: string[] };
                if (spec) {
                    results.push({
                        iconStr: scenario.icon,
                        title: spec.title,
                        text: spec.body,
                        tip: spec.tip,
                        group: groupKey,
                        priority: priority,
                        ingredients: spec.ingredients || [],
                        // @ts-ignore
                        spfData: scenario.spfData
                    });
                }
            }
        }
    };

    processGroup("g3", "high");
    processGroup("g4", "high");
    processGroup("g1", "medium");
    processGroup("g2", "low");

    // Add dynamic symptom-based advice
    if (ctx.symptoms) {
        const SYMPTOM_ADVICE: Record<string, AdviceItem> = {
            "acné": {
                iconStr: "🧪",
                title: "Poussée d'acné",
                text: "Une recrudescence d'imperfections a été notée.",
                tip: "Utilisez un soin localisé à l'acide salicylique et évitez de toucher les zones enflammées.",
                group: "g3",
                priority: "high",
                ingredients: ["Acide Salicylique", "Niacinamide", "Zinc"]
            },
            "rougeurs": {
                iconStr: "🌡️",
                title: "Sensibilité accrue",
                text: "Vos rougeurs semblent s'intensifier aujourd'hui.",
                tip: "Privilégiez des soins apaisants à base de Centella Asiatica et évitez les gommages à grains.",
                group: "g3",
                priority: "high",
                ingredients: ["Centella Asiatica", "Panthénol", "Bisabolol"]
            },
            "sécheresse": {
                iconStr: "🌵",
                title: "Peau déshydratée",
                text: "Votre peau tiraille plus que d'habitude.",
                tip: "Appliquez votre crème sur peau légèrement humide et renforcez la barrière avec des céramides.",
                group: "g3",
                priority: "high",
                ingredients: ["Acide Hyaluronique", "Céramides", "Squalane"]
            },
            "eczéma": {
                iconStr: "🌿",
                title: "Poussée d'eczéma",
                text: "Zone de sécheresse intense ou irritation détectée.",
                tip: "Utilisez un baume émollient sans parfum et évitez l'eau trop chaude lors du nettoyage.",
                group: "g3",
                priority: "high",
                ingredients: ["Céramides", "Beurre de karité", "Eau thermale"]
            },
            "taches": {
                iconStr: "☀️",
                title: "Pigmentation accentuée",
                text: "Les taches semblent plus visibles ou foncées.",
                tip: "La protection solaire est cruciale aujourd'hui pour éviter l'oxydation de la mélanine.",
                group: "g1",
                priority: "medium",
                ingredients: ["Vitamine C", "Acide Azélaïque", "SPF 50"]
            },
            "rides": {
                iconStr: "⏳",
                title: "Ridules de déshydratation",
                text: "Les ridules paraissent plus marquées.",
                tip: "Une hydratation profonde aidera à repulper l'épiderme immédiatement.",
                group: "g2",
                priority: "low",
                ingredients: ["Peptides", "Acide Hyaluronique"]
            }
        };

        Object.entries(ctx.symptoms).forEach(([symptom, trend]) => {
            if (trend === "plus" && SYMPTOM_ADVICE[symptom]) {
                results.push(SYMPTOM_ADVICE[symptom]);
            }
        });
    }

    return results.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    }).slice(0, 5);
}

export const SKIN_TYPE_MAP: Record<string, string> = {
    "Sensible": "dry",
    "Sèche": "dry",
    "Grasse": "oily",
    "Mixte": "combo",
    "Normale": "normal",
};

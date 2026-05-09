import skincareMatrix from "@/data/skincare_matrix_v3.json";
import skincareMatrixExtended from "@/data/skincare_matrix_extended.json";


export interface AdviceItem {
    iconStr: string;
    title: string;
    text: string;
    tip: string;
    group: "g1" | "g2" | "g3" | "g4" | "g5" | "g6" | "g7" | "g8";
    priority: "high" | "medium" | "low";
    ingredients?: string[];
    spfData?: any;
    zone?: string;
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
    cyclePhase?: string;
    regularityScore?: number;
    morningRoutineDone?: boolean;
    eveningRoutineDone?: boolean;
    makeupRemoved?: boolean;
    spfApplied?: boolean;
    symptoms?: Record<string, string>;
    symptomZones?: Record<string, string | null>;
}


type TriggerCondition = boolean | { gte?: number; lte?: number };

export function evaluateTrigger(ctx: Context, trigger: Record<string, TriggerCondition>): boolean {
    for (const [key, cond] of Object.entries(trigger)) {
        const val = ctx[key as keyof Context];

        if (typeof cond === "boolean") {
            if (val !== cond) return false;
        } else if (typeof cond === "string") {
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

    const processGroup = (matrix: any, groupKey: string, priority: "high" | "medium" | "low") => {
        const group = matrix.groups[groupKey];
        if (!group) return;

        for (const scenario of group.scenarios) {
            // Special handling for symptom-based triggers (G5, G7)
            if (scenario.trigger.symptom) {
                const symptom = scenario.trigger.symptom;
                const trend = ctx.symptoms?.[symptom];
                if (trend === scenario.trigger.trend) {
                    // Check zone if present (G7)
                    if (scenario.trigger.zone) {
                        const zone = ctx.symptomZones?.[symptom];
                        if (zone !== scenario.trigger.zone) continue;
                    }
                    
                    const spec = scenario.advice[skinType];
                    if (spec) {
                        results.push({
                            iconStr: scenario.icon,
                            title: spec.title,
                            text: spec.body || spec.text || "",
                            tip: spec.tip,
                            group: groupKey as any,
                            priority: priority,
                            ingredients: spec.ingredients || [],
                            spfData: scenario.spfData,
                            zone: scenario.trigger.zone
                        });
                    }
                }
                continue;
            }

            // Special handling for cycle-based triggers (G6)
            if (scenario.trigger.cyclePhase) {
                const phase = ctx.cyclePhase?.toLowerCase();
                // Map "menstruation" -> "menstruelle", "lutéal" -> "lutéale"
                const mappedPhase = phase === "menstruation" ? "menstruelle" : (phase === "lutéal" ? "lutéale" : phase);
                if (mappedPhase !== scenario.trigger.cyclePhase) continue;
                
                const spec = scenario.advice[skinType];
                if (spec) {
                    results.push({
                        iconStr: scenario.icon,
                        title: spec.title,
                        text: spec.body || spec.text || "",
                        tip: spec.tip,
                        group: groupKey as any,
                        priority: priority,
                        ingredients: spec.ingredients || [],
                        spfData: scenario.spfData
                    });
                }
                continue;
            }

            if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
                const spec = scenario.advice[skinType];
                if (spec) {
                    results.push({
                        iconStr: scenario.icon,
                        title: spec.title,
                        text: spec.body || spec.text || "",
                        tip: spec.tip,
                        group: groupKey as any,
                        priority: priority,
                        ingredients: spec.ingredients || [],
                        spfData: scenario.spfData
                    });
                }
            }
        }
    };

    // V3 Matrix groups
    processGroup(skincareMatrix, "g3", "high");
    processGroup(skincareMatrix, "g4", "high");
    processGroup(skincareMatrix, "g1", "medium");
    processGroup(skincareMatrix, "g2", "low");

    // Extended Matrix groups (G5 to G8)
    processGroup(skincareMatrixExtended, "g5", "high");
    processGroup(skincareMatrixExtended, "g7", "high");
    processGroup(skincareMatrixExtended, "g6", "medium");
    processGroup(skincareMatrixExtended, "g8", "low");

    return results.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    }).slice(0, 8); // Increased slice to 8 to show more rich advice
}


export const SKIN_TYPE_MAP: Record<string, string> = {
    "Sensible": "dry",
    "Sèche": "dry",
    "Grasse": "oily",
    "Mixte": "combo",
    "Normale": "normal",
};

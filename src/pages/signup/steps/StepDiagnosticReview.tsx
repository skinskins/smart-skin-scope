import { useEffect, useState } from "react";
import { Calendar, ChevronDown, Droplet, Leaf, ShieldAlert, Shuffle, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { normalizeCarnation } from "@/utils/carnation";
import type { SignupStepProps } from "@/pages/signup/types";

const SKIN_TYPES = [
    { value: "normale", label: "Normale", icon: Leaf },
    { value: "sèche", label: "Sèche", icon: Droplet },
    { value: "grasse", label: "Grasse", icon: Sun },
    { value: "mixte", label: "Mixte", icon: Shuffle },
    { value: "sensible", label: "Sensible", icon: ShieldAlert },
];

const SKIN_PROBLEMS = ['Acné', 'Rides', 'Taches', 'Rougeurs', 'Cernes', 'Sécheresse', 'Eczéma'];

const CARNATION_OPTIONS = [
    { value: "très_claire", label: "Très claire", color: "#F5E6D8" },
    { value: "claire", label: "Claire", color: "#EAC9A8" },
    { value: "beige_doré", label: "Beige dorée", color: "#C8924F" },
    { value: "olive_caramel", label: "Olive-Caramel", color: "#A0622A" },
    { value: "foncée", label: "Foncée", color: "#6B3A1F" },
    { value: "ébène", label: "Ébène", color: "#2C1810" },
];

const kpiSelectTriggerClass = "h-auto w-full border-none bg-transparent p-0 text-sm font-bold text-foreground shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:opacity-40 [&>svg]:h-3.5 [&>svg]:w-3.5";

const StepDiagnosticReview = ({
    BackButton,
    age,
    setAge,
    onboardingPhotoBase64,
    analysisLoading,
    onboardingAnalysis,
    correctedSkinType,
    setCorrectedSkinType,
    correctedProblems = [],
    setCorrectedProblems,
    carnation,
    setCarnation,
    skipIntroLoader,
}: SignupStepProps) => {
    const [introLoading, setIntroLoading] = useState(() => !skipIntroLoader);

    useEffect(() => {
        if (!introLoading) return;
        const duration = 3000 + Math.random() * 2000;
        const timer = setTimeout(() => setIntroLoading(false), duration);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleProblem = (problem: string) => {
        setCorrectedProblems?.((prev) => prev.includes(problem) ? prev.filter((x) => x !== problem) : [...prev, problem]);
    };
    const skinTypeValue = correctedSkinType || (onboardingAnalysis?.type_peau_detecte ?? "").toLowerCase();
    const carnationValue = carnation || normalizeCarnation(onboardingAnalysis?.carnation_detectee) || "";
    const selectedCarnation = CARNATION_OPTIONS.find((c) => c.value === carnationValue);
    const selectedSkinType = SKIN_TYPES.find((t) => t.value === skinTypeValue);
    const SkinTypeIcon = selectedSkinType?.icon ?? Leaf;
    const showLoader = analysisLoading || introLoading;

    if (showLoader) {
        return (
            <div className="h-full min-h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Analyse de votre peau en cours...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="mb-6 flex items-start gap-4">
                {BackButton && <BackButton />}
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-1">Votre analyse de peau</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Basé sur votre photo</p>
                </div>
            </div>

            {onboardingAnalysis ? (
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                    {onboardingPhotoBase64 && (
                        <div className="rounded-3xl overflow-hidden border border-border/40 bg-muted/20 flex items-center justify-center" style={{ maxHeight: 280 }}>
                            <img src={`data:image/jpeg;base64,${onboardingPhotoBase64}`} alt="Votre photo" className="w-full h-auto max-h-[280px] object-contain" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 rounded-2xl">
                        <div className="bg-white rounded-xl p-3 border border-border/40">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1">Type</p>
                            <Select value={skinTypeValue || undefined} onValueChange={setCorrectedSkinType}>
                                <SelectTrigger className={`${kpiSelectTriggerClass} capitalize`}>
                                    <div className="flex items-center gap-2">
                                        <SkinTypeIcon size={14} className="text-primary/70 shrink-0" />
                                        <SelectValue placeholder="—">{selectedSkinType?.label}</SelectValue>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {SKIN_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2">
                                                <t.icon size={14} className="text-foreground/60 shrink-0" />
                                                {t.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-border/40">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1">Carnation</p>
                            <Select value={carnationValue || undefined} onValueChange={setCarnation}>
                                <SelectTrigger className={kpiSelectTriggerClass}>
                                    <div className="flex items-center gap-2">
                                        {selectedCarnation && (
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedCarnation.color }} />
                                        )}
                                        <SelectValue placeholder="—">{selectedCarnation?.label}</SelectValue>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {CARNATION_OPTIONS.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            <span className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                                {c.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-border/40">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                                <Calendar size={11} className="opacity-50" /> Âge
                            </p>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    min={10}
                                    max={120}
                                    value={age ?? ""}
                                    onChange={(e) => setAge?.(e.target.value)}
                                    placeholder="—"
                                    className="w-12 bg-transparent border-none p-0 text-sm font-bold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                {age && <span className="text-sm font-bold text-foreground">ans</span>}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-border/40">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                                <ShieldAlert size={11} className="opacity-50" /> Sensibilités
                            </p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button type="button" className={`${kpiSelectTriggerClass} flex items-center justify-between gap-2`}>
                                        <span className="truncate text-left">{correctedProblems.length > 0 ? correctedProblems.join(", ") : "—"}</span>
                                        <ChevronDown size={14} className="opacity-40 shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    {SKIN_PROBLEMS.map((problem) => (
                                        <DropdownMenuCheckboxItem
                                            key={problem}
                                            checked={correctedProblems.includes(problem)}
                                            onCheckedChange={() => toggleProblem(problem)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            {problem}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-border/40 space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Scores cutanés</p>
                        {[
                            { label: 'Hydratation', value: onboardingAnalysis.hydratation?.score, max: 4, color: 'bg-blue-400' },
                            { label: 'Érythème', value: onboardingAnalysis.erytheme?.score, max: 4, color: 'bg-red-400' },
                            { label: 'Sébum zone T', value: onboardingAnalysis.sebum?.zone_t, max: 5, color: 'bg-yellow-400' },
                            { label: 'Acné', value: onboardingAnalysis.acne?.score, max: 4, color: 'bg-orange-400' },
                            { label: 'Éclat', value: onboardingAnalysis.eclat_global, max: 10, color: 'bg-pink-400' },
                        ].map((s) => (
                            <div key={s.label}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-[11px] font-semibold text-foreground">{s.label}</span>
                                    <span className="text-[11px] text-muted-foreground">{s.value}/{s.max}</span>
                                </div>
                                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / s.max) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {onboardingAnalysis.points_forts?.length > 0 && (
                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">✨ Points forts</p>
                            {onboardingAnalysis.points_forts.map((p: string, i: number) => <p key={i} className="text-[12px] text-foreground/80 mb-1">• {p}</p>)}
                        </div>
                    )}

                    {onboardingAnalysis.points_attention?.length > 0 && (
                        <div className="bg-muted/10 rounded-2xl p-4 border border-border/40">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">À surveiller</p>
                            {onboardingAnalysis.points_attention.map((p: string, i: number) => <p key={i} className="text-[12px] text-foreground/80 mb-1">• {p}</p>)}
                        </div>
                    )}

                    {onboardingAnalysis.observations_libres && (
                        <div className="bg-muted/5 rounded-2xl p-4 border border-border/20">
                            <p className="text-[11px] text-foreground/70 leading-relaxed italic">{onboardingAnalysis.observations_libres}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                    <p className="text-muted-foreground text-sm">Analyse non disponible</p>
                    <p className="text-[11px] text-muted-foreground/60">Vous pourrez analyser votre peau depuis l'application</p>
                </div>
            )}
        </div>
    );
};

export default StepDiagnosticReview;

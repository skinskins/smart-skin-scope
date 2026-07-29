import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { SignupStepProps } from "@/pages/signup/types";

const StepConsent = ({
    BackButton,
    personalizedRecommendationsConsent,
    setPersonalizedRecommendationsConsent,
    aiLearningConsent,
    setAiLearningConsent,
    productResearchConsent,
    setProductResearchConsent,
    marketingShareConsent,
    setMarketingShareConsent,
}: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Vos données, votre choix</h1>
                    <p className="text-sm text-muted-foreground">Modifiable à tout moment dans les réglages.</p>
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-8">
                <div className="flex items-start gap-3 justify-between pb-6 border-b border-border/40">
                    <div className="space-y-2">
                        <h3 className="text-lg text-foreground">Recommandations personnalisées</h3>
                        <p className="text-sm text-muted-foreground">Traite vos données de cycle et de peau pour générer vos routines.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-primary/50 text-primary-foreground border-transparent">Requis</Badge>
                        <Switch checked={personalizedRecommendationsConsent} onCheckedChange={setPersonalizedRecommendationsConsent} />
                    </div>
                </div>

                <div className="flex items-start gap-3 justify-between pb-6 border-b border-border/40">
                    <div className="space-y-2">
                        <h3 className="text-lg text-foreground">Analyse IA et apprentissage</h3>
                        <p className="text-sm text-muted-foreground">Affine vos recommandations à partir de vos validations.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-primary/50 text-primary-foreground border-transparent">Requis</Badge>
                        <Switch checked={aiLearningConsent} onCheckedChange={setAiLearningConsent} />
                    </div>
                </div>

                <div className="flex items-start gap-3 justify-between pb-6 border-b border-border/40">
                    <div className="space-y-2">
                        <h3 className="text-lg text-foreground">Recherche produit</h3>
                        <p className="text-sm text-muted-foreground">Données anonymisées pour améliorer nos modèles.</p>
                    </div>
                    <Switch checked={productResearchConsent} onCheckedChange={setProductResearchConsent} className="shrink-0 mt-1" />
                </div>

                <div className="flex items-start gap-3 justify-between pb-6 border-b border-border/40">
                    <div className="space-y-2">
                        <h3 className="text-lg text-foreground">Partage marketing</h3>
                        <p className="text-sm text-muted-foreground">Partage avec nos outils publicitaires.</p>
                    </div>
                    <Switch checked={marketingShareConsent} onCheckedChange={setMarketingShareConsent} className="shrink-0 mt-1" />
                </div>

                <div className="flex gap-3 p-4 bg-muted/20 rounded-2xl">
                    <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">Disclaimer</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Les conseils proposés par Nacre sont fournis à titre informatif et ne constituent pas un avis, un diagnostic ou un traitement médical. Nacre ne remplace pas un médecin, un dermatologue ou tout autre professionnel de santé.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            En cas de problème de peau, de symptômes persistants ou de doute concernant votre santé, consultez un professionnel de santé avant de suivre les recommandations de l'application.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StepConsent;

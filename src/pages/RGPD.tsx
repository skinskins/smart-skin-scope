import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

const PERMISSIONS = [
    { icon: Camera, label: "Caméra" },
    { icon: MapPin, label: "Localisation" },
    { icon: Bell, label: "Notifications" },
];

const RGPD = () => {
    const navigate = useNavigate();

    const [personalizedRecommendationsConsent, setPersonalizedRecommendationsConsent] = useState(true);
    const [aiLearningConsent, setAiLearningConsent] = useState(true);
    const [productResearchConsent, setProductResearchConsent] = useState(false);
    const [marketingShareConsent, setMarketingShareConsent] = useState(false);

    useEffect(() => {
        const fetchConsents = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await (supabase as any)
                .from("profiles")
                .select("personalized_recommendations_consent, ai_learning_consent, product_research_consent, marketing_share_consent")
                .eq("id", session.user.id)
                .single();
            if (data) {
                if (data.personalized_recommendations_consent != null) setPersonalizedRecommendationsConsent(data.personalized_recommendations_consent);
                if (data.ai_learning_consent != null) setAiLearningConsent(data.ai_learning_consent);
                if (data.product_research_consent != null) setProductResearchConsent(data.product_research_consent);
                if (data.marketing_share_consent != null) setMarketingShareConsent(data.marketing_share_consent);
            }
        };
        fetchConsents();
    }, []);

    const saveConsent = async (field: string, value: boolean) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await (supabase as any).from("profiles").update({ [field]: value }).eq("id", session.user.id);
    };

    const handleToggle = (
        field: string,
        setter: (value: boolean) => void,
    ) => (value: boolean) => {
        setter(value);
        saveConsent(field, value);
    };

    return (
        <div className="min-h-screen bg-background max-w-lg mx-auto pb-24">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-6 p-3"
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/20 transition-colors shrink-0"
                    aria-label="Retour"
                >
                    <ArrowLeft size={20} strokeWidth={1.5} className="text-foreground" />
                </button>
                <h1 className="text-2xl text-foreground">Confidentialité</h1>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-col gap-6 px-5 pt-2"
            >
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 px-1">Consentements</p>

                    <div className="flex items-center gap-4 py-3 border-b border-border/20">
                        <p className="flex-1 text-[14px] text-foreground">Recommandations personnalisées</p>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className="bg-primary/50 text-primary-foreground border-transparent">Requis</Badge>
                            <Switch
                                checked={personalizedRecommendationsConsent}
                                onCheckedChange={handleToggle("personalized_recommendations_consent", setPersonalizedRecommendationsConsent)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-3 border-b border-border/20">
                        <p className="flex-1 text-[14px] text-foreground">Analyse IA et apprentissage</p>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className="bg-primary/50 text-primary-foreground border-transparent">Requis</Badge>
                            <Switch
                                checked={aiLearningConsent}
                                onCheckedChange={handleToggle("ai_learning_consent", setAiLearningConsent)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-3 border-b border-border/20">
                        <p className="flex-1 text-[14px] text-foreground">Amélioration du produit</p>
                        <Switch
                            checked={productResearchConsent}
                            onCheckedChange={handleToggle("product_research_consent", setProductResearchConsent)}
                            className="shrink-0"
                        />
                    </div>

                    <div className="flex items-center gap-4 py-3 border-b border-border/20 last:border-b-0">
                        <p className="flex-1 text-[14px] text-foreground">Partage marketing</p>
                        <Switch
                            checked={marketingShareConsent}
                            onCheckedChange={handleToggle("marketing_share_consent", setMarketingShareConsent)}
                            className="shrink-0"
                        />
                    </div>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 px-1">Autorisations</p>

                    {PERMISSIONS.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-4 py-3 border-b border-border/20">
                            <div className="flex flex-1 items-center gap-2 min-w-0">
                                <Icon size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                                <p className="flex-1 text-[14px] text-foreground">{label}</p>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                                <p className="text-[13px]">Activé</p>
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground/70 pt-2 px-1">
                        Gérez ces autorisations depuis les réglages de votre téléphone.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default RGPD;

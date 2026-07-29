import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SignupStepProps } from "@/pages/signup/types";

const StepLocation = ({ BackButton, locationMode, setLocationMode, manualCity, setManualCity, geoLoading, setGeoLoading }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre météo au service de votre peau</h1>
                </div>
            </div>
            <div className="space-y-8 flex-1">
                <div className="space-y-3">
                    {[
                        { icon: '☀️', title: 'Indice UV', desc: 'Adapte votre SPF en temps réel' },
                        { icon: '💨', title: 'Pollution', desc: 'Protège votre barrière cutanée' },
                        { icon: '🌡️', title: 'Température', desc: 'Ajuste l\'hydratation recommandée' },
                    ].map((b) => (
                        <div key={b.title} className="flex items-center gap-4 p-4 bg-muted/20 rounded-2xl">
                            <span className="text-2xl">{b.icon}</span>
                            <div>
                                <p className="text-sm font-bold text-foreground">{b.title}</p>
                                <p className="text-[11px] text-muted-foreground">{b.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" disabled={geoLoading} onClick={() => {
                    setGeoLoading(true);
                    navigator.geolocation.getCurrentPosition(
                        () => { setLocationMode('geo'); setGeoLoading(false); },
                        () => { setGeoLoading(false); setLocationMode('manual'); }
                    );
                }} className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow disabled:opacity-60">
                    {geoLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MapPin size={18} strokeWidth={1.5} />}
                    {geoLoading ? 'Localisation...' : 'Autoriser la localisation'}
                </button>
                {locationMode === 'geo' && <p className="text-center text-sm text-primary font-semibold">✓ Localisation activée</p>}
                {locationMode === 'manual' ? (
                    <Input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder="Ex: Paris" className="h-14" />
                ) : (
                    <button type="button" onClick={() => setLocationMode('manual')} className="w-full text-center text-[11px] text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors">
                        Saisir ma ville manuellement
                    </button>
                )}
            </div>
        </>
    );
};

export default StepLocation;

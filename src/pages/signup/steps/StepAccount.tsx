import { CheckCircle2, Lock, Mail, Shield, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SignupStepProps } from "@/pages/signup/types";

const StepAccount = ({ BackButton, firstName, setFirstName, lastName, setLastName, email, setEmail, password, setPassword }: SignupStepProps) => {
    return (
        <>
            <div className="mb-10 flex items-start gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Identifiants</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Dernière étape : créer votre compte</p>
                </div>
            </div>
            <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Prénom</label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                            <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-12" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Nom</label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                            <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-12" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                        <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12" />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                        <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12" />
                    </div>
                    <div className="px-4 space-y-2">
                        <p className={`text-[9px] flex items-center gap-2 ${password.length >= 8 ? 'text-primary' : 'text-muted-foreground/40'}`}><CheckCircle2 size={10} /> 8 caractères minimum</p>
                        <p className={`text-[9px] flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}><CheckCircle2 size={10} /> Une majuscule</p>
                        <p className={`text-[9px] flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}><CheckCircle2 size={10} /> Un chiffre</p>
                    </div>
                </div>

                <div className="pt-10 flex items-start gap-4 px-4 bg-muted/15 rounded-[32px] p-6 border border-border/20">
                    <Shield className="text-primary shrink-0" size={20} />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">Vos données sont sécurisées et conformes au RGPD. Nous ne partageons jamais vos informations personnelles.</p>
                </div>
            </div>
        </>
    );
};

export default StepAccount;

import { FlaskConical, MessageCircle, RefreshCw } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BetaWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const ITEMS = [
  { icon: FlaskConical, text: "Certaines fonctionnalités sont encore en test et peuvent changer." },
  { icon: MessageCircle, text: "Vos retours nous aident à améliorer l'app chaque semaine." },
  { icon: RefreshCw, text: "Certaines données peuvent être réinitialisées pendant cette phase." },
];

export function BetaWelcomeModal({ open, onClose }: BetaWelcomeModalProps) {
  return (
    <Drawer open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DrawerContent className="px-4 pb-6">
        <div className="flex flex-col gap-2 pt-2">
          <Badge className="w-fit bg-[#593914]/60 text-white border-none">Bêta</Badge>
          <h2 className="text-2xl font-display text-foreground leading-tight">Bienvenue dans la bêta de Nacre</h2>
          <p className="text-base text-foreground">Vous testez une version en cours de construction. Voici à quoi vous attendre.</p>
        </div>

        <div className="flex flex-col gap-4 px-2 pt-8">
          {ITEMS.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex gap-3 items-start">
              <Icon size={24} strokeWidth={1.5} className="text-foreground shrink-0" />
              <p className="text-base text-foreground flex-1">{text}</p>
            </div>
          ))}
        </div>

        <Button onClick={onClose} className="w-full h-14 mt-8 text-base">
          Continuer
        </Button>
      </DrawerContent>
    </Drawer>
  );
}

export default BetaWelcomeModal;

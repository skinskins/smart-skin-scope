import { Share2 } from "lucide-react";
import { toast } from "sonner";

export default function PassportShareButton() {
  const handleShare = async () => {
    const data = {
      title: "Mon Passeport de peau — Nacre",
      text: "Voici mon suivi peau sur 30 jours",
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié");
    }
  };

  return (
    <button onClick={handleShare} className="absolute right-[24px]">
      <Share2 className="w-5 h-5 text-[#71727a]" />
    </button>
  );
}

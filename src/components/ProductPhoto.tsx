import { useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductPhotoProps {
  url: string | null;
  name: string;
  iconSize?: number;
  imgClassName?: string;
}

export const ProductPhoto = ({ url, name, iconSize = 14, imgClassName = "w-full h-full object-contain" }: ProductPhotoProps) => {
  const [error, setError] = useState(false);
  if (!url || error) {
    return <ImageOff size={iconSize} className="text-muted-foreground/40" />;
  }
  return (
    <img
      src={url}
      alt={name}
      className={imgClassName}
      onError={() => setError(true)}
    />
  );
};

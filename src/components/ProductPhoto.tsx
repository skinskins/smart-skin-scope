import { useState } from "react";
import { ProductTypeIcon } from "@/components/ProductTypeIcon";

interface ProductPhotoProps {
  url: string | null;
  name: string;
  type?: string | null;
  iconSize?: number;
  imgClassName?: string;
  /** Once a product is selected/saved (Mes Produits, routine), show the type icon instead of the photo — photos are reserved for search results. */
  showPhoto?: boolean;
}

export const ProductPhoto = ({ url, name, type, iconSize = 14, imgClassName = "w-full h-full object-contain", showPhoto = true }: ProductPhotoProps) => {
  const [error, setError] = useState(false);
  if (!showPhoto || !url || error) {
    return <ProductTypeIcon type={type} size={iconSize * 2} />;
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

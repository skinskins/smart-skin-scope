import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      {onBack && (
        <button onClick={onBack} className="flex items-center text-muted-foreground">
          <ChevronLeft size={20} />
        </button>
      )}
      <h1 className="text-[22px] font-normal">{title}</h1>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface SelectableOptionProps {
    selected: boolean;
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
}

const SelectableOption = ({ selected, onClick, className, children }: SelectableOptionProps) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "py-4 px-2 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
            selected ? "border-primary bg-primary/5 text-primary premium-shadow" : "border-border/40 bg-background/40 text-foreground/60",
            className
        )}
    >
        {children}
    </button>
);

export default SelectableOption;

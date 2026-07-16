interface ProductTypeIconProps {
    type?: string | null;
    size?: number;
}

// Mapping des types de la base vers une illustration
function resolveIcon(type?: string | null): string {
    const t = (type ?? "").toLowerCase().trim();
    switch (t) {
        case "sérum":
        case "serum":
        case "anti-taches":
            return "serum";
        case "hydratant":
        case "anti-age":
        case "anti-âge":
        case "soin-nuit":
        case "baume":
            return "creme";
        case "nettoyant":
            return "nettoyant";
        case "tonique":
        case "lotion":
            return "tonique";
        case "spf":
            return "spf";
        case "masque":
            return "masque";
        case "huile":
            return "huile";
        case "contour-yeux":
        case "contour_yeux":
            return "contour";
        case "démaquillant":
        case "demaquillant":
            return "demaquillant";
        case "brume":
            return "brume";
        case "exfoliant":
            return "exfoliant";
        default:
            return "default";
    }
}

const STROKE = "#2C180F";

export function ProductTypeIcon({ type, size = 40 }: ProductTypeIconProps) {
    const icon = resolveIcon(type);
    const common = {
        fill: "none",
        stroke: STROKE,
        strokeWidth: 2.4,
        strokeLinejoin: "round" as const,
        strokeLinecap: "round" as const,
    };

    return (
        <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            {icon === "serum" && (
                <g {...common}>
                    <rect x="26" y="30" width="22" height="26" rx="4" />
                    <rect x="31" y="24" width="12" height="6" rx="2" />
                    <rect x="33" y="20" width="8" height="4" rx="1.5" />
                    <line x1="26" y1="42" x2="48" y2="42" opacity="0.4" />
                    <g transform="rotate(35 14 24)">
                        <rect x="8" y="6" width="9" height="14" rx="4.5" />
                        <rect x="7" y="20" width="11" height="5" rx="2" />
                        <line x1="12.5" y1="25" x2="12.5" y2="40" />
                    </g>
                    <path d="M5 43 Q1 49 5 52 Q9 49 5 43 Z" />
                </g>
            )}

            {icon === "creme" && (
                <g {...common}>
                    <rect x="18" y="26" width="26" height="24" rx="5" />
                    <rect x="24" y="16" width="14" height="10" rx="3" />
                    <line x1="22" y1="34" x2="40" y2="34" opacity="0.4" />
                </g>
            )}

            {icon === "nettoyant" && (
                <g {...common}>
                    <path d="M22 24 Q22 16 31 16 Q40 16 40 24 L40 50 Q40 54 36 54 L26 54 Q22 54 22 50 Z" />
                    <rect x="27" y="8" width="8" height="8" rx="2" />
                    <line x1="27" y1="36" x2="35" y2="36" opacity="0.4" />
                </g>
            )}

            {icon === "tonique" && (
                <g {...common}>
                    <rect x="24" y="20" width="18" height="34" rx="4" />
                    <path d="M26 12 L40 12 L38 20 L28 20 Z" />
                    <circle cx="16" cy="14" r="1.3" fill={STROKE} stroke="none" />
                    <circle cx="11" cy="20" r="1.3" fill={STROKE} stroke="none" />
                    <circle cx="16" cy="26" r="1.3" fill={STROKE} stroke="none" />
                </g>
            )}

            {icon === "spf" && (
                <g {...common}>
                    <circle cx="30" cy="30" r="12" />
                    <g strokeLinecap="round">
                        <line x1="30" y1="8" x2="30" y2="13" />
                        <line x1="30" y1="47" x2="30" y2="52" />
                        <line x1="8" y1="30" x2="13" y2="30" />
                        <line x1="47" y1="30" x2="52" y2="30" />
                        <line x1="14" y1="14" x2="17" y2="17" />
                        <line x1="43" y1="43" x2="46" y2="46" />
                        <line x1="14" y1="46" x2="17" y2="43" />
                        <line x1="43" y1="17" x2="46" y2="14" />
                    </g>
                </g>
            )}

            {icon === "masque" && (
                <g {...common}>
                    <ellipse cx="30" cy="32" rx="17" ry="19" />
                    <path d="M20 27 Q30 19 40 27" opacity="0.4" />
                    <circle cx="25" cy="36" r="1.6" fill={STROKE} stroke="none" opacity="0.4" />
                    <circle cx="35" cy="36" r="1.6" fill={STROKE} stroke="none" opacity="0.4" />
                    <circle cx="30" cy="42" r="1.6" fill={STROKE} stroke="none" opacity="0.4" />
                </g>
            )}

            {icon === "huile" && (
                <g {...common}>
                    <path d="M30 8 Q42 26 42 38 Q42 54 30 54 Q18 54 18 38 Q18 26 30 8 Z" />
                    <path d="M26 42 Q30 46 34 42" opacity="0.4" />
                </g>
            )}

            {icon === "contour" && (
                <g {...common}>
                    <rect x="18" y="12" width="24" height="9" rx="4" />
                    <path d="M22 21 L38 21 L34 46 Q34 47 33 47 L27 47 Q26 47 26 46 Z" />
                    <ellipse cx="30" cy="30" rx="5" ry="7" />
                    <rect x="26" y="47" width="8" height="6" rx="1.5" />
                    <path d="M27 53 Q27 58 30 59 Q33 58 33 53 Z" />
                </g>
            )}

            {icon === "demaquillant" && (
                <g {...common}>
                    <circle cx="40" cy="34" r="15" strokeDasharray="4 4" strokeWidth={1.8} />
                    <rect x="16" y="20" width="20" height="34" rx="4" fill="#FBEBDD" />
                    <rect x="21" y="10" width="10" height="10" rx="2" fill="#FBEBDD" />
                    <path d="M26 32 Q22 39 26 43 Q30 39 26 32 Z" />
                </g>
            )}

            {icon === "brume" && (
                <g {...common}>
                    <rect x="22" y="24" width="16" height="30" rx="4" />
                    <path d="M24 24 L24 18 L36 18 L36 24" />
                    <rect x="26" y="10" width="8" height="8" rx="2" />
                    <g fill={STROKE} stroke="none">
                        <circle cx="14" cy="10" r="1.3" opacity="0.6" />
                        <circle cx="46" cy="10" r="1.3" opacity="0.6" />
                        <circle cx="9" cy="16" r="1.3" opacity="0.4" />
                        <circle cx="51" cy="16" r="1.3" opacity="0.4" />
                    </g>
                </g>
            )}

            {icon === "exfoliant" && (
                <g {...common}>
                    <rect x="18" y="26" width="26" height="24" rx="5" />
                    <rect x="24" y="16" width="14" height="10" rx="3" />
                    <g fill={STROKE} stroke="none">
                        <circle cx="24" cy="36" r="1.4" />
                        <circle cx="32" cy="40" r="1.4" />
                        <circle cx="38" cy="35" r="1.4" />
                        <circle cx="28" cy="44" r="1.4" />
                        <circle cx="36" cy="45" r="1.4" />
                    </g>
                </g>
            )}

            {icon === "default" && (
                <g {...common}>
                    <rect x="22" y="20" width="16" height="34" rx="4" />
                    <rect x="26" y="12" width="8" height="8" rx="2" />
                    <line x1="26" y1="32" x2="34" y2="32" opacity="0.4" />
                </g>
            )}
        </svg>
    );
}

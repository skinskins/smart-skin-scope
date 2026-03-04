import { motion } from "framer-motion";
import { Sparkles, Droplets, Sun, Moon, Utensils } from "lucide-react";

const tipCategories = [
  {
    icon: <Droplets size={20} />,
    title: "Hydration Boost",
    color: "hsl(200, 60%, 55%)",
    tips: [
      "Drink at least 2L of water daily for plumper skin",
      "Layer a hyaluronic acid serum under moisturizer",
      "Avoid hot showers — lukewarm water preserves skin moisture",
    ],
  },
  {
    icon: <Sun size={20} />,
    title: "Sun Protection",
    color: "hsl(45, 80%, 65%)",
    tips: [
      "Reapply SPF 50 every 2 hours when outdoors",
      "Wear a wide-brim hat on high UV index days",
      "Don't skip sunscreen on cloudy days — UV penetrates clouds",
    ],
  },
  {
    icon: <Moon size={20} />,
    title: "Night Routine",
    color: "hsl(280, 30%, 55%)",
    tips: [
      "Double cleanse: oil cleanser first, then water-based",
      "Apply retinol 2-3x per week for cell turnover",
      "Use a silk pillowcase to reduce friction",
    ],
  },
  {
    icon: <Utensils size={20} />,
    title: "Diet & Lifestyle",
    color: "hsl(152, 35%, 45%)",
    tips: [
      "Omega-3 rich foods (salmon, walnuts) boost skin barrier",
      "Reduce sugar intake to minimize breakouts",
      "Aim for 7-9 hours of sleep for skin repair",
    ],
  },
];

const Tips = () => {
  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">AI Skin Tips</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Personalized recommendations based on your skin data</p>
      </motion.div>

      {/* Daily Tip Highlight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider mb-2">Tip of the Day</p>
        <p className="text-primary-foreground text-lg font-display font-semibold leading-snug">
          Your hydration levels are down 12% this week. Try adding a hydrating toner to your AM routine.
        </p>
      </motion.div>

      {/* Tip Categories */}
      <div className="space-y-4">
        {tipCategories.map((category, i) => (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-card rounded-2xl p-5 shadow-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
              >
                {category.icon}
              </div>
              <h3 className="font-display font-semibold text-foreground">{category.title}</h3>
            </div>
            <ul className="space-y-2.5">
              {category.tips.map((tip, j) => (
                <li key={j} className="flex gap-2.5 text-sm text-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Tips;

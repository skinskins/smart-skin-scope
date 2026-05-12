import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Pencil, User, Sparkles, Target, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PassportPromptCard from "@/features/passport/components/PassportPromptCard";


const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [skinType, setSkinType] = useState("");
  const [skinProblems, setSkinProblems] = useState<string[]>([]);
  const [skinGoals, setSkinGoals] = useState<string[]>([]);

  const [editingField, setEditingField] = useState<"name" | "type" | "problems" | "goals" | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // @ts-ignore
        const { data } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          if (data.first_name) setFirstName(data.first_name);
          if (data.skin_type) setSkinType(data.skin_type);
          if (data.skin_problems) setSkinProblems(data.skin_problems);
          if (data.skin_goals) setSkinGoals(data.skin_goals);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const toggleProblem = (prob: string) => {
    setSkinProblems(prev => prev.includes(prob) ? prev.filter(p => p !== prob) : [...prev, prob]);
  };

  const toggleGoal = (goal: string) => {
    setSkinGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // @ts-ignore
        await (supabase as any).from("profiles").update({
          first_name: firstName,
          skin_type: skinType,
          skin_problems: skinProblems,
          skin_goals: skinGoals
        }).eq("id", session.user.id);
        
        await supabase.auth.updateUser({ data: { first_name: firstName } });
        toast.success("Profil mis à jour");
        setEditingField(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de sauvegarde");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("guestProfile");
    navigate("/onboarding");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen pb-32 px-6 pt-12 max-w-lg mx-auto overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Espace Personnel</p>
          <h1 className="text-4xl font-display text-foreground">Mon Profil</h1>
        </div>
        <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-destructive/5 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-all active:scale-90">
            <LogOut size={18} strokeWidth={2} />
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {/* Prénom - Large Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setEditingField("name")}
          className="col-span-2 premium-card p-8 bg-gradient-to-br from-white to-primary/5 border-none cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User size={20} strokeWidth={1.5} /></div>
            <Pencil size={14} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Prénom</p>
          <p className="text-3xl font-display text-foreground italic group-hover:text-primary transition-colors">{firstName || "Non défini"}</p>
        </motion.div>

        {/* Type de Peau - Square Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setEditingField("type")}
          className="premium-card p-6 flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-center mb-4">
            <Activity size={16} className="text-primary/60" />
            <Pencil size={14} className="text-muted-foreground/50 group-hover:text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Peau</p>
            <p className="text-xl font-display text-foreground italic">{skinType || "..."}</p>
          </div>
        </motion.div>

        {/* Sensibilités - Square Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setEditingField("problems")}
          className="premium-card p-6 flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-center mb-4">
            <Sparkles size={16} className="text-primary/60" />
            <Pencil size={14} className="text-muted-foreground/50 group-hover:text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Sensibilités</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skinProblems.length > 0 ? (
                skinProblems.slice(0, 3).map(p => (
                  <span key={p} className="px-2 py-0.5 bg-primary/5 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full border border-primary/10 italic">{p}</span>
                ))
              ) : (
                <p className="text-xl font-display text-foreground italic">Aucune</p>
              )}
              {skinProblems.length > 3 && (
                <span className="text-[11px] font-bold text-muted-foreground">+{skinProblems.length - 3}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Objectifs - Wide Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => setEditingField("goals")}
          className="col-span-2 premium-card p-6 cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-primary/60" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Mes Objectifs</p>
            </div>
            <Pencil size={14} className="text-muted-foreground/50 group-hover:text-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {skinGoals.length > 0 ? skinGoals.map(g => (
              <span key={g} className="px-3 py-1 bg-primary/5 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full border border-primary/10 italic">{g}</span>
            )) : <p className="text-sm font-medium text-foreground/60 italic">Définir mes priorités...</p>}
          </div>
        </motion.div>
      </div>

      <div className="mt-8">
        <PassportPromptCard />
      </div>


      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-sm rounded-[40px] border-none bg-background premium-shadow p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display text-foreground italic">
              {editingField === "name" && "Prénom"}
              {editingField === "type" && "Nature de peau"}
              {editingField === "problems" && "Sensibilités"}
              {editingField === "goals" && "Mes priorités"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {editingField === "name" && (
              <div className="space-y-4">
                <Input type="text" placeholder="Votre prénom" className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display italic px-6 focus:ring-1 ring-primary/20" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
              </div>
            )}

            {editingField === "type" && (
              <div className="grid grid-cols-2 gap-3">
                {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                  <button key={type} onClick={() => setSkinType(type)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinType === type ? 'bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                    {type}
                  </button>
                ))}
              </div>
            )}

            {editingField === "problems" && (
              <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"].map(prob => (
                  <button key={prob} onClick={() => toggleProblem(prob)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                    {prob}
                  </button>
                ))}
              </div>
            )}

            {editingField === "goals" && (
              <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                  <button key={goal} onClick={() => toggleGoal(goal)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                    {goal}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-8">
            <button onClick={saveProfile} disabled={saving} className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow active:scale-95 transition-all disabled:opacity-50">
              {saving ? "..." : "Enregistrer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;

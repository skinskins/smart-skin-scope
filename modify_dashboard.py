import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

# 1. Add User import
content = content.replace('ThumbsUp, X } from "lucide-react";', 'ThumbsUp, X, User } from "lucide-react";')

# 2. Add State for Profile
state_insertion = """  const [userName, setUserName] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSkinType, setEditSkinType] = useState("");"""

content = content.replace('  const [userName, setUserName] = useState<string | null>(null);', state_insertion)

# 3. Fetch skin_type
content = content.replace("              const profile = data as any;", """              const profile = data as any;
              setSkinType(profile.skin_type || null);""")

# 4. Save Profile function
save_profile_func = """
  const saveProfile = async () => {
    if (!editName && !editSkinType) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates: any = {};
        if (editName) updates.first_name = editName;
        if (editSkinType) updates.skin_type = editSkinType;
        
        await supabase.from("profiles").update(updates).eq("id", session.user.id);
        
        if (editName) {
            await supabase.auth.updateUser({ data: { first_name: editName } });
            setUserName(editName);
        }
        if (editSkinType) setSkinType(editSkinType);
      }
    } catch (error) {
      console.error(error);
    }
    setProfileOpen(false);
  };
"""

content = content.replace("  const saveEditFactor = () => {", save_profile_func + "\n  const saveEditFactor = () => {")

# 5. Remove Diagnostic CTA & Score Ring and replace with Profile Section
diag_cta_start = "      {/* Diagnostic CTA + Score combined panel */}"
diag_cta_end = "      </motion.div>\n\n      {/* Détail du score */}"
# Need to use regex because the block is large
pattern_cta = r"      \{\/\* Diagnostic CTA \+ Score combined panel \*\/}.*?<\/motion\.div>\n\n      \{\/\* Détail du score \*\/}"
profile_section = """      {/* Profil Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="premium-card p-6 mb-8 flex justify-between items-center group cursor-pointer"
        onClick={() => {
            setEditName(userName || "");
            setEditSkinType(skinType || "");
            setProfileOpen(true);
        }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={20} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{userName || "Utilisateur"}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{skinType || "Type de peau non défini"}</p>
          </div>
        </div>
        <Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
      </motion.div>

      {/* Dialogue Profil */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-sm rounded-[40px] border border-border/40 bg-background premium-shadow">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-foreground">Mon Profil</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prénom</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Votre prénom" className="flex-1 rounded-full px-4" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type de peau</label>
              <div className="grid grid-cols-2 gap-3">
                  {["Sèche", "Grasse", "Mixte", "Normale", "Sensible"].map(t => (
                      <button 
                          key={t}
                          onClick={() => setEditSkinType(t)}
                          className={`py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editSkinType === t ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                      >
                          {t}
                      </button>
                  ))}
              </div>
            </div>
          </div>
          <button onClick={saveProfile} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow">Enregistrer</button>
        </DialogContent>
      </Dialog>"""

content = re.sub(r"      \{\/\* Diagnostic CTA \+ Score combined panel \*\/}.*?<\/motion\.div>", profile_section, content, flags=re.DOTALL)

# 6. Remove Détail du score Dialog
content = re.sub(r"      \{\/\* Détail du score \*\/}.*?<\/Dialog>", "", content, flags=re.DOTALL)

# 7. Remove Analyse de surface
content = re.sub(r"      \{\/\* Métriques peau \*\/}.*?<\/div>\n    <\/div>\);", "    </div>);", content, flags=re.DOTALL)

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)


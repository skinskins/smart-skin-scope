const G6={
  desc:"Conseils adaptés à chaque phase du cycle menstruel, calculée automatiquement depuis last_period_date + cycle_duration. Source : daily_checkins.cycle_phase.",
  hq:"Phase calculée automatiquement",
  rows:[
    {f:"Phase folliculaire",ic:"🌱",srclbl:"J6–J13",trig:"cycle_phase = 'folliculaire'",phaseBg:"#E8F5E9",phaseColor:"#2E7D32",q:"Automatique",
     dry:{t:"La semaine dorée — profites-en",a:"Les œstrogènes boostent le collagène et renforcent la barrière. Ta peau sèche est à son maximum de tolérance — introduire un nouvel actif ou augmenter la concentration du rétinol.",tip:"Semaine idéale pour un soin en institut ou une exfoliation plus poussée."},
     oily:{t:"Peau au calme : optimiser sans en faire plus",a:"La régulation hormonale réduit le sébum. Sérum vitamine C le matin, routine légère le soir.",tip:"Ne pas sur-charger les produits — la routine habituelle est déjà suffisante."},
     combo:{t:"La meilleure semaine de ton cycle",a:"T-zone moins réactive, joues mieux hydratées. Semaine idéale pour tester une nouvelle texture sur les joues.",tip:"Note dans l'app comment ta peau réagit — la comparaison avec la phase lutéale sera parlante."},
     normal:{t:"Tester et introduire cette semaine",a:"Les œstrogènes unifient le teint. Un sérum vitamine C le matin amplifie cet effet.",tip:"L'app peut rappeler cette fenêtre chaque mois pour planifier les soins intensifs."}},
    {f:"Phase ovulatoire",ic:"✨",srclbl:"J14–J16",trig:"cycle_phase = 'ovulatoire'",phaseBg:"#FFF9E6",phaseColor:"#F59E0B",q:"Automatique",
     dry:{t:"Pic d'éclat — maintenir sans over-doser",a:"Le pic d'œstrogènes donne un éclat naturel. Pas besoin d'ajouter des illuminants — le sérum habituel suffit.",tip:"C'est souvent la semaine où on se trouve 'belle' sans raison — c'est hormonal et réel."},
     oily:{t:"Légère vigilance T-zone",a:"Le pic de LH peut légèrement augmenter le sébum sur 24-48h. Sérum niacinamide léger en prévention.",tip:"Si tu as des rendez-vous importants, c'est cette semaine — ta peau est biologiquement au mieux."},
     combo:{t:"Éclat maximal, T-zone à surveiller",a:"L'éclat est au maximum mais la T-zone peut commencer à briller légèrement. Papier matifiant dans le sac.",tip:"Observer si la T-zone change à J14-J15 pour anticiper la transition vers la phase lutéale."},
     normal:{t:"Ta peau est au sommet — laisser faire",a:"Aucun besoin de plus. C'est la semaine pour le moins de produits possible.",tip:"Moins de produits cette semaine = peau qui respire. L'œstrogène fait le travail."}},
    {f:"Phase lutéale",ic:"⚡",srclbl:"J17–J28",trig:"cycle_phase = 'lutéale'",phaseBg:"#FEF3E2",phaseColor:"#D97706",q:"Automatique",
     dry:{t:"Barrière plus fragile — adapter en douceur",a:"La chute des œstrogènes fragilise la barrière. Réduire les actifs forts (rétinol, AHA) dès J17. Augmenter l'hydratation avec céramides.",tip:"Pire semaine pour tester un nouveau produit — résultats faussés."},
     oily:{t:"La semaine acné : agir en prévention",a:"La progestérone dilate les pores et booste le sébum. Niacinamide quotidien dès J17, réduire sucre et alcool.",tip:"Réduire le sucre raffiné dès J17 diminue significativement l'acné prémenstruelle."},
     combo:{t:"T-zone en alerte, joues plus sensibles",a:"T-zone progressivement plus réactive. Gel nettoyant doux le soir, niacinamide sur T-zone, crème apaisante sur joues.",tip:"Observer si les mêmes zones réagissent chaque mois — valider le pattern sur 3 cycles."},
     normal:{t:"Légère vigilance — pas de panique",a:"Peau normale peut légèrement se ternir ou avoir 1-2 boutons. Niacinamide en sérum dès J17 en prévention.",tip:"Si tu utilises du rétinol, réduire la fréquence à J17-J28."}},
    {f:"Phase menstruelle",ic:"🌸",srclbl:"J1–J5",trig:"cycle_phase = 'menstruelle'",phaseBg:"#FEE2E2",phaseColor:"#DC2626",q:"Automatique",
     dry:{t:"Routine minimaliste — protection pure",a:"Prostaglandines = inflammation systémique. Nettoyant crème uniquement, céramides, aucun acide ni rétinol ces 5 jours.",tip:"Pire semaine pour un exfoliant ou un peeling — risque de réaction maximal."},
     oily:{t:"Pause aux actifs, apaiser en priorité",a:"Stopper les AHA/BHA J1-J3. Centella asiatica ou aloé vera — apaiser plutôt que purifier.",tip:"Si l'acné empire toujours à J1-J3, la corrélation hormonale est confirmée."},
     combo:{t:"Douceur absolue ces 5 jours",a:"Routine basique connue uniquement. Nettoyant doux, crème apaisante, SPF. Rien de nouveau.",tip:"Semaine pour les soins cocooning — masque hydrogel, baume lèvres, sérum apaisant."},
     normal:{t:"Confort maximal, stimulation minimale",a:"Routine habituelle allégée — supprimer temporairement les actifs forts.",tip:"Si ta peau réagit toujours à la même phase depuis 3 mois, l'app peut le signaler comme pattern confirmé."}}
  ]
};

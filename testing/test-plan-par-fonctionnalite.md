# Plan de test par fonctionnalité

## Authentification

### 1. Inscription / Onboarding initial

- Objectif : vérifier que le parcours d'inscription collecte les informations et redirige vers le dashboard.
- Scénarios nominaux :
  - remplir prénom, nom, email, mot de passe valide, sélectionner profession, âge, sexe, type de peau, objectifs, cycle, localisation, produit initial et terminer.
  - résultat attendu : création du compte Supabase, profil sauvegardé, redirection vers `/dashboard` ou `/onboarding`.
- Scénarios limites / erreurs :
  - email invalide / champ email vide → bannière ou toast d'erreur.
  - mot de passe vide ou trop court → message d'erreur.
  - refus de permission caméra lors du scan produit ou upload photo → message temps réel et possibilité de continuer sans.
  - double clic sur "Continuer" ou "Créer mon compte" → pas de doublon de création.
- Priorité : bloquant

### 2. Connexion / login

- Objectif : vérifier l'accès à un compte existant.
- Scénarios nominaux :
  - entrer email valide et mot de passe existant, cliquer sur "Se connecter".
  - résultat attendu : session Supabase active, redirection vers `/dashboard`.
- Scénarios limites / erreurs :
  - email inconnu / mot de passe incorrect → message d'erreur clair.
  - champ vide → validation avant envoi.
  - lien "mot de passe oublié" non cliquable si non implémenté ? vérifier comportement.
- Priorité : bloquant

### 3. Déconnexion

- Objectif : vérifier que la session est détruite et que l'utilisateur est renvoyé à l'onboarding.
- Scénarios nominaux :
  - cliquer sur "Se déconnecter" depuis `/profile`.
  - résultat attendu : `supabase.auth.signOut()` appelé, `guestProfile` supprimé, redirection `/onboarding`.
- Scénarios limites / erreurs :
  - erreur de réseau pendant signOut → message d'erreur, ne pas laisser l'utilisateur bloqué.
- Priorité : majeur

## Onboarding et profil

### 4. Onboarding introductif

- Objectif : vérifier la navigation et la lisibilité du slide d'accueil.
- Scénarios nominaux :
  - faire défiler les slides puis cliquer sur "Commencer".
  - résultat attendu : navigation vers `/signup`.
- Scénarios limites / erreurs :
  - bouton "Déjà un compte" → redirection `/login`.
- Priorité : mineur

### 5. Profil / cycle utilisateur

- Objectif : vérifier que le profil peut être lu et modifié, y compris le cycle.
- Scénarios nominaux :
  - modification du prénom, type de peau, objectifs, carnation, durée de cycle et date des dernières règles.
  - résultat attendu : données mises à jour dans Supabase, toast "Profil mis à jour".
- Scénarios limites / erreurs :
  - date de règles invalide ou future → contrôler si l'interface accepte ou rejette.
  - durée de cycle non numérique / valeur absurde → vérifier la validation.
  - perte de connexion pendant la sauvegarde → message d'erreur et interface non bloquante.
- Priorité : majeur

### 6. Suivi du cycle / page Suivi

- Objectif : vérifier que la page de suivi affiche bien le cycle et la météo, et charge les données de la journée.
- Scénarios nominaux :
  - consultation d'un jour passé et du jour présent avec météo.
  - résultat attendu : photo de peau si existante, analyse IA si disponible, routine log, météo.
- Scénarios limites / erreurs :
  - jour sans photo → message de chargement ou état vide.
  - absence de date paramétrée → fallback stable.
- Priorité : majeur

## Diagnostic photo IA

### 7. Upload photo depuis PearlHero / SuiviJour

- Objectif : vérifier l'upload de photo de peau puis le déclenchement d'analyse IA.
- Scénarios nominaux :
  - sélectionner un fichier image valide depuis `/suivi/:date` ou via le composant PearlHero.
  - résultat attendu : upload vers le bucket `skin-photos`, insertion ou upsert dans `skin_photos`, affichage de la photo signée, et appel `skin-analysis`.
- Scénarios limites / erreurs :
  - fichier non image → message d'erreur.
  - upload storage échoue → message d'erreur explicite.
  - analyse IA retourne `rejected` → message "Photo non exploitable".
  - perte de connexion après upload / avant analyse → l'upload reste toléré et l'utilisateur est informé.
- Priorité : bloquant

### 8. Photo de suivi hebdomadaire depuis le dashboard

- Objectif : vérifier l'alerte / rappel de photo de la semaine.
- Scénarios nominaux :
  - présence d'une photo pour la semaine en cours → pas de rappel.
  - absence de photo → l'UI affiche `weekPhotoTaken` false ou invite au suivi.
- Scénarios limites / erreurs :
  - requête Supabase vers `skin_photos` retourne vide ou erreur → état lisible.
- Priorité : majeur

## Recommandations et historique

### 9. Flux de conseils et routine journalière

- Objectif : vérifier le calcul des conseils et l'affichage de la routine.
- Scénarios nominaux :
  - ouvrir `/dashboard`, constater les cartes de conseils, routine via `daily_routine_log` ou fallback `user_products`.
  - résultat attendu : conseils triés et produits affichés.
- Scénarios limites / erreurs :
  - aucune routine enregistrée → état vide ou CTA visible.
  - erreur réseau lors de `daily_advice_log` → ne pas casser l'UI principale.
- Priorité : majeur

### 10. Recommandation basée sur météo / cycle / facteurs

- Objectif : vérifier que la page DailyConversation combine cycle, météo, facteurs et produits.
- Scénarios nominaux :
  - utilisateur connecté avec profil, météo et check-in déjà enregistrés.
  - résultat attendu : phase de cycle calculée, if UV critique affiche des conseils SPF, et routine optimisée chargée.
- Scénarios limites / erreurs :
  - météo absente → affichage neutre.
  - absence de dernier période ou cycle invalides → message de phase indisponible.
- Priorité : majeur

## Scan produit et inventaire

### 11. Scan produit photo / import produit

- Objectif : vérifier la reconnaissance produit via image et le suivi produit.
- Scénarios nominaux :
  - télécharger une photo produit via `/vanity`, `product-scan` est appelé, produit ajouté au catalogue personnel.
  - résultat attendu : produit ajouté à `user_products`, message "ajouté ✓".
- Scénarios limites / erreurs :
  - produit non reconnu → message "Produit non reconnu".
  - image de mauvaise qualité ou mauvaise orientation → message d'erreur lié à l'IA ou à la détection.
  - upload de PDF non valide dans diagnostic import → message "Le fichier doit être un PDF".
- Priorité : majeur

### 12. Scan code-barres onboarding

- Objectif : vérifier l'usage du scanner QR/barcode dans la page d'inscription.
- Scénarios nominaux :
  - activer le scanner, présenter un code, produit trouvé dans `user_products` catalogue et ajouté.
  - résultat attendu : badge succès, produit ajouté à la sélection.
- Scénarios limites / erreurs :
  - scan non reconnu → message "Produit non reconnu".
  - refus de permission caméra → fermer le scanner proprement.
- Priorité : majeur

### 13. Gestion des produits / routine

- Objectif : vérifier l'ajout, la suppression et la modification de fréquence des produits.
- Scénarios nominaux :
  - ajouter un produit du catalogue, supprimer un produit personnel, changer fréquence.
  - résultat attendu : mise à jour dans Supabase `user_products`, UI mise à jour.
- Scénarios limites / erreurs :
  - tentative d'ajout déjà existant → pas de doublon.
  - suppression impossible → message d'erreur ou rollback.
- Priorité : majeur

## Intégrations sensibles

### 14. Supabase

- Objectif : vérifier les opérations critiques sur Supabase.
- Scénarios nominaux :
  - lecture du profil, insertion/maj `profiles`, `user_products`, `skin_photos`, `daily_weather`, `daily_advice_log`, `daily_routine_log`.
  - résultat attendu : affichage des données à jour.
- Scénarios limites / erreurs :
  - erreurs d'authentification Supabase → redirection vers login.
  - échec d'une requête `upsert` de photo/diagnostic → message d'erreur.
- Priorité : bloquant

### 15. Stockage photo (RGPD & sécurité)

- Objectif : vérifier la gestion des photos de peau en stockage Supabase.
- Scénarios nominaux :
  - upload vers bucket `skin-photos`, `createSignedUrl` renvoyée, image affichée dans l'UI.
  - résultat attendu : l'URL est valide et la photo est accessible temporairement.
- Scénarios limites / erreurs :
  - permission de stockage refusée / erreur bucket → message clair.
  - photo de peau stockée sans consentement → vérifier qu'il n'y a pas d'upload automatique.
- Priorité : bloquant

### 16. Paiement / abonnement

- Objectif : vérifier l'état et le comportement de l'écran d'abonnement.
- Scénarios nominaux :
  - ouvrir `/pricing` et sélectionner un plan.
  - résultat attendu : navigation vers `/dashboard` actuellement stub, pas de paiement réel.
- Scénarios limites / erreurs :
  - Aucune intégration Stripe/App Store/Play Store trouvée dans le code actuel : signaler clairement que la souscription reste un placeholder.
- Priorité : majeur (fonctionnalité manquante à vérifier avant production)

## Fonctionnalités existantes mais incomplètes / à vérifier

### 17. Import diagnostic professionnel

- Objectif : vérifier le téléversement d'un PDF sur la page `/vanity`.
- Scénarios nominaux :
  - sélectionner un PDF valide, invoquer `diagnostic-import`, résultat stocké dans `professional_diagnostics`.
  - résultat attendu : message d'état sans plantage.
- Scénarios limites / erreurs :
  - fichier non PDF ou PDF invalide → message d'erreur.
- Priorité : mineur

### 18. Strava Connect

- Objectif : vérifier le bouton de connexion/déconnexion Strava.
- Scénarios nominaux :
  - cliquer sur "Connecter Strava" redirige vers OAuth Strava.
  - cliquer sur "Déconnecter Strava" nettoie le localStorage.
- Scénarios limites / erreurs :
  - verification que l'état connecté est stocké en localStorage.
- Priorité : mineur

## Notes générales

- Ne pas inventer de fonctionnalité absent du code : aucun paiement effectif Stripe ou App Store n'est implémenté.
- Il n'y a pas de gestion explicite des notifications push dans le code exploré.
- Le scan produit est implémenté via `product-scan` et un scanner QR dans l'onboarding.
- Le diagnostic photo IA repose sur Supabase Functions `skin-analysis` et le stockage Supabase `skin-photos`.

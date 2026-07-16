# Flux End-to-End

## Parcours 1 : nouvelle utilisatrice

### 1. Ouvrir l'application sur `/onboarding`

- Action : lancer l'app et arriver sur l'écran d'introduction.
- Résultat attendu : le premier slide affiche un titre, une description et un bouton "Continuer" ou "Commencer".
- Point de vigilance : l'écran doit se charger rapidement et le bouton doit être actif.

### 2. Première navigation vers `/signup`

- Action : cliquer sur le bouton "Continuer".
- Résultat attendu : redirection vers `/signup` sans erreur.
- Point de vigilance : aucun écran vide ou écriture brisée entre `/onboarding` et `/signup`.

### 3. Remplir les informations personnelles

- Action : renseigner la profession, sélectionner les canaux de découverte, entrer l'âge et le genre.
- Résultat attendu : les champs enregistrent les choix et montrent la progression vers le prochain step.
- Point de vigilance : tester les cas suivants : champ vide, texte invalide, sélection multiple sur les canaux.

### 4. Diagnostiquer la peau et définir les objectifs

- Action : choisir le type de peau, sélectionner les problèmes cutanés pertinents et cocher un ou plusieurs objectifs.
- Résultat attendu : les sélections persistent après navigation entre étapes et se retrouvent dans l'aperçu du profil.
- Point de vigilance : vérifier qu'un changement de page ne réinitialise pas les boutons cochés.

### 5. Compléter le cycle hormonal

- Action : entrer une date récente de dernières règles et une durée de cycle personnalisée.
- Résultat attendu : les valeurs sont sauvegardées dans le profil Supabase (`profiles.last_period_date`, `profiles.cycle_duration`).
- Point de vigilance : tester une date future, une durée de cycle trop basse/trop haute et vérifier la gestion d'erreur ou le comportement de validation.

### 6. Choisir la localisation

- Action : accepter la géolocalisation ou renseigner une ville manuellement.
- Résultat attendu : l'application doit accepter l'entrée et envoyer l'utilisateur vers l'étape suivante sans bloquer.
- Point de vigilance : refuser la localisation doit laisser l'utilisateur poursuivre l'onboarding avec un fallback.

### 7. Scanner un produit ou ajouter un produit

- Action : ouvrir le scanner QR/code-barre et présenter un code valide, ou effectuer une recherche produit manuelle si disponible.
- Résultat attendu : le produit est reconnu dans le catalogue, le message "Produit trouvé et ajouté ✓" s'affiche, et le produit réapparaît dans la sélection.
- Point de vigilance : si le produit n'est pas reconnu, vérifier un message utilisateur clair et le retour rapide à l'écran d'onboarding.

### 8. Téléverser une photo de peau si disponible

- Action : utiliser le bouton de photo via le composant `PearlHero` ou depuis `/suivi/:date`.
- Résultat attendu : le fichier est uploadé vers le bucket `skin-photos`, une entrée `skin_photos` est créée/maj, et l'appel `skin-analysis` est déclenché.
- Point de vigilance : vérifier que l'utilisateur doit explicitement choisir une photo, et qu'il n'y a pas d'upload automatique non autorisé.

### 9. Finaliser l'inscription et atteindre le dashboard

- Action : sélectionner un plan dans `/pricing` puis cliquer sur "Souscrire à l'offre" ou "Continuer gratuitement".
- Résultat attendu : navigation vers `/dashboard`.
- Point de vigilance : confirmer que l'écran de prix est bien un placeholder et qu'aucun appel Stripe n'est effectué.

### 10. Vérifier la première recommandation

- Action : sur `/dashboard`, lire la section conseils, vérifier la présence de la perle et de la météo.
- Résultat attendu : au moins un conseil s'affiche, la phase de cycle est visible si le cycle est renseigné.
- Point de vigilance : tester le scénario sans données météo pour s'assurer que l'UI reste lisible et cohérente.

## Parcours 2 : utilisatrice récurrente

### 1. Connexion

- Action : accéder à `/login`, saisir email et mot de passe, valider.
- Résultat attendu : redirection vers `/dashboard` et affichage du prénom stocké dans Supabase.
- Point de vigilance : tester le message d'erreur pour mot de passe incorrect ou email inconnu.

### 2. Validation du dashboard

- Action : vérifier le nom, l'état de la perle, les conseils et la routine affichés.
- Résultat attendu : les données du profil sont bien chargées et le statut du check-in quotidien est cohérent.
- Point de vigilance : si un check-in existe, les produits et conseils doivent correspondre à la date du jour.

### 3. Nouveau diagnostic photo

- Action : depuis `/dashboard` cliquer sur la perle ou accéder directement à `/suivi/:date` et uploader une photo.
- Résultat attendu : photo uploadée, `skin_photos` mis à jour, `skin-analysis` invoqué et résultat visible si la fonction a renvoyé un avis.
- Point de vigilance : tester l'état de l'upload si le fichier est trop volumineux, et vérifier le message d'erreur pour `analysisData.rejected`.

### 4. Comparaison avec l'historique

- Action : consulter une date passée sur `/suivi/:date` ou parcourir l'historique dans le dashboard.
- Résultat attendu : ancienne photo s'affiche via URL signée, l'analyse associée est visible et la date est cohérente.
- Point de vigilance : vérifier que la photo n'est pas accessible publiquement sans authentification et que les dates correspondent.

### 5. Mise à jour du cycle

- Action : ouvrir `/profile`, modifier la date de dernières règles ou la durée du cycle, enregistrer.
- Résultat attendu : message de succès, valeurs sauvegardées dans `profiles`, et phase cyclique mise à jour au prochain affichage.
- Point de vigilance : tester le passage d'un cycle normal vers une nouvelle date et vérifier la cohérence du calcul (`calculateCyclePhase`).

### 6. Messages de vigilance UV / facteurs

- Action : vérifier les messages de conseils dans `/daily-conversation` ou sur la perle en cas d'UV élevé.
- Résultat attendu : si `uv_index` >= 6, un avertissement SPF doit apparaître.
- Point de vigilance : vérifier également les messages basés sur d'autres facteurs (`stress`, `alcool`, `voie`) et que l'affichage ne clignote pas si la météo arrive tard.

## Parcours 3 : conversion abonnement

### 1. Accès à l'écran de pricing

- Action : naviguer directement sur `/pricing` ou via le CTA depuis l'app.
- Résultat attendu : interface de choix de plan visible avec texte descriptif et bouton de confirmation.
- Point de vigilance : l'écran doit afficher clairement les options "Mensuel" et "Annuel".

### 2. Choisir un plan

- Action : basculer entre les plans mensuel et annuel.
- Résultat attendu : le prix, la période et le sous-texte se mettent à jour immédiatement.
- Point de vigilance : vérifier le contenu du badge annuel (par exemple "-40%") et l'animation du switch.

### 3. Commencer l'essai

- Action : cliquer sur "Souscrire à l'offre" ou "Continuer gratuitement".
- Résultat attendu : redirection vers `/dashboard`.
- Point de vigilance : s'assurer que la fonction ne tente pas d'appeler Stripe ou RevenueCat, puisqu'il s'agit d'un placeholder.

### 4. Confirmer l'accès

- Action : sur le dashboard, vérifier que l'utilisateur peut continuer son expérience normalement.
- Résultat attendu : les fonctionnalités de base restent disponibles et l'utilisateur ne se bloque pas sur un écran payant.
- Point de vigilance : noter dans le test manuel que la conversion est simulée et que l'abonnement n'est pas réellement activé.

## Points de vigilance transverses

- Tester avec une session non authentifiée : la redirection doit être propre et il ne doit pas y avoir de fuite de données.
- Vérifier l'affichage sur mobile iOS et Android si l'app est utilisée en mode web mobile.
- Simuler une connexion faible ou perte de réseau pendant un upload ou une sauvegarde de profil.
- Tester les états vides : pas de produits ajoutés, pas de photo de peau, pas de dernier cycle renseigné.
- Vérifier que les données sensibles (photos de peau, cycle, diagnostic) ne sont accessibles qu'après authentification et via URL signée.
- Confirmer que l'écran d'abonnement est informatif mais ne déclenche pas de paiement réel dans le code actuel.

## Vérifications à effectuer le lendemain (ou jours suivants)

Certains comportements ne se manifestent que dans le temps ou sur plusieurs jours. Planifier ces tests séparé :

### 1. Progression du cycle hormonal (J+1)

- Action : tester un utilisateur créé aujourd'hui, puis revenir le lendemain et vérifier la date de cycle.
- Résultat attendu : le jour du cycle doit avoir avancé de +1 et la phase doit potentiellement avoir changé selon la durée du cycle.
- Point de vigilance : si le cycle dure 28 jours et démarre un lundi, vérifier que le calcul dans `calculateCyclePhase` progresse correctement chaque jour.

### 2. Compteur de streak / statistiques (J+1 à J+7)

- Action : effectuer une routine complète aujourd'hui, puis revenir demain et vérifier le compteur de streak.
- Résultat attendu : le curseur de "jours consécutifs" doit incrémenter si l'utilisateur effectue la routine le jour suivant, ou réinitialiser à 0 si un jour est manqué.
- Point de vigilance : vérifier également le compteur `weekCount` (nombre de jours complétés sur 7) et le `bestStreak` (meilleur streak enregistré).

### 3. Photo hebdomadaire et récurrence (J+7)

- Action : tester un utilisateur qui prend une photo le lundi, puis revenir le mardi et samedi pour confirmer que le système compte correctement la photo hebdomadaire.
- Résultat attendu : la flag `weekPhotoTaken` doit rester `true` jusqu'au lundi suivant, puis remettre à `false` pour une nouvelle semaine.
- Point de vigilance : le système calcule le lundi de la semaine ISO en cours ; vérifier le comportement lors du changement de semaine.

### 4. Historique des diagnostics et comparaison multi-jours (J+1, J+7, etc.)

- Action : uploader une photo aujourd'hui, puis une photo demain et une photo la semaine prochaine.
- Résultat attendu : chaque photo doit être accessible via sa date propre sur `/suivi/:date` et l'historique doit montrer toutes les photos uploadées.
- Point de vigilance : vérifier que les analyses IA associées à chaque photos sont bien sauvegardées dans `skin_photos.analysis_json` et correspondent à la bonne date.

### 5. Changement de recommandations jour après jour (J+1)

- Action : lancer l'app aujourd'hui et noter les conseils affichés, puis revenir demain et vérifier si les conseils ont changé.
- Résultat attendu : les conseils peuvent être différents d'un jour à l'autre en fonction de la phase du cycle, de la météo et du check-in quotidien.
- Point de vigilance : vérifier que l'appel à `daily_advice_log` récupère les conseils du jour courant (date d'aujourd'hui) et non ceux d'hier.

### 6. Routine matin vs soir et séparation des données (même jour + J+1)

- Action : effectuer une routine matin aujourd'hui, puis une routine soir le même jour.
- Résultat attendu : les deux routines doivent être enregistrées dans `daily_routine_log` avec `period: "morning"` et `period: "evening"` distincts.
- Point de vigilance : revenir le lendemain et vérifier que les données de matin et soir d'hier sont bien séparées et que les nouvelles routines d'aujourd'hui ne les écrasent pas.

### 7. Persistance des modifications de cycle et cohérence (J+1)

- Action : modifier la date des dernières règles aujourd'hui, puis revenir demain.
- Résultat attendu : la date et la durée du cycle doivent rester sauvegardées et la phase calculée pour demain doit être cohérente.
- Point de vigilance : simuler un cas où l'utilisateur met à jour le cycle le jour J et vérifie que la phase se recalcule correctement pour le jour J+1 et au-delà.

### 8. Météo quotidienne (J+1)

- Action : enregistrer la météo pour aujourd'hui et vérifier qu'elle s'affiche, puis demain ajouter une nouvelle météo.
- Résultat attendu : la `daily_weather` doit être datée et la météo du jour J ne doit pas interférer avec celle du jour J+1.
- Point de vigilance : vérifier que chaque jour a une météo spécifique et que la comparaison historique de peau tient compte de la météo du jour.

### 9. Statut de paiement et essai (si applicable) (J+14)

- Action : créer un compte et vérifier la date d'expiration de l'essai.
- Résultat attendu : si un système d'essai gratuit de 14 jours existe, tester le passage J+13 → J+14 et vérifier le comportement.
- Point de vigilance : s'assurer que vérification du statut d'essai est bien stockée dans le profil Supabase et progressivement mise à jour.

### 10. Synchronisation des données après un jour hors ligne (test de reconnexion)

- Action : effectuer une routine et autres actions aujourd'hui, puis quitter l'app toute une journée, puis revenir le lendemain.
- Résultat attendu : les données du jour J doivent être présentes et le compteur de jours doit être correct.
- Point de vigilance : vérifier qu'il n'y a pas de perte de données suite à une déconnexion prolongée et que la session se réétablit correctement.

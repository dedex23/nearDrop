# NearDrop — Améliorations v2

**Date** : 2026-03-14
**Approche** : UI + Catégories ensemble, puis Backup, puis Tests (Approche C)

---

## 1. Catégories personnalisables

### Modèle de données

Nouvelle table `categories` (Drizzle/SQLite) :

| Colonne     | Type      | Description                              |
|-------------|-----------|------------------------------------------|
| `id`        | text (PK) | UUID                                     |
| `name`      | text      | Nom de la catégorie                      |
| `color`     | text      | Couleur hex (ex: `#E53935`)              |
| `icon`      | text      | Nom d'icône Material OU emoji            |
| `sortOrder` | integer   | Ordre d'affichage                        |
| `createdAt` | timestamp | Date de création                         |

### Migration

1. Créer la table `categories`
2. Insérer les 7 catégories de base (restaurant, bar, cafe, shop, culture, sport, other) avec leurs couleurs/icônes actuelles
3. Modifier `places.category` : passer de enum text à foreign key vers `categories.id`
4. Convertir les valeurs enum existantes en références UUID

### Règles métier

- **Suppression** : toute catégorie est supprimable si et seulement si aucun lieu ne l'utilise. Bouton grisé sinon, avec message indiquant le nombre de lieux associés.
- Pas de distinction `isDefault` — les 7 catégories initiales sont traitées exactement comme les customs après le seed.

### UI de gestion (Settings > "Gérer les catégories")

- Liste avec drag & drop pour réordonner
- Actions : ajouter, modifier, supprimer
- Formulaire catégorie : nom, couleur (color picker), icône (grille ~40 icônes Material + champ emoji libre)

### Impact sur les écrans existants

- `CategoryChip` : lit depuis la table `categories` au lieu de `CATEGORIES` constant
- Filtres carte/liste : dynamiques, basés sur les catégories en BDD
- Formulaire lieu : sélecteur de catégorie avec couleurs/icônes custom
- Geofencing : aucun impact (ne dépend pas des catégories)

---

## 2. Refonte UI / UX

### Thème

- Conserver react-native-paper (Material Design 3) mais mieux exploité
- **Dark mode** : détection automatique du thème système + toggle manuel dans Settings
- Palette de couleurs plus contrastée, surfaces avec élévation subtile
- Typographie plus hiérarchisée (titres plus grands, sous-textes plus légers)

### Navigation (3 tabs conservés : Carte, Lieux, Réglages)

- **FAB** (Floating Action Button) sur la carte ET la liste pour ajouter un lieu
- **Bottom sheet** pour le détail d'un lieu depuis un marker carte (au lieu d'un écran séparé)
- **Swipe actions** sur les cards de la liste (supprimer, activer/désactiver)

### Carte

- Markers colorés par catégorie (couleur dynamique depuis `categories`)
- Clustering quand beaucoup de lieux sont proches
- Cercle de rayon visible autour du lieu sélectionné

### Liste des lieux

- Cards plus riches : icône/emoji de catégorie, distance actuelle, statut actif/inactif visuel
- Indicateur "notifié récemment" (dans la période de cooldown)

### Gestion des notes longues (share-intent)

- **Card list** : notes tronquées à 2 lignes avec "Voir plus"
- **Bottom sheet carte** : section notes scrollable avec hauteur max
- **Détail lieu** : notes complètes, texte sélectionnable/copiable

### Formulaire lieu

- Sections pliables : infos de base, position, catégorie, avancé (radius, notes)
- Aperçu carte inline pour vérifier la position
- Sélecteur de catégorie avec couleurs/icônes customs

---

## 3. Backup automatique

### Backup local (transparent, sans action utilisateur)

- Copie automatique du fichier SQLite vers le dossier Documents du device
- **Déclenchement** : à chaque modification de données (lieu ou catégorie), debounce 30s
- **Rétention** : 3 dernières copies, rotation automatique
- **Restauration** : Settings > "Restaurer une sauvegarde" > liste des backups locaux avec date

### Backup cloud (opt-in, une seule action)

- Toggle dans Settings : "Sauvegarder sur le cloud"
- **Google Drive** (Android) / **iCloud** (iOS) via APIs natives
- Sync automatique après chaque backup local (si activé et connecté)
- Utilise le compte Google/Apple déjà sur le device — pas de compte à créer
- **Restauration** : détection automatique d'un backup cloud à la première installation, proposition de restauration

### UX

- Backup local : entièrement transparent, aucune action requise
- Cloud : un toggle + une autorisation, une seule fois
- Indicateur dans Settings : "Dernière sauvegarde : il y a X min"

---

## 4. Renforcement des tests

### Tests unitaires (haute priorité)

- **Stores Zustand** : actions CRUD du app-store, persistance et validations du settings-store
- **Queries Drizzle** : insertions, mises à jour, recherche, migration catégories
- **Service backup** : logique de rotation, debounce, détection backup cloud
- **Catégories** : CRUD, contrainte de suppression, migration enum→FK

### Tests de composants (moyenne priorité)

- **PlaceCard** : rendu notes longues/courtes, swipe actions, catégories custom
- **CategoryChip** : couleurs/icônes dynamiques depuis la BDD
- **PlaceForm** : validation, sélecteur catégorie custom, aperçu carte

### Tests E2E Maestro (renforcement)

- Nouveau flow : gestion des catégories (ajout, modif, suppression, contrainte)
- Nouveau flow : backup/restauration
- Améliorer la robustesse des flows existants pour la nouvelle UI

### Tests notification/localisation (intégration)

- Mock GPS via `adb emu geo fix` sur émulateur
- Vérifier le flow complet : background task → geofencing → notification envoyée
- Scénarios : lieu dans le rayon, lieu hors rayon, cooldown actif, quiet mode, heures actives
- Via Maestro : mock position + `assertNotification`

### Objectif

Passer de 83 tests à ~150+, couvrir stores, queries, composants critiques, et le flow notification/localisation end-to-end.

---

## Phases d'implémentation

1. **Phase 1 — Catégories + UI** : table categories, migration, refonte composants/écrans, dark mode, bottom sheet, swipe, clustering, FAB
2. **Phase 2 — Backup** : backup local automatique, backup cloud opt-in, UI restauration
3. **Phase 3 — Tests** : unitaires stores/queries/backup, composants, E2E Maestro, intégration notification/localisation

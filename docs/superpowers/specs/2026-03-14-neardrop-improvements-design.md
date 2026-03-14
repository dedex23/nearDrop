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
| `sortOrder` | integer   | Ordre d'affichage (entiers séquentiels, réécriture complète lors du drag & drop) |
| `createdAt` | timestamp | Date de création                         |

Limite : maximum 30 catégories (au-delà, le filtre UI devient inutilisable).

### Migration (SQLite table recreation)

SQLite ne supporte pas `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY`. La migration utilise la stratégie de recréation de table, **le tout dans une transaction unique** :

1. `BEGIN TRANSACTION`
2. Créer la table `categories`
3. Insérer les 7 catégories de base avec des UUIDs déterministes (basés sur le nom, ex: `uuid-restaurant`, etc.) et leurs couleurs/icônes actuelles
4. Créer `places_new` avec `category_id TEXT REFERENCES categories(id)` au lieu de l'enum `category`
5. `INSERT INTO places_new SELECT ... FROM places` avec mapping des noms enum vers les UUIDs catégories
6. `DROP TABLE places`
7. `ALTER TABLE places_new RENAME TO places`
8. Recréer les index (`idx_places_is_active`, `idx_places_category`, `idx_places_location`)
9. `COMMIT`

Si la transaction échoue, tout est rollback et la BDD reste intacte. Cette migration est **manuelle** (fichier SQL écrit à la main) car Drizzle Kit ne gère pas les data migrations complexes.

**Intégration avec Drizzle** : le fichier SQL manuel est placé dans `src/db/migrations/` avec le prochain numéro séquentiel (ex: `0001_categories_migration.sql`) et enregistré dans le journal Drizzle (`meta/_journal.json`). Cela garantit que Drizzle le traite comme une migration normale : exécutée une seule fois, trackée dans `__drizzle_migrations`.

### Fichiers impactés par le changement Category enum → FK

| Fichier | Nature du changement |
|---------|---------------------|
| `src/db/schema.ts` | Nouvelle table `categories`, champ `places.category` → `places.categoryId` (text FK) |
| `src/types/index.ts` | Type `Category` (union string) → `Category` (objet avec id/name/color/icon), supprimer `CATEGORIES` array, adapter `Place`, `PlaceInsert` |
| `src/utils/constants.ts` | Supprimer `CATEGORY_CONFIG` record (remplacé par données BDD) |
| `src/db/queries.ts` | `rowToPlace()` : join catégorie au lieu de validation enum + fallback. Nouvelles queries CRUD catégories |
| `src/stores/app-store.ts` | `selectedCategory: Category \| null` → `selectedCategory: string \| null` (ID catégorie). Ajouter state `categories: Category[]` + actions CRUD |
| `src/components/category-chip.tsx` | Lire couleur/icône depuis l'objet catégorie au lieu de `CATEGORY_CONFIG` |
| `src/components/place-form.tsx` | Sélecteur catégorie dynamique depuis le store |
| `src/components/place-card.tsx` | Affichage icône/couleur depuis la catégorie jointe |
| `src/app/(tabs)/map.tsx` | Filtres dynamiques, markers colorés par catégorie |
| `src/app/(tabs)/places.tsx` | Filtres dynamiques |
| `src/services/geofencing.ts` | **Aucun impact** (ne dépend pas des catégories) |

### Règles métier

- **Suppression** : toute catégorie est supprimable si et seulement si aucun lieu ne l'utilise. Bouton grisé sinon, avec message indiquant le nombre de lieux associés.
- **Suppression avec lieux** : pas de reassignation automatique. L'utilisateur doit d'abord modifier les lieux associés manuellement ou via un futur bulk-edit.
- Pas de distinction `isDefault` — les 7 catégories initiales sont traitées exactement comme les customs après le seed.

### UI de gestion (Settings > "Gérer les catégories")

- Liste avec drag & drop pour réordonner (`sortOrder` : entiers séquentiels 0, 1, 2..., réécriture complète de tous les `sortOrder` à chaque réordonnancement)
- Actions : ajouter, modifier, supprimer
- Formulaire catégorie : nom, couleur (color picker), icône (grille ~40 icônes Material + champ emoji libre)
- Message d'erreur si tentative de suppression d'une catégorie utilisée

---

## 2. Refonte UI / UX

### Thème

- Conserver react-native-paper (Material Design 3) mais mieux exploité
- **Dark mode** : détection automatique du thème système + toggle manuel dans Settings. Nouveau champ `themeMode: 'system' | 'light' | 'dark'` dans `settings-store.ts` (défaut : `'system'`). Le `PaperProvider` reçoit le thème en fonction de cette préférence.
- Palette de couleurs plus contrastée, surfaces avec élévation subtile
- Typographie plus hiérarchisée (titres plus grands, sous-textes plus légers)

### Navigation (3 tabs conservés : Carte, Lieux, Réglages)

- **FAB** (Floating Action Button) sur la carte ET la liste pour ajouter un lieu (composant natif react-native-paper `FAB`)
- **Bottom sheet** pour le détail d'un lieu depuis un marker carte, via `@gorhom/bottom-sheet` (déjà compatible avec `react-native-reanimated` et `react-native-gesture-handler` présents dans le projet)
- **Swipe actions** sur les cards de la liste (supprimer, activer/désactiver) via `react-native-gesture-handler` (déjà installé)

### Carte

- Markers colorés par catégorie (couleur dynamique depuis `categories`)
- Clustering via `react-native-map-clustering` (wrapper autour de `react-native-maps`, config : rayon cluster 50px, min 2 markers)
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

- Copie du fichier SQLite vers le dossier Documents du device
- **Mécanisme de copie** : `PRAGMA wal_checkpoint(FULL)` avant copie pour garantir l'intégrité (expo-sqlite utilise WAL mode par défaut), puis copie via `expo-file-system`
- **Déclenchement** : à chaque modification de données (lieu ou catégorie), debounce 30s
- **Rétention** : 3 dernières copies, rotation automatique (suppression de la plus ancienne)
- **Restauration** : Settings > "Restaurer une sauvegarde" > liste des backups locaux avec date

### Backup cloud (différé — phase future)

Le backup cloud (Google Drive / iCloud) est **reporté à une phase ultérieure**. Les raisons :
- Pas de module Expo stable pour Google Drive ou iCloud document storage
- Nécessiterait des dépendances natives lourdes (`@react-native-google-signin/google-signin` + Drive REST API pour Android, `react-native-icloud-storage` pour iOS)
- Le backup local couvre le cas principal (protection contre crash / perte de données app)

Pour l'instant, l'export JSON existant + backup local automatique offrent une protection suffisante. Le cloud sera ajouté quand l'écosystème Expo proposera une solution plus simple.

### UX

- Backup local : entièrement transparent, aucune action requise
- Indicateur dans Settings : "Dernière sauvegarde : il y a X min"

---

## 4. Renforcement des tests

### Framework de tests composants

- `@testing-library/react-native` pour les tests de composants
- Mocks nécessaires : `PaperProvider` (thème), contexte navigation Expo Router, stores Zustand
- Configuration dans `jest.setup.ts`

### Tests unitaires (haute priorité)

- **Stores Zustand** : actions CRUD du app-store, persistance et validations du settings-store
- **Queries Drizzle** : insertions, mises à jour, recherche, migration catégories
- **Service backup** : logique de rotation, debounce, checkpoint WAL
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

### Stratégie

Tests écrits en accompagnement de chaque phase (pas uniquement en phase 3) :
- **Phase 1** : tests migration catégories, tests unitaires queries catégories, tests composants refaits
- **Phase 2** : tests backup (rotation, debounce, intégrité WAL)
- **Phase 3** : tests intégration notification/localisation, renforcement E2E Maestro, couverture restante

Objectif : couverture de toutes les fonctions publiques des services, toutes les actions des stores, et les composants critiques.

---

## Phases d'implémentation

1. **Phase 1 — Catégories + UI** : table categories, migration (recréation table), refonte types/constants/queries, refonte composants/écrans, dark mode, bottom sheet (`@gorhom/bottom-sheet`), swipe, clustering (`react-native-map-clustering`), FAB + tests associés
2. **Phase 2 — Backup** : backup local automatique (WAL checkpoint + copie), rotation, UI restauration, indicateur dans Settings + tests associés
3. **Phase 3 — Tests finaux** : intégration notification/localisation, E2E Maestro renforcés, couverture restante stores/composants

### Nouvelles dépendances

| Package | Usage |
|---------|-------|
| `@gorhom/bottom-sheet` | Bottom sheet détail lieu sur la carte |
| `react-native-map-clustering` | Clustering markers carte |
| `@testing-library/react-native` | Tests de composants |

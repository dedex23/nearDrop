# Pipeline de vérification complète sur émulateur

Tu es un agent QA qui exécute le pipeline complet de vérification. Suis ces étapes dans l'ordre, en mode **fail-fast** (arrêt au premier échec critique).

## Étape 1 — Checks statiques (en parallèle)

Lance ces 3 commandes **en parallèle** via l'outil `Bash` :

1. `npm test` (timeout 60s)
2. `npx tsc --noEmit` (timeout 60s)
3. `npm run lint` (timeout 60s)

Si **un seul** échoue → affiche le résumé avec les erreurs et **STOP**. Ne passe pas à l'étape suivante.

## Étape 2 — Émulateur

Vérifie si un émulateur est déjà actif :

```bash
~/Library/Android/sdk/platform-tools/adb devices | grep -w "emulator"
```

Si aucun émulateur détecté → lance `./scripts/emu.sh start` (timeout 120s) puis attends qu'il apparaisse dans `adb devices`.

## Étape 3 — Build & deploy

Lance le build Android debug et le déploiement sur l'émulateur :

```bash
npm run android
```

Timeout : **300s** (le build Android peut prendre 3-5 minutes).

Si échec → affiche l'erreur et **STOP**.

## Étape 4 — Tests E2E Maestro

Lance les 6 flows Maestro :

```bash
./scripts/emu.sh test
```

Timeout : **300s**.

## Étape 5 — Diagnostic si échec E2E

Si les tests Maestro échouent :

1. Capture un screenshot : `./scripts/emu.sh screenshot /tmp/test-emu-fail.png`
2. Récupère les logs : `./scripts/emu.sh logs 100`
3. **Lis le screenshot** avec l'outil `Read` sur `/tmp/test-emu-fail.png` pour diagnostiquer visuellement le problème
4. Affiche les logs pertinents

## Étape 6 — Résumé final

Produis **toujours** un tableau récapitulatif, même en cas de succès total :

```
| Étape              | Résultat |
|--------------------|----------|
| Tests unitaires    | ✅ / ❌  |
| TypeScript (tsc)   | ✅ / ❌  |
| ESLint             | ✅ / ❌  |
| Émulateur          | ✅ / ❌  |
| Build Android      | ✅ / ❌  |
| Tests E2E Maestro  | ✅ / ❌  |
```

Si tout est vert : "Pipeline complet — prêt pour commit/PR."
Si échec : résume les erreurs et propose des actions correctives.

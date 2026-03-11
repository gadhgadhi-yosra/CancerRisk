# CancerRisk AI

Application Vite + React (JSX) pour l'exploration de données santé, le calcul de risk score et un assistant IA.

## Développement
```bash
npm install
npm run dev
```
L'interface est disponible sur l'URL affichée en console (par défaut http://localhost:8080).

## Build production
```bash
npm run build
npm run preview   # sert les fichiers générés depuis dist/
```

## Tests & lint
- Lint : `npm run lint`
- Tests unitaires : `npm test`

## Structure rapide
- `src/pages` : pages principales (Dashboard, RiskScore, XAI, Assistant…)
- `src/components/ui` : librairie de composants shadcn-ui convertie en JSX
- `src/lib` : utilitaires et données simulées
# CancerRisk

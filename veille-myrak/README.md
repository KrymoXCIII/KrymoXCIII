# Veille automatisée Myrak

Ce dépôt contient les workflows n8n + la documentation pour la veille techno Myrak (Slack `#veille-myrak`).

## Contenu

- `veille-myrak/docs/GUIDE.md` — guide opérationnel complet (FR)
- `veille-myrak/docs/OPENROUTER.md` — IA via OpenRouter (Bearer Auth, modèles gratuits `:free`)
- `veille-myrak/docs/SOURCES.md` — sources RSS / Reddit / Product Hunt
- `veille-myrak/docs/SCHEMAS.md` — schémas des 2 workflows
- `veille-myrak/prompts/` — prompts système Daily + Weekly
- `veille-myrak/workflows/` — JSON n8n importables + SDK

## Workflows sur n8n.myrak.fr

- Daily Digest : https://n8n.myrak.fr/workflow/BL6qQXmVrZ4J577z
- Weekly Recap : https://n8n.myrak.fr/workflow/2qqzTC8y2Ou4y05b

Enrichissement IA via **OpenRouter** (modèles gratuits `:free`, ex. `meta-llama/llama-3.3-70b-instruct:free`) avec credential Bearer Auth — plus Gemini. Voir le guide et `docs/OPENROUTER.md` pour credentials Slack + OpenRouter et activation.

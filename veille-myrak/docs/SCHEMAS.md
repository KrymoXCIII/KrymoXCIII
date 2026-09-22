# Schémas workflows – Veille Myrak

## Daily Digest

```text
Schedule (0 8 * * *)
  → Configurer les sources (Code)
  → Recuperer les flux RSS (HTTP Request)
  → Parser et normaliser (Code)
  → Filtrer dedup et scorer (Code)
  → Preparer batch OpenRouter (Code)
  → Appeler OpenRouter (HTTP Request, Bearer Auth)
  → Parser reponse OpenRouter (Code)
  → Formater message Slack (Code)
       ├→ Poster Daily Digest Slack
       └→ Eclater lignes a logger → Logger Veille Myrak (Data Table)
```

## Weekly Recap

```text
Schedule (0 9 * * 1)
  → Lire Veille Myrak (Data Table)
  → Filtrer 7j et preparer prompt (Code)
  → Appeler OpenRouter Weekly (HTTP Request, Bearer Auth)
  → Formater message Slack Weekly (Code)
  → Poster Weekly Recap Slack
```

> L’enrichissement IA ne passe plus par Information Extractor / Google Gemini.
> Voir [OPENROUTER.md](./OPENROUTER.md) pour prompts, modèles `:free` et credential Bearer.

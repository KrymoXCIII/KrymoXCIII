# Schémas workflows – Veille Myrak

## Daily Digest

```text
Schedule (0 8 * * *)
  → Configurer les sources (Code)
  → Recuperer les flux RSS (HTTP Request)
  → Parser et normaliser (Code)
  → Filtrer dedup et scorer (Code)
  → Enrichir resume score categorie (Information Extractor)
       ↳ Google Gemini Chat Model
  → Formater message Slack (Code)
       ├→ Poster Daily Digest Slack
       └→ Eclater lignes a logger → Logger Veille Myrak (Data Table)
```

## Weekly Recap

```text
Schedule (0 9 * * 1)
  → Lire Veille Myrak (Data Table)
  → Filtrer 7j et preparer prompt (Code)
  → Generer Weekly Recap Gemini (Google Gemini text)
  → Formater message Slack Weekly (Code)
  → Poster Weekly Recap Slack
```

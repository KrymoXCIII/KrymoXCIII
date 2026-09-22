# Veille automatisée Myrak (n8n + Slack)

Système de veille techno pour **Myrak** : digest quotidien Slack + récap hebdomadaire stratégique.

Workflows déjà créés sur l’instance n8n Myrak (inactifs tant que OpenRouter / canal Slack ne sont pas prêts) :

| Workflow | ID n8n | URL |
|---|---|---|
| Daily Digest | `BL6qQXmVrZ4J577z` | https://n8n.myrak.fr/workflow/BL6qQXmVrZ4J577z |
| Weekly Recap | `2qqzTC8y2Ou4y05b` | https://n8n.myrak.fr/workflow/2qqzTC8y2Ou4y05b |

Data Table d’historique : **Veille Myrak** (`Xy0t5AMfnnBFbx9e`).

---

## 1. Sources retenues

### Product Hunt

| Source | URL | Notes |
|---|---|---|
| Feed officiel | https://www.producthunt.com/feed | Atom public, fiable |
| Topics ciblés | Artificial Intelligence, Automation, Productivity, Developer Tools, Business | Pas de RSS topic stables sans API → filtrage par **mots-clés** dans le Code |

### Reddit (RSS officiel — sans Apify)

Plus simple à maintenir qu’Apify (pas de token, pas d’actor à surveiller). User-Agent dédié + batching HTTP.

| Subreddit | URL |
|---|---|
| r/automation | https://www.reddit.com/r/automation/.rss?limit=25 |
| r/rpa | https://www.reddit.com/r/rpa/.rss?limit=25 |
| r/ai_agents | https://www.reddit.com/r/ai_agents/.rss?limit=25 |
| r/n8n | https://www.reddit.com/r/n8n/.rss?limit=25 |
| r/no_code | https://www.reddit.com/r/no_code/.rss?limit=25 |
| r/SaaS | https://www.reddit.com/r/SaaS/.rss?limit=25 |
| r/freelance | https://www.reddit.com/r/freelance/.rss?limit=25 |
| r/entrepreneur | https://www.reddit.com/r/entrepreneur/.rss?limit=25 |
| **r/ArtificialIntelligence** (ajout) | https://www.reddit.com/r/ArtificialIntelligence/.rss?limit=25 |
| **r/LangChain** (ajout) | https://www.reddit.com/r/LangChain/.rss?limit=25 |
| **r/sideproject** (ajout) | https://www.reddit.com/r/sideproject/.rss?limit=25 |

Ajouts justifiés : couverture IA générale, frameworks d’agents, et indie / productized services.

### Blogs / RSS (7 flux)

| Flux | URL | Axe |
|---|---|---|
| OpenAI Blog | https://openai.com/news/rss.xml | IA / ML |
| Hugging Face Blog | https://huggingface.co/blog/feed.xml | IA / ML |
| n8n Blog | https://n8n.io/blog/feed | Automation |
| Zapier Blog | https://zapier.com/blog/feed/ | Automation / no-code |
| LangChain Blog | https://blog.langchain.dev/rss.xml | Agents IA |
| Apify Blog | https://blog.apify.com/rss/ | Automation / scraping |
| Lenny’s Newsletter | https://www.lennysnewsletter.com/feed | SaaS / product / freelance |

Écarts vs brief initial : Make (403) et Indie Hackers (404) remplacés par Apify + Lenny (flux stables testés).

---

## 2. Schémas texte des workflows

### Daily Digest (prioritaire) — tous les jours 08:00

| # | Nom du nœud | Type | Rôle |
|---|---|---|---|
| 1 | Tous les jours a 8h | Schedule Trigger | Cron `0 8 * * *` |
| 2 | Configurer les sources | Code | Liste URLs PH / Reddit / blogs + métadonnées `source` |
| 3 | Recuperer les flux RSS | HTTP Request | GET XML/Atom (batch 3, User-Agent Myrak) |
| 4 | Parser et normaliser | Code | Parse RSS/Atom → title, url, description, date, source |
| 5 | Filtrer dedup et scorer | Code | Mots-clés, dédup URL, fenêtre 24h, top 25 candidats |
| 6 | Preparer batch OpenRouter | Code | Agrège les items + body chat completions (modèle `:free`) |
| 7 | Appeler OpenRouter | HTTP Request | POST `openrouter.ai` (Bearer Auth) |
| 8 | Parser reponse OpenRouter | Code | Mappe `summary` / `score` / `category` sur chaque item |
| 9 | Formater message Slack | Code | Top 15, Top 3, message mrkdwn + rows log |
| 10 | Poster Daily Digest Slack | Slack Post Message | Canal `#veille-myrak` |
| 11 | Eclater lignes a logger | Split Out | Une ligne = un item |
| 12 | Logger Veille Myrak | Data Table Insert | Historique pour le Weekly |

### Weekly Recap — lundis 09:00

| # | Nom du nœud | Type | Rôle |
|---|---|---|---|
| 1 | Tous les lundis a 9h | Schedule Trigger | Cron `0 9 * * 1` |
| 2 | Lire Veille Myrak | Data Table Get | Tous les items loggés |
| 3 | Filtrer 7j et preparer prompt | Code | Fenêtre 7 jours + body OpenRouter |
| 4 | Appeler OpenRouter Weekly | HTTP Request | Synthèse Top 5 / tendances / idées Myrak |
| 5 | Formater message Slack Weekly | Code | Texte final Slack |
| 6 | Poster Weekly Recap Slack | Slack Post Message | Canal `#veille-myrak` |

Détail IA (prompts, modèles gratuits, credential Bearer) : voir **[OPENROUTER.md](./OPENROUTER.md)**.

---

## 3. Import / activation

### Sur l’instance Myrak (déjà en place)

1. Ouvrir les URLs ci-dessus.
2. Créer le credential **OpenRouter API** (Bearer Auth = clé API OpenRouter) et le lier aux nœuds HTTP OpenRouter.
3. Vérifier le credential **Slack account** (déjà présent).
4. Créer le canal Slack `#veille-myrak` et **inviter le bot**.
5. Activer les workflows (toggle Active).
6. Tester via « Execute workflow » sur le Schedule Trigger.

### Import JSON (autre instance)

1. n8n → **Workflows** → **Import from File**.
2. Importer `workflows/daily-digest.n8n.json` puis `workflows/weekly-recap.n8n.json`.
3. Recréer / mapper les credentials (Slack, OpenRouter Bearer Auth).
4. Recréer une Data Table `Veille Myrak` avec les colonnes : `date`, `source`, `title`, `url`, `category`, `score`, `summary`, `subreddit`, `keyword_score` — puis mettre à jour l’ID dans les nœuds Data Table.
5. Activer.

---

## 4. Credentials & configuration

| Service | Credential n8n | Usage |
|---|---|---|
| Slack | `Slack account` (Bot Token) | Post Message `#veille-myrak` |
| OpenRouter | `OpenRouter API` (Bearer Auth) | Enrichissement Daily + synthèse Weekly |
| Data Table | Aucun (natif n8n) | Log + lecture historique |
| Apify | Non utilisé | Reddit via RSS officiel |

Scopes Slack utiles : `chat:write`, accès au canal (bot invité).

Voir **[OPENROUTER.md](./OPENROUTER.md)** pour la clé API, les headers (`HTTP-Referer`, `X-Title`) et la liste des modèles `:free`.

---

## 5. Comment modifier

| Besoin | Où |
|---|---|
| Fréquence Daily | Nœud `Tous les jours a 8h` → cron |
| Fréquence Weekly | Nœud `Tous les lundis a 9h` → cron |
| Sources RSS / Reddit / PH | Nœud `Configurer les sources` (tableau `feeds`) |
| Mots-clés | Nœud `Filtrer dedup et scorer` → tableau `KEYWORDS` |
| Canal Slack | Nœuds Slack → `channelId` (mode name `veille-myrak`) |
| Désactiver le log | Désactiver le nœud `Logger Veille Myrak` (le Weekly n’aura plus d’historique) |
| Prompt Daily / modèle | `prompts/daily-enrichment.md` + nœud `Preparer batch OpenRouter` (voir OPENROUTER.md) |
| Prompt Weekly | `prompts/weekly-recap.md` + nœud `Filtrer 7j et preparer prompt` |

---

## 6. Fichiers du dépôt

```text
veille-myrak/
  docs/GUIDE.md              ← ce guide
  docs/OPENROUTER.md         ← IA via OpenRouter (Bearer Auth, modèles :free)
  docs/SCHEMAS.md
  docs/SOURCES.md
  prompts/daily-enrichment.md
  prompts/weekly-recap.md
  workflows/daily-digest.n8n.json
  workflows/weekly-recap.n8n.json
  workflows/daily-digest.sdk.js
  workflows/weekly-recap.sdk.js
```

---

## 7. Format Slack (rappel)

- Liens en mrkdwn Slack : `<https://url|Titre>`
- Daily : max 15 items, 1 phrase de résumé, Top 3 + sections PH / Reddit / Blogs
- Weekly : Top 5 + tendances + idées offre / contenu / action

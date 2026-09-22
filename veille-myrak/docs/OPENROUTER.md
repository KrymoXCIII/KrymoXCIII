# OpenRouter – Enrichissement Daily Digest

Remplacement de Gemini par OpenRouter (modèles `:free`).

## Prompt système (exact)

```text
Tu es l'analyste de veille technologique de Myrak.

Contexte Myrak :
- Myrak aide les entreprises et les freelances à automatiser des process métiers (workflows, RPA, intégrations, orchestration) et à utiliser l'IA / le machine learning (agents IA, automatisation intelligente, use cases business).
- Cibles principales : freelances (développeurs, data, automation, consultants) et PME / startups qui veulent automatiser avec l'IA.

Pour CHAQUE item fourni, produis un objet avec :
- summary : résumé en 1 phrase en français, orienté opportunité / use case business pour Myrak
- score : entier de 1 à 10
- category : une seule valeur parmi ["automatisation", "IA_ML", "agents_IA", "no_code_low_code", "SaaS_freelance", "autre"]
- id : le même id que l'item d'entrée

Critères de score (1–10) :
1. Pertinence directe pour Myrak (automation + IA + agents)
2. Potentiel d'usage dans des projets clients (freelance / PME)
3. Intérêt pour des freelances qui vendent ce type de prestations

Règles strictes :
- Réponds UNIQUEMENT avec un JSON valide : un tableau d'objets
- Aucun texte avant ou après le JSON, pas de markdown, pas de backticks
- Une seule phrase pour summary
- score = entier (pas de décimale)
- N'invente pas de faits absents du titre / description
- Si peu pertinent : score bas et category "autre"

Format de sortie attendu :
[
  {"id": 0, "summary": "...", "score": 8, "category": "agents_IA"}
]
```

## Prompt user (exact)

```text
Analyse les items de veille suivants et renvoie UNIQUEMENT le tableau JSON demandé.

Items :
[
  {
    "id": 0,
    "title": "n8n AI Agents",
    "description": "Nouvelle fonctionnalité d'agents IA dans n8n pour automatiser des process métier.",
    "source": "rss",
    "url": "https://n8n.io/blog/ai-agents"
  },
  {
    "id": 1,
    "title": "Productized AI automation for freelancers",
    "description": "Comment packager des services d'automatisation IA pour PME.",
    "source": "reddit",
    "url": "https://www.reddit.com/r/freelance/..."
  }
]
```

Dans le workflow, ce prompt est construit dynamiquement dans le nœud **Preparer batch OpenRouter** via `JSON.stringify(payloadItems)`.

## Configuration HTTP Request

| Champ | Valeur |
|---|---|
| Method | `POST` |
| URL | `https://openrouter.ai/api/v1/chat/completions` |
| Authentication | Generic Credential → **Bearer Auth** (`OpenRouter API`) |
| Header `HTTP-Referer` | `https://myrak.fr` |
| Header `X-Title` | `Myrak Veille` |
| Body | `={{ $json.openRouterBody }}` (préparé en amont) |
| Model | `meta-llama/llama-3.3-70b-instruct:free` |
| Temperature | `0.3` |

> Ne pas mettre la clé en clair dans les headers : utiliser le credential Bearer Auth.

## Mapping items → message user

Le nœud Code **Preparer batch OpenRouter** (mode *Run Once for All Items*) :

1. Agrège tous les items filtrés
2. Construit `openRouterBody.messages[1].content` avec le prompt user + `JSON.stringify(items)`
3. Renvoie **1 seul item** → le HTTP Request ne s’exécute qu’**une fois** (économique sur free tier)

## Parser la réponse

Nœud **Parser reponse OpenRouter** :

1. Lit `choices[0].message.content`
2. Nettoie les éventuels fences markdown
3. Parse le JSON (tableau)
4. Fusionne `summary` / `score` / `category` sur chaque item d’origine (via `id`)
5. Conserve aussi `output: { summary, score, category }` pour compatibilité avec le formateur Slack

## Clé API OpenRouter

1. Créer un compte sur [https://openrouter.ai](https://openrouter.ai) (gratuit, sans CB pour les modèles `:free`)
2. **Keys** → Create Key
3. Dans n8n : Credentials → **Header Auth / Bearer Auth** nommé `OpenRouter API`
   - Pour Bearer Auth : coller la clé (sans préfixe `Bearer`)
4. Lier ce credential au nœud **Appeler OpenRouter**

Alternative env var (self-host) : définir `OPENROUTER_API_KEY` et utiliser une expression / credential qui la lit — le credential Bearer reste la méthode recommandée dans n8n Cloud / UI.

## Autres modèles gratuits à tester

Dans **Preparer batch OpenRouter**, changer `model:` :

- `meta-llama/llama-3.3-70b-instruct:free`
- `google/gemma-3-27b-it:free`
- `qwen/qwen3-14b:free`
- `mistralai/mistral-small-3.1-24b-instruct:free`

Consulter la liste à jour : https://openrouter.ai/models?q=free

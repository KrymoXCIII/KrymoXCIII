import { workflow, node, trigger, sticky, newCredential, languageModel, expr } from '@n8n/workflow-sdk';

const geminiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.1,
  config: {
    name: 'Google Gemini Chat Model',
    parameters: {
      modelName: 'models/gemini-flash-latest',
      options: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    },
    credentials: {
      googlePalmApi: newCredential('Google Gemini API'),
    },
  },
});

const dailyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Tous les jours a 8h',
    parameters: {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '0 8 * * *',
          },
        ],
      },
    },
  },
});

const configSources = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Configurer les sources',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const feeds = [
  // Product Hunt (feed officiel). Topics AI/Automation/Productivity/Dev Tools/Business
  // filtrés ensuite par mots-clés (PH ne propose plus de RSS topic stables sans API).
  { url: 'https://www.producthunt.com/feed', source: 'product_hunt', label: 'Product Hunt' },

  // Blogs / RSS (7 flux)
  { url: 'https://openai.com/news/rss.xml', source: 'rss', label: 'OpenAI Blog' },
  { url: 'https://huggingface.co/blog/feed.xml', source: 'rss', label: 'Hugging Face Blog' },
  { url: 'https://n8n.io/blog/feed', source: 'rss', label: 'n8n Blog' },
  { url: 'https://zapier.com/blog/feed/', source: 'rss', label: 'Zapier Blog' },
  { url: 'https://blog.langchain.dev/rss.xml', source: 'rss', label: 'LangChain Blog' },
  { url: 'https://blog.apify.com/rss/', source: 'rss', label: 'Apify Blog' },
  { url: 'https://www.lennysnewsletter.com/feed', source: 'rss', label: "Lenny's Newsletter" },

  // Reddit via RSS officiel (plus simple a maintenir qu'Apify)
  { url: 'https://www.reddit.com/r/automation/.rss?limit=25', source: 'reddit', label: 'r/automation', subreddit: 'automation' },
  { url: 'https://www.reddit.com/r/rpa/.rss?limit=25', source: 'reddit', label: 'r/rpa', subreddit: 'rpa' },
  { url: 'https://www.reddit.com/r/ai_agents/.rss?limit=25', source: 'reddit', label: 'r/ai_agents', subreddit: 'ai_agents' },
  { url: 'https://www.reddit.com/r/n8n/.rss?limit=25', source: 'reddit', label: 'r/n8n', subreddit: 'n8n' },
  { url: 'https://www.reddit.com/r/no_code/.rss?limit=25', source: 'reddit', label: 'r/no_code', subreddit: 'no_code' },
  { url: 'https://www.reddit.com/r/SaaS/.rss?limit=25', source: 'reddit', label: 'r/SaaS', subreddit: 'SaaS' },
  { url: 'https://www.reddit.com/r/freelance/.rss?limit=25', source: 'reddit', label: 'r/freelance', subreddit: 'freelance' },
  { url: 'https://www.reddit.com/r/entrepreneur/.rss?limit=25', source: 'reddit', label: 'r/entrepreneur', subreddit: 'entrepreneur' },
  // Ajouts justifiés
  { url: 'https://www.reddit.com/r/ArtificialIntelligence/.rss?limit=25', source: 'reddit', label: 'r/ArtificialIntelligence', subreddit: 'ArtificialIntelligence' },
  { url: 'https://www.reddit.com/r/LangChain/.rss?limit=25', source: 'reddit', label: 'r/LangChain', subreddit: 'LangChain' },
  { url: 'https://www.reddit.com/r/sideproject/.rss?limit=25', source: 'reddit', label: 'r/sideproject', subreddit: 'sideproject' },
];

return feeds.map((feed) => ({ json: feed }));`,
    },
    output: [
      {
        url: 'https://www.producthunt.com/feed',
        source: 'product_hunt',
        label: 'Product Hunt',
      },
      {
        url: 'https://n8n.io/blog/feed',
        source: 'rss',
        label: 'n8n Blog',
      },
      {
        url: 'https://www.reddit.com/r/n8n/.rss?limit=25',
        source: 'reddit',
        label: 'r/n8n',
        subreddit: 'n8n',
      },
    ],
  },
});

const fetchFeeds = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Recuperer les flux RSS',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          {
            name: 'User-Agent',
            value: 'MyrakVeilleBot/1.0 (veille technologique; contact: karym.yousfi@gmail.com)',
          },
          {
            name: 'Accept',
            value: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
        ],
      },
      options: {
        response: {
          response: {
            responseFormat: 'text',
            neverError: true,
          },
        },
        batching: {
          batch: {
            batchSize: 3,
            batchInterval: 1200,
          },
        },
        timeout: 20000,
      },
    },
    onError: 'continueRegularOutput',
    output: [
      {
        data: '<?xml version="1.0"?><rss><channel><item><title>n8n AI Agents</title><link>https://example.com/1</link><description>Automation with AI agents for freelancers</description><pubDate>Mon, 21 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>',
      },
    ],
  },
});

const parseNormalize = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parser et normaliser',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `function decodeXml(text) {
  return String(text || '')
    .replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\s+/g, ' ')
    .trim();
}

function firstMatch(block, patterns) {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match && match[1]) return decodeXml(match[1]);
  }
  return '';
}

function parseFeed(xml, meta) {
  const items = [];
  if (!xml || typeof xml !== 'string') return items;

  const entryRegex = /<(?:item|entry)\\b[\\s\\S]*?<\\/(?:item|entry)>/gi;
  const blocks = xml.match(entryRegex) || [];

  for (const block of blocks) {
    const title = firstMatch(block, [
      /<title[^>]*>([\\s\\S]*?)<\\/title>/i,
    ]);
    const url = firstMatch(block, [
      /<link[^>]*href=["']([^"']+)["'][^>]*>/i,
      /<link[^>]*>([\\s\\S]*?)<\\/link>/i,
      /<id[^>]*>([\\s\\S]*?)<\\/id>/i,
      /<guid[^>]*>([\\s\\S]*?)<\\/guid>/i,
    ]);
    const description = firstMatch(block, [
      /<summary[^>]*>([\\s\\S]*?)<\\/summary>/i,
      /<content[^>]*>([\\s\\S]*?)<\\/content>/i,
      /<description[^>]*>([\\s\\S]*?)<\\/description>/i,
      /<media:description[^>]*>([\\s\\S]*?)<\\/media:description>/i,
    ]).replace(/<[^>]+>/g, ' ').slice(0, 800);
    const publishedAt = firstMatch(block, [
      /<published[^>]*>([\\s\\S]*?)<\\/published>/i,
      /<updated[^>]*>([\\s\\S]*?)<\\/updated>/i,
      /<pubDate[^>]*>([\\s\\S]*?)<\\/pubDate>/i,
      /<dc:date[^>]*>([\\s\\S]*?)<\\/dc:date>/i,
    ]);

    if (!title || !url) continue;

    items.push({
      json: {
        title,
        url: url.trim(),
        description,
        publishedAt,
        source: meta.source,
        label: meta.label,
        subreddit: meta.subreddit || '',
      },
    });
  }
  return items;
}

const results = [];
const sourceItems = $('Configurer les sources').all();

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const sourceMeta = sourceItems[i] ? sourceItems[i].json : {};
  const meta = {
    source: sourceMeta.source || item.json.source || 'rss',
    label: sourceMeta.label || item.json.label || 'unknown',
    subreddit: sourceMeta.subreddit || item.json.subreddit || '',
  };
  const xml = item.json.data || item.json.body || (typeof item.json === 'string' ? item.json : '');
  results.push(...parseFeed(xml, meta));
}

return results;`,
    },
    output: [
      {
        title: 'n8n AI Agents',
        url: 'https://example.com/1',
        description: 'Automation with AI agents for freelancers',
        publishedAt: 'Mon, 21 Sep 2026 10:00:00 GMT',
        source: 'rss',
        label: 'n8n Blog',
        subreddit: '',
      },
    ],
  },
});

const filterItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Filtrer dedup et scorer',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const KEYWORDS = [
  'automatisation', 'automation', 'workflow', 'process', 'business process',
  'RPA', 'no-code', 'low-code', 'intégration', 'integration', 'API',
  'IA', 'intelligence artificielle', 'artificial intelligence', 'machine learning', 'ML', 'LLM',
  'agent', 'agents IA', 'AI agent', 'multi-agent', 'autonomous',
  'freelance', 'SaaS', 'indie hacker', 'productized service', 'AI agency',
];

const WINDOW_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
const seen = new Set();
const scored = [];

function keywordScore(text) {
  const hay = String(text || '').toLowerCase();
  let score = 0;
  for (const kw of KEYWORDS) {
    if (hay.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

for (const item of items) {
  const data = item.json;
  const url = String(data.url || '').split('?')[0].replace(/\\/$/, '');
  if (!url || seen.has(url)) continue;
  seen.add(url);

  const publishedMs = parseDate(data.publishedAt);
  // Si la date est absente (certains flux), on garde l'item (mieux que de tout perdre).
  if (publishedMs !== null && now - publishedMs > WINDOW_MS) continue;

  const blob = \`\${data.title || ''} \${data.description || ''}\`;
  const kwScore = keywordScore(blob);
  if (kwScore < 1) continue;

  scored.push({
    json: {
      title: data.title,
      url,
      description: data.description || '',
      publishedAt: data.publishedAt || new Date().toISOString(),
      source: data.source,
      label: data.label,
      subreddit: data.subreddit || '',
      keywordScore: kwScore,
    },
  });
}

scored.sort((a, b) => b.json.keywordScore - a.json.keywordScore);
// Limite avant IA pour cout / latence
return scored.slice(0, 25);`,
    },
    output: [
      {
        title: 'n8n AI Agents',
        url: 'https://example.com/1',
        description: 'Automation with AI agents for freelancers',
        publishedAt: 'Mon, 21 Sep 2026 10:00:00 GMT',
        source: 'rss',
        label: 'n8n Blog',
        subreddit: '',
        keywordScore: 4,
      },
    ],
  },
});

const enrichAi = node({
  type: '@n8n/n8n-nodes-langchain.informationExtractor',
  version: 1.2,
  config: {
    name: 'Enrichir resume score categorie',
    parameters: {
      text: expr('{{ "Title: " + $json.title + "\\nSource: " + $json.source + "\\nLabel: " + $json.label + "\\nSubreddit: " + ($json.subreddit || "") + "\\nDescription: " + $json.description + "\\nURL: " + $json.url + "\\nKeywordScore: " + $json.keywordScore }}'),
      schemaType: 'fromJson',
      jsonSchemaExample: '{\n  "summary": "Resume en 1 phrase en francais, oriente opportunite business pour Myrak.",\n  "score": 7,\n  "category": "automatisation"\n}',
      options: {
        systemPromptTemplate: `Tu es l'analyste de veille technologique de Myrak.

Contexte Myrak :
- Myrak aide les entreprises et les freelances a automatiser des process metiers (workflows, RPA, integrations, orchestration) et a utiliser l'IA / le machine learning (agents IA, automatisation intelligente, use cases business).
- Cibles principales : freelances (developpeurs, data, automation, consultants) et PME / startups qui veulent automatiser avec l'IA.

Pour chaque item fourni (title, description, source), produis UNIQUEMENT un JSON valide avec :
{
  "summary": "Resume en 1 phrase en francais, oriente opportunite / use case business pour Myrak.",
  "score": 7,
  "category": "automatisation"
}

Categories autorisees (choisir exactement une) :
- "automatisation"
- "IA_ML"
- "agents_IA"
- "no_code_low_code"
- "SaaS_freelance"
- "autre"

Criteres de score (entier de 1 a 10) :
1. Pertinence directe pour Myrak (automation + IA + agents).
2. Potentiel d'usage dans des projets clients (freelance / PME).
3. Interet pour des freelances qui vendent ce type de prestations.

Regles :
- summary : une seule phrase, claire, actionnable, en francais.
- score : entier 1-10 (pas de decimale).
- category : une des valeurs listees ci-dessus.
- N'invente pas de faits absents du titre / description.
- Si l'item est peu pertinent, mets un score bas et category "autre".
- Ne renvoie aucun texte hors JSON.`,
        batching: {
          batchSize: 5,
          delayBetweenBatches: 800,
        },
      },
    },
    subnodes: {
      model: geminiModel,
    },
    output: [
      {
        title: 'n8n AI Agents',
        url: 'https://example.com/1',
        description: 'Automation with AI agents for freelancers',
        publishedAt: 'Mon, 21 Sep 2026 10:00:00 GMT',
        source: 'rss',
        label: 'n8n Blog',
        subreddit: '',
        keywordScore: 4,
        output: {
          summary: 'Nouvelle vague d agents n8n exploitables pour packager des automatisations IA aupres des PME.',
          score: 9,
          category: 'agents_IA',
        },
      },
    ],
  },
});

const formatSlack = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Formater message Slack',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const allowedCategories = new Set([
  'automatisation', 'IA_ML', 'agents_IA', 'no_code_low_code', 'SaaS_freelance', 'autre',
]);

const enriched = items.map((item) => {
  const data = item.json;
  const ai = data.output || {};
  const aiScore = Number(ai.score);
  const keywordScore = Number(data.keywordScore) || 0;
  const score = Number.isFinite(aiScore) ? aiScore : 0;
  const category = allowedCategories.has(ai.category) ? ai.category : 'autre';
  const summary = String(ai.summary || data.description || '').replace(/\\n+/g, ' ').trim();
  const finalScore = score + keywordScore * 0.25;
  return {
    title: data.title,
    url: data.url,
    source: data.source,
    label: data.label,
    subreddit: data.subreddit || '',
    category,
    summary,
    score,
    keywordScore,
    finalScore,
    publishedAt: data.publishedAt,
  };
});

enriched.sort((a, b) => b.finalScore - a.finalScore || b.score - a.score);
const top = enriched.slice(0, 15);
const top3 = top.slice(0, 3);

const bySource = {
  product_hunt: top.filter((i) => i.source === 'product_hunt'),
  reddit: top.filter((i) => i.source === 'reddit'),
  rss: top.filter((i) => i.source === 'rss'),
};

const now = new Date();
const dateLabel = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function line(item, withSubreddit = false) {
  const meta = withSubreddit && item.subreddit
    ? \`r/\${item.subreddit}\`
    : item.category;
  return \`- <\${item.url}|\${item.title}> – \${meta} – \${item.summary} Score: \${item.score}/10\`;
}

function numbered(item, idx) {
  return \`\${idx}. <\${item.url}|\${item.title}> – \${item.category} – \${item.summary} Score: \${item.score}/10\`;
}

let message = \`🧭 *Veille Myrak – \${dateLabel}*\\n\\n\`;
message += \`⭐ *Top 3 du jour*\\n\`;
if (top3.length === 0) {
  message += \`_Aucun item pertinent sur les dernieres 24h._\\n\`;
} else {
  top3.forEach((item, idx) => {
    message += \`\${numbered(item, idx + 1)}\\n\`;
  });
}

message += \`\\n🚀 *Product Hunt*\\n\`;
message += bySource.product_hunt.length
  ? bySource.product_hunt.map((i) => line(i)).join('\\n') + '\\n'
  : \`_Aucun lancement pertinent._\\n\`;

message += \`\\n🔴 *Reddit*\\n\`;
message += bySource.reddit.length
  ? bySource.reddit.map((i) => line(i, true)).join('\\n') + '\\n'
  : \`_Aucun post pertinent._\\n\`;

message += \`\\n📰 *Blogs / RSS*\\n\`;
message += bySource.rss.length
  ? bySource.rss.map((i) => line(i)).join('\\n') + '\\n'
  : \`_Aucun article pertinent._\\n\`;

const rows = top.map((item) => ({
  date: item.publishedAt || now.toISOString(),
  source: item.source,
  title: item.title,
  url: item.url,
  category: item.category,
  score: item.score,
  summary: item.summary,
  subreddit: item.subreddit || '',
  keyword_score: item.keywordScore,
}));

return [{
  json: {
    slackMessage: message.trim(),
    itemCount: top.length,
    rows,
  },
}];`,
    },
    output: [
      {
        slackMessage: '🧭 *Veille Myrak – 22/09/2026*\n\n⭐ *Top 3 du jour*\n1. <https://example.com/1|n8n AI Agents> – agents_IA – Nouvelle vague. Score: 9/10',
        itemCount: 1,
        rows: [
          {
            date: '2026-09-21T10:00:00.000Z',
            source: 'rss',
            title: 'n8n AI Agents',
            url: 'https://example.com/1',
            category: 'agents_IA',
            score: 9,
            summary: 'Nouvelle vague.',
            subreddit: '',
            keyword_score: 4,
          },
        ],
      },
    ],
  },
});

const postSlack = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Poster Daily Digest Slack',
    parameters: {
      resource: 'message',
      operation: 'post',
      authentication: 'accessToken',
      select: 'channel',
      channelId: {
        __rl: true,
        mode: 'name',
        value: 'veille-myrak',
      },
      messageType: 'text',
      text: expr('{{ $json.slackMessage }}'),
      otherOptions: {
        mrkdwn: true,
        includeLinkToWorkflow: false,
        unfurl_links: false,
        unfurl_media: false,
      },
    },
    credentials: {
      slackApi: newCredential('Slack account'),
    },
    output: [
      {
        ok: true,
        channel: 'C000VEILLE',
      },
    ],
  },
});

const splitRows = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: 'Eclater lignes a logger',
    parameters: {
      fieldToSplitOut: 'rows',
      include: 'noOtherFields',
    },
    output: [
      {
        date: '2026-09-21T10:00:00.000Z',
        source: 'rss',
        title: 'n8n AI Agents',
        url: 'https://example.com/1',
        category: 'agents_IA',
        score: 9,
        summary: 'Nouvelle vague.',
        subreddit: '',
        keyword_score: 4,
      },
    ],
  },
});

const logDataTable = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Logger Veille Myrak',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: {
        __rl: true,
        mode: 'id',
        value: 'Xy0t5AMfnnBFbx9e',
        cachedResultName: 'Veille Myrak',
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          date: expr('{{ $json.date }}'),
          source: expr('{{ $json.source }}'),
          title: expr('{{ $json.title }}'),
          url: expr('{{ $json.url }}'),
          category: expr('{{ $json.category }}'),
          score: expr('{{ $json.score }}'),
          summary: expr('{{ $json.summary }}'),
          subreddit: expr('{{ $json.subreddit }}'),
          keyword_score: expr('{{ $json.keyword_score }}'),
        },
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'date', canBeUsedToMatch: true },
          { id: 'source', displayName: 'source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'title', displayName: 'title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'url', displayName: 'url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'category', displayName: 'category', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'score', displayName: 'score', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'summary', displayName: 'summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'subreddit', displayName: 'subreddit', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'keyword_score', displayName: 'keyword_score', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
        ],
      },
      options: {
        optimizeBulk: true,
      },
    },
    output: [
      {
        id: 1,
      },
    ],
  },
});

const guideSticky = sticky(
  `## Veille Myrak – Daily Digest\n\n1. Creer le canal Slack \`#veille-myrak\` et inviter le bot.\n2. Configurer le credential **Google Gemini API**.\n3. Verifier le credential **Slack account**.\n4. Sources / mots-cles : noeud **Configurer les sources** et **Filtrer dedup et scorer**.\n5. Pour desactiver le log : desactiver le noeud **Logger Veille Myrak**.`,
  undefined,
  { width: 460, height: 360 },
);

export default workflow('myrak-daily-digest', 'Myrak – Daily Digest Veille')
  .add(dailyTrigger)
  .to(configSources)
  .to(fetchFeeds)
  .to(parseNormalize)
  .to(filterItems)
  .to(enrichAi)
  .to(formatSlack)
  .to(postSlack)
  .add(formatSlack)
  .to(splitRows)
  .to(logDataTable)
  .add(guideSticky);

import { workflow, node, trigger, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const weeklyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Tous les lundis a 9h',
    parameters: {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '0 9 * * 1',
          },
        ],
      },
    },
  },
});

const getRows = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lire Veille Myrak',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: {
        __rl: true,
        mode: 'id',
        value: 'Xy0t5AMfnnBFbx9e',
        cachedResultName: 'Veille Myrak',
      },
      returnAll: true,
    },
    output: [
      {
        id: 1,
        date: '2026-09-20T10:00:00.000Z',
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

const preparePrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Filtrer 7j et preparer prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

const weekItems = [];
for (const item of items) {
  const data = item.json;
  const ms = parseDate(data.date || data.publishedAt || data.createdAt);
  if (ms !== null && now - ms > WINDOW_MS) continue;
  weekItems.push({
    title: data.title || '',
    url: data.url || '',
    category: data.category || 'autre',
    score: Number(data.score) || 0,
    summary: data.summary || '',
    source: data.source || '',
    subreddit: data.subreddit || '',
  });
}

weekItems.sort((a, b) => b.score - a.score);

const d = new Date();
const onejan = new Date(d.getFullYear(), 0, 1);
const weekNum = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
const year = d.getFullYear();

const listText = weekItems.length
  ? weekItems.map((it, i) => (
      (i + 1) + '. [' + it.score + '/10] ' + it.title + ' | ' + it.category + ' | ' + it.source
      + '\\n   URL: ' + it.url
      + '\\n   Resume: ' + it.summary
    )).join('\\n')
  : 'Aucun item sur les 7 derniers jours.';

const userMessage = 'Semaine ' + weekNum + '/' + year + ' — ' + weekItems.length + ' items:\\n\\n' + listText;

return [{
  json: {
    weekNum,
    year,
    itemCount: weekItems.length,
    userMessage,
    items: weekItems,
  },
}];`,
    },
    output: [
      {
        weekNum: 39,
        year: 2026,
        itemCount: 1,
        userMessage: 'Semaine 39/2026 — 1 items:\n\n1. [9/10] n8n AI Agents | agents_IA | rss\n   URL: https://example.com/1\n   Resume: Nouvelle vague.',
        items: [
          {
            title: 'n8n AI Agents',
            url: 'https://example.com/1',
            category: 'agents_IA',
            score: 9,
            summary: 'Nouvelle vague.',
            source: 'rss',
            subreddit: '',
          },
        ],
      },
    ],
  },
});

const WEEKLY_SYSTEM = "Tu es le stratège de veille de Myrak. Contexte: automation + IA + agents pour freelances/PME. À partir de la liste d'items de la semaine, génère un récap Slack mrkdwn avec: titre Semaine N/YYYY, Top 5, Tendances (3 bullets), Idées pour Myrak (3 bullets). Liens au format <url|titre>. Français. Pas de JSON.";

const geminiText = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: {
    name: 'Generer Weekly Recap Gemini',
    parameters: {
      resource: 'text',
      operation: 'message',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'models/gemini-flash-latest',
        cachedResultName: 'models/gemini-flash-latest',
      },
      messages: {
        values: [
          {
            content: expr('{{ $json.userMessage }}'),
          },
        ],
      },
      simplify: true,
      jsonOutput: false,
      options: {
        systemMessage: WEEKLY_SYSTEM,
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    },
    credentials: {
      googlePalmApi: newCredential('Google Gemini API'),
    },
    output: [
      {
        text: '🧭 *Veille Myrak – Semaine 39/2026*\n\n🔥 *Top 5*\n1. <https://example.com/1|n8n AI Agents> – agents_IA – Resume.',
      },
    ],
  },
});

const formatSlack = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Formater message Slack Weekly',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const item = items[0].json;
let text = '';
if (typeof item.text === 'string') text = item.text;
else if (typeof item.content === 'string') text = item.content;
else if (item.candidates && item.candidates[0]) {
  const parts = item.candidates[0].content?.parts || [];
  text = parts.map((p) => p.text || '').join('\\n');
} else if (item.output) {
  text = typeof item.output === 'string' ? item.output : JSON.stringify(item.output);
} else {
  text = String(item.slackMessage || item.message || '');
}
text = String(text || '').trim();
if (!text) {
  text = '_Weekly Recap: aucun contenu genere._';
}
return [{ json: { slackMessage: text } }];`,
    },
    output: [
      {
        slackMessage: '🧭 *Veille Myrak – Semaine 39/2026*\n\n🔥 *Top 5*\n1. <https://example.com/1|n8n AI Agents> – agents_IA – Resume.',
      },
    ],
  },
});

const postSlack = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Poster Weekly Recap Slack',
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

const guideSticky = sticky(
  `## Veille Myrak – Weekly Recap\n\n1. Tourne chaque lundi a 9h (cron 0 9 * * 1).\n2. Lit la Data Table **Veille Myrak** (id Xy0t5AMfnnBFbx9e).\n3. Filtre les 7 derniers jours, resume via Gemini, poste sur Slack #veille-myrak.\n4. Credentials: Google Gemini API + Slack account.`,
  undefined,
  { width: 460, height: 320 },
);

export default workflow('myrak-weekly-recap', 'Myrak – Weekly Recap Veille')
  .add(weeklyTrigger)
  .to(getRows)
  .to(preparePrompt)
  .to(geminiText)
  .to(formatSlack)
  .to(postSlack)
  .add(guideSticky);

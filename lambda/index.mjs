import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = readFileSync(join(__dirname, 'system-prompt.md'), 'utf8');

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.5';
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ??
  'https://getskibots.github.io,http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let _openai = null;
const getOpenAI = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

// JSON Schema for OpenAI structured outputs.
const RESPONSE_SCHEMA = {
  name: 'TrailheadResponse',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['question', 'compose'] },
      question: { type: ['string', 'null'] },
      email: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              subject: { type: 'string' },
              recommendedDepartment: {
                type: 'string',
                enum: [
                  'Ski School',
                  'Lift Tickets',
                  'Lodging / Reservations',
                  'Rentals',
                  'Season Pass / Membership',
                  'Group Sales & Events',
                  'Food & Beverage',
                  'Lost & Found',
                  'Guest Services',
                ],
              },
              priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
              revenueOpportunity: { type: 'boolean' },
              requestSummary: { type: 'string' },
              knownDetails: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    label: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['label', 'value'],
                },
              },
              additionalInfoNeeded: { type: 'array', items: { type: 'string' } },
              originalGuestMessage: { type: 'string' },
              suggestedResponse: { type: 'string' },
            },
            required: [
              'subject',
              'recommendedDepartment',
              'priority',
              'revenueOpportunity',
              'requestSummary',
              'knownDetails',
              'additionalInfoNeeded',
              'originalGuestMessage',
              'suggestedResponse',
            ],
          },
        ],
      },
    },
    required: ['type'],
  },
  strict: true,
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(status, body, origin) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function buildMessages(conversationHistory, action) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  for (const turn of conversationHistory) {
    if (turn.role === 'guest') {
      messages.push({ role: 'user', content: turn.text });
    } else if (turn.role === 'assistant') {
      messages.push({ role: 'assistant', content: turn.question });
    }
  }

  if (action === 'regenerate_question') {
    const lastAssistant = [...conversationHistory]
      .reverse()
      .find((t) => t.role === 'assistant');
    const avoid = lastAssistant?.question ?? '';
    messages.push({
      role: 'system',
      content: `Regenerate mode: Generate a *different* clarifying question. Avoid repeating or rephrasing this previous question: "${avoid}". Explore a different dimension of the request.`,
    });
  }

  return messages;
}

export const handler = async (event) => {
  const origin = event?.headers?.origin ?? event?.headers?.Origin ?? '';

  if (event?.requestContext?.http?.method === 'OPTIONS' || event?.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { error: 'OPENAI_API_KEY not configured' }, origin);
  }

  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, origin);
  }

  const conversationHistory = Array.isArray(payload?.conversationHistory)
    ? payload.conversationHistory
    : null;
  const action = payload?.action === 'regenerate_question' ? 'regenerate_question' : 'next';

  if (!conversationHistory || conversationHistory.length === 0) {
    return jsonResponse(400, { error: 'conversationHistory required' }, origin);
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: buildMessages(conversationHistory, action),
      response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
      temperature: action === 'regenerate_question' ? 0.9 : 0.5,
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      return jsonResponse(502, { error: 'Empty model response' }, origin);
    }

    const parsed = JSON.parse(raw);

    if (parsed.type === 'question' && typeof parsed.question === 'string') {
      return jsonResponse(200, { type: 'question', question: parsed.question }, origin);
    }

    if (parsed.type === 'compose' && parsed.email) {
      return jsonResponse(200, { type: 'compose', email: parsed.email }, origin);
    }

    return jsonResponse(502, { error: 'Model returned unexpected shape', raw: parsed }, origin);
  } catch (err) {
    console.error('Trailhead handler error:', err);
    return jsonResponse(500, { error: err?.message ?? 'Unknown error' }, origin);
  }
};

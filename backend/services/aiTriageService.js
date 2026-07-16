// AI Issue Triage service.
// Calls Gemini or OpenAI (chosen via AI_PROVIDER) to classify a free-text
// complaint into a structured triage result. If no API key is configured or
// the call fails, falls back to the deterministic rule-based classifier
// (ported from the original frontend) so the feature never hard-fails.

import prisma from '../config/prisma.js'

const KEYWORD_RULES = [
  {
    match: ['leak', 'leaking', 'water', 'dripping'],
    category: 'Leakage / Performance',
    priority: 'High',
    causes: ['Blocked or cracked drain line', 'Worn seal or gasket', 'Condensation buildup'],
    checks: ['Turn off the unit if water is near electrical wiring', 'Inspect drainage path for blockage', 'Check surrounding area for standing water'],
  },
  {
    match: ['flicker', 'flickering', 'no display', 'not turning on', 'screen', 'hdmi', 'projector'],
    category: 'Electronics',
    priority: 'Medium',
    causes: ['Loose or damaged cable connection', 'Failing internal power supply', 'Overheating component'],
    checks: ['Verify power cable and HDMI connections are firmly seated', 'Try an alternate cable or port', 'Check for overheating or unusual smell before continuing use'],
  },
  {
    match: ['noise', 'unusual noise', 'grinding', 'rattling', 'vibrat'],
    category: 'Mechanical',
    priority: 'Medium',
    causes: ['Worn bearing or motor part', 'Loose mounting hardware', 'Foreign object caught in moving part'],
    checks: ['Do not operate if grinding noise is severe', 'Visually inspect for loose panels or debris', 'Note when in the operating cycle the noise occurs'],
  },
  {
    match: ['smoke', 'burning smell', 'spark', 'shock', 'electric'],
    category: 'Electrical Safety',
    priority: 'Critical',
    causes: ['Short circuit', 'Damaged wiring insulation', 'Overloaded circuit'],
    checks: ['Disconnect power immediately if safe to do so', 'Do not touch exposed wiring', 'Evacuate the area if smoke is present and notify facilities immediately'],
  },
  {
    match: ['cooling', 'not cooling', 'warm', 'ac ', 'air condition'],
    category: 'HVAC',
    priority: 'Medium',
    causes: ['Low refrigerant', 'Dirty filter restricting airflow', 'Frozen evaporator coil'],
    checks: ['Check and clean/replace the air filter', 'Confirm thermostat settings are correct', 'Look for ice buildup on indoor coil'],
  },
  {
    match: ['stuck', 'jammed', 'not moving', 'elevator', 'lift'],
    category: 'Mechanical Safety',
    priority: 'Critical',
    causes: ['Door sensor obstruction', 'Motor or cable fault', 'Control system fault'],
    checks: ['Do not force doors open', 'Evacuate occupants using emergency procedure if trapped', 'Notify a qualified elevator technician immediately'],
  },
  {
    match: ['crack', 'broken', 'damage', 'damaged'],
    category: 'Structural / Physical Damage',
    priority: 'Medium',
    causes: ['Impact damage', 'Material fatigue', 'Manufacturing defect'],
    checks: ['Photograph the damage for the record', 'Restrict access if the damage poses a safety risk', 'Avoid further load or stress on the damaged area'],
  },
]

const DEFAULT_RULE = {
  category: 'General',
  priority: 'Medium',
  causes: ['Normal wear and tear', 'Irregular usage pattern', 'Requires on-site inspection to confirm'],
  checks: ['Confirm the issue is reproducible', 'Check for any visible external damage', 'Log exact time and conditions when the issue occurs'],
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

function buildTitle(complaint, category) {
  const clean = complaint.trim().replace(/\s+/g, ' ')
  const short = clean.length > 60 ? clean.slice(0, 57) + '…' : clean
  return toTitleCase(`${category.split(' / ')[0]}: ${short}`)
}

async function ruleBasedTriage({ complaint, asset }) {
  const text = complaint.toLowerCase()
  const rule = KEYWORD_RULES.find((r) => r.match.some((kw) => text.includes(kw))) || DEFAULT_RULE

  let recurringWarning = null
  if (asset?.id) {
    const priorCount = await prisma.issue.count({ where: { assetId: asset.id } })
    if (priorCount >= 2) {
      recurringWarning = `This asset has ${priorCount} prior reported issues. Consider a full inspection instead of a spot fix.`
    }
  }

  return {
    title: buildTitle(complaint, rule.category),
    category: rule.category,
    priority: rule.priority,
    possibleCauses: rule.causes,
    initialChecks: rule.checks,
    recurringWarning,
    safetyNote:
      rule.priority === 'Critical'
        ? 'This looks safety-critical. A qualified technician should assess it before the asset is used again.'
        : null,
    generatedAt: new Date().toISOString(),
  }
}

const SYSTEM_PROMPT = `You are an AI maintenance issue triage assistant for a facilities management system.
Given an asset's context and a free-text complaint, respond with ONLY a JSON object (no markdown, no prose) matching exactly this shape:
{
  "title": "short descriptive issue title, max 70 chars",
  "category": "one of: Electronics, HVAC, Mechanical, Mechanical Safety, Electrical Safety, Leakage / Performance, Structural / Physical Damage, Plumbing, General",
  "priority": "one of: Low, Medium, High, Critical",
  "possibleCauses": ["cause 1", "cause 2", "cause 3"],
  "initialChecks": ["check 1", "check 2", "check 3"],
  "safetyNote": "a short safety warning string if priority is Critical or High risk, otherwise null"
}
Use Critical priority only for genuine safety hazards (fire, shock, structural collapse, entrapment).`

async function callGemini({ complaint, asset }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key') return null

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const assetContext = asset
    ? `Asset: ${asset.name} (${asset.category}), located at ${asset.location}, condition: ${asset.condition}.`
    : 'No specific asset context provided.'

  const body = {
    contents: [
      {
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${assetContext}\n\nComplaint: "${complaint}"` }],
      },
    ],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')
  return JSON.parse(text)
}

async function callOpenAI({ complaint, asset }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_openai_api_key') return null

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const assetContext = asset
    ? `Asset: ${asset.name} (${asset.category}), located at ${asset.location}, condition: ${asset.condition}.`
    : 'No specific asset context provided.'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${assetContext}\n\nComplaint: "${complaint}"` },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned no content')
  return JSON.parse(text)
}

/**
 * Runs AI triage over a complaint + asset context.
 * Tries the configured provider (Gemini/OpenAI); falls back to the
 * deterministic rule-based classifier on any failure or missing key.
 */
export async function runAiTriage({ complaint, asset }) {
  if (!complaint || complaint.trim().length < 8) {
    const err = new Error('Complaint is too short for the AI to analyze. Please add more detail.')
    err.statusCode = 400
    throw err
  }

  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  let aiResult = null

  try {
    if (provider === 'openai') {
      aiResult = await callOpenAI({ complaint, asset })
    } else {
      aiResult = await callGemini({ complaint, asset })
    }
  } catch (err) {
    console.warn(`AI provider (${provider}) call failed, falling back to rule-based triage:`, err.message)
    aiResult = null
  }

  if (!aiResult) {
    return ruleBasedTriage({ complaint, asset })
  }

  // Merge in the recurring-issue check (not something the LLM can know reliably).
  let recurringWarning = null
  if (asset?.id) {
    const priorCount = await prisma.issue.count({ where: { assetId: asset.id } })
    if (priorCount >= 2) {
      recurringWarning = `This asset has ${priorCount} prior reported issues. Consider a full inspection instead of a spot fix.`
    }
  }

  return {
    title: aiResult.title || buildTitle(complaint, aiResult.category || 'General'),
    category: aiResult.category || 'General',
    priority: ['Low', 'Medium', 'High', 'Critical'].includes(aiResult.priority) ? aiResult.priority : 'Medium',
    possibleCauses: Array.isArray(aiResult.possibleCauses) ? aiResult.possibleCauses : [],
    initialChecks: Array.isArray(aiResult.initialChecks) ? aiResult.initialChecks : [],
    recurringWarning,
    safetyNote: aiResult.safetyNote || null,
    generatedAt: new Date().toISOString(),
  }
}

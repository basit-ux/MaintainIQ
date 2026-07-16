// AI Issue Triage — calls the secured backend endpoint, which in turn
// calls Gemini/OpenAI (with a deterministic rule-based fallback server
// side). The frontend never holds an AI API key.

import { apiRequest } from './api'

export async function runAiTriageAsync({ complaint, asset }) {
  const result = await apiRequest('/issues/ai-triage', {
    method: 'POST',
    body: { complaint, assetId: asset?.id || null },
  })
  if (!result.ok) {
    throw new Error(result.error || 'AI triage is unavailable right now. You can still fill in the details manually below.')
  }
  return result.result
}

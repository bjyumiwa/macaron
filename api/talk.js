// /api/talk.js  （Vercel Serverless Function / Node ランタイム想定）
export default async function handler(req, res) {
  const setCORS = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };
  setCORS();
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    setCORS();
    return res.status(200).json({ ok: true, endpoint: '/api/talk', expect: 'POST' });
  }
  if (req.method !== 'POST') {
    setCORS();
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      setCORS();
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
    }

    // body（文字列でもOK）
    let body = req.body ?? {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const model = body.model || 'gpt-4o-mini';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 220;

    // messages 組み立て（互換）
    let messages = null;
    if (body.userMessage) {
      const systemPrompt = body.systemPrompt || 'You are WHOAI.';
      const hist = Array.isArray(body.history) ? body.history : [];
      messages = [
        { role: 'system', content: String(systemPrompt) },
        ...hist.map(h => ({
          role: (h.role === 'assistant' || h.role === 'system') ? h.role : 'user',
          content: String(h.content ?? '')
        })),
        { role: 'user', content: String(body.userMessage ?? '') }
      ];
    }
    if (!messages && Array.isArray(body.messages) && body.messages.length) {
      messages = body.messages.map(m => ({
        role: (m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
        content: String(m.content ?? '')
      }));
    }
    if (!messages && body.message) {
      messages = [
        { role: 'system', content: 'あなたはやさしい相棒AI。短く優しく答えて。' },
        { role: 'user', content: String(body.message) }
      ];
    }
    if (!messages) {
      setCORS();
      return res.status(400).json({ error: 'No input', received: body });
    }

    // OpenAI
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });

    const text = await r.text();
    if (!r.ok) {
      setCORS();
      return res.status(502).json({ error: 'OpenAI error', status: r.status, detail: text });
    }

    let data;
    try { data = JSON.parse(text); }
    catch {
      setCORS();
      return res.status(502).json({ error: 'Bad JSON from OpenAI', raw: text });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() ?? '';
    setCORS();
    return res.status(200).json({ reply, model });
  } catch (e) {
    console.error('[talk.js]', e);
    setCORS();
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

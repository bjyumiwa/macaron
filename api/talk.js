// /api/talk.js
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 生存確認
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, endpoint: '/api/talk', expect: 'POST' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
    }

    // ---- body を安全に取得（文字列でもOKに）----
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    // パラメータ
    const model = body.model || 'gpt-4o-mini';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 220;

    // ---- messages の互換入力を構築 ----
    let messages = null;

    // 互換: {userMessage, history[], systemPrompt}
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

    // 旧: {messages:[...]}
    if (!messages && Array.isArray(body.messages) && body.messages.length > 0) {
      messages = body.messages.map(m => ({
        role: (m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
        content: String(m.content ?? '')
      }));
    }

    // 単発: {message:"..."}
    if (!messages && body.message) {
      messages = [
        { role: 'system', content: 'あなたはやさしい相棒AI。短く優しく答えて。' },
        { role: 'user', content: String(body.message) }
      ];
    }

    if (!messages) {
      return res.status(400).json({ error: 'No input', received: body });
    }

    // ---- OpenAI 呼び出し ----
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });

    const text = await r.text(); // まず生のテキスト
    if (!r.ok) {
      // OpenAI のエラーをそのまま返してデバッグしやすく
      return res.status(502).json({
        error: 'OpenAI error',
        status: r.status,
        detail: text
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Bad JSON from OpenAI', raw: text });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ reply, model });
  } catch (e) {
    console.error('[talk.js]', e);
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

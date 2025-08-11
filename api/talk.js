// /api/talk.js  ←そのまま置き換え
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // 本番は許可ドメインに絞る
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    // 簡易な疎通確認用
    return res.status(200).json({ ok: true, endpoint: '/api/talk', method: 'POST only' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
    }

    const body = req.body || {};
    let messages = null;
    let model = body.model || 'gpt-4o-mini';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 220;

    // ① 互換: { userMessage, history, systemPrompt } 形式（今回のフロント）
    if (body.userMessage) {
      const systemPrompt = body.systemPrompt || 'You are WHOAI.';
      const hist = Array.isArray(body.history) ? body.history : [];
      messages = [
        { role: 'system', content: String(systemPrompt) },
        ...hist.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content || '')
        })),
        { role: 'user', content: String(body.userMessage || '') }
      ];
    }

    // ② 旧: { messages:[...] } 形式
    if (!messages && Array.isArray(body.messages) && body.messages.length > 0) {
      messages = body.messages.map(m => ({
        role: (m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
        content: String(m.content || '')
      }));
    }

    // ③ 単発: { message:"..." } 形式
    if (!messages && body.message) {
      messages = [
        { role: 'system', content: 'あなたはやさしい相棒AI。短く優しく答えて。' },
        { role: 'user', content: String(body.message) }
      ];
    }

    if (!messages) {
      return res.status(400).json({ error: 'No input. Provide {userMessage,...} or {messages:[...]} or {message:"..."}' });
    }

    // OpenAI
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: 'OpenAI error', detail: text });
    }

    const data = JSON.parse(text);
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

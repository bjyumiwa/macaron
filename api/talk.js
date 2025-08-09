// /api/talk.js
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // 本番はドメインを限定してOK
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    // フロントから {messages:[...]} が来る想定（あなたのconversation.html）
    // {message:"..."} でも動くように両対応
    let messages = body.messages;
    if (!messages && body.message) {
      messages = [
        { role: 'system', content: 'あなたはやさしい相棒AI。短く優しく答えて。' },
        { role: 'user', content: String(body.message) }
      ];
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
      })
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(500).json({ error: 'OpenAI error', detail: text });
    }
    const data = JSON.parse(text);
    const reply = data.choices?.[0]?.message?.content ?? '';

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

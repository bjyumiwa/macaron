export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end(); // ← POSTじゃないリクエストは拒否
    return;
  }

  const body = req.body;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: body.message }]
    })
  });

  const data = await openaiRes.json();
  res.status(200).json({ reply: data.choices[0].message.content });
}

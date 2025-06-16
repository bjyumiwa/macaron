const express = require('express');
const fetch = require('node-fetch'); // または globalThis.fetch（Node.js 18以降）
const dotenv = require('dotenv');
const app = express();
dotenv.config();

app.use(express.json()); // JSONボディを読み取るミドルウェア

app.post('/api/talk', async (req, res) => {
  const body = req.body;

  try {
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
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

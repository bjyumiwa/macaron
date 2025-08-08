export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  // CORSプリフライト対応
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: corsHeaders(true),
    });
  }

  // リクエスト内容を取得
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders(true),
    });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages) {
    return new Response(JSON.stringify({ error: "Bad request: messages[]" }), {
      status: 400,
      headers: corsHeaders(true),
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: corsHeaders(true),
    });
  }

  // OpenAI APIへリクエスト
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ error: t }), {
      status: r.status,
      headers: corsHeaders(true),
    });
  }

  const data = await r.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return new Response(JSON.stringify({ reply: text }), {
    status: 200,
    headers: corsHeaders(true),
  });
}

// CORS許可ヘッダー
function corsHeaders(json = false) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Origin": "*", // ← 全てのオリジン許可
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

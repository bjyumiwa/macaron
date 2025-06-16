export default async function handler(request) {
  try {
    // Validate request method
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate API key exists
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate message length (OpenAI has token limits)
    if (body.message.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: body.message }],
        max_tokens: 1000, // Add reasonable limits
        temperature: 0.7
      })
    });

    // Check if OpenAI request was successful
    if (!openaiRes.ok) {
      const errorData = await openaiRes.json();
      console.error('OpenAI API error:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from OpenAI',
          details: errorData.error?.message || 'Unknown error'
        }), 
        { status: openaiRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await openaiRes.json();

    // Validate OpenAI response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from OpenAI' }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        reply: data.choices[0].message.content,
        usage: data.usage // Include token usage info
      }), 
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache" // Prevent caching of dynamic responses
        }
      }
    );

  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

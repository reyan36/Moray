export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Get the Key securely from Vercel Settings
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server Error: Missing GROQ_API_KEY" });
  }

  try {
    // 3. Parse the incoming data safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { prompt } = body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // 4. Call Groq from the server
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: "You are a movie expert. Return only the requested format." },
            { role: "user", content: prompt }
        ],
        max_tokens: 100
      })
    });

    const data = await response.json();
    
    // 5. Send result back to frontend
    const text = data.choices?.[0]?.message?.content || "No response";
    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
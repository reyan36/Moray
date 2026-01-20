export default async function handler(req, res) {
  // 1. Get the Key securely from Vercel Environment Variables
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
  }

  // 2. Get the prompt from the frontend
  const { prompt, system } = JSON.parse(req.body);

  try {
    // 3. Call Groq from the server
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: system || "You are a helpful assistant." },
            { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.5
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
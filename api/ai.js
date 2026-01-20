// api/ai.js
export default async function handler(req, res) {
  // 1. Get Google Gemini Key from Vercel
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) return res.status(500).json({ error: "Server missing API Key" });

  const { prompt } = JSON.parse(req.body);

  try {
    // 2. Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // 3. Extract text from Gemini response structure
    const text = data.candidates[0].content.parts[0].text;
    
    return res.status(200).json({ result: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
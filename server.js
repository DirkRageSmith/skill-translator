const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/rewrite', async (req, res) => {
  const { jd, history } = req.body;
  if (!jd || !history) return res.status(400).json({ error: 'Missing fields' });

  const prompt = `You translate informal work experience into resume bullet points tuned to a job description. Find the real transferable skill and restate it matching the job description vocabulary without inventing anything not mentioned.

Rules:
- Only use what is stated or directly implied. Never fabricate metrics, titles, or outcomes.
- Use active concrete verbs. No filler like "results-driven" or "team player".
- Match job description terms ONLY if the work history genuinely supports it.
- Tag each bullet with the skill it demonstrates in 2-4 words.

Return ONLY valid JSON in this exact shape, no markdown fences, no extra text:
{"bullets":[{"raw":"paraphrase of original line","skill":"skill tag","line":"rewritten resume bullet"}]}

Produce 4-8 bullets, strongest job description matches first.

JOB DESCRIPTION:
${jd}

WORK HISTORY:
${history}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API key present:', !!apiKey, 'length:', apiKey ? apiKey.length : 0);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });

    const data = await geminiRes.json();
    console.log('Gemini status:', geminiRes.status);
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500));

    if (data.error) {
      console.error('Gemini error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No text in response' });

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

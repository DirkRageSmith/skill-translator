const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/rewrite', async (req, res) => {
  const { jd, history } = req.body;
  if (!jd || !history) return res.status(400).json({ error: 'Missing fields' });

  const prompt = `You translate informal, lived work experience into resume bullet points, tuned to a specific job description.

People often undersell what they did because they describe it the way they'd tell a friend, not the way a hiring manager reads it. Your job is to find the real, transferable skill underneath an informal description and restate it in language that matches the job description's vocabulary and priorities — without inventing accomplishments, numbers, or responsibilities the person didn't mention.

Rules:
- Only use what's stated or directly implied in the work history. Never fabricate metrics, titles, team sizes, or outcomes.
- Each bullet should map to something specific the person actually wrote.
- Use active, concrete verbs. Avoid generic resume filler ("results-driven," "team player").
- Where the job description uses specific terms, use matching language ONLY if the work history genuinely supports it.
- Tag each bullet with the underlying skill it demonstrates, in 2-4 words.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"bullets":[{"raw":"short paraphrase of the original line from work history","skill":"skill tag","line":"the rewritten resume bullet"}]}

Produce between 4 and 8 bullets, prioritizing the strongest matches to the job description first.

JOB DESCRIPTION:
${jd}

WORK HISTORY (in the person's own words):
${history}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No response from model' });

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

// Vercel Serverless Function (Node.js) — api/simulate.js

const AREA_PROMPTS = {
  brzuch:    'slim the belly and stomach area naturally',
  boki:      'slim the waist and love handles naturally',
  uda:       'slim the thighs naturally',
  ramiona:   'slim the upper arms naturally',
  podbrodek: 'reduce the double chin naturally',
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_API_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { imageBase64, area = 'brzuch', reduction = 20 } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const areaPrompt = AREA_PROMPTS[area] || AREA_PROMPTS.brzuch;
  const intensity = reduction <= 15 ? 'subtly' : reduction <= 25 ? 'moderately' : 'noticeably';
  const prompt = `${intensity} ${areaPrompt}, keep the exact same person, face, hair, skin tone, clothing, and background unchanged, realistic natural result, no artifacts`;

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux-kontext/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_url: imageBase64,
        strength: Math.min(0.45, reduction / 100 + 0.15),
        num_inference_steps: 28,
        guidance_scale: 3.5,
      }),
    });

    if (!falRes.ok) {
      const err = await falRes.text();
      return res.status(502).json({ error: 'fal.ai error', detail: err });
    }

    const result = await falRes.json();
    const outputUrl = result?.images?.[0]?.url || result?.image?.url || null;

    if (!outputUrl) {
      return res.status(502).json({ error: 'No output image', raw: result });
    }

    return res.status(200).json({ url: outputUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

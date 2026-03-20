// Vercel Edge Function — api/simulate.js
export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const AREA_PROMPTS = {
  brzuch:    'slim the belly and stomach area naturally',
  boki:      'slim the waist and love handles naturally',
  uda:       'slim the thighs naturally',
  ramiona:   'slim the upper arms naturally',
  podbrodek: 'reduce the double chin naturally',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const FAL_KEY = process.env.FAL_API_KEY;
  if (!FAL_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }); }

  const { imageBase64, area = 'brzuch', reduction = 20 } = body;
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }

  const areaPrompt = AREA_PROMPTS[area] || AREA_PROMPTS.brzuch;
  const intensity = reduction <= 15 ? 'subtly' : reduction <= 25 ? 'moderately' : 'noticeably';
  const prompt = `${intensity} ${areaPrompt}, keep the exact same person, face, hair, skin tone, clothing, and background unchanged, realistic natural result, no artifacts`;

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux-kontext/image-to-image', {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'fal.ai error', detail: err }), { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const result = await falRes.json();
    const outputUrl = result?.images?.[0]?.url || result?.image?.url || null;

    if (!outputUrl) {
      return new Response(JSON.stringify({ error: 'No output image', raw: result }), { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    return new Response(JSON.stringify({ url: outputUrl }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }
}

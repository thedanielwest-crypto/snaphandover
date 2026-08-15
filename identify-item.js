// netlify/functions/identify-item.js
//
// SETUP (one-time):
// 1. Put this file at:  netlify/functions/identify-item.js  in your project
// 2. In Netlify dashboard: Site settings → Environment variables →
//    add ANTHROPIC_API_KEY = your key from console.anthropic.com
// 3. Deploy. No extra npm packages needed — uses Netlify's built-in fetch.
//
// What it does: takes a base64 photo from the app, asks Claude to identify
// the item (food, drink, medication packet, or activity), and returns a
// short suggested name + size/dosage if visible. The app always shows this
// as an EDITABLE text field — the carer can overwrite anything the AI gets wrong.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    // image arrives as a data URL: "data:image/jpeg;base64,xxxx"
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Invalid image format' }), { status: 400 });
    }
    const [, mediaType, base64Data] = match;

    const prompt = `You are helping a disability support carer log a shift. Look at this photo and identify what it shows.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"tag": "Food" | "Drink" | "Meds" | "Activity", "name": "short plain-English item name", "size": "packet size / dosage / mg / ml if clearly visible, otherwise \\"unknown\\""}

Examples:
- A glass of orange juice → {"tag":"Drink","name":"Orange juice","size":"unknown"}
- A blister pack of Panadol → {"tag":"Meds","name":"Panadol","size":"500mg"}
- A plate with a sandwich → {"tag":"Food","name":"Sandwich","size":"unknown"}
- A photo of someone walking outside → {"tag":"Activity","name":"Outdoor walk","size":"unknown"}

If you're not confident, still make your best single guess — the carer will check and can edit it. Do not include markdown formatting or explanation, just the raw JSON object.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // fast + cheap, good fit for a quick tag/name guess
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content?.find(c => c.type === 'text')?.text || '{}';
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { tag: null, name: '', size: 'unknown' };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

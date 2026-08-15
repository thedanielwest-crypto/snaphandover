export default async (req) => {
if (req.method !== 'POST') {
return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}

try {
const { image } = await req.json();
if (!image) {
return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
}

const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
if (!match) {
return new Response(JSON.stringify({ error: 'Invalid image format' }), { status: 400 });
}
const mediaType = match[1];
const base64Data = match[2];

const promptLines = [
'You are helping a disability support carer log a shift. Look at this photo and identify what it shows.',
'',
'Respond with ONLY a JSON object, no other text. Use exactly these keys: tag, name, size.',
'tag must be one of: Food, Drink, Meds, Activity.',
'name is a short plain-English item name.',
'size is packet size, dosage, mg, or ml if clearly visible, otherwise the word unknown.',
'',
'Example: a glass of orange juice has tag Drink, name Orange juice, size unknown.',
'Example: a blister pack of Panadol has tag Meds, name Panadol, size 500mg.',
'Example: a plate with a sandwich has tag Food, name Sandwich, size unknown.',
'Example: a photo of someone walking outside has tag Activity, name Outdoor walk, size unknown.',
'',
'If you are not confident, still make your best single guess -- the carer will check and can edit it.',
'Do not include markdown formatting or explanation, just the raw JSON object.'
];
const prompt = promptLines.join('\n');

const response = await fetch('https://api.anthropic.com/v1/messages', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'x-api-key': process.env.ANTHROPIC_API_KEY,
'anthropic-version': '2023-06-01'
},
body: JSON.stringify({
model: 'claude-haiku-4-5-20251001',
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
let rawText = '{}';
for (const block of data.content || []) {
if (block.type === 'text') { rawText = block.text; break; }
}
const cleaned = rawText.replace(/```json|```/g, '').trim();

let parsed;
try {
parsed = JSON.parse(cleaned);
} catch (e) {
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

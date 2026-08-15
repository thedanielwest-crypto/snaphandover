const TABLE_IDS = {
Clients: 'tblk3rayBsHTAd6QB',
Carers: 'tblbeh6rSWfJp9G4U',
LogEntries: 'tblJ9zYc42aHkQCRz'
};

export default async (req) => {
if (req.method !== 'POST') {
return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TOKEN = process.env.AIRTABLE_TOKEN;

try {
const { action, table, fields, recordId } = await req.json();
const tableId = TABLE_IDS[table];
if (!tableId) {
return new Response(JSON.stringify({ error: 'Unknown table: ' + table }), { status: 400 });
}

const baseUrl = 'https://api.airtable.com/v0/' + BASE_ID + '/' + tableId;
const headers = {
'Authorization': 'Bearer ' + TOKEN,
'Content-Type': 'application/json'
};

let response;

if (action === 'list') {
response = await fetch(baseUrl + '?pageSize=100', { headers });
} else if (action === 'create') {
response = await fetch(baseUrl, {
method: 'POST',
headers,
body: JSON.stringify({ records: [{ fields }], typecast: true })
});
} else if (action === 'delete') {
response = await fetch(baseUrl + '/' + recordId, { method: 'DELETE', headers });
} else {
return new Response(JSON.stringify({ error: 'Unknown action: ' + action }), { status: 400 });
}

const data = await response.json();
if (!response.ok) {
return new Response(JSON.stringify({ error: 'Airtable error', detail: data }), { status: 500 });
}
return new Response(JSON.stringify(data), {
status: 200,
headers: { 'Content-Type': 'application/json' }
});

} catch (err) {
return new Response(JSON.stringify({ error: err.message }), { status: 500 });
}
};

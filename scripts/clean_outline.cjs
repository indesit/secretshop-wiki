const OUTLINE_URL = process.env.OUTLINE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.OUTLINE_API_TOKEN;

if (!API_TOKEN) {
    console.error('ERROR: Set OUTLINE_API_TOKEN environment variable.');
    console.error('  export OUTLINE_API_TOKEN="ol_api_..."');
    process.exit(1);
}

async function outlineRequest(endpoint, payload = {}) {
    const res = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

async function cleanAll() {
    console.log('Deleting all existing collections...');
    const res = await outlineRequest('collections.list', { limit: 100 });

    if (res && res.data) {
        for (const col of res.data) {
            console.log(`  Deleting: ${col.name} (${col.id})`);
            await outlineRequest('collections.delete', { id: col.id });
        }
    }
    console.log('Cleanup complete. Outline is now empty.');
}

cleanAll();

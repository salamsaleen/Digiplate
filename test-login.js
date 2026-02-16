
// Removed "require('node-fetch')"
// Assuming Node 18+ environment where fetch is global

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/debug/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@digiplate.com', password: 'digiplate123' })
        });
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

test();

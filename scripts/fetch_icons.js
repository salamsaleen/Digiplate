const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const icons = [
    { url: 'https://placehold.co/192x192/0b121e/white/png?text=DP', file: 'icon-192x192.png' },
    { url: 'https://placehold.co/512x512/0b121e/white/png?text=DigiPlate', file: 'icon-512x512.png' }
];

icons.forEach(ic => {
    const file = fs.createWriteStream(path.join(dir, ic.file));
    https.get(ic.url, function (response) {
        response.pipe(file);
        console.log(`Downloaded ${ic.file}`);
    }).on('error', (e) => console.error(e));
});

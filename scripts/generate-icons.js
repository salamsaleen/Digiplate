const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = 'C:\\Users\\HAMabu\\OneDrive\\Pictures\\icondigiplate.jpeg';
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

// Rounded square SVG mask
function roundedSquareMask(size, radius) {
    return Buffer.from(
        `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
    );
}

async function generateIcon(size, name) {
    const radius = Math.round(size * 0.22); // ~22% radius like iOS
    const mask = roundedSquareMask(size, radius);

    await sharp(SOURCE)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toFile(path.join(OUTPUT_DIR, name));

    console.log(`✅ Generated ${name} (${size}x${size})`);
}

async function main() {
    console.log('Generating PWA icons...');
    await generateIcon(192, 'icon-192.png');
    await generateIcon(512, 'icon-512.png');
    await generateIcon(180, 'apple-touch-icon.png'); // Apple touch icon
    console.log('✅ All icons generated successfully!');
}

main().catch(console.error);

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Ensure public directory exists
try {
  mkdirSync(publicDir, { recursive: true });
} catch (err) {
  // Directory already exists
}

const svgBuffer = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb" rx="80"/>
  <g transform="translate(256, 256)">
    <path d="M 0,-120 L 0,-180 M 0,120 L 0,180" stroke="#ffffff" stroke-width="32" stroke-linecap="round"/>
    <path d="M -60,-80 Q -60,-120 -20,-120 L 20,-120 Q 60,-120 60,-80 Q 60,-40 20,-40 L -40,-40 Q -80,-40 -80,0 Q -80,40 -40,40 L 40,40 Q 80,40 80,80 Q 80,120 40,120 L -20,120 Q -60,120 -60,80"
          fill="none" stroke="#ffffff" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(100, -80)">
      <path d="M -30,30 L 0,0 L 30,30" fill="none" stroke="#10b981" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 0,0 L 0,60" stroke="#10b981" stroke-width="20" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;

const sizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const { size, name } of sizes) {
    const outputPath = join(publicDir, name);
    await sharp(Buffer.from(svgBuffer))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate favicon
  await sharp(Buffer.from(svgBuffer))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico (32x32)');

  // Copy SVG for maskable icon
  await sharp(Buffer.from(svgBuffer))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'masked-icon.svg'));
  console.log('✓ Generated masked-icon.svg');

  console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'public/icon.svg'));

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  // Maskable padding: shrink artwork to ~80% of canvas so platforms can crop
  // the corners without clipping the 中 mark.
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  const padded = maskable
    ? await sharp(source)
        .resize(Math.round(size * 0.8), Math.round(size * 0.8))
        .extend({
          top: Math.round(size * 0.1),
          bottom: Math.round(size * 0.1),
          left: Math.round(size * 0.1),
          right: Math.round(size * 0.1),
          background: '#C41E3A',
        })
        .png()
        .toBuffer()
    : await sharp(source).resize(size, size).png().toBuffer();
  await writeFile(resolve(root, 'public', name), padded);
  console.log(`wrote public/${name} (${size}x${size}${maskable ? ' maskable' : ''})`);
}

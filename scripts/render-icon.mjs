import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, 'build');
const svgPath = join(buildDir, 'icon.svg');
const pngPath = join(buildDir, 'icon.png');
const icoPath = join(buildDir, 'icon.ico');

const svg = await readFile(svgPath);
await mkdir(buildDir, { recursive: true });

const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
await writeFile(pngPath, png512);

// Multi-size ICO: 16, 32, 48, 256
const sizes = [16, 32, 48, 256];
const images = await Promise.all(
  sizes.map(async (size) => ({
    size,
    buffer: await sharp(svg).resize(size, size).png().toBuffer()
  }))
);

// Minimal ICO writer (PNG-compressed entries — supported by modern Windows).
function buildIco(entries) {
  const headerSize = 6 + entries.length * 16;
  const parts = [];
  let offset = headerSize;
  const dir = Buffer.alloc(headerSize);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(entries.length, 4);
  entries.forEach((entry, index) => {
    const o = 6 + index * 16;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, o);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(entry.buffer.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += entry.buffer.length;
    parts.push(entry.buffer);
  });
  return Buffer.concat([dir, ...parts]);
}

await writeFile(icoPath, buildIco(images));
console.log(`Wrote ${pngPath}`);
console.log(`Wrote ${icoPath}`);

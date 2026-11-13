import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Simple uncompressed RGBA raw PNG generator
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Distance from center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.38;
      const isRing = Math.abs(dist - radius) < (width * 0.04);
      const isCenter = dist < (width * 0.06);

      // Simple icon drawing
      if (isRing || isCenter) {
        rawData[pixelOffset] = 99;     // Indigo R
        rawData[pixelOffset + 1] = 102; // Indigo G
        rawData[pixelOffset + 2] = 241; // Indigo B
        rawData[pixelOffset + 3] = 255; // Alpha
      } else if (dist < width * 0.44) {
        rawData[pixelOffset] = 20;
        rawData[pixelOffset + 1] = 24;
        rawData[pixelOffset + 2] = 33;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, 13, 15, 20));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, 13, 15, 20));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, 13, 15, 20));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, 13, 15, 20));
console.log('Icons generated successfully');

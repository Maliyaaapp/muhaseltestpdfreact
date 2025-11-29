// Minimal ZIP builder (store method, no compression) for Electron renderer
// Creates a ZIP file in-memory from an array of files

// Pre-computed CRC32 lookup table for faster calculation
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[i] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2) & 0x1f));
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export interface ZipInputFile {
  name: string;
  data: Uint8Array;
  date?: Date;
}

export function buildZip(files: ZipInputFile[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const fileDatas: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();

  files.forEach((f) => {
    const nameBytes = strToUint8(f.name);
    const data = f.data;
    const crc = crc32(data);
    const dt = dosDateTime(f.date || now);

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const dvL = new DataView(lh.buffer);
    dvL.setUint32(0, 0x04034b50, true); // signature
    dvL.setUint16(4, 20, true); // version needed
    dvL.setUint16(6, 0x0800, true);  // general purpose (UTF-8)
    dvL.setUint16(8, 0, true);  // compression method (store)
    dvL.setUint16(10, dt.time, true);
    dvL.setUint16(12, dt.date, true);
    dvL.setUint32(14, crc, true);
    dvL.setUint32(18, data.length, true);
    dvL.setUint32(22, data.length, true);
    dvL.setUint16(26, nameBytes.length, true);
    dvL.setUint16(28, 0, true); // extra length
    lh.set(nameBytes, 30);
    localHeaders.push(lh);
    fileDatas.push(data);

    // Central directory header
    const ch = new Uint8Array(46 + nameBytes.length);
    const dvC = new DataView(ch.buffer);
    dvC.setUint32(0, 0x02014b50, true); // signature
    dvC.setUint16(4, 20, true); // version made by
    dvC.setUint16(6, 20, true); // version needed to extract
    dvC.setUint16(8, 0x0800, true);  // general purpose (UTF-8)
    dvC.setUint16(10, 0, true); // compression (store)
    dvC.setUint16(12, dt.time, true);
    dvC.setUint16(14, dt.date, true);
    dvC.setUint32(16, crc, true);
    dvC.setUint32(20, data.length, true);
    dvC.setUint32(24, data.length, true);
    dvC.setUint16(28, nameBytes.length, true);
    dvC.setUint16(30, 0, true); // extra length
    dvC.setUint16(32, 0, true); // file comment length
    dvC.setUint16(34, 0, true); // disk number start
    dvC.setUint16(36, 0, true); // internal file attrs
    dvC.setUint32(38, 0, true); // external file attrs
    dvC.setUint32(42, offset, true); // relative offset of local header
    ch.set(nameBytes, 46);
    centralHeaders.push(ch);

    offset += lh.length + data.length;
  });

  const centralSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
  const centralOffset = offset;

  // End of central directory record
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true);
  dvE.setUint16(4, 0, true); // disk number
  dvE.setUint16(6, 0, true); // disk with central directory
  dvE.setUint16(8, files.length, true);
  dvE.setUint16(10, files.length, true);
  dvE.setUint32(12, centralSize, true);
  dvE.setUint32(16, centralOffset, true);
  dvE.setUint16(20, 0, true); // comment length

  // Concatenate all parts
  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (let i = 0; i < localHeaders.length; i++) {
    out.set(localHeaders[i], pos);
    pos += localHeaders[i].length;
    out.set(fileDatas[i], pos);
    pos += fileDatas[i].length;
  }
  for (const ch of centralHeaders) {
    out.set(ch, pos);
    pos += ch.length;
  }
  out.set(eocd, pos);
  return out;
}
// ZIP sem compressão: imagens JPEG/PNG já são compactadas. Sem dependências externas.
const encoder = new TextEncoder();
const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c >>> 0;
}
const checksum = (bytes) => {
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const u16 = (view, pos, value) => view.setUint16(pos, value, true);
const u32 = (view, pos, value) => view.setUint32(pos, value >>> 0, true);

export function makePhotoZip(files) {
  const output = [];
  const central = [];
  let offset = 0;
  const used = new Set();
  for (const file of files) {
    let name = String(file.name || "foto.jpg").replace(/[\\/]/g, "_");
    const base = name.replace(/(\.[^.]+)$/, "");
    const extension = name.slice(base.length);
    let suffix = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${suffix++}${extension}`;
    used.add(name.toLowerCase());
    const bytes = file.bytes;
    const nameBytes = encoder.encode(name);
    const crc = checksum(bytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50);
    u16(lv, 4, 20);
    u16(lv, 6, 0x0800); // nomes UTF-8
    u16(lv, 8, 0); // método store
    u32(lv, 14, crc);
    u32(lv, 18, bytes.length);
    u32(lv, 22, bytes.length);
    u16(lv, 26, nameBytes.length);
    local.set(nameBytes, 30);
    output.push(local, bytes);
    const record = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(record.buffer);
    u32(cv, 0, 0x02014b50);
    u16(cv, 4, 20);
    u16(cv, 6, 20);
    u16(cv, 8, 0x0800);
    u16(cv, 10, 0);
    u32(cv, 16, crc);
    u32(cv, 20, bytes.length);
    u32(cv, 24, bytes.length);
    u16(cv, 28, nameBytes.length);
    u32(cv, 42, offset);
    record.set(nameBytes, 46);
    central.push(record);
    offset += local.length + bytes.length;
  }
  const centralLength = central.reduce((sum, b) => sum + b.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50);
  u16(ev, 8, files.length);
  u16(ev, 10, files.length);
  u32(ev, 12, centralLength);
  u32(ev, 16, offset);
  return new Blob([...output, ...central, end], { type: "application/zip" });
}

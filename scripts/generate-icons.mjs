import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, "../com.ryanhenning.sbcsd.sdPlugin/imgs/actions/toggle");

// CRC table for PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function makePng(width, height, rgbaBuffer) {
    // RGBA scanlines with filter byte 0
    const stride = width * 4;
    const rawData = Buffer.alloc(height * (stride + 1));
    for (let y = 0; y < height; y++) {
        rawData[y * (stride + 1)] = 0; // Filter byte: None
        rgbaBuffer.copy(rawData, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    const compressed = zlib.deflateSync(rawData);

    // PNG signature
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    function makeChunk(type, data) {
        const len = data.length;
        const chunk = Buffer.alloc(4 + 4 + len + 4);
        chunk.writeUInt32BE(len, 0);
        chunk.write(type, 4, 4, "ascii");
        data.copy(chunk, 8);
        const crc = crc32(chunk.subarray(4, 8 + len));
        chunk.writeUInt32BE(crc, 8 + len);
        return chunk;
    }

    const ihdrChunk = makeChunk("IHDR", ihdr);
    const idatChunk = makeChunk("IDAT", compressed);
    const iendChunk = makeChunk("IEND", Buffer.alloc(0));

    return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Software rasterizer with anti-aliasing (supersampled 2x)
class Canvas {
    constructor(size) {
        this.size = size;
        this.scale = 2;
        this.w = size * this.scale;
        this.h = size * this.scale;
        this.pixels = Buffer.alloc(this.w * this.h * 4); // RGBA
    }

    setPixel(x, y, r, g, b, a) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
        const idx = (y * this.w + x) * 4;
        const srcA = a / 255;
        const dstA = this.pixels[idx + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (outA <= 0) return;
        this.pixels[idx] = Math.round((r * srcA + this.pixels[idx] * dstA * (1 - srcA)) / outA);
        this.pixels[idx + 1] = Math.round((g * srcA + this.pixels[idx + 1] * dstA * (1 - srcA)) / outA);
        this.pixels[idx + 2] = Math.round((b * srcA + this.pixels[idx + 2] * dstA * (1 - srcA)) / outA);
        this.pixels[idx + 3] = Math.round(outA * 255);
    }

    fillRect(x, y, w, h, r, g, b, a) {
        const sx = x * this.scale;
        const sy = y * this.scale;
        const sw = w * this.scale;
        const sh = h * this.scale;
        for (let py = Math.floor(sy); py < sy + sh; py++) {
            for (let px = Math.floor(sx); px < sx + sw; px++) {
                this.setPixel(px, py, r, g, b, a);
            }
        }
    }

    fillRoundRect(x, y, w, h, rad, r, g, b, a) {
        const sx = x * this.scale;
        const sy = y * this.scale;
        const sw = w * this.scale;
        const sh = h * this.scale;
        const srad = rad * this.scale;
        for (let py = Math.floor(sy); py < sy + sh; py++) {
            for (let px = Math.floor(sx); px < sx + sw; px++) {
                let inside = true;
                if (px < sx + srad && py < sy + srad) {
                    inside = Math.hypot(px - (sx + srad), py - (sy + srad)) <= srad;
                } else if (px > sx + sw - srad && py < sy + srad) {
                    inside = Math.hypot(px - (sx + sw - srad), py - (sy + srad)) <= srad;
                } else if (px < sx + srad && py > sy + sh - srad) {
                    inside = Math.hypot(px - (sx + srad), py - (sy + sh - srad)) <= srad;
                } else if (px > sx + sw - srad && py > sy + sh - srad) {
                    inside = Math.hypot(px - (sx + sw - srad), py - (sy + sh - srad)) <= srad;
                }
                if (inside) this.setPixel(px, py, r, g, b, a);
            }
        }
    }

    strokeArc(cx, cy, radius, startAngle, endAngle, strokeWidth, r, g, b, a) {
        const scx = cx * this.scale;
        const scy = cy * this.scale;
        const srad = radius * this.scale;
        const stw = strokeWidth * this.scale;
        const minR = srad - stw / 2;
        const maxR = srad + stw / 2;

        const bbMinX = Math.floor(scx - maxR - 1);
        const bbMaxX = Math.ceil(scx + maxR + 1);
        const bbMinY = Math.floor(scy - maxR - 1);
        const bbMaxY = Math.ceil(scy + maxR + 1);

        for (let py = bbMinY; py <= bbMaxY; py++) {
            for (let px = bbMinX; px <= bbMaxX; px++) {
                const dist = Math.hypot(px - scx, py - scy);
                if (dist >= minR && dist <= maxR) {
                    let angle = Math.atan2(py - scy, px - scx);
                    if (angle < 0) angle += Math.PI * 2;
                    if (startAngle <= endAngle) {
                        if (angle >= startAngle && angle <= endAngle) this.setPixel(px, py, r, g, b, a);
                    } else {
                        if (angle >= startAngle || angle <= endAngle) this.setPixel(px, py, r, g, b, a);
                    }
                }
            }
        }
    }

    fillCircle(cx, cy, radius, r, g, b, a) {
        const scx = cx * this.scale;
        const scy = cy * this.scale;
        const srad = radius * this.scale;
        for (let py = Math.floor(scy - srad - 1); py <= Math.ceil(scy + srad + 1); py++) {
            for (let px = Math.floor(scx - srad - 1); px <= Math.ceil(scx + srad + 1); px++) {
                if (Math.hypot(px - scx, py - scy) <= srad) {
                    this.setPixel(px, py, r, g, b, a);
                }
            }
        }
    }

    strokeCircle(cx, cy, radius, strokeWidth, r, g, b, a) {
        this.strokeArc(cx, cy, radius, 0, Math.PI * 2, strokeWidth, r, g, b, a);
    }

    // Downsample to final size
    toBuffer() {
        const out = Buffer.alloc(this.size * this.size * 4);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
                for (let dy = 0; dy < this.scale; dy++) {
                    for (let dx = 0; dx < this.scale; dx++) {
                        const sIdx = ((y * this.scale + dy) * this.w + (x * this.scale + dx)) * 4;
                        rSum += this.pixels[sIdx];
                        gSum += this.pixels[sIdx + 1];
                        bSum += this.pixels[sIdx + 2];
                        aSum += this.pixels[sIdx + 3];
                    }
                }
                const count = this.scale * this.scale;
                const dIdx = (y * this.size + x) * 4;
                out[dIdx] = Math.round(rSum / count);
                out[dIdx + 1] = Math.round(gSum / count);
                out[dIdx + 2] = Math.round(bSum / count);
                out[dIdx + 3] = Math.round(aSum / count);
            }
        }
        return makePng(this.size, this.size, out);
    }
}

function drawHeadphones(size) {
    const c = new Canvas(size);
    const S = size / 72; // Reference size is 72x72
    const cx = 36 * S;
    const cy = 34 * S;

    // Headband arc (from left ear to right ear)
    // Angles in radians: Math.PI (180deg) to 2*Math.PI (0deg)
    c.strokeArc(cx, cy, 21 * S, Math.PI * 0.98, Math.PI * 2.02, 3.8 * S, 255, 255, 255, 240);

    // Headband cushion (inner slightly thinner accent)
    c.strokeArc(cx, cy, 18.5 * S, Math.PI * 1.15, Math.PI * 1.85, 2 * S, 0, 195, 255, 220); // Creative Sound Blaster Cyan accent

    // Ear cups: Left and Right rounded rectangles
    const cupW = 8 * S;
    const cupH = 17 * S;
    const cupRad = 4 * S;

    // Left cup
    c.fillRoundRect(cx - 24 * S, cy - 2 * S, cupW, cupH, cupRad, 255, 255, 255, 245);
    // Left inner cushion accent
    c.fillRoundRect(cx - 20 * S, cy + 1 * S, 2.5 * S, cupH - 6 * S, 1 * S, 0, 195, 255, 220);

    // Right cup
    c.fillRoundRect(cx + 16 * S, cy - 2 * S, cupW, cupH, cupRad, 255, 255, 255, 245);
    // Right inner cushion accent
    c.fillRoundRect(cx + 17.5 * S, cy + 1 * S, 2.5 * S, cupH - 6 * S, 1 * S, 0, 195, 255, 220);

    return c.toBuffer();
}

function drawSpeakers(size) {
    const c = new Canvas(size);
    const S = size / 72; // Reference size 72x72

    const spkW = 17 * S;
    const spkH = 32 * S;
    const spkRad = 3 * S;

    // Left speaker cabinet
    const lX = 14 * S;
    const rX = 41 * S;
    const spkY = 20 * S;

    [lX, rX].forEach((x) => {
        // Cabinet outline/body
        c.fillRoundRect(x, spkY, spkW, spkH, spkRad, 35, 37, 43, 230);
        c.fillRoundRect(x + 1 * S, spkY + 1 * S, spkW - 2 * S, spkH - 2 * S, spkRad - 0.5 * S, 255, 255, 255, 235);
        c.fillRoundRect(x + 2 * S, spkY + 2 * S, spkW - 4 * S, spkH - 4 * S, spkRad - 1 * S, 22, 24, 28, 255);

        const speakerCenterX = x + spkW / 2;

        // Tweeter (top driver)
        const tweeterY = spkY + 8.5 * S;
        c.fillCircle(speakerCenterX, tweeterY, 3.2 * S, 60, 65, 75, 255);
        c.fillCircle(speakerCenterX, tweeterY, 2 * S, 0, 195, 255, 240); // Creative Cyan dome

        // Woofer (bottom driver)
        const wooferY = spkY + 21.5 * S;
        c.fillCircle(speakerCenterX, wooferY, 5.8 * S, 60, 65, 75, 255);
        c.strokeCircle(speakerCenterX, wooferY, 4.6 * S, 1 * S, 140, 145, 155, 200);
        c.fillCircle(speakerCenterX, wooferY, 2.6 * S, 0, 195, 255, 240); // Creative Cyan center dustcap
    });

    return c.toBuffer();
}

// Generate standard 72x72 and high-res @2x 144x144 PNGs
fs.writeFileSync(path.join(OUT_DIR, "headphones.png"), drawHeadphones(72));
fs.writeFileSync(path.join(OUT_DIR, "headphones@2x.png"), drawHeadphones(144));
fs.writeFileSync(path.join(OUT_DIR, "speakers.png"), drawSpeakers(72));
fs.writeFileSync(path.join(OUT_DIR, "speakers@2x.png"), drawSpeakers(144));

// Also generate category and marketplace icons using the combined aesthetic
fs.writeFileSync(path.join(OUT_DIR, "icon.png"), drawHeadphones(72));
fs.writeFileSync(path.join(OUT_DIR, "icon@2x.png"), drawHeadphones(144));

console.log("Generated headphone and speaker icons successfully in:", OUT_DIR);

// export.ts — Export functionality for Orbital AI Studio
// Supports ZIP + manifest, WebM preview, and glTF container

import {
  GEN_GRID,
  GEN_CELL,
  GEN_SHEET,
  DISP_CELL,
  DISP_SHEET,
  OVERSCAN,
  DEFAULT_FEATHER_PX,
  DEFAULT_WARP_TYPE,
  DEFAULT_SHEAR,
  DEFAULT_ZOOM_MAX,
  DEFAULT_PARALLAX_MAX,
  createDefaultManifest,
  type OrbitalManifest,
  type RingConfig
} from './orbitSprite';
import { telemetry } from './telemetry';
import type { SpriteSheet, GenerationManifest } from './geminiService';

// === TYPES ===

export interface ExportOptions {
  format: 'zip' | 'glb' | 'webm';
  includeManifest?: boolean;
  includePreview?: boolean;
  previewFps?: number;
  previewDuration?: number;
  quality?: number;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  manifest?: OrbitalManifest;
  previewUrl?: string;
}

// === SIMPLE ZIP IMPLEMENTATION ===
// Minimal ZIP creator without external dependencies

class SimpleZip {
  private files: Array<{ name: string; data: Uint8Array; date: Date }> = [];

  addFile(name: string, data: Uint8Array | ArrayBuffer | Blob | string): void {
    let uint8Data: Uint8Array;

    if (typeof data === 'string') {
      uint8Data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      // Will be handled async
      throw new Error('Use addFileAsync for Blob data');
    } else if (data instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(data);
    } else {
      uint8Data = data;
    }

    this.files.push({
      name,
      data: uint8Data,
      date: new Date()
    });
  }

  async addFileAsync(name: string, data: Blob): Promise<void> {
    const buffer = await data.arrayBuffer();
    this.files.push({
      name,
      data: new Uint8Array(buffer),
      date: new Date()
    });
  }

  generate(): Blob {
    const centralDirectory: Uint8Array[] = [];
    const fileData: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      // Local file header
      const localHeader = this.createLocalFileHeader(file);
      fileData.push(localHeader);
      fileData.push(file.data);

      // Central directory entry
      const centralEntry = this.createCentralDirectoryEntry(file, offset);
      centralDirectory.push(centralEntry);

      offset += localHeader.length + file.data.length;
    }

    // End of central directory
    const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0);
    const endOfCentralDir = this.createEndOfCentralDirectory(
      this.files.length,
      centralDirSize,
      offset
    );

    // Combine all parts
    const parts = [...fileData, ...centralDirectory, endOfCentralDir];
    const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalSize);

    let pos = 0;
    for (const part of parts) {
      result.set(part, pos);
      pos += part.length;
    }

    return new Blob([result], { type: 'application/zip' });
  }

  private createLocalFileHeader(file: { name: string; data: Uint8Array; date: Date }): Uint8Array {
    const nameBytes = new TextEncoder().encode(file.name);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    // Signature
    view.setUint32(0, 0x04034b50, true);
    // Version needed
    view.setUint16(4, 20, true);
    // General purpose flag
    view.setUint16(6, 0, true);
    // Compression method (0 = stored)
    view.setUint16(8, 0, true);
    // Modification time/date
    const dosTime = this.dateToDosTIme(file.date);
    view.setUint16(10, dosTime.time, true);
    view.setUint16(12, dosTime.date, true);
    // CRC-32
    view.setUint32(14, this.crc32(file.data), true);
    // Compressed size
    view.setUint32(18, file.data.length, true);
    // Uncompressed size
    view.setUint32(22, file.data.length, true);
    // File name length
    view.setUint16(26, nameBytes.length, true);
    // Extra field length
    view.setUint16(28, 0, true);
    // File name
    header.set(nameBytes, 30);

    return header;
  }

  private createCentralDirectoryEntry(
    file: { name: string; data: Uint8Array; date: Date },
    localHeaderOffset: number
  ): Uint8Array {
    const nameBytes = new TextEncoder().encode(file.name);
    const entry = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(entry.buffer);

    // Signature
    view.setUint32(0, 0x02014b50, true);
    // Version made by
    view.setUint16(4, 20, true);
    // Version needed
    view.setUint16(6, 20, true);
    // General purpose flag
    view.setUint16(8, 0, true);
    // Compression method
    view.setUint16(10, 0, true);
    // Modification time/date
    const dosTime = this.dateToDosTIme(file.date);
    view.setUint16(12, dosTime.time, true);
    view.setUint16(14, dosTime.date, true);
    // CRC-32
    view.setUint32(16, this.crc32(file.data), true);
    // Compressed size
    view.setUint32(20, file.data.length, true);
    // Uncompressed size
    view.setUint32(24, file.data.length, true);
    // File name length
    view.setUint16(28, nameBytes.length, true);
    // Extra field length
    view.setUint16(30, 0, true);
    // File comment length
    view.setUint16(32, 0, true);
    // Disk number start
    view.setUint16(34, 0, true);
    // Internal file attributes
    view.setUint16(36, 0, true);
    // External file attributes
    view.setUint32(38, 0, true);
    // Relative offset of local header
    view.setUint32(42, localHeaderOffset, true);
    // File name
    entry.set(nameBytes, 46);

    return entry;
  }

  private createEndOfCentralDirectory(
    fileCount: number,
    centralDirSize: number,
    centralDirOffset: number
  ): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    // Signature
    view.setUint32(0, 0x06054b50, true);
    // Disk number
    view.setUint16(4, 0, true);
    // Disk with central directory
    view.setUint16(6, 0, true);
    // Number of entries on this disk
    view.setUint16(8, fileCount, true);
    // Total number of entries
    view.setUint16(10, fileCount, true);
    // Central directory size
    view.setUint32(12, centralDirSize, true);
    // Central directory offset
    view.setUint32(16, centralDirOffset, true);
    // Comment length
    view.setUint16(20, 0, true);

    return record;
  }

  private dateToDosTIme(date: Date): { time: number; date: number } {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    const table = this.getCrc32Table();

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private crc32Table: Uint32Array | null = null;

  private getCrc32Table(): Uint32Array {
    if (this.crc32Table) return this.crc32Table;

    this.crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      this.crc32Table[i] = c;
    }

    return this.crc32Table;
  }
}

// === EXPORT FUNCTIONS ===

/**
 * Export sprite sheets to ZIP with manifest
 */
export async function exportToZip(
  sheets: SpriteSheet[],
  genManifest: GenerationManifest,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const startTime = performance.now();

  telemetry.emit({
    type: 'export_start',
    format: 'zip',
    sheetCount: sheets.length
  });

  const zip = new SimpleZip();

  // Create orbital manifest
  const manifest = createOrbitalManifest(genManifest);

  // Add manifest
  zip.addFile('manifest.json', JSON.stringify(manifest, null, 2));

  // Add sprite sheets
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const ringIdx = Math.floor(i / 2);
    const isOffset = i % 2 === 1 && genManifest.params.dualOffset;

    const filename = isOffset
      ? `ring_${ringIdx}/sheet_${String(i).padStart(3, '0')}_offset.png`
      : `ring_${ringIdx}/sheet_${String(i).padStart(3, '0')}.png`;

    await zip.addFileAsync(filename, sheet.blob);
  }

  // Add preview if requested
  if (options.includePreview) {
    const preview = await generateWebMPreview(sheets, {
      fps: options.previewFps || 24,
      duration: options.previewDuration || 3
    });

    await zip.addFileAsync('previews/spin.webm', preview);
  }

  const blob = zip.generate();
  const filename = `orbital_${genManifest.jobId}.zip`;

  telemetry.emit({
    type: 'export_done',
    format: 'zip',
    latencyMs: performance.now() - startTime,
    sizeBytes: blob.size
  });

  return {
    blob,
    filename,
    manifest
  };
}

/**
 * Export to glTF with EXT_orbital_sprite extension
 */
export async function exportToGltf(
  sheets: SpriteSheet[],
  genManifest: GenerationManifest,
  options: { embedImages?: boolean } = {}
): Promise<ExportResult> {
  const startTime = performance.now();

  telemetry.emit({
    type: 'export_start',
    format: 'glb',
    sheetCount: sheets.length
  });

  const manifest = createOrbitalManifest(genManifest);

  // Build glTF structure
  const gltf: any = {
    asset: { version: '2.0', generator: 'Orbital AI Studio' },
    extensionsUsed: ['EXT_orbital_sprite'],
    extensions: {
      EXT_orbital_sprite: {
        cell: manifest.generation.cell,
        rings: manifest.rings.map((ring, idx) => ({
          phi: ring.phi,
          frames: 12,
          offset: ring.dualOffset ? 15 : 0,
          grid: manifest.generation.grid,
          images: [`sheet_${idx}_base`],
          imagesOffset: ring.dualOffset ? [`sheet_${idx}_offset`] : undefined
        })),
        viewer: {
          stitch: manifest.stitch,
          zoom: manifest.zoom,
          parallax_max: manifest.parallax_max
        }
      }
    },
    buffers: [] as any[],
    bufferViews: [] as any[],
    images: [] as any[]
  };

  // Add images
  if (options.embedImages) {
    // GLB format - embed images in buffer
    const bufferParts: ArrayBuffer[] = [];
    let offset = 0;

    for (let i = 0; i < sheets.length; i++) {
      const arrayBuffer = await sheets[i].blob.arrayBuffer();
      bufferParts.push(arrayBuffer);

      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: arrayBuffer.byteLength
      });

      gltf.images.push({
        bufferView: i,
        mimeType: sheets[i].blob.type || 'image/png'
      });

      offset += arrayBuffer.byteLength;
    }

    // Create combined buffer
    const totalSize = bufferParts.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalSize);
    let pos = 0;
    for (const part of bufferParts) {
      combinedBuffer.set(new Uint8Array(part), pos);
      pos += part.byteLength;
    }

    gltf.buffers.push({ byteLength: totalSize });

    // Create GLB
    const blob = createGLB(gltf, combinedBuffer);
    const filename = `orbital_${genManifest.jobId}.glb`;

    telemetry.emit({
      type: 'export_done',
      format: 'glb',
      latencyMs: performance.now() - startTime,
      sizeBytes: blob.size
    });

    return { blob, filename, manifest };
  } else {
    // Standard glTF with external images
    for (let i = 0; i < sheets.length; i++) {
      gltf.images.push({ uri: `sheet_${String(i).padStart(3, '0')}.png` });
    }

    const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'model/gltf+json' });
    const filename = `orbital_${genManifest.jobId}.gltf`;

    telemetry.emit({
      type: 'export_done',
      format: 'gltf',
      latencyMs: performance.now() - startTime,
      sizeBytes: blob.size
    });

    return { blob, filename, manifest };
  }
}

/**
 * Generate WebM preview animation
 */
export async function generateWebMPreview(
  sheets: SpriteSheet[],
  options: { fps?: number; duration?: number } = {}
): Promise<Blob> {
  const { fps = 24, duration = 3 } = options;

  // Use Canvas + MediaRecorder for WebM generation
  const canvas = new OffscreenCanvas(DISP_SHEET.w, DISP_SHEET.h);
  const ctx = canvas.getContext('2d')!;

  // Create image elements from sheets
  const images = await Promise.all(
    sheets.map(async (sheet) => {
      const bitmap = await createImageBitmap(sheet.blob);
      return bitmap;
    })
  );

  if (images.length === 0) {
    throw new Error('No images to create preview');
  }

  // Generate frames
  const totalFrames = fps * duration;
  const frames: ImageData[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    const angle = (frame / totalFrames) * 360;
    const frameIdx = Math.floor((angle / 360) * 12) % images.length;

    // Calculate tile position
    const tileX = (frameIdx % GEN_GRID[0]) * GEN_CELL;
    const tileY = Math.floor(frameIdx / GEN_GRID[0]) * GEN_CELL;

    // Draw frame
    ctx.clearRect(0, 0, DISP_SHEET.w, DISP_SHEET.h);
    ctx.drawImage(
      images[0], // First sheet
      tileX, tileY, GEN_CELL, GEN_CELL,
      0, 0, DISP_SHEET.w, DISP_SHEET.h
    );

    frames.push(ctx.getImageData(0, 0, DISP_SHEET.w, DISP_SHEET.h));
  }

  // Create WebM using canvas recording
  // Note: This is a simplified version; full implementation would use WebCodecs
  const blob = await encodeFramesToWebM(frames, fps);

  return blob;
}

// === HELPERS ===

function createOrbitalManifest(genManifest: GenerationManifest): OrbitalManifest {
  return {
    version: '1.1',
    generation: {
      grid: GEN_GRID,
      cell: GEN_CELL,
      sheet: [GEN_SHEET.w, GEN_SHEET.h],
      overscan: OVERSCAN
    },
    display: {
      grid: GEN_GRID,
      cell: DISP_CELL,
      sheet: [DISP_SHEET.w, DISP_SHEET.h]
    },
    rings: genManifest.rings,
    stitch: {
      feather: DEFAULT_FEATHER_PX,
      warp: DEFAULT_WARP_TYPE,
      shear: DEFAULT_SHEAR
    },
    zoom: {
      max: DEFAULT_ZOOM_MAX,
      unsharp: true
    },
    parallax_max: DEFAULT_PARALLAX_MAX
  };
}

function createGLB(gltf: any, binaryBuffer: Uint8Array): Blob {
  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = new TextEncoder().encode(jsonString);

  // Pad JSON to 4-byte boundary
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = new Uint8Array(jsonBuffer.length + jsonPadding);
  paddedJsonBuffer.set(jsonBuffer);
  for (let i = jsonBuffer.length; i < paddedJsonBuffer.length; i++) {
    paddedJsonBuffer[i] = 0x20; // Space
  }

  // Pad binary to 4-byte boundary
  const binPadding = (4 - (binaryBuffer.length % 4)) % 4;
  const paddedBinBuffer = new Uint8Array(binaryBuffer.length + binPadding);
  paddedBinBuffer.set(binaryBuffer);

  // Calculate total size
  const headerSize = 12;
  const jsonChunkHeaderSize = 8;
  const binChunkHeaderSize = 8;
  const totalSize = headerSize +
    jsonChunkHeaderSize + paddedJsonBuffer.length +
    binChunkHeaderSize + paddedBinBuffer.length;

  // Create GLB buffer
  const glb = new ArrayBuffer(totalSize);
  const view = new DataView(glb);
  const uint8View = new Uint8Array(glb);

  let offset = 0;

  // Header
  view.setUint32(offset, 0x46546C67, true); // 'glTF'
  offset += 4;
  view.setUint32(offset, 2, true); // Version 2
  offset += 4;
  view.setUint32(offset, totalSize, true); // Total length
  offset += 4;

  // JSON chunk header
  view.setUint32(offset, paddedJsonBuffer.length, true);
  offset += 4;
  view.setUint32(offset, 0x4E4F534A, true); // 'JSON'
  offset += 4;

  // JSON chunk data
  uint8View.set(paddedJsonBuffer, offset);
  offset += paddedJsonBuffer.length;

  // Binary chunk header
  view.setUint32(offset, paddedBinBuffer.length, true);
  offset += 4;
  view.setUint32(offset, 0x004E4942, true); // 'BIN\0'
  offset += 4;

  // Binary chunk data
  uint8View.set(paddedBinBuffer, offset);

  return new Blob([glb], { type: 'model/gltf-binary' });
}

async function encodeFramesToWebM(frames: ImageData[], fps: number): Promise<Blob> {
  // Simplified WebM encoding using canvas capture
  // Full implementation would use WebCodecs API

  const canvas = document.createElement('canvas');
  canvas.width = frames[0].width;
  canvas.height = frames[0].height;
  const ctx = canvas.getContext('2d')!;

  // Check if MediaRecorder supports webm
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.onerror = reject;
    recorder.start();

    // Draw frames
    let frameIndex = 0;
    const frameInterval = 1000 / fps;

    const drawFrame = () => {
      if (frameIndex >= frames.length) {
        recorder.stop();
        return;
      }

      ctx.putImageData(frames[frameIndex], 0, 0);
      frameIndex++;

      setTimeout(drawFrame, frameInterval);
    };

    drawFrame();
  });
}

/**
 * Trigger browser download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// === INDEX EXPORT ===

export const orbitalExport = {
  toZip: exportToZip,
  toGltf: exportToGltf,
  generatePreview: generateWebMPreview,
  download: downloadBlob
};

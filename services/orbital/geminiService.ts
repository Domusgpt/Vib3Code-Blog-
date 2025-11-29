// geminiService.ts — Gemini Banana API integration for orbital sprite generation
// SPEC-1 v2 compliant: 704×528 sheets, 4×3 grid, cell 176

import {
  GEN_SHEET,
  GEN_CELL,
  GEN_GRID,
  promptForGen,
  promptForDualOffset,
  dualSpriteOffset,
  generateCacheKey,
  type RingConfig
} from './orbitSprite';
import { telemetry } from './telemetry';

// === TYPES ===

export interface SpriteParams {
  frames: 12 | 24 | 36;
  cell: 176 | 312 | 584;
  ringPitchDeg: number;
  dualOffset?: boolean;
  seed?: number;
}

export interface SpriteSheet {
  imageData: ImageData;
  blob: Blob;
  url: string;
  params: SpriteParams;
  timestamp: number;
}

export interface GenerationResult {
  sheets: SpriteSheet[];
  manifest: GenerationManifest;
  cacheKey: string;
}

export interface GenerationManifest {
  jobId: string;
  timestamp: number;
  params: SpriteParams;
  rings: RingConfig[];
  sheets: string[]; // URLs or filenames
}

// === CACHE ===

interface CacheEntry {
  result: GenerationResult;
  timestamp: number;
  hits: number;
}

const spriteCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 50;

function getCached(key: string): GenerationResult | null {
  const entry = spriteCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    spriteCache.delete(key);
    return null;
  }

  entry.hits++;
  telemetry.emit({
    type: 'cache_hit',
    cacheKey: key,
    hits: entry.hits
  });

  return entry.result;
}

function setCache(key: string, result: GenerationResult): void {
  // Evict oldest if at capacity
  if (spriteCache.size >= MAX_CACHE_SIZE) {
    const oldest = [...spriteCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) {
      URL.revokeObjectURL(oldest[1].result.sheets[0]?.url);
      spriteCache.delete(oldest[0]);
    }
  }

  spriteCache.set(key, {
    result,
    timestamp: Date.now(),
    hits: 0
  });
}

// === API KEY ===

function getApiKey(): string {
  // Check various env variable patterns
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY ||
              (import.meta as any).env?.GEMINI_API_KEY ||
              (globalThis as any).process?.env?.GEMINI_API_KEY ||
              '';

  if (!key) {
    console.warn('[GeminiService] No API key found. Set VITE_GEMINI_API_KEY in .env.local');
  }

  return key;
}

// === MAIN API ===

/**
 * Request a sprite sheet from Gemini
 */
export async function requestSprite(
  front: Blob | string,
  back: Blob | string,
  params: SpriteParams
): Promise<SpriteSheet> {
  const jobId = generateJobId();
  const startTime = performance.now();

  telemetry.emit({
    type: 'model_request',
    jobId,
    params,
    timestamp: Date.now()
  });

  try {
    // Convert URLs to blobs if needed
    const frontBlob = typeof front === 'string' ? await fetchBlob(front) : front;
    const backBlob = typeof back === 'string' ? await fetchBlob(back) : back;

    // Generate prompt based on params
    const prompt = params.dualOffset
      ? promptForDualOffset(params.frames, params.seed)
      : promptForGen(params.ringPitchDeg, params.seed);

    // Call Gemini API
    const response = await callGeminiAPI(frontBlob, backBlob, prompt, params);

    // Process response into sprite sheet
    const sheet = await processGeminiResponse(response, params);

    const latency = performance.now() - startTime;

    telemetry.emit({
      type: 'sprite_received',
      jobId,
      latencyMs: latency,
      sheetSize: [GEN_SHEET.w, GEN_SHEET.h],
      ok: true
    });

    return sheet;
  } catch (error) {
    telemetry.emit({
      type: 'error',
      jobId,
      errCode: (error as Error).name,
      message: (error as Error).message
    });
    throw error;
  }
}

/**
 * Request complete generation with optional dual-sprite and caching
 */
export async function requestGeneration(
  front: Blob | string,
  back: Blob | string,
  params: SpriteParams,
  options: {
    useCache?: boolean;
    parallel?: boolean;
  } = {}
): Promise<GenerationResult> {
  const { useCache = true, parallel = true } = options;

  // Convert to blobs for cache key
  const frontBlob = typeof front === 'string' ? await fetchBlob(front) : front;
  const backBlob = typeof back === 'string' ? await fetchBlob(back) : back;

  // Check cache
  const cacheKey = await generateCacheKey(frontBlob, backBlob, {
    frames: params.frames,
    cell: params.cell,
    dual: params.dualOffset || false,
    rings: [params.ringPitchDeg],
    seed: params.seed
  });

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const jobId = generateJobId();

  telemetry.emit({
    type: 'job_enqueued',
    jobId,
    cacheKey,
    params
  });

  // Generate sprites
  const sheets: SpriteSheet[] = [];

  if (params.dualOffset && parallel) {
    // Request both sprites in parallel
    const [primary, offset] = await Promise.all([
      requestSprite(frontBlob, backBlob, { ...params, dualOffset: false }),
      requestSprite(frontBlob, backBlob, { ...params, dualOffset: true })
    ]);
    sheets.push(primary, offset);
  } else if (params.dualOffset) {
    // Sequential requests
    sheets.push(await requestSprite(frontBlob, backBlob, { ...params, dualOffset: false }));
    sheets.push(await requestSprite(frontBlob, backBlob, { ...params, dualOffset: true }));
  } else {
    // Single sprite
    sheets.push(await requestSprite(frontBlob, backBlob, params));
  }

  const manifest: GenerationManifest = {
    jobId,
    timestamp: Date.now(),
    params,
    rings: [{ phi: params.ringPitchDeg, sheets: sheets.length }],
    sheets: sheets.map(s => s.url)
  };

  const result: GenerationResult = {
    sheets,
    manifest,
    cacheKey
  };

  // Cache result
  setCache(cacheKey, result);

  return result;
}

/**
 * Request multi-ring generation (full sphere)
 */
export async function requestMultiRingGeneration(
  front: Blob | string,
  back: Blob | string,
  params: SpriteParams,
  rings: RingConfig[],
  options: {
    useCache?: boolean;
    progressCallback?: (ring: number, total: number) => void;
  } = {}
): Promise<GenerationResult> {
  const { useCache = true, progressCallback } = options;

  const frontBlob = typeof front === 'string' ? await fetchBlob(front) : front;
  const backBlob = typeof back === 'string' ? await fetchBlob(back) : back;

  const allSheets: SpriteSheet[] = [];

  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    progressCallback?.(i, rings.length);

    const ringParams = { ...params, ringPitchDeg: ring.phi };
    const sheet = await requestSprite(frontBlob, backBlob, ringParams);
    allSheets.push(sheet);

    if (ring.dualOffset) {
      const offsetSheet = await requestSprite(frontBlob, backBlob, {
        ...ringParams,
        dualOffset: true
      });
      allSheets.push(offsetSheet);
    }
  }

  const cacheKey = await generateCacheKey(frontBlob, backBlob, {
    frames: params.frames,
    cell: params.cell,
    dual: params.dualOffset || false,
    rings: rings.map(r => r.phi),
    seed: params.seed
  });

  const manifest: GenerationManifest = {
    jobId: generateJobId(),
    timestamp: Date.now(),
    params,
    rings,
    sheets: allSheets.map(s => s.url)
  };

  const result: GenerationResult = {
    sheets: allSheets,
    manifest,
    cacheKey
  };

  if (useCache) {
    setCache(cacheKey, result);
  }

  return result;
}

// === INTERNAL HELPERS ===

async function callGeminiAPI(
  front: Blob,
  back: Blob,
  prompt: string,
  params: SpriteParams
): Promise<Response> {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Return mock response for development
    console.warn('[GeminiService] No API key, returning mock sprite');
    return createMockResponse(params);
  }

  // Convert blobs to base64
  const frontBase64 = await blobToBase64(front);
  const backBase64 = await blobToBase64(back);

  const requestBody = {
    contents: [{
      parts: [
        {
          text: prompt
        },
        {
          inline_data: {
            mime_type: front.type || 'image/png',
            data: frontBase64
          }
        },
        {
          inline_data: {
            mime_type: back.type || 'image/png',
            data: backBase64
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'image/png'
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  return response;
}

async function processGeminiResponse(
  response: Response,
  params: SpriteParams
): Promise<SpriteSheet> {
  // Check if mock response
  if ((response as any).__mock) {
    return (response as any).__mockSheet;
  }

  const data = await response.json();

  // Extract image from response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inline_data?.mime_type?.startsWith('image/')
  );

  if (!imagePart) {
    throw new Error('No image in Gemini response');
  }

  const imageBase64 = imagePart.inline_data.data;
  const mimeType = imagePart.inline_data.mime_type;

  // Convert to blob
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  // Create ImageData
  const imageBitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

  return {
    imageData,
    blob,
    url: URL.createObjectURL(blob),
    params,
    timestamp: Date.now()
  };
}

async function createMockResponse(params: SpriteParams): Promise<any> {
  // Create a mock sprite sheet for development
  const canvas = new OffscreenCanvas(GEN_SHEET.w, GEN_SHEET.h);
  const ctx = canvas.getContext('2d')!;

  // Fill with gradient background
  const gradient = ctx.createLinearGradient(0, 0, GEN_SHEET.w, GEN_SHEET.h);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GEN_SHEET.w, GEN_SHEET.h);

  // Draw grid cells with mock content
  const [cols, rows] = GEN_GRID;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * GEN_CELL;
      const y = row * GEN_CELL;
      const frameIndex = row * cols + col;
      const angle = (360 / 12) * frameIndex;

      // Draw cell border
      ctx.strokeStyle = '#4a4a6a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, GEN_CELL - 4, GEN_CELL - 4);

      // Draw mock object (rotating cube representation)
      const cx = x + GEN_CELL / 2;
      const cy = y + GEN_CELL / 2;
      const size = GEN_CELL * 0.4;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((angle * Math.PI) / 180);

      // Draw cube face
      ctx.fillStyle = `hsl(${angle}, 70%, 50%)`;
      ctx.fillRect(-size / 2, -size / 2, size, size);

      // Draw highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-size / 2, -size / 2, size / 2, size / 2);

      ctx.restore();

      // Draw angle label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle}°`, cx, y + GEN_CELL - 8);
    }
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const imageData = ctx.getImageData(0, 0, GEN_SHEET.w, GEN_SHEET.h);

  const sheet: SpriteSheet = {
    imageData,
    blob,
    url: URL.createObjectURL(blob),
    params,
    timestamp: Date.now()
  };

  return {
    __mock: true,
    __mockSheet: sheet
  };
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.blob();
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}_${random}`;
}

// === EXPORTS ===

export const geminiService = {
  requestSprite,
  requestGeneration,
  requestMultiRingGeneration,
  clearCache: () => {
    spriteCache.forEach(entry => {
      entry.result.sheets.forEach(s => URL.revokeObjectURL(s.url));
    });
    spriteCache.clear();
  },
  getCacheStats: () => ({
    size: spriteCache.size,
    entries: [...spriteCache.entries()].map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp
    }))
  })
};

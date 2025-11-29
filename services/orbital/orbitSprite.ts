// orbitSprite.ts — helpers for 4×3 canonical gen (704×528, cell 176) with 20% overscan
// SPEC-1 v2 compliant

export type Grid = [number, number];

// === CANONICAL GENERATION CONSTANTS ===
export const GEN_GRID: Grid = [4, 3];
export const GEN_CELL = 176;
export const GEN_SHEET = { w: 704, h: 528 };
export const OVERSCAN = 0.20;

// === DISPLAY CONSTANTS ===
export const DISP_CELL = 146; // crop from 176 with 15px margin per side
export const DISP_SHEET = { w: 584, h: 438 };
export const CROP_MARGIN = (GEN_CELL - DISP_CELL) / 2; // 15 px per side

// === STITCH CONSTANTS ===
export const DEFAULT_FEATHER_PX = 10;
export const DEFAULT_WARP_TYPE = 'cylindrical' as const;
export const DEFAULT_SHEAR = 0.10;
export const MAX_WARP_DEG = 6;

// === ZOOM CONSTANTS ===
export const DEFAULT_ZOOM_MAX = 1.2;
export const ZOOM_UNSHARP_THRESHOLD = 1.25;

// === PARALLAX CONSTANTS ===
export const DEFAULT_PARALLAX_MAX = 0.02;

// === MODE CONFIGURATIONS ===
export type OrbitalMode = 'fast' | 'pro' | 'smooth';

export interface ModeConfig {
  frames: 12 | 24 | 36;
  cell: 312 | 584 | 176;
  dualSprite: boolean;
  sheets: number;
}

export const MODE_CONFIGS: Record<OrbitalMode, ModeConfig> = {
  fast: { frames: 12, cell: 176, dualSprite: false, sheets: 1 },
  pro: { frames: 12, cell: 176, dualSprite: false, sheets: 1 },
  smooth: { frames: 24, cell: 176, dualSprite: true, sheets: 2 }
};

// === RING CONFIGURATION ===
export interface RingConfig {
  phi: number; // pitch angle in degrees
  sheets: number;
  dualOffset?: boolean;
}

export const DEFAULT_RINGS: RingConfig[] = [{ phi: 0, sheets: 1 }];
export const FULL_SPHERE_RINGS: RingConfig[] = [
  { phi: -15, sheets: 1 },
  { phi: 0, sheets: 1 },
  { phi: 15, sheets: 1 }
];

// === MANIFEST TYPES ===
export interface OrbitalManifest {
  version: string;
  generation: {
    grid: Grid;
    cell: number;
    sheet: [number, number];
    overscan: number;
  };
  display: {
    grid: Grid;
    cell: number;
    sheet: [number, number];
  };
  rings: RingConfig[];
  stitch: {
    feather: number;
    warp: 'cylindrical' | 'conical' | 'spherical';
    shear: number;
  };
  zoom: {
    max: number;
    unsharp: boolean;
  };
  parallax_max: number;
}

export function createDefaultManifest(): OrbitalManifest {
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
    rings: DEFAULT_RINGS,
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

// === GEOMETRY HELPERS ===

/**
 * Get tile rectangle from sprite sheet by index
 */
export function tileRect(index: number, cell = GEN_CELL, grid = GEN_GRID) {
  const [cols] = grid;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * cell, y: row * cell, w: cell, h: cell };
}

/**
 * Get cropped display rectangle from generation tile
 */
export function cropRect(index: number) {
  const t = tileRect(index);
  const m = CROP_MARGIN;
  return { x: t.x + m, y: t.y + m, w: DISP_CELL, h: DISP_CELL };
}

/**
 * Convert frame index to yaw angle
 */
export function angleForIndex(i: number, total = 12): number {
  return (360 / total) * i;
}

/**
 * Convert yaw angle to frame indices and blend factor
 */
export function phaseParams(thetaDeg: number, frames = 12) {
  const step = 360 / frames;
  const normalized = ((thetaDeg % 360) + 360) % 360; // normalize to [0, 360)
  const u = normalized / step;
  const i = Math.floor(u) % frames;
  const t = u - Math.floor(u);
  return { i, j: (i + 1) % frames, t, stepDeg: step };
}

/**
 * Get spherical neighbors for bilinear interpolation
 * Returns up to 4 neighbors: two yaw frames on each of two pitch rings
 */
export function sphericalNeighbors(
  thetaDeg: number,
  phiDeg: number,
  rings: RingConfig[],
  framesPerRing = 12
) {
  const stepYaw = 360 / framesPerRing;
  const k = Math.floor(thetaDeg / stepYaw);
  const tTheta = (thetaDeg / stepYaw) - k;

  // Find nearest rings above and below
  const sortedRings = [...rings].sort((a, b) => a.phi - b.phi);
  let r0 = sortedRings[0];
  let r1 = sortedRings[0];
  let tPhi = 0;

  for (let i = 0; i < sortedRings.length - 1; i++) {
    if (phiDeg >= sortedRings[i].phi && phiDeg <= sortedRings[i + 1].phi) {
      r0 = sortedRings[i];
      r1 = sortedRings[i + 1];
      tPhi = (phiDeg - r0.phi) / (r1.phi - r0.phi);
      break;
    }
  }

  // If outside ring range, clamp
  if (phiDeg < sortedRings[0].phi) {
    r0 = r1 = sortedRings[0];
    tPhi = 0;
  } else if (phiDeg > sortedRings[sortedRings.length - 1].phi) {
    r0 = r1 = sortedRings[sortedRings.length - 1];
    tPhi = 0;
  }

  // Calculate blend weights
  const w00 = (1 - tTheta) * (1 - tPhi);
  const w10 = tTheta * (1 - tPhi);
  const w01 = (1 - tTheta) * tPhi;
  const w11 = tTheta * tPhi;

  return {
    neighbors: [
      { ring: r0, frame: k % framesPerRing, weight: w00 },
      { ring: r0, frame: (k + 1) % framesPerRing, weight: w10 },
      { ring: r1, frame: k % framesPerRing, weight: w01 },
      { ring: r1, frame: (k + 1) % framesPerRing, weight: w11 }
    ],
    tTheta,
    tPhi
  };
}

/**
 * Calculate motion direction vector for seam alignment
 */
export function motionDirection(
  dTheta: number,
  dPhi: number
): { angle: number; magnitude: number } {
  const angle = Math.atan2(dPhi, dTheta);
  const magnitude = Math.sqrt(dTheta * dTheta + dPhi * dPhi);
  return { angle, magnitude };
}

/**
 * Calculate dual-sprite offset angle
 */
export function dualSpriteOffset(frames = 12): number {
  return 180 / frames; // +15° for 12 frames
}

// === PROMPT GENERATORS ===

/**
 * Generate Gemini prompt for sprite generation
 */
export function promptForGen(ringPitchDeg = 0, seed?: number): string {
  let prompt = `You are rendering a 360° product orbit sprite from two references (front/back). `;
  prompt += `Output a 4×3 sprite grid (left→right, top→bottom increasing yaw). `;
  prompt += `Total = ${GEN_SHEET.w}×${GEN_SHEET.h} px. Cell = ${GEN_CELL}×${GEN_CELL} px. No padding. `;
  prompt += `Constant softbox lighting, fixed focal length, level horizon, scale-locked across cells. `;
  prompt += `Alpha background or neutral matte with 2–4 px alpha bleed beyond object edge. `;
  prompt += `Start yaw at 0° (front) for ring pitch ${ringPitchDeg}°.`;
  if (seed !== undefined) {
    prompt += ` Use seed=${seed}.`;
  }
  return prompt;
}

/**
 * Generate Gemini prompt for dual-sprite offset
 */
export function promptForDualOffset(frames = 12, seed?: number): string {
  const offset = dualSpriteOffset(frames);
  let prompt = promptForGen(0, seed);
  prompt += ` Start at +${offset}° yaw offset relative to the main sprite; `;
  prompt += `keep identical lighting/scale/seed.`;
  return prompt;
}

// === CACHE KEY GENERATION ===

/**
 * Generate cache key from inputs and params
 */
export async function generateCacheKey(
  frontBlob: Blob,
  backBlob: Blob,
  params: {
    frames: number;
    cell: number;
    dual: boolean;
    rings: number[];
    seed?: number;
  }
): Promise<string> {
  const frontHash = await hashBlob(frontBlob);
  const backHash = await hashBlob(backBlob);
  const paramStr = JSON.stringify(params);
  const combined = `${frontHash}:${backHash}:${paramStr}`;
  return await hashString(combined);
}

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32); // truncate for readability
}

// === URL STATE PERSISTENCE ===

export interface OrbitalURLState {
  mode: OrbitalMode;
  yaw: number;
  pitch: number;
  zoom: number;
  parallax: number;
}

export function parseURLState(): Partial<OrbitalURLState> {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const state: Partial<OrbitalURLState> = {};

  if (params.has('mode')) {
    const mode = params.get('mode') as OrbitalMode;
    if (['fast', 'pro', 'smooth'].includes(mode)) {
      state.mode = mode;
    }
  }
  if (params.has('yaw')) state.yaw = parseFloat(params.get('yaw')!);
  if (params.has('pitch')) state.pitch = parseFloat(params.get('pitch')!);
  if (params.has('zoom')) state.zoom = parseFloat(params.get('zoom')!);
  if (params.has('parallax')) state.parallax = parseFloat(params.get('parallax')!);

  return state;
}

export function updateURLState(state: Partial<OrbitalURLState>): void {
  const params = new URLSearchParams(window.location.hash.slice(1));

  if (state.mode !== undefined) params.set('mode', state.mode);
  if (state.yaw !== undefined) params.set('yaw', state.yaw.toFixed(1));
  if (state.pitch !== undefined) params.set('pitch', state.pitch.toFixed(1));
  if (state.zoom !== undefined) params.set('zoom', state.zoom.toFixed(2));
  if (state.parallax !== undefined) params.set('parallax', state.parallax.toFixed(3));

  window.history.replaceState(null, '', `#${params.toString()}`);
}

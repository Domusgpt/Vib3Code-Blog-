// normalize.ts — Lightweight frame normalization (Anti-Wobble v2)
// Pure JS implementation with SIMD-ready structure for future WASM migration
// SPEC-1 v2: centroid stddev < 0.5 px; area drift < 2.5%; post-proc < 20 ms/frame @ 312

import { GEN_CELL, GEN_GRID, tileRect, type Grid } from './orbitSprite';
import { telemetry, recordKPI } from './telemetry';

// === TYPES ===

export interface NormalizedFrame {
  imageData: ImageData;
  centroid: { x: number; y: number };
  area: number;
  scale: number;
  offset: { dx: number; dy: number };
}

export interface NormalizationResult {
  frames: NormalizedFrame[];
  metrics: NormalizationMetrics;
}

export interface NormalizationMetrics {
  centroidStddev: number;
  areaDrift: number;
  avgPostProcMs: number;
  frameCount: number;
}

export interface NormalizationOptions {
  targetFit?: number;        // 0.8 = 80% box fit
  scaleClamp?: number;       // ±3% scale variation allowed
  featherPx?: number;        // edge feather pixels
  smoothWindow?: number;     // Savitzky-Golay window size
  alphaThreshold?: number;   // threshold for object detection
}

const DEFAULT_OPTIONS: Required<NormalizationOptions> = {
  targetFit: 0.80,
  scaleClamp: 0.03,
  featherPx: 2,
  smoothWindow: 5,
  alphaThreshold: 0.1
};

// === MAIN NORMALIZATION FUNCTION ===

/**
 * Normalize a sprite sheet into stable individual frames
 */
export async function normalizeSprite(
  spriteImageData: ImageData,
  options: NormalizationOptions = {},
  grid: Grid = GEN_GRID,
  cell: number = GEN_CELL
): Promise<NormalizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();

  const [cols, rows] = grid;
  const frameCount = cols * rows;
  const rawFrames: NormalizedFrame[] = [];

  // Step 1: Extract and analyze each frame
  for (let i = 0; i < frameCount; i++) {
    const rect = tileRect(i, cell, grid);
    const frameData = extractTile(spriteImageData, rect.x, rect.y, rect.w, rect.h);
    const analysis = analyzeFrame(frameData, opts.alphaThreshold);

    rawFrames.push({
      imageData: frameData,
      centroid: analysis.centroid,
      area: analysis.area,
      scale: 1.0,
      offset: { dx: 0, dy: 0 }
    });
  }

  // Step 2: Compute target metrics (robust median)
  const targetArea = robustMedian(rawFrames.map(f => f.area));
  const targetCentroid = {
    x: robustMedian(rawFrames.map(f => f.centroid.x)),
    y: robustMedian(rawFrames.map(f => f.centroid.y))
  };

  // Step 3: Compute transforms for each frame
  const transforms: Array<{ dx: number; dy: number; scale: number }> = [];

  for (const frame of rawFrames) {
    // Scale to match target area
    let scale = Math.sqrt(targetArea / Math.max(frame.area, 1));

    // Clamp scale within bounds
    scale = Math.max(1 - opts.scaleClamp, Math.min(1 + opts.scaleClamp, scale));

    // Offset to center
    const dx = targetCentroid.x - frame.centroid.x * scale;
    const dy = targetCentroid.y - frame.centroid.y * scale;

    transforms.push({ dx, dy, scale });
    frame.scale = scale;
    frame.offset = { dx, dy };
  }

  // Step 4: Temporal smoothing (Savitzky-Golay)
  const smoothedTransforms = savitzkyGolaySmooth(transforms, opts.smoothWindow);

  // Step 5: Apply transforms and compose final frames
  const normalizedFrames: NormalizedFrame[] = [];

  for (let i = 0; i < frameCount; i++) {
    const frame = rawFrames[i];
    const transform = smoothedTransforms[i];

    const composed = composeFrame(
      frame.imageData,
      transform,
      cell,
      opts.targetFit,
      opts.featherPx
    );

    normalizedFrames.push({
      imageData: composed,
      centroid: {
        x: frame.centroid.x * transform.scale + transform.dx,
        y: frame.centroid.y * transform.scale + transform.dy
      },
      area: frame.area * transform.scale * transform.scale,
      scale: transform.scale,
      offset: { dx: transform.dx, dy: transform.dy }
    });
  }

  // Step 6: Compute final metrics
  const metrics = computeMetrics(normalizedFrames, performance.now() - startTime);

  // Record KPIs
  recordKPI({
    centroidStddev: metrics.centroidStddev,
    areaDrift: metrics.areaDrift,
    postProcMs: metrics.avgPostProcMs,
    modelCalls: 1
  });

  return { frames: normalizedFrames, metrics };
}

/**
 * Normalize a single tile (for streaming/chunked processing)
 */
export function normalizeTile(
  tileData: ImageData,
  targetCentroid: { x: number; y: number },
  targetArea: number,
  options: NormalizationOptions = {}
): NormalizedFrame {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const analysis = analyzeFrame(tileData, opts.alphaThreshold);

  let scale = Math.sqrt(targetArea / Math.max(analysis.area, 1));
  scale = Math.max(1 - opts.scaleClamp, Math.min(1 + opts.scaleClamp, scale));

  const dx = targetCentroid.x - analysis.centroid.x * scale;
  const dy = targetCentroid.y - analysis.centroid.y * scale;

  const composed = composeFrame(
    tileData,
    { dx, dy, scale },
    tileData.width,
    opts.targetFit,
    opts.featherPx
  );

  return {
    imageData: composed,
    centroid: {
      x: analysis.centroid.x * scale + dx,
      y: analysis.centroid.y * scale + dy
    },
    area: analysis.area * scale * scale,
    scale,
    offset: { dx, dy }
  };
}

// === FRAME ANALYSIS ===

interface FrameAnalysis {
  centroid: { x: number; y: number };
  area: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function analyzeFrame(imageData: ImageData, alphaThreshold: number): FrameAnalysis {
  const { data, width, height } = imageData;
  const threshold = Math.floor(alphaThreshold * 255);

  let sumX = 0, sumY = 0, count = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];

      if (alpha > threshold) {
        sumX += x;
        sumY += y;
        count++;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const area = count;
  const centroid = count > 0
    ? { x: sumX / count, y: sumY / count }
    : { x: width / 2, y: height / 2 };

  return {
    centroid,
    area,
    bounds: { minX, minY, maxX, maxY }
  };
}

// === IMAGE MANIPULATION ===

function extractTile(
  source: ImageData,
  x: number,
  y: number,
  w: number,
  h: number
): ImageData {
  const result = new ImageData(w, h);

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const srcIdx = ((y + dy) * source.width + (x + dx)) * 4;
      const dstIdx = (dy * w + dx) * 4;

      result.data[dstIdx] = source.data[srcIdx];
      result.data[dstIdx + 1] = source.data[srcIdx + 1];
      result.data[dstIdx + 2] = source.data[srcIdx + 2];
      result.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return result;
}

function composeFrame(
  source: ImageData,
  transform: { dx: number; dy: number; scale: number },
  outputSize: number,
  targetFit: number,
  featherPx: number
): ImageData {
  const result = new ImageData(outputSize, outputSize);
  const { dx, dy, scale } = transform;

  // Calculate output bounds for target fit
  const fitMargin = (1 - targetFit) / 2;
  const outStart = Math.floor(outputSize * fitMargin);
  const outEnd = Math.floor(outputSize * (1 - fitMargin));

  for (let outY = 0; outY < outputSize; outY++) {
    for (let outX = 0; outX < outputSize; outX++) {
      // Map output to source coordinates
      const srcX = (outX - dx) / scale;
      const srcY = (outY - dy) / scale;

      // Bounds check
      if (srcX < 0 || srcX >= source.width - 1 || srcY < 0 || srcY >= source.height - 1) {
        continue;
      }

      // Bilinear interpolation
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const fx = srcX - x0;
      const fy = srcY - y0;

      const i00 = (y0 * source.width + x0) * 4;
      const i10 = (y0 * source.width + x1) * 4;
      const i01 = (y1 * source.width + x0) * 4;
      const i11 = (y1 * source.width + x1) * 4;

      const dstIdx = (outY * outputSize + outX) * 4;

      for (let c = 0; c < 4; c++) {
        const v00 = source.data[i00 + c];
        const v10 = source.data[i10 + c];
        const v01 = source.data[i01 + c];
        const v11 = source.data[i11 + c];

        const v0 = v00 + (v10 - v00) * fx;
        const v1 = v01 + (v11 - v01) * fx;
        const v = v0 + (v1 - v0) * fy;

        result.data[dstIdx + c] = Math.round(v);
      }

      // Apply edge feather
      if (featherPx > 0) {
        const edgeDist = Math.min(
          outX, outY,
          outputSize - 1 - outX,
          outputSize - 1 - outY
        );

        if (edgeDist < featherPx) {
          const feather = edgeDist / featherPx;
          result.data[dstIdx + 3] = Math.round(result.data[dstIdx + 3] * feather);
        }
      }
    }
  }

  return result;
}

// === SMOOTHING ===

function savitzkyGolaySmooth(
  transforms: Array<{ dx: number; dy: number; scale: number }>,
  windowSize: number
): Array<{ dx: number; dy: number; scale: number }> {
  if (windowSize < 3 || transforms.length < windowSize) {
    return transforms;
  }

  // Savitzky-Golay coefficients for smoothing (order 2, window 5)
  const halfWindow = Math.floor(windowSize / 2);
  const coefficients = computeSGCoefficients(windowSize);

  const result: Array<{ dx: number; dy: number; scale: number }> = [];

  for (let i = 0; i < transforms.length; i++) {
    let smoothDx = 0, smoothDy = 0, smoothScale = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = Math.max(0, Math.min(transforms.length - 1, i + j));
      const coeff = coefficients[j + halfWindow];

      smoothDx += transforms[idx].dx * coeff;
      smoothDy += transforms[idx].dy * coeff;
      smoothScale += transforms[idx].scale * coeff;
    }

    result.push({ dx: smoothDx, dy: smoothDy, scale: smoothScale });
  }

  return result;
}

function computeSGCoefficients(windowSize: number): number[] {
  // Simplified SG coefficients for smoothing (polynomial order 0 = moving average with weights)
  const halfWindow = Math.floor(windowSize / 2);
  const coefficients: number[] = [];
  let sum = 0;

  for (let i = -halfWindow; i <= halfWindow; i++) {
    const weight = 1 - Math.abs(i) / (halfWindow + 1);
    coefficients.push(weight);
    sum += weight;
  }

  // Normalize
  return coefficients.map(c => c / sum);
}

// === METRICS ===

function computeMetrics(
  frames: NormalizedFrame[],
  totalTimeMs: number
): NormalizationMetrics {
  if (frames.length === 0) {
    return { centroidStddev: 0, areaDrift: 0, avgPostProcMs: 0, frameCount: 0 };
  }

  // Centroid standard deviation
  const centroidsX = frames.map(f => f.centroid.x);
  const centroidsY = frames.map(f => f.centroid.y);
  const centroidStddevX = standardDeviation(centroidsX);
  const centroidStddevY = standardDeviation(centroidsY);
  const centroidStddev = Math.sqrt(centroidStddevX ** 2 + centroidStddevY ** 2);

  // Area drift (max deviation from median as percentage)
  const areas = frames.map(f => f.area);
  const medianArea = robustMedian(areas);
  const areaDrift = Math.max(...areas.map(a => Math.abs(a - medianArea) / medianArea * 100));

  return {
    centroidStddev,
    areaDrift,
    avgPostProcMs: totalTimeMs / frames.length,
    frameCount: frames.length
  };
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function robustMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// === MATTE GENERATION ===

/**
 * Generate alpha matte from YCbCr thresholding
 */
export function generateMatte(
  imageData: ImageData,
  options: {
    yRange?: [number, number];
    cbRange?: [number, number];
    crRange?: [number, number];
    morphologySize?: number;
  } = {}
): ImageData {
  const {
    yRange = [16, 235],
    cbRange = [16, 240],
    crRange = [16, 240],
    morphologySize = 1
  } = options;

  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);

  // YCbCr conversion and thresholding
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // RGB to YCbCr
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
      const Cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;

      // Threshold
      const inRange =
        Y >= yRange[0] && Y <= yRange[1] &&
        Cb >= cbRange[0] && Cb <= cbRange[1] &&
        Cr >= crRange[0] && Cr <= crRange[1];

      mask[y * width + x] = inRange ? 255 : 0;
    }
  }

  // Simple morphology (dilate then erode to clean edges)
  const dilated = morphDilate(mask, width, height, morphologySize);
  const cleaned = morphErode(dilated, width, height, morphologySize);

  // Apply mask to alpha channel
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let i = 0; i < cleaned.length; i++) {
    result.data[i * 4 + 3] = cleaned[i];
  }

  return result;
}

function morphDilate(mask: Uint8Array, width: number, height: number, size: number): Uint8Array {
  const result = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;

      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            maxVal = Math.max(maxVal, mask[ny * width + nx]);
          }
        }
      }

      result[y * width + x] = maxVal;
    }
  }

  return result;
}

function morphErode(mask: Uint8Array, width: number, height: number, size: number): Uint8Array {
  const result = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;

      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            minVal = Math.min(minVal, mask[ny * width + nx]);
          }
        }
      }

      result[y * width + x] = minVal;
    }
  }

  return result;
}

// services/orbital/index.ts — Orbital AI Studio service exports

// Core sprite utilities
export {
  GEN_GRID,
  GEN_CELL,
  GEN_SHEET,
  DISP_CELL,
  DISP_SHEET,
  OVERSCAN,
  CROP_MARGIN,
  DEFAULT_FEATHER_PX,
  DEFAULT_WARP_TYPE,
  DEFAULT_SHEAR,
  DEFAULT_ZOOM_MAX,
  DEFAULT_PARALLAX_MAX,
  ZOOM_UNSHARP_THRESHOLD,
  MODE_CONFIGS,
  DEFAULT_RINGS,
  FULL_SPHERE_RINGS,
  createDefaultManifest,
  tileRect,
  cropRect,
  angleForIndex,
  phaseParams,
  sphericalNeighbors,
  motionDirection,
  dualSpriteOffset,
  promptForGen,
  promptForDualOffset,
  generateCacheKey,
  parseURLState,
  updateURLState,
  type Grid,
  type OrbitalMode,
  type ModeConfig,
  type RingConfig,
  type OrbitalManifest,
  type OrbitalURLState
} from './orbitSprite';

// Gemini API service
export {
  requestSprite,
  requestGeneration,
  requestMultiRingGeneration,
  geminiService,
  type SpriteParams,
  type SpriteSheet,
  type GenerationResult,
  type GenerationManifest
} from './geminiService';

// Telemetry
export {
  telemetry,
  createJobTelemetry,
  measureLatency,
  recordKPI,
  getKPIStats,
  type TelemetryEvent,
  type TelemetryEventType,
  type TelemetryConfig,
  type KPIMetrics
} from './telemetry';

// Normalization
export {
  normalizeSprite,
  normalizeTile,
  generateMatte,
  type NormalizedFrame,
  type NormalizationResult,
  type NormalizationMetrics,
  type NormalizationOptions
} from './normalize';

// WebGL shaders
export {
  OrbitalShaderManager,
  type ShaderType,
  type ShaderProgram,
  type StitchUniforms,
  type ParallaxUniforms,
  type ShadowUniforms,
  type ZoomUniforms
} from './shaderManager';

// Export functionality
export {
  exportToZip,
  exportToGltf,
  generateWebMPreview,
  downloadBlob,
  orbitalExport,
  type ExportOptions,
  type ExportResult
} from './export';

// Cache layer
export {
  hashBlob,
  hashString,
  hashArrayBuffer,
  generateCacheKey as createCacheKey,
  createCache,
  spriteCache,
  tileCache,
  previewCache,
  warmCache,
  clearAllCaches,
  getCacheStats,
  type CacheKey,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
  type CacheInterface,
  type SpriteCache,
  type NormalizedTileCache,
  type PreviewCache
} from './cache';

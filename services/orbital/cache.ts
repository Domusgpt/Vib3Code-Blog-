// cache.ts — Caching layer for Orbital AI Studio
// Key: hash(front, back, frames, cell, dual, rings, seed)
// Stores: sprites, normalized tiles, preview webm

import { telemetry } from './telemetry';

// === TYPES ===

export interface CacheKey {
  frontHash: string;
  backHash: string;
  frames: number;
  cell: number;
  dual: boolean;
  rings: number[];
  seed?: number;
}

export interface CacheEntry<T> {
  data: T;
  metadata: {
    key: string;
    created: number;
    accessed: number;
    size: number;
    hits: number;
  };
}

export interface CacheStats {
  entries: number;
  totalSize: number;
  hitRate: number;
  hits: number;
  misses: number;
}

export interface CacheConfig {
  maxEntries?: number;
  maxSize?: number; // bytes
  ttl?: number; // milliseconds
  storage?: 'memory' | 'indexeddb' | 'localstorage';
}

// === CONTENT HASHING ===

/**
 * Generate SHA-256 hash of blob content
 */
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Generate SHA-256 hash of string
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Generate SHA-256 hash of ArrayBuffer
 */
export async function hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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

  const keyData: CacheKey = {
    frontHash,
    backHash,
    frames: params.frames,
    cell: params.cell,
    dual: params.dual,
    rings: params.rings.sort((a, b) => a - b),
    seed: params.seed
  };

  const keyString = JSON.stringify(keyData);
  const keyHash = await hashString(keyString);

  return keyHash.slice(0, 32); // Truncate for readability
}

// === MEMORY CACHE ===

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: Required<CacheConfig>;
  private stats = { hits: 0, misses: 0 };

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      maxSize: config.maxSize ?? 500 * 1024 * 1024, // 500MB
      ttl: config.ttl ?? 3600000, // 1 hour
      storage: config.storage ?? 'memory'
    };
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      telemetry.emit({ type: 'cache_hit', cacheHit: false, cacheKey: key });
      return null;
    }

    // Check TTL
    if (Date.now() - entry.metadata.created > this.config.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      telemetry.emit({ type: 'cache_hit', cacheHit: false, cacheKey: key, reason: 'expired' });
      return null;
    }

    // Update access time and hits
    entry.metadata.accessed = Date.now();
    entry.metadata.hits++;
    this.stats.hits++;

    telemetry.emit({
      type: 'cache_hit',
      cacheHit: true,
      cacheKey: key,
      hits: entry.metadata.hits
    });

    return entry.data;
  }

  async set(key: string, data: T, size: number = 0): Promise<void> {
    // Evict if necessary
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      data,
      metadata: {
        key,
        created: Date.now(),
        accessed: Date.now(),
        size,
        hits: 0
      }
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.metadata.created > this.config.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getStats(): CacheStats {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.metadata.size;
    });

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      entries: this.cache.size,
      totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      hits: this.stats.hits,
      misses: this.stats.misses
    };
  }

  private evictIfNeeded(incomingSize: number): void {
    // Check entry count
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Check total size
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.metadata.size;
    });

    while (totalSize + incomingSize > this.config.maxSize && this.cache.size > 0) {
      const evictedSize = this.evictLRU();
      totalSize -= evictedSize;
    }
  }

  private evictLRU(): number {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    let evictedSize = 0;

    this.cache.forEach((entry, key) => {
      if (entry.metadata.accessed < oldestAccess) {
        oldestAccess = entry.metadata.accessed;
        oldestKey = key;
        evictedSize = entry.metadata.size;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }

    return evictedSize;
  }
}

// === INDEXEDDB CACHE ===

class IndexedDBCache<T> {
  private dbName = 'orbital-cache';
  private storeName = 'cache';
  private db: IDBDatabase | null = null;
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      maxSize: config.maxSize ?? 2 * 1024 * 1024 * 1024, // 2GB
      ttl: config.ttl ?? 86400000, // 24 hours
      storage: 'indexeddb'
    };
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('accessed', 'metadata.accessed');
          store.createIndex('created', 'metadata.created');
        }
      };
    });
  }

  async get(key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (Date.now() - entry.metadata.created > this.config.ttl) {
          store.delete(key);
          resolve(null);
          return;
        }

        // Update access time
        entry.metadata.accessed = Date.now();
        entry.metadata.hits++;
        store.put(entry);

        resolve(entry.data);
      };
    });
  }

  async set(key: string, data: T, size: number = 0): Promise<void> {
    const db = await this.getDB();

    const entry: CacheEntry<T> & { key: string } = {
      key,
      data,
      metadata: {
        key,
        created: Date.now(),
        accessed: Date.now(),
        size,
        hits: 0
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      store.put(entry);
    });
  }

  async delete(key: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async has(key: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count(IDBKeyRange.only(key));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result > 0);
    });
  }

  async getStats(): Promise<CacheStats> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);

      let entries = 0;
      let totalSize = 0;
      let totalHits = 0;

      const request = store.openCursor();

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor) {
          const entry = cursor.value as CacheEntry<T>;
          entries++;
          totalSize += entry.metadata.size;
          totalHits += entry.metadata.hits;
          cursor.continue();
        } else {
          resolve({
            entries,
            totalSize,
            hitRate: 0, // Would need to track misses separately
            hits: totalHits,
            misses: 0
          });
        }
      };
    });
  }
}

// === CACHE FACTORY ===

export interface CacheInterface<T> {
  get(key: string): Promise<T | null>;
  set(key: string, data: T, size?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): CacheStats | Promise<CacheStats>;
}

export function createCache<T>(config: CacheConfig = {}): CacheInterface<T> {
  const storage = config.storage ?? 'memory';

  if (storage === 'indexeddb' && typeof indexedDB !== 'undefined') {
    return new IndexedDBCache<T>(config);
  }

  return new MemoryCache<T>(config);
}

// === SPECIALIZED CACHES ===

export interface SpriteCache {
  imageData: ImageData;
  blob: Blob;
  timestamp: number;
}

export interface NormalizedTileCache {
  tiles: ImageData[];
  metrics: {
    centroidStddev: number;
    areaDrift: number;
  };
}

export interface PreviewCache {
  webm: Blob;
  duration: number;
  fps: number;
}

// Create singleton caches
export const spriteCache = createCache<SpriteCache>({
  maxEntries: 50,
  maxSize: 200 * 1024 * 1024, // 200MB
  ttl: 3600000 // 1 hour
});

export const tileCache = createCache<NormalizedTileCache>({
  maxEntries: 100,
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 1800000 // 30 minutes
});

export const previewCache = createCache<PreviewCache>({
  maxEntries: 20,
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 3600000 // 1 hour
});

// === CACHE UTILITIES ===

/**
 * Warm up cache with preloaded data
 */
export async function warmCache(
  entries: Array<{ key: string; data: SpriteCache | NormalizedTileCache | PreviewCache; type: 'sprite' | 'tile' | 'preview' }>
): Promise<void> {
  for (const entry of entries) {
    switch (entry.type) {
      case 'sprite':
        await spriteCache.set(entry.key, entry.data as SpriteCache);
        break;
      case 'tile':
        await tileCache.set(entry.key, entry.data as NormalizedTileCache);
        break;
      case 'preview':
        await previewCache.set(entry.key, entry.data as PreviewCache);
        break;
    }
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    spriteCache.clear(),
    tileCache.clear(),
    previewCache.clear()
  ]);
}

/**
 * Get combined cache stats
 */
export async function getCacheStats(): Promise<{
  sprite: CacheStats;
  tile: CacheStats;
  preview: CacheStats;
  total: CacheStats;
}> {
  const [sprite, tile, preview] = await Promise.all([
    spriteCache.getStats(),
    tileCache.getStats(),
    previewCache.getStats()
  ]);

  const spriteStats = sprite instanceof Promise ? await sprite : sprite;
  const tileStats = tile instanceof Promise ? await tile : tile;
  const previewStats = preview instanceof Promise ? await preview : preview;

  return {
    sprite: spriteStats,
    tile: tileStats,
    preview: previewStats,
    total: {
      entries: spriteStats.entries + tileStats.entries + previewStats.entries,
      totalSize: spriteStats.totalSize + tileStats.totalSize + previewStats.totalSize,
      hitRate: (spriteStats.hitRate + tileStats.hitRate + previewStats.hitRate) / 3,
      hits: spriteStats.hits + tileStats.hits + previewStats.hits,
      misses: spriteStats.misses + tileStats.misses + previewStats.misses
    }
  };
}

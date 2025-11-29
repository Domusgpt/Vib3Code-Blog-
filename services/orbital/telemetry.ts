// telemetry.ts — NDJSON telemetry for Orbital AI Studio
// Privacy-safe: no PII, only hashes and metrics

// === TYPES ===

export type TelemetryEventType =
  | 'session_start'
  | 'upload_ingest'
  | 'job_enqueued'
  | 'model_request'
  | 'sprite_received'
  | 'normalize_done'
  | 'viewer_ready'
  | 'export_start'
  | 'export_done'
  | 'cache_hit'
  | 'error';

export interface TelemetryEvent {
  type: TelemetryEventType;
  ts?: number;
  sessionId?: string;
  jobId?: string;
  ring?: number;
  frameIdx?: number;
  cellSize?: number;
  model?: string;
  latencyMs?: number;
  cacheHit?: boolean;
  ok?: boolean;
  errCode?: string;
  device?: string;
  [key: string]: unknown;
}

export interface TelemetryConfig {
  endpoint?: string;
  bufferSize?: number;
  flushIntervalMs?: number;
  enabled?: boolean;
  debug?: boolean;
}

// === TELEMETRY CLASS ===

class TelemetryService {
  private buffer: TelemetryEvent[] = [];
  private sessionId: string;
  private config: Required<TelemetryConfig>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private pendingFlush: Promise<void> | null = null;
  private listeners: Set<(event: TelemetryEvent) => void> = new Set();

  constructor(config: TelemetryConfig = {}) {
    this.sessionId = this.generateSessionId();
    this.config = {
      endpoint: config.endpoint || '',
      bufferSize: config.bufferSize || 100,
      flushIntervalMs: config.flushIntervalMs || 30000,
      enabled: config.enabled ?? true,
      debug: config.debug ?? false
    };

    if (this.config.enabled && this.config.endpoint) {
      this.startFlushTimer();
    }

    // Emit session start
    this.emit({ type: 'session_start' });
  }

  /**
   * Emit a telemetry event
   */
  emit(event: Omit<TelemetryEvent, 'ts' | 'sessionId'>): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      ts: Date.now(),
      sessionId: this.sessionId
    };

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(fullEvent);
      } catch (e) {
        console.error('[Telemetry] Listener error:', e);
      }
    });

    if (this.config.debug) {
      console.log('[Telemetry]', JSON.stringify(fullEvent));
    }

    if (!this.config.enabled) return;

    this.buffer.push(fullEvent);

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /**
   * Subscribe to telemetry events
   */
  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Flush buffer to endpoint
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    if (!this.config.endpoint) {
      // Just clear buffer if no endpoint
      this.buffer = [];
      return;
    }

    // Avoid concurrent flushes
    if (this.pendingFlush) {
      return this.pendingFlush;
    }

    const events = [...this.buffer];
    this.buffer = [];

    this.pendingFlush = this.sendEvents(events);

    try {
      await this.pendingFlush;
    } finally {
      this.pendingFlush = null;
    }
  }

  /**
   * Get buffered events as NDJSON string
   */
  toNDJSON(): string {
    return this.buffer.map(e => JSON.stringify(e)).join('\n');
  }

  /**
   * Get all events since session start
   */
  getEvents(): TelemetryEvent[] {
    return [...this.buffer];
  }

  /**
   * Export events to downloadable NDJSON file
   */
  exportToFile(): void {
    const ndjson = this.toNDJSON();
    const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `orbital-telemetry-${this.sessionId}.ndjson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Configure telemetry
   */
  configure(config: Partial<TelemetryConfig>): void {
    Object.assign(this.config, config);

    if (this.config.enabled && this.config.endpoint && !this.flushTimer) {
      this.startFlushTimer();
    } else if (!this.config.enabled && this.flushTimer) {
      this.stopFlushTimer();
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush();
    this.listeners.clear();
  }

  // === PRIVATE ===

  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    if (!this.config.endpoint) return;

    const ndjson = events.map(e => JSON.stringify(e)).join('\n');

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson'
        },
        body: ndjson
      });

      if (!response.ok) {
        console.warn('[Telemetry] Failed to send events:', response.status);
        // Re-add failed events to buffer
        this.buffer.unshift(...events);
      }
    } catch (error) {
      console.warn('[Telemetry] Network error:', error);
      // Re-add failed events to buffer
      this.buffer.unshift(...events);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `ses_${timestamp}_${random}`;
  }
}

// === SINGLETON INSTANCE ===

export const telemetry = new TelemetryService({
  debug: typeof window !== 'undefined' && window.location.hostname === 'localhost',
  enabled: true
});

// === HELPER FUNCTIONS ===

/**
 * Create scoped telemetry for a job
 */
export function createJobTelemetry(jobId: string) {
  return {
    emit: (event: Omit<TelemetryEvent, 'ts' | 'sessionId' | 'jobId'>) => {
      telemetry.emit({ ...event, jobId });
    }
  };
}

/**
 * Measure and emit latency for an async operation
 */
export async function measureLatency<T>(
  type: TelemetryEventType,
  fn: () => Promise<T>,
  extra: Partial<TelemetryEvent> = {}
): Promise<T> {
  const start = performance.now();
  let ok = true;
  let errCode: string | undefined;

  try {
    return await fn();
  } catch (error) {
    ok = false;
    errCode = (error as Error).name;
    throw error;
  } finally {
    const latencyMs = performance.now() - start;
    telemetry.emit({
      type,
      latencyMs,
      ok,
      errCode,
      ...extra
    });
  }
}

// === KPI TRACKING ===

export interface KPIMetrics {
  centroidStddev: number;
  areaDrift: number;
  postProcMs: number;
  modelCalls: number;
}

const kpiBuffer: KPIMetrics[] = [];

export function recordKPI(metrics: KPIMetrics): void {
  kpiBuffer.push(metrics);

  telemetry.emit({
    type: 'normalize_done',
    centroidStddev: metrics.centroidStddev,
    areaDrift: metrics.areaDrift,
    postProcMs: metrics.postProcMs,
    modelCalls: metrics.modelCalls,
    ok: metrics.centroidStddev < 0.5 && metrics.areaDrift < 2.5
  });
}

export function getKPIStats(): {
  p50: Partial<KPIMetrics>;
  p95: Partial<KPIMetrics>;
  avg: Partial<KPIMetrics>;
} {
  if (kpiBuffer.length === 0) {
    return { p50: {}, p95: {}, avg: {} };
  }

  const sorted = {
    centroidStddev: [...kpiBuffer].sort((a, b) => a.centroidStddev - b.centroidStddev),
    areaDrift: [...kpiBuffer].sort((a, b) => a.areaDrift - b.areaDrift),
    postProcMs: [...kpiBuffer].sort((a, b) => a.postProcMs - b.postProcMs),
    modelCalls: [...kpiBuffer].sort((a, b) => a.modelCalls - b.modelCalls)
  };

  const p50Idx = Math.floor(kpiBuffer.length * 0.5);
  const p95Idx = Math.floor(kpiBuffer.length * 0.95);

  return {
    p50: {
      centroidStddev: sorted.centroidStddev[p50Idx]?.centroidStddev,
      areaDrift: sorted.areaDrift[p50Idx]?.areaDrift,
      postProcMs: sorted.postProcMs[p50Idx]?.postProcMs,
      modelCalls: sorted.modelCalls[p50Idx]?.modelCalls
    },
    p95: {
      centroidStddev: sorted.centroidStddev[p95Idx]?.centroidStddev,
      areaDrift: sorted.areaDrift[p95Idx]?.areaDrift,
      postProcMs: sorted.postProcMs[p95Idx]?.postProcMs,
      modelCalls: sorted.modelCalls[p95Idx]?.modelCalls
    },
    avg: {
      centroidStddev: kpiBuffer.reduce((sum, k) => sum + k.centroidStddev, 0) / kpiBuffer.length,
      areaDrift: kpiBuffer.reduce((sum, k) => sum + k.areaDrift, 0) / kpiBuffer.length,
      postProcMs: kpiBuffer.reduce((sum, k) => sum + k.postProcMs, 0) / kpiBuffer.length,
      modelCalls: kpiBuffer.reduce((sum, k) => sum + k.modelCalls, 0) / kpiBuffer.length
    }
  };
}

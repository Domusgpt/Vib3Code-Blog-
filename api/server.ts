// server.ts — HTTP API server for Orbital AI Studio
// Endpoints: POST /v1/jobs, GET /v1/jobs/:id, POST /v1/jobs/:id/cancel, GET /v1/health
// Supports idempotency headers and webhook callbacks

import type { SpriteParams } from '../services/orbital/geminiService';
import type { RingConfig } from '../services/orbital/orbitSprite';

// === TYPES ===

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobRequest {
  inputs: {
    front_uri: string;
    back_uri: string;
  };
  params: {
    frames?: 12 | 24 | 36;
    cell?: 176 | 312 | 584;
    dualSprite?: boolean;
    rings?: number[];
    seed?: number;
  };
  callback_url?: string;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  created_at: number;
  updated_at: number;
  inputs: JobRequest['inputs'];
  params: JobRequest['params'];
  artifacts?: {
    manifest_url?: string;
    zip_url?: string;
    preview_url?: string;
    sheets?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
  progress?: {
    stage: string;
    percent: number;
  };
  callback_url?: string;
  idempotency_key?: string;
}

export interface WebhookPayload {
  event: 'job.completed' | 'job.failed' | 'job.progress';
  job: Job;
  timestamp: number;
}

// === IN-MEMORY JOB STORE ===
// In production, this would be Redis/PostgreSQL

const jobs = new Map<string, Job>();
const idempotencyKeys = new Map<string, string>(); // key -> job_id

// === JOB QUEUE ===
// Simple in-process queue; plug in Redis/RabbitMQ/SQS in production

type QueuedJob = {
  jobId: string;
  priority: number;
  enqueued: number;
};

const jobQueue: QueuedJob[] = [];
let isProcessing = false;

// === ULID GENERATOR ===

function generateUlid(): string {
  const timestamp = Date.now().toString(36).padStart(10, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
  return `${timestamp}${random}`.toUpperCase();
}

// === HMAC FOR WEBHOOKS ===

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// === API HANDLERS ===

export interface ApiContext {
  req: Request;
  params?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * POST /v1/jobs - Create a new job
 */
export async function createJob(ctx: ApiContext): Promise<ApiResponse> {
  const idempotencyKey = ctx.req.headers.get('Idempotency-Key');

  // Check idempotency
  if (idempotencyKey) {
    const existingJobId = idempotencyKeys.get(idempotencyKey);
    if (existingJobId) {
      const existingJob = jobs.get(existingJobId);
      if (existingJob) {
        return {
          status: 200,
          body: { job_id: existingJobId, status: existingJob.status }
        };
      }
    }
  }

  // Parse request body
  let body: JobRequest;
  try {
    body = await ctx.req.json();
  } catch (e) {
    return {
      status: 400,
      body: { error: 'Invalid JSON body' }
    };
  }

  // Validate inputs
  if (!body.inputs?.front_uri || !body.inputs?.back_uri) {
    return {
      status: 400,
      body: { error: 'Missing required inputs: front_uri, back_uri' }
    };
  }

  // Create job
  const jobId = generateUlid();
  const now = Date.now();

  const job: Job = {
    job_id: jobId,
    status: 'queued',
    created_at: now,
    updated_at: now,
    inputs: body.inputs,
    params: {
      frames: body.params?.frames || 12,
      cell: body.params?.cell || 176,
      dualSprite: body.params?.dualSprite || false,
      rings: body.params?.rings || [0],
      seed: body.params?.seed
    },
    callback_url: body.callback_url,
    idempotency_key: idempotencyKey || undefined,
    progress: {
      stage: 'queued',
      percent: 0
    }
  };

  // Store job
  jobs.set(jobId, job);
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, jobId);
  }

  // Queue for processing
  jobQueue.push({
    jobId,
    priority: 0,
    enqueued: now
  });

  // Start processing if not already running
  processQueue();

  return {
    status: 201,
    body: { job_id: jobId },
    headers: {
      'Location': `/v1/jobs/${jobId}`
    }
  };
}

/**
 * GET /v1/jobs/:id - Get job status
 */
export async function getJob(ctx: ApiContext): Promise<ApiResponse> {
  const jobId = ctx.params?.id;

  if (!jobId) {
    return {
      status: 400,
      body: { error: 'Missing job ID' }
    };
  }

  const job = jobs.get(jobId);

  if (!job) {
    return {
      status: 404,
      body: { error: 'Job not found' }
    };
  }

  return {
    status: 200,
    body: job
  };
}

/**
 * POST /v1/jobs/:id/cancel - Cancel a job
 */
export async function cancelJob(ctx: ApiContext): Promise<ApiResponse> {
  const jobId = ctx.params?.id;

  if (!jobId) {
    return {
      status: 400,
      body: { error: 'Missing job ID' }
    };
  }

  const job = jobs.get(jobId);

  if (!job) {
    return {
      status: 404,
      body: { error: 'Job not found' }
    };
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return {
      status: 400,
      body: { error: 'Cannot cancel completed or failed job' }
    };
  }

  // Update job status
  job.status = 'cancelled';
  job.updated_at = Date.now();

  // Remove from queue
  const queueIndex = jobQueue.findIndex(q => q.jobId === jobId);
  if (queueIndex !== -1) {
    jobQueue.splice(queueIndex, 1);
  }

  return {
    status: 200,
    body: { job_id: jobId, status: 'cancelled' }
  };
}

/**
 * GET /v1/health - Health check
 */
export async function healthCheck(_ctx: ApiContext): Promise<ApiResponse> {
  return {
    status: 200,
    body: {
      status: 'healthy',
      timestamp: Date.now(),
      queue_length: jobQueue.length,
      jobs_total: jobs.size
    }
  };
}

// === JOB PROCESSING ===

async function processQueue(): Promise<void> {
  if (isProcessing || jobQueue.length === 0) return;

  isProcessing = true;

  while (jobQueue.length > 0) {
    // Sort by priority and enqueue time
    jobQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.enqueued - b.enqueued;
    });

    const queued = jobQueue.shift();
    if (!queued) break;

    const job = jobs.get(queued.jobId);
    if (!job || job.status === 'cancelled') continue;

    await processJob(job);
  }

  isProcessing = false;
}

async function processJob(job: Job): Promise<void> {
  try {
    // Update status
    job.status = 'processing';
    job.updated_at = Date.now();
    job.progress = { stage: 'fetching_inputs', percent: 10 };

    await sendWebhook(job, 'job.progress');

    // Simulate processing stages
    // In production, this would call geminiService.requestGeneration

    // Stage 1: Fetch inputs
    job.progress = { stage: 'generating_sprite', percent: 30 };
    job.updated_at = Date.now();
    await sendWebhook(job, 'job.progress');

    // Simulate API delay
    await sleep(2000);

    // Stage 2: Generate sprite
    job.progress = { stage: 'normalizing', percent: 60 };
    job.updated_at = Date.now();
    await sendWebhook(job, 'job.progress');

    await sleep(1000);

    // Stage 3: Normalize
    job.progress = { stage: 'exporting', percent: 80 };
    job.updated_at = Date.now();
    await sendWebhook(job, 'job.progress');

    await sleep(500);

    // Stage 4: Export
    job.progress = { stage: 'complete', percent: 100 };
    job.status = 'completed';
    job.updated_at = Date.now();

    // Mock artifacts
    job.artifacts = {
      manifest_url: `/artifacts/${job.job_id}/manifest.json`,
      zip_url: `/artifacts/${job.job_id}/orbital.zip`,
      preview_url: `/artifacts/${job.job_id}/preview.webm`,
      sheets: [`/artifacts/${job.job_id}/sheet_000.png`]
    };

    await sendWebhook(job, 'job.completed');

  } catch (error) {
    job.status = 'failed';
    job.updated_at = Date.now();
    job.error = {
      code: 'PROCESSING_ERROR',
      message: (error as Error).message
    };

    await sendWebhook(job, 'job.failed');
  }
}

async function sendWebhook(job: Job, event: WebhookPayload['event']): Promise<void> {
  if (!job.callback_url) return;

  const payload: WebhookPayload = {
    event,
    job,
    timestamp: Date.now()
  };

  const body = JSON.stringify(payload);

  // Generate HMAC signature (using job_id as secret for demo)
  const signature = await createHmacSignature(body, job.job_id);

  // Retry with exponential backoff
  const maxRetries = 3;
  let delay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(job.callback_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Orbital-Signature': signature,
          'X-Orbital-Event': event
        },
        body
      });

      if (response.ok) return;

      console.warn(`[Webhook] Attempt ${attempt + 1} failed: ${response.status}`);
    } catch (error) {
      console.warn(`[Webhook] Attempt ${attempt + 1} error:`, error);
    }

    await sleep(delay);
    delay *= 2;
  }

  console.error(`[Webhook] Failed to deliver after ${maxRetries} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === ROUTER ===

export interface Route {
  method: string;
  pattern: RegExp;
  handler: (ctx: ApiContext) => Promise<ApiResponse>;
  paramNames: string[];
}

const routes: Route[] = [
  {
    method: 'POST',
    pattern: /^\/v1\/jobs$/,
    handler: createJob,
    paramNames: []
  },
  {
    method: 'GET',
    pattern: /^\/v1\/jobs\/([^/]+)$/,
    handler: getJob,
    paramNames: ['id']
  },
  {
    method: 'POST',
    pattern: /^\/v1\/jobs\/([^/]+)\/cancel$/,
    handler: cancelJob,
    paramNames: ['id']
  },
  {
    method: 'GET',
    pattern: /^\/v1\/health$/,
    handler: healthCheck,
    paramNames: []
  }
];

/**
 * Route a request to the appropriate handler
 */
export async function routeRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Find matching route
  for (const route of routes) {
    if (route.method !== method) continue;

    const match = path.match(route.pattern);
    if (!match) continue;

    // Extract params
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });

    // Call handler
    const ctx: ApiContext = { req, params };
    const response = await route.handler(ctx);

    // Build response
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...response.headers
    });

    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers
    });
  }

  // 404 Not Found
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// === RATE LIMITING ===

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per minute

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// === EXPORTS ===

export const api = {
  createJob,
  getJob,
  cancelJob,
  healthCheck,
  routeRequest,
  checkRateLimit
};

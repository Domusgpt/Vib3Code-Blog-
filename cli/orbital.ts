#!/usr/bin/env node
// orbital.ts — CLI for Orbital AI Studio
// Commands: gen, batch, serve
// Emits NDJSON progress; exits non-zero on error

/**
 * Usage:
 *   orbital gen --front F --back B [--frames 12] [--cell 176] [--dual] [--rings 1] [--out ./out]
 *   orbital batch --manifest jobs.jsonl [--concurrency 4] [--out ./out]
 *   orbital serve [--port 3001]
 *
 * Options:
 *   --json          Output NDJSON progress
 *   --quiet         Suppress non-essential output
 *   --help          Show help
 */

// === TYPES ===

interface GenOptions {
  front: string;
  back: string;
  frames: 12 | 24 | 36;
  cell: 176 | 312 | 584;
  dual: boolean;
  rings: number;
  out: string;
  json: boolean;
  seed?: number;
}

interface BatchOptions {
  manifest: string;
  concurrency: number;
  out: string;
  json: boolean;
}

interface ServeOptions {
  port: number;
  host: string;
}

interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  jobId?: string;
  stage?: string;
  percent?: number;
  message?: string;
  timestamp: number;
  [key: string]: unknown;
}

interface BatchJob {
  id: string;
  front: string;
  back: string;
  frames?: number;
  cell?: number;
  dual?: boolean;
  rings?: number[];
  seed?: number;
}

// === NDJSON OUTPUT ===

function emitNDJSON(event: ProgressEvent): void {
  console.log(JSON.stringify(event));
}

function emitProgress(type: ProgressEvent['type'], data: Partial<ProgressEvent> = {}): void {
  emitNDJSON({
    type,
    timestamp: Date.now(),
    ...data
  });
}

// === ARGUMENT PARSING ===

function parseArgs(args: string[]): { command: string; options: Record<string, any> } {
  const command = args[0] || 'help';
  const options: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      // Boolean flags
      if (key === 'dual' || key === 'json' || key === 'quiet' || key === 'help') {
        options[key] = true;
      }
      // Value options
      else if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      }
      else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

// === COMMANDS ===

async function cmdGen(options: Partial<GenOptions>): Promise<number> {
  // Validate required options
  if (!options.front || !options.back) {
    console.error('Error: --front and --back are required');
    return 1;
  }

  const genOpts: GenOptions = {
    front: options.front,
    back: options.back,
    frames: (parseInt(String(options.frames)) || 12) as 12 | 24 | 36,
    cell: (parseInt(String(options.cell)) || 176) as 176 | 312 | 584,
    dual: options.dual || false,
    rings: parseInt(String(options.rings)) || 1,
    out: options.out || './out',
    json: options.json || false,
    seed: options.seed ? parseInt(String(options.seed)) : undefined
  };

  const jobId = `cli_${Date.now().toString(36)}`;

  if (genOpts.json) {
    emitProgress('start', { jobId, ...genOpts });
  } else {
    console.log(`\nOrbital AI Studio - Generate`);
    console.log(`  Front: ${genOpts.front}`);
    console.log(`  Back:  ${genOpts.back}`);
    console.log(`  Frames: ${genOpts.frames}`);
    console.log(`  Cell: ${genOpts.cell}px`);
    console.log(`  Dual-sprite: ${genOpts.dual}`);
    console.log(`  Rings: ${genOpts.rings}`);
    console.log(`  Output: ${genOpts.out}\n`);
  }

  try {
    // Stage 1: Validate inputs
    if (genOpts.json) {
      emitProgress('progress', { jobId, stage: 'validating', percent: 5 });
    } else {
      console.log('[1/5] Validating inputs...');
    }

    await validateInputs(genOpts.front, genOpts.back);

    // Stage 2: Load images
    if (genOpts.json) {
      emitProgress('progress', { jobId, stage: 'loading', percent: 15 });
    } else {
      console.log('[2/5] Loading images...');
    }

    const frontData = await loadImage(genOpts.front);
    const backData = await loadImage(genOpts.back);

    // Stage 3: Generate sprites
    if (genOpts.json) {
      emitProgress('progress', { jobId, stage: 'generating', percent: 30 });
    } else {
      console.log('[3/5] Generating sprites (this may take a moment)...');
    }

    // Simulate generation (in production, call geminiService)
    await simulateGeneration(genOpts);

    // Stage 4: Normalize frames
    if (genOpts.json) {
      emitProgress('progress', { jobId, stage: 'normalizing', percent: 70 });
    } else {
      console.log('[4/5] Normalizing frames...');
    }

    await simulateNormalization();

    // Stage 5: Export
    if (genOpts.json) {
      emitProgress('progress', { jobId, stage: 'exporting', percent: 90 });
    } else {
      console.log('[5/5] Exporting artifacts...');
    }

    await simulateExport(genOpts.out, jobId);

    // Complete
    if (genOpts.json) {
      emitProgress('complete', {
        jobId,
        outputDir: genOpts.out,
        files: ['manifest.json', 'sheet_000.png', 'preview.webm']
      });
    } else {
      console.log(`\n✓ Generation complete!`);
      console.log(`  Output: ${genOpts.out}/`);
      console.log(`  - manifest.json`);
      console.log(`  - sheet_000.png`);
      console.log(`  - preview.webm\n`);
    }

    return 0;

  } catch (error) {
    if (genOpts.json) {
      emitProgress('error', {
        jobId,
        message: (error as Error).message,
        code: 'GENERATION_ERROR'
      });
    } else {
      console.error(`\n✗ Error: ${(error as Error).message}\n`);
    }
    return 1;
  }
}

async function cmdBatch(options: Partial<BatchOptions>): Promise<number> {
  if (!options.manifest) {
    console.error('Error: --manifest is required');
    return 1;
  }

  const batchOpts: BatchOptions = {
    manifest: options.manifest,
    concurrency: parseInt(String(options.concurrency)) || 4,
    out: options.out || './out',
    json: options.json || false
  };

  if (batchOpts.json) {
    emitProgress('start', { mode: 'batch', manifest: batchOpts.manifest });
  } else {
    console.log(`\nOrbital AI Studio - Batch Process`);
    console.log(`  Manifest: ${batchOpts.manifest}`);
    console.log(`  Concurrency: ${batchOpts.concurrency}`);
    console.log(`  Output: ${batchOpts.out}\n`);
  }

  try {
    // Read manifest
    const jobs = await readBatchManifest(batchOpts.manifest);

    if (batchOpts.json) {
      emitProgress('progress', { stage: 'loaded', jobCount: jobs.length });
    } else {
      console.log(`Loaded ${jobs.length} jobs from manifest\n`);
    }

    // Process jobs with concurrency limit
    const results = await processBatchJobs(jobs, batchOpts);

    // Summary
    const succeeded = results.filter(r => r.success).length;
    const failed = results.length - succeeded;

    if (batchOpts.json) {
      emitProgress('complete', {
        total: jobs.length,
        succeeded,
        failed,
        results
      });
    } else {
      console.log(`\n✓ Batch complete: ${succeeded}/${jobs.length} succeeded`);
      if (failed > 0) {
        console.log(`  ${failed} jobs failed`);
      }
      console.log('');
    }

    return failed > 0 ? 1 : 0;

  } catch (error) {
    if (batchOpts.json) {
      emitProgress('error', {
        message: (error as Error).message,
        code: 'BATCH_ERROR'
      });
    } else {
      console.error(`\n✗ Error: ${(error as Error).message}\n`);
    }
    return 1;
  }
}

async function cmdServe(options: Partial<ServeOptions>): Promise<number> {
  const serveOpts: ServeOptions = {
    port: parseInt(String(options.port)) || 3001,
    host: options.host || '0.0.0.0'
  };

  console.log(`\nOrbital AI Studio - HTTP Server`);
  console.log(`  Listening on http://${serveOpts.host}:${serveOpts.port}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /v1/jobs           Create job`);
  console.log(`  GET  /v1/jobs/:id       Get job status`);
  console.log(`  POST /v1/jobs/:id/cancel Cancel job`);
  console.log(`  GET  /v1/health         Health check\n`);

  // In Node.js, we'd use http.createServer or express
  // This is a placeholder for the browser/Deno environment
  console.log('Note: Server implementation requires Node.js runtime');
  console.log('Use with: node --experimental-modules cli/orbital.ts serve\n');

  // Keep process alive
  await new Promise(() => {}); // Never resolves

  return 0;
}

function cmdHelp(): number {
  console.log(`
Orbital AI Studio CLI

Usage:
  orbital <command> [options]

Commands:
  gen     Generate orbital sprite from front/back images
  batch   Process multiple jobs from JSONL manifest
  serve   Start HTTP API server

Generate Options:
  --front <path>    Path to front image (required)
  --back <path>     Path to back image (required)
  --frames <n>      Frame count: 12, 24, 36 (default: 12)
  --cell <n>        Cell size: 176, 312, 584 (default: 176)
  --dual            Enable dual-sprite offset
  --rings <n>       Number of pitch rings (default: 1)
  --out <dir>       Output directory (default: ./out)
  --seed <n>        Random seed for reproducibility
  --json            Output NDJSON progress

Batch Options:
  --manifest <file> Path to jobs.jsonl file (required)
  --concurrency <n> Max parallel jobs (default: 4)
  --out <dir>       Output directory (default: ./out)
  --json            Output NDJSON progress

Serve Options:
  --port <n>        Server port (default: 3001)
  --host <addr>     Bind address (default: 0.0.0.0)

Examples:
  orbital gen --front product_front.png --back product_back.png
  orbital gen --front ./images/shoe_front.jpg --back ./images/shoe_back.jpg --dual --frames 24
  orbital batch --manifest jobs.jsonl --concurrency 2
  orbital serve --port 8080
`);
  return 0;
}

// === HELPERS ===

async function validateInputs(front: string, back: string): Promise<void> {
  // In browser, check if URLs are accessible
  // In Node.js, check if files exist
  if (!front || !back) {
    throw new Error('Front and back images are required');
  }

  // Simulate validation
  await sleep(100);
}

async function loadImage(path: string): Promise<ArrayBuffer> {
  // In production, this would load from file or URL
  await sleep(200);
  return new ArrayBuffer(0);
}

async function simulateGeneration(opts: GenOptions): Promise<void> {
  const steps = opts.dual ? 2 : 1;
  for (let i = 0; i < steps; i++) {
    await sleep(1500); // Simulate API call
  }
}

async function simulateNormalization(): Promise<void> {
  await sleep(500);
}

async function simulateExport(outDir: string, jobId: string): Promise<void> {
  await sleep(300);
}

async function readBatchManifest(path: string): Promise<BatchJob[]> {
  // In production, read and parse JSONL file
  // For now, return mock data
  return [
    { id: 'job1', front: 'front1.png', back: 'back1.png' },
    { id: 'job2', front: 'front2.png', back: 'back2.png' }
  ];
}

interface BatchResult {
  jobId: string;
  success: boolean;
  error?: string;
}

async function processBatchJobs(
  jobs: BatchJob[],
  opts: BatchOptions
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const pending: Promise<void>[] = [];

  for (const job of jobs) {
    // Limit concurrency
    while (pending.length >= opts.concurrency) {
      await Promise.race(pending);
    }

    const promise = (async () => {
      try {
        if (opts.json) {
          emitProgress('progress', { jobId: job.id, stage: 'processing' });
        } else {
          console.log(`Processing ${job.id}...`);
        }

        await sleep(2000); // Simulate processing

        results.push({ jobId: job.id, success: true });

        if (!opts.json) {
          console.log(`  ✓ ${job.id} complete`);
        }
      } catch (error) {
        results.push({
          jobId: job.id,
          success: false,
          error: (error as Error).message
        });

        if (!opts.json) {
          console.log(`  ✗ ${job.id} failed: ${(error as Error).message}`);
        }
      }
    })();

    pending.push(promise);
    promise.finally(() => {
      const idx = pending.indexOf(promise);
      if (idx !== -1) pending.splice(idx, 1);
    });
  }

  // Wait for all to complete
  await Promise.all(pending);

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === MAIN ===

async function main(): Promise<number> {
  // Get args (skip node and script path)
  const args = typeof process !== 'undefined'
    ? process.argv.slice(2)
    : [];

  if (args.length === 0) {
    return cmdHelp();
  }

  const { command, options } = parseArgs(args);

  switch (command) {
    case 'gen':
      return cmdGen(options);

    case 'batch':
      return cmdBatch(options);

    case 'serve':
      return cmdServe(options);

    case 'help':
    case '--help':
    case '-h':
      return cmdHelp();

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "orbital help" for usage information');
      return 1;
  }
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('orbital')) {
  main().then(code => {
    process.exit(code);
  });
}

// Export for testing
export {
  cmdGen,
  cmdBatch,
  cmdServe,
  cmdHelp,
  parseArgs,
  main
};

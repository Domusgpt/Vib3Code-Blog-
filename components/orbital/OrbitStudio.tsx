// OrbitStudio.tsx — Main UI page for Orbital AI Studio
// Modes: Fast (12×312), Pro (12×584), Smooth (dual-sprite 24/36)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { OrbitViewer, type OrbitController2D } from './OrbitViewer';
import {
  MODE_CONFIGS,
  type OrbitalMode,
  parseURLState,
  updateURLState,
  GEN_CELL,
  DISP_CELL
} from '../../services/orbital/orbitSprite';
import { geminiService, type SpriteSheet } from '../../services/orbital/geminiService';
import { normalizeSprite, type NormalizedFrame } from '../../services/orbital/normalize';
import { orbitalExport } from '../../services/orbital/export';
import { telemetry } from '../../services/orbital/telemetry';

// === TYPES ===

interface OrbitStudioProps {
  className?: string;
}

type StudioState = 'idle' | 'uploading' | 'generating' | 'normalizing' | 'ready' | 'error';

// === COMPONENT ===

export function OrbitStudio({ className }: OrbitStudioProps) {
  // State
  const [state, setState] = useState<StudioState>('idle');
  const [mode, setMode] = useState<OrbitalMode>('fast');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [frames, setFrames] = useState<ImageData[]>([]);
  const [progress, setProgress] = useState({ stage: '', percent: 0 });
  const [error, setError] = useState<string>('');

  // Refs
  const controllerRef = useRef<OrbitController2D | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Load URL state on mount
  useEffect(() => {
    const urlState = parseURLState();
    if (urlState.mode) {
      setMode(urlState.mode);
    }
  }, []);

  // Update URL when mode changes
  useEffect(() => {
    updateURLState({ mode });
  }, [mode]);

  // === HANDLERS ===

  const handleFrontSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleBackSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'front' | 'back') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (type === 'front') {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!frontImage || !backImage) {
      setError('Please select both front and back images');
      return;
    }

    setState('generating');
    setError('');
    setProgress({ stage: 'Preparing...', percent: 5 });

    telemetry.emit({
      type: 'job_enqueued',
      mode,
      frontSize: frontImage.size,
      backSize: backImage.size
    });

    try {
      const config = MODE_CONFIGS[mode];

      // Stage 1: Generate sprite
      setProgress({ stage: 'Generating sprite...', percent: 20 });

      const result = await geminiService.requestGeneration(
        frontImage,
        backImage,
        {
          frames: config.frames as 12 | 24 | 36,
          cell: GEN_CELL as 176 | 312 | 584,
          ringPitchDeg: 0,
          dualOffset: config.dualSprite
        }
      );

      // Stage 2: Normalize frames
      setState('normalizing');
      setProgress({ stage: 'Normalizing frames...', percent: 60 });

      const normalizedFrames: ImageData[] = [];

      for (const sheet of result.sheets) {
        const normalized = await normalizeSprite(sheet.imageData);

        // Verify KPIs
        if (normalized.metrics.centroidStddev > 0.5) {
          console.warn('[OrbitStudio] Centroid stddev exceeds threshold:', normalized.metrics.centroidStddev);
        }
        if (normalized.metrics.areaDrift > 2.5) {
          console.warn('[OrbitStudio] Area drift exceeds threshold:', normalized.metrics.areaDrift);
        }

        normalizedFrames.push(...normalized.frames.map(f => f.imageData));
      }

      setProgress({ stage: 'Ready!', percent: 100 });
      setFrames(normalizedFrames);
      setState('ready');

      telemetry.emit({
        type: 'viewer_ready',
        mode,
        frameCount: normalizedFrames.length
      });

    } catch (err) {
      setState('error');
      setError((err as Error).message);

      telemetry.emit({
        type: 'error',
        errCode: 'GENERATION_ERROR',
        message: (err as Error).message
      });
    }
  }, [frontImage, backImage, mode]);

  const handleExportZip = useCallback(async () => {
    if (frames.length === 0) return;

    telemetry.emit({ type: 'export_start', format: 'zip' });

    try {
      // Create mock sprite sheets from frames
      const sheets: SpriteSheet[] = [{
        imageData: frames[0],
        blob: await imageDataToBlob(frames[0]),
        url: '',
        params: {
          frames: 12,
          cell: GEN_CELL as 176 | 312 | 584,
          ringPitchDeg: 0
        },
        timestamp: Date.now()
      }];

      const result = await orbitalExport.toZip(sheets, {
        jobId: `export_${Date.now().toString(36)}`,
        timestamp: Date.now(),
        params: {
          frames: MODE_CONFIGS[mode].frames as 12 | 24 | 36,
          cell: GEN_CELL as 176 | 312 | 584,
          ringPitchDeg: 0
        },
        rings: [{ phi: 0, sheets: 1 }],
        sheets: []
      }, { includePreview: true });

      orbitalExport.download(result.blob, result.filename);

      telemetry.emit({ type: 'export_done', format: 'zip', sizeBytes: result.blob.size });
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    }
  }, [frames, mode]);

  const handleExportWebM = useCallback(async () => {
    if (frames.length === 0) return;

    telemetry.emit({ type: 'export_start', format: 'webm' });

    try {
      const sheets: SpriteSheet[] = [{
        imageData: frames[0],
        blob: await imageDataToBlob(frames[0]),
        url: '',
        params: {
          frames: 12,
          cell: GEN_CELL as 176 | 312 | 584,
          ringPitchDeg: 0
        },
        timestamp: Date.now()
      }];

      const preview = await orbitalExport.generatePreview(sheets);
      orbitalExport.download(preview, `orbital_preview_${Date.now().toString(36)}.webm`);

      telemetry.emit({ type: 'export_done', format: 'webm', sizeBytes: preview.size });
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    }
  }, [frames]);

  const handleReset = useCallback(() => {
    setState('idle');
    setFrontImage(null);
    setBackImage(null);
    setFrontPreview('');
    setBackPreview('');
    setFrames([]);
    setProgress({ stage: '', percent: 0 });
    setError('');
  }, []);

  // === RENDER ===

  return (
    <div className={`orbit-studio ${className || ''}`} style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Orbital AI Studio</h1>
        <p style={styles.subtitle}>Generate 360° product views from front/back images</p>
      </header>

      {/* Mode Selector */}
      <div style={styles.modeSelector}>
        {(['fast', 'pro', 'smooth'] as OrbitalMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              ...styles.modeButton,
              ...(mode === m ? styles.modeButtonActive : {})
            }}
          >
            <span style={styles.modeName}>{m.toUpperCase()}</span>
            <span style={styles.modeDesc}>
              {m === 'fast' && '12 frames, quick'}
              {m === 'pro' && '12 frames, high-res'}
              {m === 'smooth' && '24 frames, dual-sprite'}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {state === 'idle' && (
          <div style={styles.uploadSection}>
            {/* Front Image */}
            <div
              style={{
                ...styles.uploadBox,
                ...(frontPreview ? styles.uploadBoxWithPreview : {})
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'front')}
              onClick={() => frontInputRef.current?.click()}
            >
              {frontPreview ? (
                <img src={frontPreview} alt="Front" style={styles.preview} />
              ) : (
                <>
                  <div style={styles.uploadIcon}>📷</div>
                  <p style={styles.uploadLabel}>Front View</p>
                  <p style={styles.uploadHint}>Click or drag to upload</p>
                </>
              )}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                onChange={handleFrontSelect}
                style={styles.hiddenInput}
              />
            </div>

            {/* Back Image */}
            <div
              style={{
                ...styles.uploadBox,
                ...(backPreview ? styles.uploadBoxWithPreview : {})
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'back')}
              onClick={() => backInputRef.current?.click()}
            >
              {backPreview ? (
                <img src={backPreview} alt="Back" style={styles.preview} />
              ) : (
                <>
                  <div style={styles.uploadIcon}>📷</div>
                  <p style={styles.uploadLabel}>Back View</p>
                  <p style={styles.uploadHint}>Click or drag to upload</p>
                </>
              )}
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackSelect}
                style={styles.hiddenInput}
              />
            </div>
          </div>
        )}

        {(state === 'generating' || state === 'normalizing') && (
          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress.percent}%`
                }}
              />
            </div>
            <p style={styles.progressText}>{progress.stage}</p>
          </div>
        )}

        {state === 'ready' && frames.length > 0 && (
          <div style={styles.viewerSection}>
            <OrbitViewer
              frames={frames}
              width={584}
              height={438}
              autoPlay={true}
              enableShadow={true}
              enableZoom={true}
              enableDrag={true}
              onReady={(ctrl) => {
                controllerRef.current = ctrl;
              }}
              style={styles.viewer}
            />
          </div>
        )}

        {state === 'error' && (
          <div style={styles.errorSection}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {state === 'idle' && (
          <button
            onClick={handleGenerate}
            disabled={!frontImage || !backImage}
            style={{
              ...styles.primaryButton,
              ...(!frontImage || !backImage ? styles.buttonDisabled : {})
            }}
          >
            Generate 360° View
          </button>
        )}

        {state === 'ready' && (
          <>
            <button onClick={handleExportZip} style={styles.secondaryButton}>
              Export ZIP
            </button>
            <button onClick={handleExportWebM} style={styles.secondaryButton}>
              Export WebM
            </button>
            <button onClick={handleReset} style={styles.tertiaryButton}>
              Start Over
            </button>
          </>
        )}

        {state === 'error' && (
          <button onClick={handleReset} style={styles.primaryButton}>
            Try Again
          </button>
        )}
      </div>

      {/* GSAP Integration Example */}
      <div style={styles.codeSection}>
        <h3 style={styles.codeTitle}>GSAP Integration</h3>
        <pre style={styles.codeBlock}>
{`const tl = gsap.timeline({ scrollTrigger: { scrub: true } });
tl.to({}, { duration: 1, onUpdate() {
  const p = tl.progress();
  controller.setYaw(p * 360);
  controller.setPitch(Math.sin(p * Math.PI) * 15);
}});`}
        </pre>
      </div>
    </div>
  );
}

// === HELPERS ===

async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

// === STYLES ===

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e0e0e0',
    backgroundColor: '#0a0a0f'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem'
  },
  subtitle: {
    color: '#888',
    fontSize: '1.1rem'
  },
  modeSelector: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  modeButton: {
    padding: '1rem 1.5rem',
    border: '1px solid #333',
    borderRadius: '12px',
    background: '#111',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const
  },
  modeButtonActive: {
    borderColor: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.1)'
  },
  modeName: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '0.25rem'
  },
  modeDesc: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#666'
  },
  main: {
    minHeight: '400px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadSection: {
    display: 'flex',
    gap: '2rem',
    justifyContent: 'center'
  },
  uploadBox: {
    width: '240px',
    height: '240px',
    border: '2px dashed #333',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    overflow: 'hidden'
  },
  uploadBoxWithPreview: {
    border: '2px solid #8b5cf6'
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem'
  },
  uploadLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '0.25rem'
  },
  uploadHint: {
    fontSize: '0.75rem',
    color: '#666'
  },
  preview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },
  hiddenInput: {
    display: 'none'
  },
  progressSection: {
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: '400px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#222',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '1rem'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
    transition: 'width 0.3s ease'
  },
  progressText: {
    color: '#888',
    fontSize: '0.9rem'
  },
  viewerSection: {
    display: 'flex',
    justifyContent: 'center'
  },
  viewer: {
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 0 60px rgba(139, 92, 246, 0.2)'
  },
  errorSection: {
    textAlign: 'center' as const
  },
  errorText: {
    color: '#ef4444',
    fontSize: '1rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '2rem'
  },
  primaryButton: {
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, opacity 0.2s'
  },
  secondaryButton: {
    padding: '0.875rem 1.5rem',
    background: '#222',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tertiaryButton: {
    padding: '0.875rem 1.5rem',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#888',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  codeSection: {
    marginTop: '3rem',
    padding: '1.5rem',
    background: '#111',
    borderRadius: '12px',
    border: '1px solid #222'
  },
  codeTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#888',
    marginBottom: '1rem'
  },
  codeBlock: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.85rem',
    color: '#8b5cf6',
    background: '#0a0a0f',
    padding: '1rem',
    borderRadius: '8px',
    overflow: 'auto',
    margin: 0
  }
};

export default OrbitStudio;

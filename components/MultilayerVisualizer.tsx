import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { MultilayerHolographicShader, ShaderUniforms } from '../services/vib3-plus/MultilayerHolographicShader';

interface LayerConfig {
    id: string;
    role: 'background' | 'shadow' | 'content' | 'highlight' | 'accent';
    reactivity: number;
    zIndex: number;
    opacity: number;
}

const LAYER_CONFIGS: LayerConfig[] = [
    { id: 'layer-background', role: 'background', reactivity: 0.5, zIndex: 1, opacity: 0.3 },
    { id: 'layer-shadow', role: 'shadow', reactivity: 0.7, zIndex: 2, opacity: 0.4 },
    { id: 'layer-content', role: 'content', reactivity: 0.9, zIndex: 3, opacity: 0.6 },
    { id: 'layer-highlight', role: 'highlight', reactivity: 1.1, zIndex: 4, opacity: 0.5 },
    { id: 'layer-accent', role: 'accent', reactivity: 1.5, zIndex: 5, opacity: 0.7 }
];

export interface MultilayerVisualizerRef {
    updateParams: (params: Partial<ShaderUniforms>) => void;
    setGeometry: (type: number) => void;
    triggerPulse: () => void;
}

interface MultilayerVisualizerProps {
    className?: string;
    baseParams?: Partial<ShaderUniforms>;
}

const MultilayerVisualizer = forwardRef<MultilayerVisualizerRef, MultilayerVisualizerProps>(
    ({ className, baseParams }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
        const shadersRef = useRef<(MultilayerHolographicShader | null)[]>([]);
        const animationFrameRef = useRef<number>();
        const startTimeRef = useRef<number>(Date.now());
        const [webGLSupported, setWebGLSupported] = useState(true);
        const [failedLayersCount, setFailedLayersCount] = useState(0);
        const paramsRef = useRef<Partial<ShaderUniforms>>({
            u_geometryType: 0,
            u_gridDensity: 5.0,
            u_morphFactor: 0.5,
            u_chaos: 0.1,
            u_speed: 1.0,
            u_hue: 0.5,
            u_intensity: 1.0,
            u_saturation: 0.8,
            u_dimension: 4.0,
            u_rot4dXY: 0.0,
            u_rot4dXZ: 0.0,
            u_rot4dYZ: 0.0,
            u_rot4dXW: 0.0,
            u_rot4dYW: 0.0,
            u_rot4dZW: 0.0,
            u_mouseIntensity: 0.5,
            u_clickIntensity: 0.0,
            ...baseParams
        });
        const mouseRef = useRef<[number, number]>([0, 0]);

        useImperativeHandle(ref, () => ({
            updateParams: (params: Partial<ShaderUniforms>) => {
                paramsRef.current = { ...paramsRef.current, ...params };
            },
            setGeometry: (type: number) => {
                paramsRef.current.u_geometryType = type;
            },
            triggerPulse: () => {
                const originalIntensity = paramsRef.current.u_intensity || 1.0;
                paramsRef.current.u_intensity = originalIntensity * 1.5;
                setTimeout(() => {
                    paramsRef.current.u_intensity = originalIntensity;
                }, 300);
            }
        }));

        useEffect(() => {
            if (!containerRef.current) return;

            console.log('[MultilayerVisualizer] Initializing with params:', baseParams);

            let failedCount = 0;

            // Initialize canvases and shaders for each layer
            LAYER_CONFIGS.forEach((layerConfig, index) => {
                const canvas = canvasRefs.current[index];
                if (!canvas) {
                    console.warn(`[MultilayerVisualizer] Canvas ${index} not found`);
                    failedCount++;
                    return;
                }

                try {
                    const gl = canvas.getContext('webgl', {
                        alpha: true,
                        premultipliedAlpha: false,
                        preserveDrawingBuffer: false,
                        failIfMajorPerformanceCaveat: false
                    });

                    if (!gl) {
                        console.warn(`[MultilayerVisualizer] WebGL not supported for layer ${layerConfig.role} - using CSS fallback`);
                        failedCount++;
                        return;
                    }

                    console.log(`[MultilayerVisualizer] Initializing layer ${layerConfig.role}`);

                    // Enable blending for transparency
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

                    shadersRef.current[index] = new MultilayerHolographicShader(gl);
                    console.log(`[MultilayerVisualizer] Layer ${layerConfig.role} initialized successfully`);
                } catch (error) {
                    console.warn(`[MultilayerVisualizer] Error initializing layer ${layerConfig.role} - using CSS fallback:`, error);
                    failedCount++;
                }
            });

            // If all layers failed, use CSS fallback
            if (failedCount >= LAYER_CONFIGS.length) {
                console.log('[MultilayerVisualizer] All WebGL layers failed - using CSS gradient fallback');
                setWebGLSupported(false);
            }
            setFailedLayersCount(failedCount);

            // Handle mouse movement
            const handleMouseMove = (e: MouseEvent) => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                mouseRef.current = [
                    e.clientX - rect.left,
                    rect.height - (e.clientY - rect.top)
                ];
            };

            window.addEventListener('mousemove', handleMouseMove);

            // Resize handler
            const handleResize = () => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();

                canvasRefs.current.forEach(canvas => {
                    if (canvas) {
                        canvas.width = rect.width;
                        canvas.height = rect.height;

                        const gl = canvas.getContext('webgl');
                        if (gl) {
                            gl.viewport(0, 0, rect.width, rect.height);
                        }
                    }
                });
            };

            handleResize();
            window.addEventListener('resize', handleResize);

            // Render loop
            const render = () => {
                const now = Date.now();
                const elapsed = (now - startTimeRef.current) / 1000;

                LAYER_CONFIGS.forEach((layerConfig, index) => {
                    const canvas = canvasRefs.current[index];
                    const shader = shadersRef.current[index];
                    if (!canvas || !shader) return;

                    try {
                        const gl = canvas.getContext('webgl');
                        if (!gl) return;

                        // Apply reactivity multiplier to rotation speeds
                        const reactivity = layerConfig.reactivity;

                        const layerUniforms: Partial<ShaderUniforms> = {
                            ...paramsRef.current,
                            u_resolution: [canvas.width, canvas.height],
                            u_time: elapsed * 1000,
                            u_mouse: mouseRef.current,
                            u_roleIntensity: reactivity,
                            // Apply reactivity to rotations
                            u_rot4dXY: ((paramsRef.current.u_rot4dXY || 0) + elapsed * 0.1) * reactivity,
                            u_rot4dXZ: ((paramsRef.current.u_rot4dXZ || 0) + elapsed * 0.15) * reactivity,
                            u_rot4dYZ: ((paramsRef.current.u_rot4dYZ || 0) + elapsed * 0.12) * reactivity,
                            u_rot4dXW: ((paramsRef.current.u_rot4dXW || 0) + elapsed * 0.08) * reactivity,
                            u_rot4dYW: ((paramsRef.current.u_rot4dYW || 0) + elapsed * 0.09) * reactivity,
                            u_rot4dZW: ((paramsRef.current.u_rot4dZW || 0) + elapsed * 0.11) * reactivity,
                        };

                        gl.clear(gl.COLOR_BUFFER_BIT);
                        shader.render(layerUniforms);
                    } catch (error) {
                        console.error(`[MultilayerVisualizer] Render error for layer ${layerConfig.role}:`, error);
                    }
                });

                animationFrameRef.current = requestAnimationFrame(render);
            };

            console.log('[MultilayerVisualizer] Starting render loop');
            render();

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                shadersRef.current.forEach(shader => shader?.dispose());
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('resize', handleResize);
            };
        }, [baseParams]);

        // CSS Fallback when WebGL is not supported
        if (!webGLSupported || failedLayersCount >= LAYER_CONFIGS.length) {
            const hue = (baseParams?.u_hue || 0.5) * 360;
            return (
                <div ref={containerRef} className={`relative w-full h-full ${className || ''}`}>
                    {/* Animated gradient fallback */}
                    <div
                        className="absolute inset-0 animate-gradient"
                        style={{
                            background: `
                                radial-gradient(ellipse at 20% 30%, hsl(${hue}, 70%, 15%) 0%, transparent 50%),
                                radial-gradient(ellipse at 80% 70%, hsl(${hue + 60}, 70%, 12%) 0%, transparent 50%),
                                radial-gradient(ellipse at 50% 50%, hsl(${hue + 120}, 60%, 10%) 0%, transparent 60%),
                                linear-gradient(135deg, #0a0a0a 0%, hsl(${hue}, 30%, 8%) 100%)
                            `,
                            opacity: 0.8
                        }}
                    />
                    {/* Noise overlay */}
                    <div
                        className="absolute inset-0 opacity-10 mix-blend-overlay"
                        style={{
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                            backgroundSize: '128px'
                        }}
                    />
                    <style>{`
                        @keyframes gradient {
                            0%, 100% { transform: rotate(0deg) scale(1); }
                            50% { transform: rotate(180deg) scale(1.1); }
                        }
                        .animate-gradient {
                            animation: gradient 20s ease-in-out infinite;
                        }
                    `}</style>
                </div>
            );
        }

        return (
            <div ref={containerRef} className={`relative w-full h-full ${className || ''}`}>
                {LAYER_CONFIGS.map((layerConfig, index) => (
                    <canvas
                        key={layerConfig.id}
                        ref={el => (canvasRefs.current[index] = el)}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                            zIndex: layerConfig.zIndex,
                            opacity: layerConfig.opacity,
                            mixBlendMode: layerConfig.role === 'accent' ? 'screen' : 'normal',
                            display: webGLSupported ? 'block' : 'none'
                        }}
                    />
                ))}
            </div>
        );
    }
);

export default MultilayerVisualizer;

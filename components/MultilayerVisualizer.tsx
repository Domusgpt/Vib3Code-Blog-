import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
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

            // Initialize canvases and shaders for each layer
            LAYER_CONFIGS.forEach((layerConfig, index) => {
                const canvas = canvasRefs.current[index];
                if (!canvas) {
                    console.warn(`[MultilayerVisualizer] Canvas ${index} not found`);
                    return;
                }

                try {
                    const gl = canvas.getContext('webgl', {
                        alpha: true,
                        premultipliedAlpha: false,
                        preserveDrawingBuffer: false
                    });

                    if (!gl) {
                        console.error(`[MultilayerVisualizer] WebGL not supported for layer ${layerConfig.role}`);
                        return;
                    }

                    console.log(`[MultilayerVisualizer] Initializing layer ${layerConfig.role}`);

                    // Enable blending for transparency
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

                    shadersRef.current[index] = new MultilayerHolographicShader(gl);
                    console.log(`[MultilayerVisualizer] Layer ${layerConfig.role} initialized successfully`);
                } catch (error) {
                    console.error(`[MultilayerVisualizer] Error initializing layer ${layerConfig.role}:`, error);
                }
            });

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
                            mixBlendMode: layerConfig.role === 'accent' ? 'screen' : 'normal'
                        }}
                    />
                ))}
            </div>
        );
    }
);

export default MultilayerVisualizer;


import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import gsap from 'gsap';
import ShaderManager from '../services/vib3/ShaderManager';
import GeometryManager from '../services/vib3/GeometryManager';
import ProjectionManager from '../services/vib3/ProjectionManager';
import HypercubeCore from '../services/vib3/HypercubeCore';

interface VisualizerCanvasProps {
    className?: string;
}

export interface VisualizerRef {
    updateParams: (params: any) => void;
    triggerBurst: () => void;
}

const VisualizerCanvas = forwardRef<VisualizerRef, VisualizerCanvasProps>(({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const coreRef = useRef<HypercubeCore | null>(null);

    useImperativeHandle(ref, () => ({
        updateParams: (params: any) => {
            if (coreRef.current) {
                coreRef.current.updateParameters(params);
            }
        },
        triggerBurst: () => {
            // Spike visuals for transition
            if (coreRef.current) {
                const originalState = { ...coreRef.current.state };
                
                // Spike
                coreRef.current.updateParameters({
                    glitchIntensity: 0.8,
                    colorShift: 0.5,
                    rotationSpeed: 5.0
                });

                // Tween back
                gsap.to(coreRef.current.state, {
                    glitchIntensity: originalState.glitchIntensity || 0,
                    colorShift: originalState.colorShift || 0,
                    rotationSpeed: originalState.rotationSpeed || 0.2,
                    duration: 1.0,
                    ease: "power2.out",
                    onUpdate: () => {
                         // Force shader update handled by render loop reading state, 
                         // but we might need to flag dirty uniforms if logic requires explicit set
                         coreRef.current?._markUniformDirty('glitchIntensity');
                         coreRef.current?._markUniformDirty('colorShift');
                         coreRef.current?._markUniformDirty('rotationSpeed');
                    }
                });
            }
        }
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Initialize Services
        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        const geoMgr = new GeometryManager();
        const projMgr = new ProjectionManager();
        const shaderMgr = new ShaderManager(gl, geoMgr, projMgr);

        // Initialize Engine
        const core = new HypercubeCore(canvas, shaderMgr, {
            geometryType: 'hypercube',
            gridDensity: 20,
        });

        core.start();
        coreRef.current = core;

        return () => {
            core.dispose();
            coreRef.current = null;
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className={`w-full h-full block ${className}`}
        />
    );
});

export default VisualizerCanvas;

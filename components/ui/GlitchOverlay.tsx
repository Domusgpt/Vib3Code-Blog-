import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface GlitchOverlayProps {
    active: boolean;
}

const GlitchOverlay: React.FC<GlitchOverlayProps> = ({ active }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const moireRef = useRef<HTMLDivElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (active) {
            const tl = gsap.timeline();

            // 1. Hard Flash
            tl.set(containerRef.current, { opacity: 1, pointerEvents: 'all' })
              .to(flashRef.current, { opacity: 1, duration: 0.05, ease: 'power4.in' })
              .to(flashRef.current, { opacity: 0, duration: 0.1 });

            // 2. Moiré Distortion
            tl.to(moireRef.current, { 
                scale: 1.5, 
                rotation: 15, 
                opacity: 0.8, 
                duration: 0.2, 
                ease: 'steps(5)' 
            }, 0);

            // 3. RGB Split & Shake
            tl.to(containerRef.current, {
                x: () => (Math.random() - 0.5) * 50,
                duration: 0.05,
                repeat: 5,
                yoyo: true
            }, 0);

        } else {
            // Cleanup / Reset
            gsap.to(containerRef.current, { opacity: 0, pointerEvents: 'none', duration: 0.3 });
            gsap.set(moireRef.current, { scale: 1, rotation: 0, opacity: 0 });
        }
    }, [active]);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-[100] pointer-events-none opacity-0 flex items-center justify-center overflow-hidden bg-black/10"
        >
            {/* White Flash Layer */}
            <div ref={flashRef} className="absolute inset-0 bg-white mix-blend-overlay opacity-0" />
            
            {/* Moiré Pattern Layer */}
            <div 
                ref={moireRef}
                className="absolute inset-[-50%] w-[200%] h-[200%] moire-grid blend-exclusion opacity-0"
                style={{ background: 'repeating-radial-gradient(circle, transparent 0, transparent 4px, #4FC3F7 5px)' }}
            />

            {/* Chromatic Aberration Strip */}
            <div className="absolute top-1/2 left-0 w-full h-2 bg-red-500 mix-blend-screen blur-sm scale-x-0 transition-transform duration-100" 
                 style={{ transform: active ? 'scaleX(1)' : 'scaleX(0)' }} 
            />
             <div className="absolute top-1/2 left-0 w-full h-2 bg-blue-500 mix-blend-screen blur-sm scale-x-0 transition-transform duration-150 delay-75" 
                 style={{ transform: active ? 'scaleX(1)' : 'scaleX(0)' }} 
            />

            {/* Scanlines */}
            <div className="absolute inset-0 scanlines opacity-50" />
        </div>
    );
};

export default GlitchOverlay;
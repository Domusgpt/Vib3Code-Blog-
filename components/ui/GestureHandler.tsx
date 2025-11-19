
import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { VisualizerRef } from '../VisualizerCanvas';

interface GestureHandlerProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
    onNavigate: (direction: 'next' | 'prev') => void;
    baseParams: any; // The current visualizer state to revert to
}

const GestureHandler: React.FC<GestureHandlerProps> = ({ visualizerRef, onNavigate, baseParams }) => {
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);
    const dragProgress = useRef(0); // 0 to 1 based on threshold

    // Threshold is 1/3 of screen width
    const getThreshold = () => window.innerWidth / 3;

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            // Only trigger if starting near the edges (left 15% or right 15%)
            const edgeThreshold = window.innerWidth * 0.15;
            const isLeftEdge = e.clientX < edgeThreshold;
            const isRightEdge = e.clientX > window.innerWidth - edgeThreshold;

            if (isLeftEdge || isRightEdge) {
                setIsDragging(true);
                startX.current = e.clientX;
                currentX.current = e.clientX;
                document.body.style.cursor = 'grabbing';
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging) return;

            currentX.current = e.clientX;
            const deltaX = currentX.current - startX.current;
            const threshold = getThreshold();
            
            // Calculate progress (0 to 1)
            // If dragging from left edge, we want positive delta. From right edge, negative delta means pull.
            // Actually, let's just use absolute distance for intensity
            const absDelta = Math.abs(deltaX);
            const progress = Math.min(absDelta / threshold, 1.0);
            dragProgress.current = progress;

            // --- REAL-TIME VISUALIZER COUPLING ---
            // Increase chaos, density, and speed as user drags
            if (visualizerRef.current) {
                visualizerRef.current.updateParams({
                    // Dramatic shift in color
                    colorShift: progress * 0.8, 
                    // Increase chaos/glitch
                    glitchIntensity: progress * 0.5,
                    // Ramp up speed significantly
                    rotationSpeed: (baseParams.rotationSpeed || 0.2) + (progress * 4.0),
                    // Density morphs
                    gridDensity: (baseParams.gridDensity || 20) + (progress * 20),
                    // Warp the geometry
                    morphFactor: (baseParams.morphFactor || 0.5) + (progress * 0.4 * Math.sin(Date.now() / 100))
                });
            }
        };

        const handlePointerUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            document.body.style.cursor = 'default';

            const deltaX = currentX.current - startX.current;
            const threshold = getThreshold();

            if (Math.abs(deltaX) >= threshold) {
                // --- TRIGGER NAVIGATION ---
                // If deltaX is positive (dragged right), go PREV (unless inverse logic desired)
                // Standard: Swipe Left (drag left) -> Next Content
                // Swipe Right (drag right) -> Prev Content
                if (deltaX < 0) {
                    onNavigate('next');
                } else {
                    onNavigate('prev');
                }
                // The visualizer reset will happen via App.tsx switching sections
            } else {
                // --- CANCEL / SNAP BACK ---
                // Smoothly revert visualizer to base params
                if (visualizerRef.current && baseParams) {
                    gsap.to(visualizerRef.current, {
                        duration: 0.5,
                        ease: "power2.out",
                        // We can't tween the ref directly like this for params, we need to tween a proxy
                        // So we just manually reset via updateParams for now, or use the triggerBurst revert logic
                        onUpdate: function() {
                            // Ideally we tween values, but a hard reset with a slight delay is safer for now
                            // to avoid fighting the loop.
                            const p = 1 - this.progress(); // 1 to 0
                            visualizerRef.current?.updateParams({
                                colorShift: p * dragProgress.current * 0.8,
                                glitchIntensity: p * dragProgress.current * 0.5,
                                rotationSpeed: baseParams.rotationSpeed, // Snap speed back
                                gridDensity: baseParams.gridDensity
                            });
                        },
                        onComplete: () => {
                             visualizerRef.current?.updateParams(baseParams);
                        }
                    });
                }
            }
            
            dragProgress.current = 0;
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, baseParams, onNavigate, visualizerRef]);

    return (
        <div className="fixed inset-0 z-40 pointer-events-none">
            {/* Visual Hint Zones (invisible but could have hover effect) */}
            <div className="absolute left-0 top-0 bottom-0 w-[10%] z-50 pointer-events-auto cursor-grab hover:bg-white/5 transition-colors duration-300" />
            <div className="absolute right-0 top-0 bottom-0 w-[10%] z-50 pointer-events-auto cursor-grab hover:bg-white/5 transition-colors duration-300" />
            
            {/* Dynamic Feedback UI could go here (arrows appearing as you drag) */}
        </div>
    );
};

export default GestureHandler;

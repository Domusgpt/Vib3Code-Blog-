import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Section {
    id: string;
    title: string;
    icon: string;
    color: string;
    description: string;
}

interface HexagonalRevolverProps {
    sections: Section[];
    activeSection: number;
    onSectionChange: (index: number) => void;
}

const HexagonalRevolver: React.FC<HexagonalRevolverProps> = ({
    sections,
    activeSection,
    onSectionChange
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cylinderRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; time: number } | null>(null);
    const rotationRef = useRef<number>(0);
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout>>();

    const CARD_ANGLE = 360 / sections.length; // 60 degrees for 6 sections
    const RADIUS = 450;

    // Update rotation when active section changes
    useEffect(() => {
        rotationRef.current = -activeSection * CARD_ANGLE;
        if (cylinderRef.current) {
            gsap.to(cylinderRef.current, {
                rotationY: rotationRef.current,
                duration: 0.8,
                ease: 'power2.out'
            });
        }
    }, [activeSection, CARD_ANGLE]);

    // Scroll detection for show/hide
    useEffect(() => {
        let lastScroll = 0;
        const handleWheel = (e: WheelEvent) => {
            const scrollingUp = e.deltaY < 0;

            if (scrollingUp && !isExpanded) {
                setIsExpanded(true);
                resetAutoHide();
            } else if (!scrollingUp && isExpanded && !isDragging) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [isExpanded, isDragging]);

    const resetAutoHide = () => {
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = setTimeout(() => {
            if (!isDragging) setIsExpanded(false);
        }, 4000);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, time: Date.now() };
        setIsExpanded(true);

        // Apply hypersphere folding effect
        if (containerRef.current) {
            gsap.to(containerRef.current, {
                scale: 0.85,
                rotateX: 5,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStartRef.current || !cylinderRef.current) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const rotationDelta = deltaX * 0.3;
        const newRotation = rotationRef.current + rotationDelta;

        gsap.set(cylinderRef.current, { rotationY: newRotation });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaTime = Date.now() - dragStartRef.current.time;
        const velocity = Math.abs(deltaX / deltaTime);

        // Reverse hypersphere effect
        if (containerRef.current) {
            gsap.to(containerRef.current, {
                scale: 1,
                rotateX: 0,
                duration: 0.4,
                ease: 'power2.out'
            });
        }

        // High velocity flick
        if (velocity > 0.8) {
            const direction = deltaX > 0 ? -1 : 1;
            const newIndex = (activeSection + direction + sections.length) % sections.length;
            onSectionChange(newIndex);
        } else {
            // Snap to nearest
            const currentRotation = rotationRef.current + (deltaX * 0.3);
            const nearestIndex = Math.round(-currentRotation / CARD_ANGLE) % sections.length;
            const finalIndex = (nearestIndex + sections.length) % sections.length;

            if (finalIndex !== activeSection) {
                onSectionChange(finalIndex);
            } else {
                // Snap back to current
                if (cylinderRef.current) {
                    gsap.to(cylinderRef.current, {
                        rotationY: rotationRef.current,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                }
            }
        }

        setIsDragging(false);
        dragStartRef.current = null;
        resetAutoHide();
    };

    const handleSectionDotClick = (index: number) => {
        onSectionChange(index);
        resetAutoHide();
    };

    return (
        <>
            {/* Hexagonal Revolver Bezel */}
            <div
                className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
                    isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseMove={resetAutoHide}
                onMouseLeave={() => {
                    if (!isDragging) {
                        autoHideTimerRef.current = setTimeout(() => setIsExpanded(false), 1000);
                    }
                }}
            >
                <div className="relative mt-6 w-[600px] h-[360px] bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                    {/* Holographic Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-cyan-500/5 pointer-events-none" />

                    {/* Scanlines */}
                    <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-3xl" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-purple-500/40 rounded-br-3xl" />

                    {/* 3D Cylinder Container */}
                    <div className="w-full h-full perspective-[2000px] flex items-center justify-center overflow-visible">
                        <div
                            ref={containerRef}
                            className="relative w-full h-full preserve-3d transition-transform duration-300"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                        >
                            <div
                                ref={cylinderRef}
                                className="preserve-3d relative w-full h-full"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {sections.map((section, index) => {
                                    const angle = index * CARD_ANGLE;
                                    const isFocused = index === activeSection;
                                    const angleDiff = Math.abs((angle + rotationRef.current) % 360);
                                    const isVisible = angleDiff < 120 || angleDiff > 240;

                                    // Calculate opacity and blur based on angle
                                    let opacity = 0.2;
                                    let blur = 8;
                                    if (isFocused) {
                                        opacity = 1;
                                        blur = 0;
                                    } else if (isVisible) {
                                        opacity = 0.7;
                                        blur = 2;
                                    }

                                    return (
                                        <div
                                            key={section.id}
                                            className="absolute top-1/2 left-1/2 w-[280px] h-[240px] -ml-[140px] -mt-[120px] backface-hidden transition-all duration-300"
                                            style={{
                                                transform: `rotateY(${angle}deg) translateZ(${RADIUS}px)`,
                                                opacity,
                                                filter: `blur(${blur}px) brightness(${isFocused ? 1.2 : 0.8})`
                                            }}
                                        >
                                            <div
                                                className={`w-full h-full rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                                                    isFocused ? 'bg-black/60' : 'bg-black/40'
                                                }`}
                                                style={{
                                                    borderColor: isFocused ? section.color : 'rgba(255,255,255,0.1)',
                                                    boxShadow: isFocused ? `0 0 40px ${section.color}60, inset 0 0 40px ${section.color}20` : 'none'
                                                }}
                                            >
                                                {/* Icon */}
                                                <div
                                                    className="text-5xl mb-4 transition-transform duration-300"
                                                    style={{
                                                        color: section.color,
                                                        filter: `drop-shadow(0 0 ${isFocused ? 20 : 10}px ${section.color})`
                                                    }}
                                                >
                                                    {section.icon}
                                                </div>

                                                {/* Title */}
                                                <h3
                                                    className="text-2xl font-bold mb-2"
                                                    style={{ color: isFocused ? section.color : '#fff' }}
                                                >
                                                    {section.title}
                                                </h3>

                                                {/* Description (only visible when focused) */}
                                                {isFocused && (
                                                    <p className="text-xs text-slate-400 line-clamp-2 px-2">
                                                        {section.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Drag Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-cyan-400/50 flex items-center gap-2 pointer-events-none">
                        <span>←</span>
                        <span>DRAG TO ROTATE</span>
                        <span>→</span>
                    </div>
                </div>
            </div>

            {/* Section Dots (Right Side) */}
            <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
                {sections.map((section, index) => (
                    <button
                        key={section.id}
                        onClick={() => handleSectionDotClick(index)}
                        className={`group relative transition-all duration-300 ${
                            index === activeSection ? 'scale-125' : 'scale-100 hover:scale-110'
                        }`}
                        title={section.title}
                    >
                        {/* Dot */}
                        <div
                            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                                index === activeSection ? 'bg-current' : 'bg-transparent'
                            }`}
                            style={{
                                borderColor: section.color,
                                boxShadow: index === activeSection ? `0 0 15px ${section.color}` : 'none'
                            }}
                        />

                        {/* Label (on hover) */}
                        <div
                            className="absolute right-6 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        >
                            <div
                                className="px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-xl"
                                style={{
                                    borderColor: section.color,
                                    background: `${section.color}20`,
                                    color: section.color
                                }}
                            >
                                {section.title}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Keyboard Hint (Bottom) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex gap-6 items-center text-xs font-mono text-cyan-400/20 pointer-events-none">
                <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">←</kbd>
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">→</kbd>
                    Navigate
                </span>
                <span className="text-white/10">|</span>
                <span>Scroll up to reveal revolver</span>
            </div>
        </>
    );
};

export default HexagonalRevolver;

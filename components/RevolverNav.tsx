import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SECTIONS } from '../constants';

interface RevolverNavProps {
    activeIndex: number;
    onSectionSelect: (index: number) => void;
}

const RevolverNav: React.FC<RevolverNavProps> = ({ activeIndex, onSectionSelect }) => {
    const [isVisible, setIsVisible] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const cylinderRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dimensions for Hexagon
    const cardWidth = 120;
    const radius = 140; 
    const theta = 360 / SECTIONS.length;

    // --- 1. Scroll & Visibility Logic ---
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY < -10) {
                // Scroll UP -> Show Nav
                showNav();
            } else if (e.deltaY > 10) {
                // Scroll DOWN -> Hide Nav
                hideNav();
            }
        };

        window.addEventListener('wheel', handleWheel);
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const showNav = () => {
        setIsVisible(true);
        resetAutoHide();
    };

    const hideNav = () => {
        setIsVisible(false);
    };

    const resetAutoHide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 3000); // Auto hide after 3s
    };

    // --- 2. Animation Logic ---
    useEffect(() => {
        if (!navRef.current) return;
        
        // Slide In/Out
        gsap.to(navRef.current, {
            y: isVisible ? 0 : -120,
            opacity: isVisible ? 1 : 0,
            duration: 0.5,
            ease: "power3.out"
        });
    }, [isVisible]);

    useEffect(() => {
        if (!cylinderRef.current) return;

        // Rotate the cylinder to face the active section
        gsap.to(cylinderRef.current, {
            rotationX: activeIndex * -theta, // Rotate on X axis for a "Rolodex" feel, or Y for carousel
            duration: 0.8,
            ease: "back.out(1.2)",
        });
    }, [activeIndex, theta]);

    return (
        <nav 
            ref={navRef}
            onMouseEnter={resetAutoHide}
            onMouseMove={resetAutoHide}
            className="fixed top-0 left-0 w-full h-[100px] z-50 flex justify-center pointer-events-none -translate-y-full opacity-0"
        >
            {/* --- THE BEZEL (Static Frame) --- */}
            <div className="relative mt-4 pointer-events-auto">
                {/* Glass Housing */}
                <div className="w-[600px] h-[70px] bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden relative">
                    
                    {/* Holographic Shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    {/* Scanlines Overlay */}
                    <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

                    {/* Left/Right Tech Decorations */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="w-1 h-4 bg-cyan-500/50 rounded-full animate-pulse" />
                        <div className="w-1 h-2 bg-purple-500/50 rounded-full" />
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="w-1 h-2 bg-purple-500/50 rounded-full" />
                        <div className="w-1 h-4 bg-cyan-500/50 rounded-full animate-pulse" />
                    </div>

                    {/* --- 3D CAROUSEL CONTAINER --- */}
                    <div className="w-full h-full perspective-1000 flex items-center justify-center">
                        <div 
                            ref={cylinderRef}
                            className="preserve-3d relative w-full h-full"
                            style={{ transformOrigin: 'center center -140px' }} // Deep origin
                        >
                            {SECTIONS.map((section, index) => {
                                const angle = index * theta;
                                const isActive = index === activeIndex;
                                
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            onSectionSelect(index);
                                            resetAutoHide();
                                        }}
                                        className={`
                                            absolute top-1/2 left-1/2
                                            w-[140px] h-[50px]
                                            -ml-[70px] -mt-[25px]
                                            flex items-center justify-center gap-3
                                            rounded-lg border transition-all duration-300
                                            ${isActive 
                                                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(79,195,247,0.4)]' 
                                                : 'bg-slate-900/40 border-white/5 text-slate-500 hover:text-white hover:border-white/20'}
                                        `}
                                        style={{
                                            transform: `rotateX(${angle}deg) translateZ(${radius}px)`
                                        }}
                                    >
                                        <span className="font-mono text-lg">{section.icon}</span>
                                        <span className="text-xs font-bold tracking-widest uppercase">{section.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Indicator Arrow */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-cyan-400" />
                </div>
            </div>
        </nav>
    );
};

export default RevolverNav;
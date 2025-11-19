
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import VisualizerCanvas, { VisualizerRef } from './components/VisualizerCanvas';
import RevolverNav from './components/RevolverNav';
import GlitchOverlay from './components/ui/GlitchOverlay';
import GestureHandler from './components/ui/GestureHandler'; // New Import
import { VISUALIZER_PROFILES } from './constants';

// Section Imports
import HeroSection from './components/sections/HeroSection';
import PhilosophySection from './components/sections/PhilosophySection';
import PillarsSection from './components/sections/PillarsSection';
import QualitySection from './components/sections/QualitySection';
import SustainabilitySection from './components/sections/SustainabilitySection';
import ContactSection from './components/sections/ContactSection';

const SECTIONS_COMPONENTS = [
    HeroSection,
    PhilosophySection,
    PillarsSection,
    QualitySection,
    SustainabilitySection,
    ContactSection
];

const THEME_KEYS = Object.keys(VISUALIZER_PROFILES) as (keyof typeof VISUALIZER_PROFILES)[];

const App: React.FC = () => {
    const visualizerRef = useRef<VisualizerRef>(null);
    const [activeSection, setActiveSection] = useState(0);
    const [isGlitching, setIsGlitching] = useState(false);
    const sectionContainerRef = useRef<HTMLDivElement>(null);
    const activeTheme = VISUALIZER_PROFILES[THEME_KEYS[activeSection]];

    // The "Big Switch" Logic
    const handleSectionChange = (index: number) => {
        if (index === activeSection || isGlitching) return;
        
        setIsGlitching(true);
        
        // 1. Trigger Visual Spike
        visualizerRef.current?.triggerBurst();

        // 2. Content Switch with Glitch Timing
        setTimeout(() => {
            setActiveSection(index);
            
            // Update Theme in background while glitch covers it
            const sectionKey = THEME_KEYS[index];
            const targetTheme = VISUALIZER_PROFILES[sectionKey];
            
            // @ts-ignore
            visualizerRef.current?.updateParams({ 
                ...targetTheme,
                patternIntensity: 1.5 // Start intense
            });

            // Tween back to normal intensity
            gsap.delayedCall(0.5, () => {
                // @ts-ignore
                visualizerRef.current?.updateParams({ patternIntensity: (targetTheme as any).patternIntensity || 1.0 });
            });

        }, 200); // Mid-glitch swap

        // 3. Reset Glitch
        setTimeout(() => {
            setIsGlitching(false);
        }, 800);
    };

    const handleNavigate = (direction: 'next' | 'prev') => {
        let nextIndex = activeSection;
        if (direction === 'next') {
            nextIndex = (activeSection + 1) % SECTIONS_COMPONENTS.length;
        } else {
            nextIndex = (activeSection - 1 + SECTIONS_COMPONENTS.length) % SECTIONS_COMPONENTS.length;
        }
        handleSectionChange(nextIndex);
    };

    const ActiveComponent = SECTIONS_COMPONENTS[activeSection];

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white">
            
            {/* 1. Glitch Overlay (The "Switch" Effect) */}
            <GlitchOverlay active={isGlitching} />

            {/* 2. VIB34D Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <VisualizerCanvas ref={visualizerRef} />
                {/* Global Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_120%)] opacity-80" />
                {/* Vaporwave Grid Floor (Decor) */}
                <div className="absolute bottom-0 w-full h-[30vh] bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none mix-blend-screen" />
            </div>

            {/* 3. Gesture Controller (Drag to Navigate) */}
            <GestureHandler 
                visualizerRef={visualizerRef} 
                onNavigate={handleNavigate} 
                baseParams={activeTheme} 
            />

            {/* 4. Top-mounted Revolver Bezel (Hidden by default, scroll up to reveal) */}
            <RevolverNav activeIndex={activeSection} onSectionSelect={handleSectionChange} />

            {/* 5. Active Section Container */}
            <main 
                ref={sectionContainerRef}
                className={`relative z-10 w-full h-full transition-opacity duration-100 ${isGlitching ? 'opacity-0' : 'opacity-100'}`}
            >
                <ActiveComponent visualizerRef={visualizerRef} />
            </main>

            {/* Footer / Status */}
            <div className="fixed bottom-6 right-8 z-50 text-xs font-mono text-cyan-400/30 tracking-widest pointer-events-none flex flex-col items-end">
                <span>VIB34D SYSTEM v1.4</span>
                <span>MODE: {THEME_KEYS[activeSection].toUpperCase()}</span>
                <span className="mt-2 opacity-50 hidden md:block">&lt; DRAG SIDES TO NAVIGATE &gt;</span>
            </div>
        </div>
    );
};

export default App;

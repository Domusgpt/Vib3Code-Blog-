
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import MultilayerVisualizer, { MultilayerVisualizerRef } from './components/MultilayerVisualizer';
import HexagonalRevolver from './components/HexagonalRevolver';
import GlitchOverlay from './components/ui/GlitchOverlay';
import { SECTION_PRESETS, getPresetBySection } from './constants/shaderPresets';

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

const App: React.FC = () => {
    const visualizerRef = useRef<MultilayerVisualizerRef>(null);
    const [activeSection, setActiveSection] = useState(0);
    const [isGlitching, setIsGlitching] = useState(false);
    const sectionContainerRef = useRef<HTMLDivElement>(null);
    const activePreset = getPresetBySection(activeSection);

    // Handle section changes
    const handleSectionChange = (index: number) => {
        if (index === activeSection || isGlitching) return;

        setIsGlitching(true);

        // 1. Trigger Visual Pulse
        visualizerRef.current?.triggerPulse();

        // 2. Content Switch with Glitch Timing
        setTimeout(() => {
            setActiveSection(index);

            // Update shader params for new section
            const targetPreset = getPresetBySection(index);
            visualizerRef.current?.updateParams({
                ...targetPreset.shaderParams,
                u_intensity: (targetPreset.shaderParams.u_intensity || 1.0) * 1.5 // Spike
            });

            // Tween back to normal intensity
            gsap.delayedCall(0.5, () => {
                visualizerRef.current?.updateParams({
                    u_intensity: targetPreset.shaderParams.u_intensity || 1.0
                });
            });

        }, 200); // Mid-glitch swap

        // 3. Reset Glitch
        setTimeout(() => {
            setIsGlitching(false);
        }, 800);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                const prevIndex = (activeSection - 1 + SECTIONS_COMPONENTS.length) % SECTIONS_COMPONENTS.length;
                handleSectionChange(prevIndex);
            } else if (e.key === 'ArrowRight') {
                const nextIndex = (activeSection + 1) % SECTIONS_COMPONENTS.length;
                handleSectionChange(nextIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection]);

    const ActiveComponent = SECTIONS_COMPONENTS[activeSection];

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white">

            {/* 1. Glitch Overlay (The "Switch" Effect) */}
            <GlitchOverlay active={isGlitching} />

            {/* 2. Multilayer Holographic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <MultilayerVisualizer
                    ref={visualizerRef}
                    baseParams={activePreset.shaderParams}
                />
                {/* Global Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_120%)] opacity-60" />
                {/* Cyber Grid Floor */}
                <div className="absolute bottom-0 w-full h-[30vh] cyber-grid opacity-10 pointer-events-none" />
            </div>

            {/* 3. Hexagonal Revolver Navigation */}
            <HexagonalRevolver
                sections={SECTION_PRESETS}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />

            {/* 4. Active Section Container */}
            <main
                ref={sectionContainerRef}
                className={`relative z-10 w-full h-full transition-opacity duration-100 ${isGlitching ? 'opacity-0' : 'opacity-100'}`}
            >
                <ActiveComponent visualizerRef={visualizerRef} activePreset={activePreset} />
            </main>

            {/* Footer / Status */}
            <div className="fixed bottom-6 left-8 z-50 text-xs font-mono text-cyan-400/30 tracking-widest pointer-events-none flex flex-col items-start">
                <span>VIB3+ MULTILAYER v2.0</span>
                <span>GEOMETRY: {activePreset.shaderParams.u_geometryType}</span>
                <span className="text-white/20">|</span>
                <span style={{ color: activePreset.color }} className="opacity-70">
                    {activePreset.title.toUpperCase()}
                </span>
            </div>
        </div>
    );
};

export default App;

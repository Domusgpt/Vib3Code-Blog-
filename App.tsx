
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import CircularRevolver from './components/CircularRevolver';
import { SECTION_PRESETS } from './constants/shaderPresets';

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
    const [activeSection, setActiveSection] = useState(0);
    const activePreset = SECTION_PRESETS[activeSection];

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                const prevIndex = (activeSection - 1 + SECTIONS_COMPONENTS.length) % SECTIONS_COMPONENTS.length;
                setActiveSection(prevIndex);
            } else if (e.key === 'ArrowRight') {
                const nextIndex = (activeSection + 1) % SECTIONS_COMPONENTS.length;
                setActiveSection(nextIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection]);

    const ActiveComponent = SECTIONS_COMPONENTS[activeSection];

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a] text-white">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
            </div>

            {/* Circular Revolver Navigation */}
            <CircularRevolver
                sections={SECTION_PRESETS}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
            />

            {/* Active Section Container */}
            <main className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar">
                <ActiveComponent activePreset={activePreset} />
            </main>

            {/* Footer Status */}
            <div className="fixed bottom-8 left-8 z-40 text-xs font-mono text-white/20 tracking-wider">
                <div>VIB3CODE v2.0</div>
                <div style={{ color: activePreset.color }} className="opacity-50">
                    {activePreset.title.toUpperCase()}
                </div>
            </div>
        </div>
    );
};

export default App;

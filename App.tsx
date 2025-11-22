
import React, { useEffect, useState } from 'react';
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
            {/* Animated Background */}
            <div className="fixed inset-0 z-0">
                {/* Gradient Orbs */}
                <div
                    className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[128px] opacity-20 animate-float-slow"
                    style={{ background: activePreset.color }}
                />
                <div
                    className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[128px] opacity-15 animate-float-slower"
                    style={{ background: `linear-gradient(135deg, ${activePreset.color}, transparent)` }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[96px] opacity-10 animate-pulse-slow"
                    style={{ background: activePreset.color }}
                />

                {/* Noise Texture */}
                <div
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                        backgroundSize: '128px'
                    }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
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
                <div className="font-display">VIB3CODE v3.0</div>
                <div style={{ color: activePreset.color }} className="opacity-50 mt-1">
                    {activePreset.title.toUpperCase()}
                </div>
            </div>

            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-50px, -80px); }
                }
                @keyframes float-slower {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(40px, 60px); }
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.15; }
                }
                .animate-float-slow {
                    animation: float-slow 20s ease-in-out infinite;
                }
                .animate-float-slower {
                    animation: float-slower 25s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 15s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default App;

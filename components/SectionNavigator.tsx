import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Section {
    id: string;
    title: string;
    icon: string;
    color: string;
    description: string;
}

interface SectionNavigatorProps {
    sections: Section[];
    activeSection: number;
    onSectionChange: (index: number) => void;
}

const SectionNavigator: React.FC<SectionNavigatorProps> = ({
    sections,
    activeSection,
    onSectionChange
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (indicatorRef.current) {
            // Animate indicator to active section
            const sectionWidth = 100 / sections.length;
            gsap.to(indicatorRef.current, {
                x: `${activeSection * sectionWidth}%`,
                duration: 0.6,
                ease: 'power3.out'
            });
        }
    }, [activeSection, sections.length]);

    const handleSectionClick = (index: number) => {
        onSectionChange(index);
        setIsExpanded(false);
    };

    return (
        <>
            {/* Floating Navigation Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="fixed top-8 right-8 z-[60] w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-cyan-400/30 flex items-center justify-center group hover:border-cyan-400 transition-all hover:scale-110"
                style={{
                    boxShadow: '0 0 30px rgba(79, 195, 247, 0.3)'
                }}
            >
                <div className="relative">
                    {/* Hamburger/Close Icon */}
                    <div className={`flex flex-col gap-1 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                        <div className={`w-5 h-0.5 bg-cyan-400 transition-all duration-300 ${isExpanded ? 'rotate-45 translate-y-1.5' : ''}`} />
                        <div className={`w-5 h-0.5 bg-cyan-400 transition-all duration-300 ${isExpanded ? 'opacity-0' : ''}`} />
                        <div className={`w-5 h-0.5 bg-cyan-400 transition-all duration-300 ${isExpanded ? '-rotate-45 -translate-y-1.5' : ''}`} />
                    </div>
                </div>
            </button>

            {/* Expanded Navigation Panel */}
            <div
                ref={navRef}
                className={`fixed inset-0 z-50 transition-all duration-500 ${
                    isExpanded ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/80 backdrop-blur-lg transition-opacity duration-500 ${
                        isExpanded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setIsExpanded(false)}
                />

                {/* Navigation Content */}
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl px-8 transition-all duration-500 ${
                        isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                >
                    <h2 className="text-center text-5xl font-bold mb-4 holographic-text">
                        Navigate Sections
                    </h2>
                    <p className="text-center text-slate-400 mb-12 text-lg">
                        Choose your destination in the VIB3CODE universe
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sections.map((section, index) => (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(index)}
                                className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                                    activeSection === index
                                        ? 'scale-105 border-opacity-100'
                                        : 'border-opacity-30 hover:border-opacity-60 hover:scale-102'
                                }`}
                                style={{
                                    borderColor: section.color,
                                    background: activeSection === index
                                        ? `linear-gradient(135deg, ${section.color}20, transparent)`
                                        : 'rgba(0,0,0,0.3)',
                                    boxShadow: activeSection === index
                                        ? `0 0 40px ${section.color}40`
                                        : '0 4px 20px rgba(0,0,0,0.3)'
                                }}
                            >
                                {/* Icon */}
                                <div
                                    className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110"
                                    style={{
                                        filter: `drop-shadow(0 0 20px ${section.color})`
                                    }}
                                >
                                    {section.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-2xl font-bold mb-2 text-white">
                                    {section.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {section.description}
                                </p>

                                {/* Active Indicator */}
                                {activeSection === index && (
                                    <div
                                        className="absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse"
                                        style={{
                                            backgroundColor: section.color,
                                            boxShadow: `0 0 15px ${section.color}`
                                        }}
                                    />
                                )}

                                {/* Hover Glow */}
                                <div
                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at center, ${section.color}20, transparent 70%)`
                                    }}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Close Hint */}
                    <div className="text-center mt-8 text-slate-500 text-sm font-mono">
                        Press ESC or click outside to close
                    </div>
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 h-1 bg-white/5">
                <div
                    ref={indicatorRef}
                    className="h-full transition-colors duration-300"
                    style={{
                        width: `${100 / sections.length}%`,
                        backgroundColor: sections[activeSection]?.color || '#4FC3F7',
                        boxShadow: `0 0 20px ${sections[activeSection]?.color || '#4FC3F7'}`
                    }}
                />
            </div>

            {/* Keyboard hint */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex gap-4 items-center text-xs font-mono text-cyan-400/30 pointer-events-none">
                <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">←</kbd>
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">→</kbd>
                    Navigate
                </span>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">M</kbd>
                    Menu
                </span>
            </div>
        </>
    );
};

export default SectionNavigator;

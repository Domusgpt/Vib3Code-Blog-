import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface Section {
    id: string;
    title: string;
    icon: string;
    color: string;
}

interface CircularRevolverProps {
    sections: Section[];
    activeSection: number;
    onSectionChange: (index: number) => void;
}

const CircularRevolver: React.FC<CircularRevolverProps> = ({
    sections,
    activeSection,
    onSectionChange
}) => {
    const [rotation, setRotation] = useState(0);
    const revolverRef = useRef<HTMLDivElement>(null);

    const anglePerSection = 360 / sections.length;

    useEffect(() => {
        const targetRotation = -activeSection * anglePerSection;
        setRotation(targetRotation);
    }, [activeSection, anglePerSection]);

    return (
        <div className="fixed bottom-6 right-6 z-50 group">
            {/* Glow Effect */}
            <div
                className="absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                    background: sections[activeSection]?.color,
                    transform: 'scale(1.1)'
                }}
            />

            {/* Circular Dial */}
            <div className="relative w-28 h-28">
                {/* Outer Ring */}
                <div
                    className="absolute inset-0 rounded-full border-2 transition-all duration-500 group-hover:border-opacity-80"
                    style={{
                        borderColor: sections[activeSection]?.color,
                        opacity: 0.5,
                        boxShadow: `0 0 20px ${sections[activeSection]?.color}30`
                    }}
                />

                {/* Center Circle */}
                <div className="absolute inset-2 rounded-full bg-black/95 backdrop-blur-xl border border-white/20 shadow-2xl" />

                {/* Section Dots */}
                <div
                    ref={revolverRef}
                    className="absolute inset-0 transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {sections.map((section, index) => {
                        const angle = index * anglePerSection;
                        const isActive = index === activeSection;
                        const radius = 44; // Adjusted for smaller circle (112px / 2 - 12px)
                        const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
                        const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionChange(index)}
                                className="absolute top-1/2 left-1/2 transition-all duration-300 group/dot"
                                style={{
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-rotation}deg)`,
                                }}
                                title={section.title}
                            >
                                {/* Dot */}
                                <div
                                    className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                                        isActive ? 'scale-150' : 'scale-100 group-hover/dot:scale-125'
                                    }`}
                                    style={{
                                        background: isActive ? section.color : 'rgba(255,255,255,0.5)',
                                        boxShadow: isActive
                                            ? `0 0 12px ${section.color}, 0 0 24px ${section.color}60`
                                            : '0 1px 4px rgba(0,0,0,0.6)',
                                        border: `1.5px solid ${isActive ? section.color : 'rgba(255,255,255,0.3)'}`
                                    }}
                                />

                                {/* Dot Label (on hover) */}
                                <div
                                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                                >
                                    <div
                                        className="px-3 py-1 rounded-lg backdrop-blur-xl text-xs font-mono uppercase tracking-wider font-display"
                                        style={{
                                            background: 'rgba(0,0,0,0.9)',
                                            color: section.color,
                                            boxShadow: `0 0 20px ${section.color}40`
                                        }}
                                    >
                                        {section.title}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        className="text-2xl transition-all duration-500"
                        style={{
                            color: sections[activeSection]?.color,
                            filter: `drop-shadow(0 0 6px ${sections[activeSection]?.color})`
                        }}
                    >
                        {sections[activeSection]?.icon}
                    </span>
                </div>

                {/* Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="52"
                        fill="none"
                        stroke={sections[activeSection]?.color}
                        strokeWidth="2"
                        strokeDasharray={`${(activeSection + 1) / sections.length * 327} 327`}
                        className="transition-all duration-700"
                        style={{
                            opacity: 0.6,
                            filter: `drop-shadow(0 0 3px ${sections[activeSection]?.color})`
                        }}
                    />
                </svg>

                {/* Section Counter - Inside circle on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute -bottom-1 text-[9px] font-mono text-white/40 tracking-wider">
                        {activeSection + 1}/{sections.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CircularRevolver;

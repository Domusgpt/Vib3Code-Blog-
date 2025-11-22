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
        <div className="fixed bottom-8 right-8 z-50 group">
            {/* Glow Effect */}
            <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30 transition-opacity duration-500"
                style={{
                    background: sections[activeSection]?.color,
                    transform: 'scale(1.2)'
                }}
            />

            {/* Circular Dial */}
            <div className="relative w-48 h-48">
                {/* Outer Ring */}
                <div
                    className="absolute inset-0 rounded-full border-2 transition-all duration-500"
                    style={{
                        borderColor: sections[activeSection]?.color + '40',
                        boxShadow: `0 0 30px ${sections[activeSection]?.color}20`
                    }}
                />

                {/* Center Circle */}
                <div className="absolute inset-4 rounded-full bg-black/90 backdrop-blur-2xl border-2 border-white/10 shadow-2xl" />

                {/* Section Dots */}
                <div
                    ref={revolverRef}
                    className="absolute inset-0 transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {sections.map((section, index) => {
                        const angle = index * anglePerSection;
                        const isActive = index === activeSection;
                        const radius = 76;
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
                                {/* Dot Glow */}
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-full blur-md animate-pulse"
                                        style={{
                                            background: section.color,
                                            transform: 'scale(2)'
                                        }}
                                    />
                                )}

                                {/* Dot */}
                                <div
                                    className={`relative w-5 h-5 rounded-full transition-all duration-300 ${
                                        isActive ? 'scale-125' : 'scale-100 group-hover/dot:scale-110'
                                    }`}
                                    style={{
                                        background: isActive ? section.color : 'rgba(255,255,255,0.4)',
                                        boxShadow: isActive
                                            ? `0 0 20px ${section.color}, 0 0 40px ${section.color}80`
                                            : '0 2px 8px rgba(0,0,0,0.5)',
                                        border: `2px solid ${isActive ? section.color : 'rgba(255,255,255,0.2)'}`
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
                    <div className="text-center">
                        <span
                            className="text-4xl transition-all duration-500"
                            style={{
                                color: sections[activeSection]?.color,
                                filter: `drop-shadow(0 0 8px ${sections[activeSection]?.color})`
                            }}
                        >
                            {sections[activeSection]?.icon}
                        </span>
                    </div>
                </div>

                {/* Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="88"
                        fill="none"
                        stroke={sections[activeSection]?.color}
                        strokeWidth="2"
                        strokeDasharray={`${(activeSection + 1) / sections.length * 553} 553`}
                        className="transition-all duration-700"
                        style={{
                            opacity: 0.3,
                            filter: `drop-shadow(0 0 4px ${sections[activeSection]?.color})`
                        }}
                    />
                </svg>
            </div>

            {/* Section Label */}
            <div className="text-center mt-4">
                <div
                    className="text-sm font-mono uppercase tracking-widest font-display transition-colors duration-500"
                    style={{ color: sections[activeSection]?.color }}
                >
                    {sections[activeSection]?.title}
                </div>
                <div className="text-xs text-white/30 mt-1">
                    {activeSection + 1} / {sections.length}
                </div>
            </div>
        </div>
    );
};

export default CircularRevolver;

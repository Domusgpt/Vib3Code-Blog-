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
        <div className="fixed bottom-8 right-8 z-50">
            {/* Circular Dial */}
            <div className="relative w-32 h-32">
                {/* Center Circle */}
                <div className="absolute inset-0 rounded-full bg-black/80 backdrop-blur-xl border border-white/20" />

                {/* Section Dots */}
                <div
                    ref={revolverRef}
                    className="absolute inset-0 transition-transform duration-500 ease-out"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {sections.map((section, index) => {
                        const angle = index * anglePerSection;
                        const isActive = index === activeSection;
                        const radius = 48;
                        const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
                        const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionChange(index)}
                                className="absolute top-1/2 left-1/2 transition-all duration-300"
                                style={{
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-rotation}deg)`,
                                }}
                                title={section.title}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                        isActive ? 'scale-150' : 'scale-100 hover:scale-125'
                                    }`}
                                    style={{
                                        background: isActive ? section.color : 'rgba(255,255,255,0.3)',
                                        boxShadow: isActive ? `0 0 12px ${section.color}` : 'none'
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl" style={{ color: sections[activeSection]?.color }}>
                        {sections[activeSection]?.icon}
                    </span>
                </div>
            </div>

            {/* Section Label */}
            <div className="text-center mt-3">
                <div
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{ color: sections[activeSection]?.color }}
                >
                    {sections[activeSection]?.title}
                </div>
            </div>
        </div>
    );
};

export default CircularRevolver;

import React from 'react';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const ContactSection: React.FC<SectionProps> = ({ activePreset }) => {
    return (
        <div className="min-h-screen px-8 lg:px-16 py-16 flex flex-col items-center justify-center">
            {/* Section Header */}
            <div className="max-w-7xl mx-auto mb-12 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-4xl" style={{ color: activePreset.color }}>
                        {activePreset.icon}
                    </span>
                </div>
                <h1
                    className="text-5xl md:text-6xl font-bold mb-4 tracking-tight"
                    style={{
                        background: `linear-gradient(135deg, ${activePreset.color}, white)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontFamily: 'Syne, DM Sans, sans-serif'
                    }}
                >
                    {activePreset.title}
                </h1>
                <p className="text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed">
                    {activePreset.description}
                </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full mb-12">
                {[
                    { label: "Discord", value: "vib3.code/discord" },
                    { label: "GitHub", value: "@vib3-labs" },
                    { label: "Substack", value: "vib3code.substack" },
                    { label: "Status", value: "Systems Operational" }
                ].map((item, i) => (
                    <div
                        key={i}
                        className="cursor-pointer relative bg-black/70 backdrop-blur-xl border p-6 rounded-xl overflow-hidden group hover:scale-[1.01] transition-all duration-300"
                        style={{
                            borderColor: `${activePreset.color}40`,
                            boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px ${activePreset.color}20`
                        }}
                    >
                        <h3
                            className="text-xs tracking-widest uppercase mb-2 font-display"
                            style={{ color: activePreset.color }}
                        >
                            {item.label}
                        </h3>
                        <p className="text-xl md:text-2xl font-light text-slate-100 font-mono">{item.value}</p>

                        {/* Hover Effect */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                            style={{ background: activePreset.color }}
                        />
                    </div>
                ))}
            </div>

            {/* Subscribe Section */}
            <div className="flex flex-col items-center">
                <p className="text-slate-300 mb-6 text-sm">Subscribe to the weekly transmission.</p>
                <button
                    className="px-10 py-3 font-bold text-base tracking-wider uppercase hover:scale-105 transition-all duration-300 rounded-lg border-2 font-display"
                    style={{
                        background: activePreset.color,
                        color: '#0a0a0a',
                        borderColor: activePreset.color,
                        boxShadow: `0 0 40px ${activePreset.color}60, 0 4px 16px rgba(0,0,0,0.4)`
                    }}
                >
                    Subscribe
                </button>
            </div>
        </div>
    );
};

export default ContactSection;

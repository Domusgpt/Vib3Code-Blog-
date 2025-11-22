import React from 'react';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const ContactSection: React.FC<SectionProps> = ({ activePreset }) => {
    return (
        <div className="min-h-screen px-6 md:px-12 py-24 flex flex-col items-center justify-center">
            {/* Section Header */}
            <div className="max-w-7xl mx-auto mb-16 text-center">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <span className="text-6xl" style={{ color: activePreset.color }}>
                        {activePreset.icon}
                    </span>
                </div>
                <h1
                    className="text-7xl md:text-8xl font-bold mb-6 tracking-tight"
                    style={{ color: activePreset.color }}
                >
                    {activePreset.title}
                </h1>
                <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                    {activePreset.description}
                </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full mb-16">
                {[
                    { label: "Discord", value: "vib3.code/discord" },
                    { label: "GitHub", value: "@vib3-labs" },
                    { label: "Substack", value: "vib3code.substack" },
                    { label: "Status", value: "Systems Operational" }
                ].map((item, i) => (
                    <div
                        key={i}
                        className="cursor-pointer relative bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-lg overflow-hidden group hover:border-white/20 transition-all duration-300"
                        style={{
                            borderColor: `${activePreset.color}20`
                        }}
                    >
                        <h3
                            className="text-sm tracking-widest uppercase mb-2"
                            style={{ color: activePreset.color }}
                        >
                            {item.label}
                        </h3>
                        <p className="text-2xl md:text-3xl font-light text-white font-mono">{item.value}</p>

                        {/* Hover Effect */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                            style={{ background: activePreset.color }}
                        />
                    </div>
                ))}
            </div>

            {/* Subscribe Section */}
            <div className="flex flex-col items-center">
                <p className="text-slate-400 mb-6">Subscribe to the weekly transmission.</p>
                <button
                    className="px-12 py-4 font-bold text-lg tracking-widest uppercase hover:scale-105 transition-all duration-300 rounded-lg border-2"
                    style={{
                        background: activePreset.color,
                        color: '#0a0a0a',
                        borderColor: activePreset.color,
                        boxShadow: `0 0 30px ${activePreset.color}50`
                    }}
                >
                    Initiate Sequence
                </button>
            </div>
        </div>
    );
};

export default ContactSection;

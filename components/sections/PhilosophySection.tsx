import React from 'react';
import VisualCodexCard from '../VisualCodexCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const PhilosophySection: React.FC<SectionProps> = ({ activePreset }) => {
    const articles = BLOG_CONTENT.philosophy.map((item, i) => ({
        ...item,
        icon: activePreset.icon,
        category: 'CONCEPT',
        date: `Entry ${String(i + 1).padStart(2, '0')}`,
        tags: ['AI', 'Theory', 'Ethics', 'UX']
    }));

    return (
        <div className="min-h-screen px-8 lg:px-16 py-16">
            {/* Section Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="flex items-center gap-3 mb-4">
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
                <p className="text-lg text-slate-200 max-w-3xl leading-relaxed">
                    {activePreset.description}
                </p>
            </div>

            {/* Articles Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, i) => (
                    <VisualCodexCard
                        key={i}
                        article={article}
                        index={i}
                        accentColor={activePreset.color}

                    />
                ))}
            </div>
        </div>
    );
};

export default PhilosophySection;

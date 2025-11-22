import React from 'react';
import VisualCodexCard from '../VisualCodexCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const QualitySection: React.FC<SectionProps> = ({ activePreset }) => {
    const articles = BLOG_CONTENT.quality.map((item, i) => ({
        ...item,
        icon: activePreset.icon,
        category: item.category || 'DEEP DIVE',
        date: `${8 + i} min read`,
        tags: ['Tutorial', 'Deep Dive', 'Architecture', 'Performance']
    }));

    return (
        <div className="min-h-screen px-6 md:px-12 py-24">
            {/* Section Header */}
            <div className="max-w-7xl mx-auto mb-16">
                <div className="flex items-center gap-4 mb-6">
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
                <p className="text-xl text-slate-400 max-w-3xl">
                    {activePreset.description}
                </p>
            </div>

            {/* Articles Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

export default QualitySection;

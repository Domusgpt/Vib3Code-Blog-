import React from 'react';
import ArticleCard from '../ArticleCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const SustainabilitySection: React.FC<SectionProps> = ({ activePreset }) => {
    const articles = BLOG_CONTENT.sustainability.map((item, i) => ({
        ...item,
        category: 'FUTURE',
        date: `Signal ${String(i + 1).padStart(2, '0')}`,
        tags: ['AI', 'Ethics', 'Future', 'Society']
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
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, i) => (
                    <ArticleCard
                        key={i}
                        article={article}
                        accentColor={activePreset.color}
                    />
                ))}
            </div>
        </div>
    );
};

export default SustainabilitySection;

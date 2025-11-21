import React from 'react';
import { MultilayerVisualizerRef } from '../MultilayerVisualizer';
import EnhancedArticleCard from '../EnhancedArticleCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    visualizerRef: React.RefObject<MultilayerVisualizerRef | null>;
    activePreset: SectionPreset;
}

const PhilosophySection: React.FC<SectionProps> = ({ visualizerRef, activePreset }) => {
    const articles = BLOG_CONTENT.philosophy.map((item, i) => ({
        ...item,
        icon: '★',
        category: 'CONCEPT',
        date: `Entry ${String(i + 1).padStart(2, '0')}`,
        tags: ['AI', 'Theory', 'Ethics', 'UX']
    }));

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar relative px-6 md:px-12 py-12">
            {/* Section Header */}
            <div className="text-center mb-16 max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <span className="text-6xl" style={{ filter: `drop-shadow(0 0 30px ${activePreset.color})` }}>
                        {activePreset.icon}
                    </span>
                </div>
                <h2
                    className="text-6xl md:text-8xl font-bold mb-4"
                    style={{ color: activePreset.color }}
                >
                    {activePreset.title}
                </h2>
                <p className="text-lg text-slate-400">
                    {activePreset.description}
                </p>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-24">
                {articles.map((article, i) => (
                    <EnhancedArticleCard
                        key={i}
                        article={article}
                        index={i}
                        accentColor={activePreset.color}
                        shaderPreset={{
                            ...activePreset.shaderParams,
                            u_geometryType: (activePreset.shaderParams.u_geometryType || 0) + (i % 3) * 0.1
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default PhilosophySection;

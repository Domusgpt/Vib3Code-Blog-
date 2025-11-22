import React from 'react';
import ArticleCard from '../ArticleCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const HeroSection: React.FC<SectionProps> = ({ activePreset }) => {
    return (
        <div className="min-h-screen px-6 md:px-12 py-24">
            {/* Hero Header */}
            <div className="max-w-7xl mx-auto text-center mb-24 pt-12">
                <div className="flex items-center justify-center gap-4 mb-6 opacity-80">
                    <span className="text-2xl" style={{ color: activePreset.color }}>::</span>
                    <span className="text-white font-mono tracking-widest">SYSTEM.INIT</span>
                    <span className="text-sm" style={{ color: activePreset.color }}>v2.0</span>
                </div>

                <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-8"
                    style={{
                        background: `linear-gradient(to bottom, white, ${activePreset.color})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    VIB3<br/>CODE
                </h1>

                <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-16">
                    Explorations in <strong style={{ color: activePreset.color }}>AI</strong>,
                    <strong className="text-purple-400"> Generative Art</strong>, and the
                    <strong className="text-teal-400"> Future of Web</strong>.<br/>
                    Coding at the speed of thought.
                </p>
            </div>

            {/* Featured Articles */}
            <div className="max-w-7xl mx-auto">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-8 text-center">
                    Featured Articles
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {BLOG_CONTENT.hero.featured.map((post, i) => (
                        <ArticleCard
                            key={i}
                            article={{
                                title: post.title,
                                desc: post.desc,
                                category: post.category,
                                date: post.date,
                                tags: ['Featured', 'Latest']
                            }}
                            accentColor={activePreset.color}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroSection;

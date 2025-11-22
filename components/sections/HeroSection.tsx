import React from 'react';
import VisualCodexCard from '../VisualCodexCard';
import { BLOG_CONTENT } from '../../constants';
import { SectionPreset } from '../../constants/shaderPresets';

interface SectionProps {
    activePreset: SectionPreset;
}

const HeroSection: React.FC<SectionProps> = ({ activePreset }) => {
    return (
        <div className="min-h-screen px-8 lg:px-16 py-16">
            {/* Hero Header */}
            <div className="max-w-7xl mx-auto text-center mb-20 pt-16">
                <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-6"
                    style={{
                        background: `linear-gradient(135deg, white, ${activePreset.color}, white)`,
                        backgroundSize: '200% 200%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontFamily: 'Syne, DM Sans, sans-serif'
                    }}
                >
                    VIB3CODE
                </h1>

                <p className="text-xl md:text-2xl text-slate-200 font-light leading-relaxed max-w-3xl mx-auto">
                    Explorations in <strong style={{ color: activePreset.color }}>AI</strong>, <strong style={{ color: '#A78BFA' }}>Generative Art</strong>, and the <strong style={{ color: '#2DD4BF' }}>Future of Web</strong>.
                </p>

                {/* Scroll indicator */}
                <div className="mt-12 flex flex-col items-center gap-2 opacity-50">
                    <div className="text-xs font-mono text-slate-400 tracking-wider">SCROLL</div>
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-400 to-transparent animate-pulse"></div>
                </div>
            </div>

            {/* Featured Articles */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700"></div>
                    <h2 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-display">
                        Featured
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-700"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {BLOG_CONTENT.hero.featured.map((post, i) => (
                        <VisualCodexCard
                            key={i}
                            article={{
                                title: post.title,
                                desc: post.desc,
                                icon: activePreset.icon,
                                category: post.category,
                                date: post.date,
                                tags: ['Featured', 'Latest']
                            }}
                            index={i}
                            accentColor={activePreset.color}

                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroSection;

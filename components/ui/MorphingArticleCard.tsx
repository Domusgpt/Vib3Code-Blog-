import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

interface ArticleData {
    title: string;
    desc: string;
    category?: string;
    date?: string;
    icon?: string;
    content?: string;
    tags?: string[];
}

interface MorphingArticleCardProps {
    article: ArticleData;
    index: number;
    accentColor?: string;
}

const MorphingArticleCard: React.FC<MorphingArticleCardProps> = ({
    article,
    index,
    accentColor = '#4FC3F7'
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Generate a unique color based on index
    const colors = [
        { primary: '#4FC3F7', secondary: '#7B3FF2', glow: 'rgba(79, 195, 247, 0.3)' }, // Cyan-Purple
        { primary: '#F50057', secondary: '#FF4081', glow: 'rgba(245, 0, 87, 0.3)' },   // Pink-Rose
        { primary: '#00E676', secondary: '#76FF03', glow: 'rgba(0, 230, 118, 0.3)' },  // Green-Lime
        { primary: '#FF6D00', secondary: '#FFD600', glow: 'rgba(255, 109, 0, 0.3)' },  // Orange-Yellow
        { primary: '#AA00FF', secondary: '#D500F9', glow: 'rgba(170, 0, 255, 0.3)' },  // Purple-Magenta
        { primary: '#00B8D4', secondary: '#0091EA', glow: 'rgba(0, 184, 212, 0.3)' },  // Teal-Blue
    ];
    const colorTheme = colors[index % colors.length];

    const handleExpand = () => {
        if (!cardRef.current || !contentRef.current || !overlayRef.current) return;

        setIsExpanded(true);

        // Show overlay
        gsap.to(overlayRef.current, {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out'
        });

        // Morph and expand card
        gsap.to(cardRef.current, {
            position: 'fixed',
            top: '5vh',
            left: '5vw',
            width: '90vw',
            height: '90vh',
            borderRadius: '20px',
            zIndex: 1000,
            duration: 0.6,
            ease: 'power3.inOut',
            onStart: () => {
                if (cardRef.current) {
                    cardRef.current.style.position = 'fixed';
                }
            }
        });

        // Fade in expanded content
        gsap.to(contentRef.current, {
            opacity: 1,
            y: 0,
            delay: 0.3,
            duration: 0.4,
            ease: 'power2.out'
        });

        // Trigger shockwave effect
        triggerShockwave();
    };

    const handleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!cardRef.current || !contentRef.current || !overlayRef.current) return;

        // Hide expanded content
        gsap.to(contentRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.2,
            ease: 'power2.in'
        });

        // Shrink card back
        gsap.to(cardRef.current, {
            position: 'relative',
            top: 'auto',
            left: 'auto',
            width: '100%',
            height: 'auto',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            zIndex: 1,
            duration: 0.5,
            ease: 'power3.inOut',
            onComplete: () => {
                setIsExpanded(false);
                if (cardRef.current) {
                    cardRef.current.style.position = 'relative';
                }
            }
        });

        // Hide overlay
        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in'
        });
    };

    const triggerShockwave = () => {
        // Visual burst effect on expansion
        const shockwave = document.createElement('div');
        shockwave.className = 'shockwave-ring';
        shockwave.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid ${colorTheme.primary};
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 999;
        `;
        document.body.appendChild(shockwave);

        gsap.to(shockwave, {
            width: '150vw',
            height: '150vw',
            opacity: 0,
            duration: 1,
            ease: 'power2.out',
            onComplete: () => {
                document.body.removeChild(shockwave);
            }
        });
    };

    return (
        <>
            {/* Dark Overlay */}
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] opacity-0 pointer-events-none"
                style={{ display: isExpanded ? 'block' : 'none' }}
                onClick={handleCollapse}
            />

            {/* Article Card */}
            <div
                ref={cardRef}
                onClick={!isExpanded ? handleExpand : undefined}
                className={`
                    liquid-card p-6
                    transition-all duration-500
                    ${!isExpanded ? 'cursor-pointer hover:scale-105' : 'overflow-y-auto custom-scrollbar'}
                    relative
                `}
                style={{
                    background: isExpanded
                        ? `linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.98) 100%)`
                        : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isExpanded ? colorTheme.primary : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isExpanded
                        ? `0 0 60px ${colorTheme.glow}, inset 0 0 40px rgba(0,0,0,0.5)`
                        : '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                {/* Compact View */}
                {!isExpanded && (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            {article.icon && (
                                <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 10px ' + colorTheme.primary + ')' }}>
                                    {article.icon}
                                </span>
                            )}
                            {article.category && (
                                <span
                                    className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded-full"
                                    style={{
                                        color: colorTheme.primary,
                                        background: colorTheme.glow,
                                        border: `1px solid ${colorTheme.primary}`,
                                    }}
                                >
                                    {article.category}
                                </span>
                            )}
                            {article.date && (
                                <span className="text-xs font-mono text-slate-500">
                                    {article.date}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3
                            className="text-xl font-bold mb-3 leading-tight"
                            style={{
                                background: `linear-gradient(135deg, ${colorTheme.primary}, ${colorTheme.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            {article.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-slate-400 line-clamp-3 flex-grow">
                            {article.desc}
                        </p>

                        {/* Expand Hint */}
                        <div
                            className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-mono"
                            style={{ color: colorTheme.primary }}
                        >
                            <span>EXPAND</span>
                            <span className="animate-pulse">→</span>
                        </div>
                    </div>
                )}

                {/* Expanded View */}
                {isExpanded && (
                    <div
                        ref={contentRef}
                        className="opacity-0 translate-y-5"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleCollapse}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-500 transition-all group z-50"
                        >
                            <span className="text-white group-hover:text-red-400 text-xl">×</span>
                        </button>

                        {/* Header */}
                        <div className="mb-8">
                            {article.icon && (
                                <div className="text-6xl mb-4" style={{ filter: 'drop-shadow(0 0 20px ' + colorTheme.primary + ')' }}>
                                    {article.icon}
                                </div>
                            )}

                            <h2
                                className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
                                style={{
                                    background: `linear-gradient(135deg, ${colorTheme.primary}, ${colorTheme.secondary}, ${colorTheme.primary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    backgroundSize: '200% 200%',
                                    animation: 'gradientShift 3s ease infinite'
                                }}
                            >
                                {article.title}
                            </h2>

                            <div className="flex flex-wrap gap-4 mb-6 text-sm font-mono">
                                {article.category && (
                                    <span
                                        className="px-3 py-1 rounded-full"
                                        style={{
                                            color: colorTheme.primary,
                                            background: colorTheme.glow,
                                            border: `1px solid ${colorTheme.primary}`,
                                        }}
                                    >
                                        {article.category}
                                    </span>
                                )}
                                {article.date && (
                                    <span className="text-slate-500">{article.date}</span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="prose prose-invert prose-lg max-w-none">
                            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                                {article.desc}
                            </p>

                            <div className="space-y-6 text-slate-400">
                                <p>
                                    {article.content || `This is where the full article content would appear. The morphing card expands to fill most of the screen, providing an immersive reading experience with holographic effects and smooth animations.`}
                                </p>

                                <p>
                                    The VIB3CODE approach combines cutting-edge web technologies with aesthetic sensibilities drawn from cyberpunk and vaporwave culture. Every interaction is carefully choreographed to provide visual feedback and maintain the user's sense of spatial awareness within the 4D quantum field.
                                </p>

                                <div
                                    className="my-8 p-6 rounded-lg border-l-4"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        borderColor: colorTheme.primary,
                                        boxShadow: `0 0 20px ${colorTheme.glow}`
                                    }}
                                >
                                    <h4 className="text-2xl font-bold text-white mb-3">Key Insight</h4>
                                    <p className="text-slate-300">
                                        The intersection of AI, generative art, and web technologies is creating new possibilities for expression and interaction.
                                    </p>
                                </div>

                                {article.tags && article.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-8">
                                        {article.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 text-xs font-mono rounded-full bg-white/5 border border-white/20 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-12 pt-8 border-t border-white/10 flex gap-4">
                            <button
                                className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all"
                                style={{ borderColor: colorTheme.primary }}
                            >
                                Share Article
                            </button>
                            <button className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all">
                                Save for Later
                            </button>
                        </div>
                    </div>
                )}

                {/* Holographic Shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-[inherit]" />

                {/* Scanlines (when expanded) */}
                {isExpanded && (
                    <div className="absolute inset-0 scanlines opacity-10 pointer-events-none rounded-[inherit]" />
                )}
            </div>

            <style>{`
                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </>
    );
};

export default MorphingArticleCard;

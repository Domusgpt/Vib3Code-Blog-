import React, { useState, useRef } from 'react';
import gsap from 'gsap';

interface Article {
    title: string;
    desc: string;
    category?: string;
    date?: string;
    icon?: string;
    content?: string;
    tags?: string[];
}

interface VisualCodexCardProps {
    article: Article;
    index: number;
    accentColor: string;
}

const VisualCodexCard: React.FC<VisualCodexCardProps> = ({
    article,
    index,
    accentColor
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleExpand = () => {
        setIsExpanded(true);

        // Show backdrop
        if (overlayRef.current) {
            gsap.to(overlayRef.current, {
                opacity: 1,
                duration: 0.3
            });
        }

        // Expand card
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                borderRadius: 0,
                zIndex: 1000,
                duration: 0.6,
                ease: 'power3.inOut'
            });
        }

        // Fade in content
        if (contentRef.current) {
            gsap.to(contentRef.current, {
                opacity: 1,
                y: 0,
                delay: 0.3,
                duration: 0.4
            });
        }
    };

    const handleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Fade out content
        if (contentRef.current) {
            gsap.to(contentRef.current, {
                opacity: 0,
                y: 20,
                duration: 0.2
            });
        }

        // Shrink card
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                position: 'relative',
                top: 'auto',
                left: 'auto',
                width: '100%',
                height: 'auto',
                borderRadius: '16px',
                zIndex: 1,
                duration: 0.5,
                delay: 0.2,
                ease: 'power3.inOut',
                onComplete: () => setIsExpanded(false)
            });
        }

        // Hide backdrop
        if (overlayRef.current) {
            gsap.to(overlayRef.current, {
                opacity: 0,
                duration: 0.3,
                delay: 0.2
            });
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[999] opacity-0"
                style={{
                    display: isExpanded ? 'block' : 'none',
                    pointerEvents: isExpanded ? 'auto' : 'none'
                }}
                onClick={handleCollapse}
            />

            {/* Card */}
            <div
                ref={cardRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={!isExpanded ? handleExpand : undefined}
                className={`
                    relative rounded-xl overflow-hidden transition-all duration-500
                    ${!isExpanded ? 'cursor-pointer hover:scale-[1.01]' : ''}
                `}
                style={{
                    border: `1px solid ${isHovered || isExpanded ? accentColor + '80' : accentColor + '30'}`,
                    boxShadow: isExpanded
                        ? `0 0 80px ${accentColor}50, inset 0 0 60px rgba(0,0,0,0.8)`
                        : isHovered
                        ? `0 0 40px ${accentColor}40, 0 8px 24px rgba(0,0,0,0.6)`
                        : `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}20`
                }}
            >
                {/* Animated Gradient Background */}
                <div
                    className="absolute inset-0 pointer-events-none transition-all duration-700"
                    style={{
                        background: `
                            radial-gradient(circle at 30% 20%, ${accentColor}${isExpanded ? '60' : '40'} 0%, transparent 60%),
                            radial-gradient(circle at 70% 80%, ${accentColor}${isExpanded ? '50' : '30'} 0%, transparent 70%),
                            linear-gradient(135deg, ${accentColor}20, transparent)
                        `,
                        opacity: isHovered || isExpanded ? 0.6 : 0.4,
                        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                        animation: isExpanded ? 'pulse 4s ease-in-out infinite' : 'none'
                    }}
                />

                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                    backgroundSize: '128px'
                }} />

                {/* Content */}
                <div className="relative z-10 backdrop-blur-sm">
                    {!isExpanded ? (
                        // Compact View
                        <div className="p-6 bg-gradient-to-br from-black/70 via-black/50 to-black/70">
                            {/* Icon */}
                            {article.icon && (
                                <div
                                    className="text-4xl mb-4"
                                    style={{
                                        color: accentColor,
                                        filter: `drop-shadow(0 0 16px ${accentColor}80)`
                                    }}
                                >
                                    {article.icon}
                                </div>
                            )}

                            {/* Title */}
                            <h3
                                className="text-2xl font-bold mb-3 leading-tight tracking-tight"
                                style={{
                                    background: `linear-gradient(135deg, white, ${accentColor}DD)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    fontFamily: 'Syne, DM Sans, sans-serif'
                                }}
                            >
                                {article.title}
                            </h3>

                            {/* Category Badge */}
                            {article.category && (
                                <div
                                    className="inline-block px-2 py-0.5 mb-3 rounded text-[10px] font-mono uppercase tracking-wider border font-display"
                                    style={{
                                        color: accentColor,
                                        borderColor: `${accentColor}60`,
                                        background: `${accentColor}15`
                                    }}
                                >
                                    {article.category}
                                </div>
                            )}

                            {/* Description */}
                            <p className="text-slate-200 text-sm leading-relaxed mb-4 line-clamp-3">
                                {article.desc}
                            </p>

                            {/* Meta Info */}
                            {article.date && (
                                <div className="pt-3 border-t border-white/10">
                                    <span className="text-xs font-mono text-slate-400">
                                        {article.date}
                                    </span>
                                </div>
                            )}

                            {/* Hover Glow Line */}
                            <div
                                className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-500 ${
                                    isHovered ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{
                                    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                                    boxShadow: `0 0 16px ${accentColor}`
                                }}
                            />
                        </div>
                    ) : (
                        // Expanded View
                        <div
                            ref={contentRef}
                            className="opacity-0 translate-y-5 h-screen overflow-y-auto custom-scrollbar bg-black/70 backdrop-blur-xl"
                        >
                            <div className="max-w-4xl mx-auto p-12">
                                {/* Close Button */}
                                <button
                                    onClick={handleCollapse}
                                    className="fixed top-8 right-8 w-14 h-14 rounded-full backdrop-blur-xl border-2 hover:scale-110 transition-all group z-[1001]"
                                    style={{
                                        background: 'rgba(0,0,0,0.8)',
                                        borderColor: accentColor
                                    }}
                                >
                                    <span
                                        className="text-2xl transition-colors"
                                        style={{ color: accentColor }}
                                    >
                                        ×
                                    </span>
                                </button>

                                {/* Header */}
                                <div className="mb-12">
                                    {/* Icon */}
                                    {article.icon && (
                                        <div
                                            className="text-8xl mb-8"
                                            style={{
                                                color: accentColor,
                                                filter: `drop-shadow(0 0 30px ${accentColor})`
                                            }}
                                        >
                                            {article.icon}
                                        </div>
                                    )}

                                    {/* Category & Date */}
                                    <div className="flex flex-wrap gap-4 mb-6">
                                        {article.category && (
                                            <div
                                                className="px-4 py-2 rounded-lg font-mono text-sm uppercase tracking-wider border font-display"
                                                style={{
                                                    color: accentColor,
                                                    borderColor: `${accentColor}60`,
                                                    background: `${accentColor}15`
                                                }}
                                            >
                                                {article.category}
                                            </div>
                                        )}
                                        {article.date && (
                                            <div className="px-4 py-2 text-sm font-mono text-slate-400">
                                                {article.date}
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h1
                                        className="text-7xl md:text-8xl font-black mb-8 leading-none tracking-tighter"
                                        style={{
                                            background: `linear-gradient(135deg, ${accentColor}, white, ${accentColor})`,
                                            backgroundSize: '200% 200%',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            animation: 'gradientShift 4s ease infinite',
                                            fontFamily: 'Syne, DM Sans, sans-serif'
                                        }}
                                    >
                                        {article.title}
                                    </h1>
                                </div>

                                {/* Content */}
                                <div className="prose prose-invert prose-2xl max-w-none">
                                    {/* Lead Paragraph */}
                                    <p className="text-2xl text-slate-200 leading-relaxed mb-12 font-light">
                                        {article.desc}
                                    </p>

                                    {/* Divider */}
                                    <div className="flex items-center gap-4 my-12">
                                        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                background: accentColor,
                                                boxShadow: `0 0 12px ${accentColor}`
                                            }}
                                        />
                                        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />
                                    </div>

                                    {/* Body Content */}
                                    <div className="space-y-8 text-lg text-slate-300 leading-relaxed">
                                        <p>
                                            {article.content || `This article explores the intersection of cutting-edge technology and creative expression. Through elegant design principles, we examine how form and function converge to create experiences that transcend traditional boundaries.`}
                                        </p>

                                        <p>
                                            The approach demonstrates how complexity can be managed through thoughtful abstraction. Each element serves a distinct purpose while contributing to a harmonious whole—a principle that applies equally to code architecture and visual design.
                                        </p>

                                        {/* Callout Box */}
                                        <div
                                            className="my-12 p-8 rounded-2xl border-l-4"
                                            style={{
                                                background: `linear-gradient(135deg, ${accentColor}08, transparent)`,
                                                borderColor: accentColor
                                            }}
                                        >
                                            <h3 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
                                                <span style={{ color: accentColor }}>⚡</span>
                                                Key Insight
                                            </h3>
                                            <p className="text-xl text-slate-200 leading-relaxed">
                                                Effective design systems emerge from the recognition that constraints breed creativity. By establishing clear patterns and principles, we create frameworks that empower rather than limit.
                                            </p>
                                        </div>

                                        <p>
                                            The future belongs to those who can synthesize technical mastery with aesthetic sensibility. This represents a bridge between the analytical and the creative, the systematic and the expressive.
                                        </p>

                                        {/* Tags */}
                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-3 pt-8">
                                                {article.tags.map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-4 py-2 text-sm font-mono rounded-full bg-white/5 border border-white/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer font-display"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-16 pt-12 border-t border-white/10 flex gap-4">
                                    <button
                                        className="px-8 py-4 rounded-full font-mono text-sm uppercase tracking-wider border-2 transition-all hover:scale-105 font-display"
                                        style={{
                                            borderColor: accentColor,
                                            background: `${accentColor}20`,
                                            color: accentColor
                                        }}
                                    >
                                        Share
                                    </button>
                                    <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all text-white font-mono text-sm uppercase tracking-wider font-display">
                                        Bookmark
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scanlines (Expanded Only) */}
                {isExpanded && (
                    <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />
                )}
            </div>

            <style>{`
                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.02); }
                }
            `}</style>
        </>
    );
};

export default VisualCodexCard;

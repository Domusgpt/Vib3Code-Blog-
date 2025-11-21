import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import MultilayerVisualizer, { MultilayerVisualizerRef } from './MultilayerVisualizer';
import { ShaderUniforms } from '../services/vib3-plus/MultilayerHolographicShader';

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
    shaderPreset?: Partial<ShaderUniforms>;
}

const VisualCodexCard: React.FC<VisualCodexCardProps> = ({
    article,
    index,
    accentColor,
    shaderPreset
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const visualizerRef = useRef<MultilayerVisualizerRef>(null);

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

        // Pulse visualizer
        visualizerRef.current?.triggerPulse();
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
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[999] opacity-0 pointer-events-none"
                style={{ display: isExpanded ? 'block' : 'none' }}
                onClick={handleCollapse}
            />

            {/* Card */}
            <div
                ref={cardRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={!isExpanded ? handleExpand : undefined}
                className={`
                    relative rounded-2xl overflow-hidden transition-all duration-500
                    ${!isExpanded ? 'cursor-pointer' : ''}
                `}
                style={{
                    border: `1px solid ${isHovered || isExpanded ? accentColor : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isExpanded
                        ? `0 0 80px ${accentColor}40, inset 0 0 60px rgba(0,0,0,0.8)`
                        : isHovered
                        ? `0 0 30px ${accentColor}30`
                        : '0 2px 12px rgba(0,0,0,0.4)'
                }}
            >
                {/* Visualizer Background */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <MultilayerVisualizer
                        ref={visualizerRef}
                        baseParams={{
                            ...shaderPreset,
                            u_intensity: isExpanded ? 0.6 : 0.3,
                            u_gridDensity: isExpanded ? 12.0 : 4.0
                        }}
                    />
                </div>

                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                    backgroundSize: '128px'
                }} />

                {/* Content */}
                <div className="relative z-10 backdrop-blur-sm">
                    {!isExpanded ? (
                        /* Compact View */
                        <div className="p-8 bg-gradient-to-br from-black/80 via-black/60 to-black/80">
                            {/* Header Bar */}
                            <div className="flex items-center justify-between mb-6">
                                {/* Category Badge */}
                                {article.category && (
                                    <div
                                        className="px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider border"
                                        style={{
                                            color: accentColor,
                                            borderColor: `${accentColor}40`,
                                            background: `${accentColor}10`
                                        }}
                                    >
                                        {article.category}
                                    </div>
                                )}

                                {/* Icon */}
                                {article.icon && (
                                    <div
                                        className="text-3xl"
                                        style={{
                                            color: accentColor,
                                            filter: `drop-shadow(0 0 12px ${accentColor})`
                                        }}
                                    >
                                        {article.icon}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <h3
                                className="text-3xl font-bold mb-4 leading-tight tracking-tight"
                                style={{
                                    background: `linear-gradient(135deg, ${accentColor}, white)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                {article.title}
                            </h3>

                            {/* Description */}
                            <p className="text-slate-300 leading-relaxed mb-6 line-clamp-3">
                                {article.desc}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                {article.date && (
                                    <span className="text-xs font-mono text-slate-500">
                                        {article.date}
                                    </span>
                                )}

                                {/* Expand Button */}
                                <div
                                    className="flex items-center gap-2 text-sm font-mono transition-transform duration-300"
                                    style={{
                                        color: accentColor,
                                        transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
                                    }}
                                >
                                    <span>READ MORE</span>
                                    <span>→</span>
                                </div>
                            </div>

                            {/* Hover Glow Line */}
                            <div
                                className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-500 ${
                                    isHovered ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{
                                    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                                    boxShadow: `0 0 12px ${accentColor}`
                                }}
                            />
                        </div>
                    ) : (
                        /* Expanded View */
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
                                                className="px-4 py-2 rounded-lg font-mono text-sm uppercase tracking-wider border"
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
                                            animation: 'gradientShift 4s ease infinite'
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
                                            {article.content || `This article explores the intersection of cutting-edge technology and creative expression. Through the lens of the Visual Codex design system, we examine how form and function converge to create experiences that transcend traditional boundaries.`}
                                        </p>

                                        <p>
                                            The multilayer approach to visualization demonstrates how complexity can be managed through elegant abstraction. Each layer serves a distinct purpose while contributing to a harmonious whole—a principle that applies equally to code architecture and visual design.
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
                                            The future belongs to those who can synthesize technical mastery with aesthetic sensibility. The Visual Codex represents this synthesis—a bridge between the analytical and the creative, the systematic and the expressive.
                                        </p>

                                        {/* Tags */}
                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-3 pt-8">
                                                {article.tags.map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-4 py-2 text-sm font-mono rounded-full bg-white/5 border border-white/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
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
                                        className="px-8 py-4 rounded-full font-mono text-sm uppercase tracking-wider border-2 transition-all hover:scale-105"
                                        style={{
                                            borderColor: accentColor,
                                            background: `${accentColor}20`,
                                            color: accentColor
                                        }}
                                    >
                                        Share
                                    </button>
                                    <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all text-white font-mono text-sm uppercase tracking-wider">
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
            `}</style>
        </>
    );
};

export default VisualCodexCard;

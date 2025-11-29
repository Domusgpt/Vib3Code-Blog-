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

interface EnhancedArticleCardProps {
    article: Article;
    index: number;
    accentColor: string;
    shaderPreset?: Partial<ShaderUniforms>;
}

const EnhancedArticleCard: React.FC<EnhancedArticleCardProps> = ({
    article,
    index,
    accentColor,
    shaderPreset
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const visualizerRef = useRef<MultilayerVisualizerRef>(null);
    const miniVisualizerRef = useRef<MultilayerVisualizerRef>(null);

    // Geometry type based on index
    const geometryType = index % 8;

    // Color as RGB
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0.3, g: 0.7, b: 1.0 };
    };

    const rgb = hexToRgb(accentColor);
    const hue = (Math.atan2(rgb.b - rgb.r, rgb.g - rgb.r) / (2 * Math.PI) + 1) % 1;

    const defaultPreset: Partial<ShaderUniforms> = {
        u_geometryType: geometryType,
        u_gridDensity: 3.0 + index * 0.5,
        u_morphFactor: 0.3 + (index * 0.1),
        u_chaos: 0.05,
        u_speed: 0.8,
        u_hue: hue,
        u_intensity: 0.8,
        u_saturation: 0.7,
        u_mouseIntensity: 0.3,
        ...shaderPreset
    };

    useEffect(() => {
        if (isHovered && miniVisualizerRef.current) {
            miniVisualizerRef.current.triggerPulse();
        }
    }, [isHovered]);

    const handleExpand = () => {
        if (!cardRef.current || !contentRef.current) return;

        setIsExpanded(true);

        // Animate card expansion
        gsap.to(cardRef.current, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            borderRadius: 0,
            zIndex: 100,
            duration: 0.6,
            ease: 'power3.inOut'
        });

        // Fade in content
        gsap.to(contentRef.current, {
            opacity: 1,
            y: 0,
            delay: 0.3,
            duration: 0.4,
            ease: 'power2.out'
        });

        // Trigger visualizer pulse
        if (visualizerRef.current) {
            visualizerRef.current.triggerPulse();
        }
    };

    const handleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!cardRef.current || !contentRef.current) return;

        // Fade out content first
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
            borderRadius: '20px',
            zIndex: 1,
            duration: 0.5,
            delay: 0.2,
            ease: 'power3.inOut',
            onComplete: () => {
                setIsExpanded(false);
            }
        });
    };

    return (
        <div
            ref={cardRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={!isExpanded ? handleExpand : undefined}
            className={`
                relative rounded-2xl border transition-all duration-500 overflow-hidden
                ${!isExpanded ? 'cursor-pointer hover:scale-105' : ''}
            `}
            style={{
                borderColor: isHovered || isExpanded ? accentColor : 'rgba(255,255,255,0.1)',
                boxShadow: isExpanded
                    ? `inset 0 0 100px ${accentColor}20`
                    : isHovered
                    ? `0 0 30px ${accentColor}40`
                    : '0 4px 20px rgba(0,0,0,0.3)'
            }}
        >
            {/* Mini Visualizer (Compact View) */}
            {!isExpanded && (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <MultilayerVisualizer
                        ref={miniVisualizerRef}
                        baseParams={defaultPreset}
                    />
                </div>
            )}

            {/* Full Visualizer (Expanded View) */}
            {isExpanded && (
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <MultilayerVisualizer
                        ref={visualizerRef}
                        baseParams={{
                            ...defaultPreset,
                            u_intensity: 1.2,
                            u_gridDensity: 8.0
                        }}
                    />
                </div>
            )}

            {/* Card Content */}
            <div className="relative z-10">
                {/* Compact View */}
                {!isExpanded && (
                    <div className="p-6 backdrop-blur-sm bg-black/40">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            {article.icon && (
                                <span
                                    className="text-4xl"
                                    style={{
                                        filter: `drop-shadow(0 0 10px ${accentColor})`,
                                        color: accentColor
                                    }}
                                >
                                    {article.icon}
                                </span>
                            )}
                            <div className="flex gap-2 items-center">
                                {article.category && (
                                    <span
                                        className="text-xs font-mono uppercase px-2 py-1 rounded-full border"
                                        style={{
                                            color: accentColor,
                                            borderColor: accentColor,
                                            background: `${accentColor}20`
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
                        </div>

                        {/* Title */}
                        <h3
                            className="text-2xl font-bold mb-3 leading-tight"
                            style={{ color: accentColor }}
                        >
                            {article.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-slate-300 line-clamp-3 mb-4">
                            {article.desc}
                        </p>

                        {/* Expand Hint */}
                        <div
                            className="flex items-center gap-2 text-xs font-mono pt-4 border-t border-white/10"
                            style={{ color: accentColor }}
                        >
                            <span>EXPLORE</span>
                            <span className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
                                →
                            </span>
                        </div>
                    </div>
                )}

                {/* Expanded View */}
                {isExpanded && (
                    <div
                        ref={contentRef}
                        className="opacity-0 translate-y-5 h-full overflow-y-auto custom-scrollbar"
                    >
                        <div className="min-h-full p-12 backdrop-blur-xl bg-black/60">
                            {/* Close Button */}
                            <button
                                onClick={handleCollapse}
                                className="fixed top-8 right-8 w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border hover:bg-red-500/20 transition-all group z-50"
                                style={{ borderColor: accentColor }}
                            >
                                <span className="text-white text-2xl group-hover:text-red-400">
                                    ×
                                </span>
                            </button>

                            {/* Header */}
                            <div className="max-w-4xl mx-auto">
                                {article.icon && (
                                    <div
                                        className="text-8xl mb-6"
                                        style={{
                                            filter: `drop-shadow(0 0 30px ${accentColor})`,
                                            color: accentColor
                                        }}
                                    >
                                        {article.icon}
                                    </div>
                                )}

                                <h2
                                    className="text-6xl md:text-8xl font-bold mb-6 leading-tight"
                                    style={{ color: accentColor }}
                                >
                                    {article.title}
                                </h2>

                                <div className="flex flex-wrap gap-4 mb-8 text-sm font-mono">
                                    {article.category && (
                                        <span
                                            className="px-4 py-2 rounded-full border"
                                            style={{
                                                color: accentColor,
                                                borderColor: accentColor,
                                                background: `${accentColor}20`
                                            }}
                                        >
                                            {article.category}
                                        </span>
                                    )}
                                    {article.date && (
                                        <span className="text-slate-500 py-2">
                                            {article.date}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="prose prose-invert prose-xl max-w-none">
                                    <p className="text-2xl text-slate-200 mb-8 leading-relaxed">
                                        {article.desc}
                                    </p>

                                    <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
                                        <p>
                                            {article.content || `This article explores the cutting-edge intersection of AI, generative art, and web technologies. Through practical examples and deep technical insights, we'll uncover the patterns that define the future of digital experiences.`}
                                        </p>

                                        <p>
                                            The VIB3CODE philosophy embraces the quantum nature of modern computing—where data flows through multiple dimensions, visualizations respond to user intent in real-time, and interfaces become living, breathing entities rather than static representations.
                                        </p>

                                        <div
                                            className="my-8 p-8 rounded-lg border-l-4"
                                            style={{
                                                background: `${accentColor}10`,
                                                borderColor: accentColor
                                            }}
                                        >
                                            <h4 className="text-2xl font-bold text-white mb-4">
                                                Key Insight
                                            </h4>
                                            <p className="text-slate-200">
                                                The multilayer holographic shader system demonstrates how additive composition can create depth and complexity without overwhelming the visual field. Each layer contributes its unique frequency, harmonizing into a coherent whole.
                                            </p>
                                        </div>

                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-3 mt-12">
                                                {article.tags.map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-4 py-2 text-sm font-mono rounded-full bg-white/5 border border-white/20 text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-16 pt-8 border-t border-white/10 flex gap-4">
                                    <button
                                        className="px-8 py-4 rounded-full border transition-all hover:scale-105"
                                        style={{
                                            borderColor: accentColor,
                                            background: `${accentColor}20`,
                                            color: accentColor
                                        }}
                                    >
                                        Share Article
                                    </button>
                                    <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all text-white">
                                        Save for Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanlines Overlay (Expanded Only) */}
            {isExpanded && (
                <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />
            )}
        </div>
    );
};

export default EnhancedArticleCard;

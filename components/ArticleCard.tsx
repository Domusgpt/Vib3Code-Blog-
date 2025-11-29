import React, { useState, useRef } from 'react';
import gsap from 'gsap';

interface Article {
    title: string;
    desc: string;
    category?: string;
    date?: string;
    tags?: string[];
}

interface ArticleCardProps {
    article: Article;
    accentColor: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, accentColor }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleExpand = () => {
        setIsExpanded(true);
        document.body.style.overflow = 'hidden';

        if (overlayRef.current) {
            gsap.to(overlayRef.current, { opacity: 1, duration: 0.3 });
        }
    };

    const handleCollapse = () => {
        setIsExpanded(false);
        document.body.style.overflow = 'auto';

        if (overlayRef.current) {
            gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 });
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isExpanded && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] opacity-0"
                    onClick={handleCollapse}
                />
            )}

            {/* Card */}
            <div
                ref={cardRef}
                className={`
                    relative group cursor-pointer transition-all duration-300
                    ${isExpanded ? 'fixed inset-4 md:inset-12 z-[101] overflow-y-auto' : ''}
                `}
                onClick={!isExpanded ? handleExpand : undefined}
            >
                <div
                    className={`
                        bg-black/80 backdrop-blur-xl border border-white/10
                        transition-all duration-300
                        ${isExpanded ? 'rounded-none h-full' : 'rounded-lg hover:border-white/20 min-h-[280px]'}
                    `}
                    style={{
                        borderColor: isExpanded ? accentColor : undefined
                    }}
                >
                    <div className={`p-6 ${isExpanded ? 'max-w-4xl mx-auto py-12' : ''}`}>
                        {/* Close Button (Expanded Only) */}
                        {isExpanded && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollapse();
                                }}
                                className="fixed top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all z-[102] flex items-center justify-center"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        )}

                        {/* Category Badge */}
                        {article.category && (
                            <div
                                className="inline-block px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider mb-4"
                                style={{
                                    background: `${accentColor}20`,
                                    color: accentColor,
                                    border: `1px solid ${accentColor}40`
                                }}
                            >
                                {article.category}
                            </div>
                        )}

                        {/* Title */}
                        <h3
                            className={`font-bold mb-4 leading-tight ${
                                isExpanded ? 'text-6xl md:text-7xl' : 'text-2xl md:text-3xl'
                            }`}
                            style={{ color: isExpanded ? accentColor : '#fff' }}
                        >
                            {article.title}
                        </h3>

                        {/* Description */}
                        <p className={`text-slate-300 leading-relaxed ${
                            isExpanded ? 'text-xl mb-8' : 'text-base mb-4 line-clamp-3'
                        }`}>
                            {article.desc}
                        </p>

                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="prose prose-invert prose-lg max-w-none space-y-6">
                                <p className="text-slate-300">
                                    This article explores cutting-edge concepts in AI, web technologies, and digital experiences.
                                    Through practical examples and deep analysis, we uncover the patterns shaping the future of the web.
                                </p>

                                <div
                                    className="p-6 rounded-lg border-l-4 my-8"
                                    style={{
                                        background: `${accentColor}10`,
                                        borderColor: accentColor
                                    }}
                                >
                                    <h4 className="text-xl font-bold text-white mb-3">Key Insight</h4>
                                    <p className="text-slate-300">
                                        The intersection of AI and creative technology is creating unprecedented opportunities
                                        for expression and innovation in digital spaces.
                                    </p>
                                </div>

                                <p className="text-slate-300">
                                    The VIB3CODE philosophy embraces systematic creativity—establishing frameworks that
                                    empower rather than constrain, enabling rapid iteration while maintaining coherent aesthetics.
                                </p>

                                {/* Tags */}
                                {article.tags && article.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-6">
                                        {article.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 text-sm rounded-full bg-white/5 border border-white/10 text-slate-400"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Meta Info (Compact Only) */}
                        {!isExpanded && (
                            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                                {article.date && (
                                    <span className="text-xs text-slate-500 font-mono">{article.date}</span>
                                )}
                                <span
                                    className="text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: accentColor }}
                                >
                                    Read more →
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ArticleCard;

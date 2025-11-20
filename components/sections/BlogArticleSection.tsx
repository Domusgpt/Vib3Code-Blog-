import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import MorphingArticleCard from '../ui/MorphingArticleCard';

gsap.registerPlugin(ScrollTrigger);

interface Article {
    title: string;
    desc: string;
    category?: string;
    date?: string;
    icon?: string;
    content?: string;
    tags?: string[];
}

interface BlogArticleSectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
    sectionTitle: string;
    sectionSubtitle: string;
    sectionIcon: string;
    articles: Article[];
    accentColor: string;
    visualizerParams?: any;
}

const BlogArticleSection: React.FC<BlogArticleSectionProps> = ({
    visualizerRef,
    sectionTitle,
    sectionSubtitle,
    sectionIcon,
    articles,
    accentColor,
    visualizerParams
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Choreograph Visualizer to Scroll
        ScrollTrigger.create({
            trigger: container,
            scroller: container,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            onUpdate: (self) => {
                if (visualizerParams) {
                    // Dynamically adjust visualizer based on scroll
                    visualizerRef.current?.updateParams({
                        ...visualizerParams,
                        rotationSpeed: visualizerParams.rotationSpeed * (1 + self.progress * 0.5),
                        morphFactor: (visualizerParams.morphFactor || 0) + (self.progress * 0.3),
                    });
                }
            }
        });

        // Parallax header
        if (headerRef.current) {
            gsap.to(headerRef.current, {
                y: -100,
                opacity: 0.5,
                ease: "none",
                scrollTrigger: {
                    trigger: container,
                    scroller: container,
                    start: "top top",
                    end: "center top",
                    scrub: true
                }
            });
        }

        // Stagger animate cards on scroll
        if (gridRef.current) {
            const cards = gridRef.current.querySelectorAll('.article-card');
            gsap.from(cards, {
                y: 100,
                opacity: 0,
                stagger: 0.1,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: gridRef.current,
                    scroller: container,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        }

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, [visualizerParams]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-auto custom-scrollbar relative"
        >
            {/* Gradient Overlay at top */}
            <div className="sticky top-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />

            <div className="min-h-full w-full px-6 md:px-12 py-12">
                {/* Section Header */}
                <div
                    ref={headerRef}
                    className="text-center mb-16 sticky top-12 z-10"
                >
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl backdrop-blur-xl border-2"
                            style={{
                                borderColor: accentColor,
                                boxShadow: `0 0 30px ${accentColor}40`,
                                background: `radial-gradient(circle, ${accentColor}20, transparent)`
                            }}
                        >
                            {sectionIcon}
                        </div>
                    </div>

                    <h2
                        className="text-6xl md:text-8xl font-bold mb-4 tracking-tight"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor}, white, ${accentColor})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            backgroundSize: '200% 200%',
                            textShadow: `0 0 80px ${accentColor}60`,
                        }}
                    >
                        {sectionTitle}
                    </h2>

                    <p className="text-lg md:text-xl text-slate-400 font-mono tracking-wide">
                        {sectionSubtitle}
                    </p>

                    {/* Decorative Line */}
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/20" />
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
                        />
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/20" />
                    </div>
                </div>

                {/* Articles Grid */}
                <div
                    ref={gridRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-24"
                >
                    {articles.map((article, i) => (
                        <div key={i} className="article-card">
                            <MorphingArticleCard
                                article={article}
                                index={i}
                                accentColor={accentColor}
                            />
                        </div>
                    ))}
                </div>

                {/* Bottom Gradient */}
                <div className="h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
            </div>

            {/* Floating Decorative Elements */}
            <div
                className="fixed top-[10%] left-[5%] text-8xl opacity-5 pointer-events-none animate-float-1"
                style={{ color: accentColor }}
            >
                {sectionIcon}
            </div>
            <div
                className="fixed bottom-[20%] right-[8%] text-6xl opacity-5 pointer-events-none animate-float-2"
                style={{ color: accentColor }}
            >
                {sectionIcon}
            </div>
        </div>
    );
};

export default BlogArticleSection;

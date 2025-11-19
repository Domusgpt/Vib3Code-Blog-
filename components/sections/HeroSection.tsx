
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import { BLOG_CONTENT } from '../../constants';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const HeroSection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        
        // Choreograph Visualizer to Scroll
        ScrollTrigger.create({
            trigger: textRef.current,
            scroller: container,
            start: "top center",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                // Mutate visualizer params based on scroll progress
                visualizerRef.current?.updateParams({
                    rotationSpeed: 0.2 + (self.progress * 0.5),
                    morphFactor: self.progress * 0.8,
                    gridDensity: 18 + (self.progress * 10)
                });
            }
        });

        // Parallax Elements
        gsap.utils.toArray('.parallax-item').forEach((item: any, i) => {
            gsap.to(item, {
                y: (i + 1) * -100,
                ease: "none",
                scrollTrigger: {
                    trigger: container,
                    scroller: container,
                    start: "top top",
                    end: "bottom top",
                    scrub: true
                }
            });
        });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            {/* Scrollable Content Area */}
            <div className="min-h-[150vh] w-full flex flex-col items-center pt-[30vh]">
                
                {/* Floating Parallax Elements */}
                <div className="fixed top-[20%] left-[15%] text-6xl opacity-10 parallax-item animate-float-1 font-mono">{"{ }"}</div>
                <div className="fixed top-[60%] right-[10%] text-8xl opacity-5 parallax-item animate-float-2 font-mono">&lt;/&gt;</div>
                <div className="fixed bottom-[20%] left-[25%] text-4xl opacity-10 parallax-item animate-float-3 font-mono">0x</div>

                <div ref={textRef} className="text-center z-10 max-w-4xl px-6">
                    <div className="flex items-center justify-center gap-4 mb-6 opacity-80">
                        <span className="text-cyan-400 text-2xl">::</span>
                        <span className="text-white font-mono tracking-widest">SYSTEM.INIT</span>
                        <span className="text-cyan-200 text-sm">v1.4</span>
                    </div>
                    
                    <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-cyan-900">
                        VIB3<br/>CODE
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-24">
                        Explorations in <strong className="text-cyan-400">AI</strong>, <strong className="text-purple-400">Generative Art</strong>, and the <strong className="text-teal-400">Future of Web</strong>.<br/>
                        Coding at the speed of thought.
                    </p>

                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-8">Featured Articles</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 mb-48 w-full">
                        {BLOG_CONTENT.hero.featured.map((post, i) => (
                            <div key={i} className="liquid-card p-6 flex flex-col items-start text-left group cursor-pointer">
                                {/* Article Metadata */}
                                <div className="flex justify-between w-full mb-4 text-xs font-mono text-cyan-500/70">
                                    <span>{post.category.toUpperCase()}</span>
                                    <span>{post.date}</span>
                                </div>
                                
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">{post.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-3 mb-4">{post.desc}</p>
                                
                                <div className="mt-auto text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                                    Read Article <span>→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;

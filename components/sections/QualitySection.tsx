
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import { BLOG_CONTENT } from '../../constants';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const QualitySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !cardsRef.current) return;
        const container = containerRef.current;

        // Visualizer Choreography - Hypercube distortion/glitch
        ScrollTrigger.create({
            trigger: cardsRef.current,
            scroller: container,
            start: "top center",
            end: "bottom center",
            scrub: 1,
            onUpdate: (self) => {
                visualizerRef.current?.updateParams({
                    glitchIntensity: self.progress * 0.05, // Introduce slight glitch
                    gridDensity: 28 + (self.progress * 10),
                    rotationSpeed: 1.5 + (Math.sin(self.progress * Math.PI) * 0.5)
                });
            }
        });

    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            <div className="min-h-[130vh] w-full flex flex-col items-center pt-32 pb-32 px-4">
                
                <h2 className="text-5xl md:text-7xl font-bold mb-6 text-center">
                    Deep <span className="text-cyan-400">Dives</span>
                </h2>
                <p className="text-xl text-slate-400 mb-20 text-center max-w-xl">
                    Technical case studies and architectural breakdowns.
                </p>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full">
                    {BLOG_CONTENT.quality.map((post, i) => (
                        <div key={i} className="liquid-card p-8 flex flex-col items-start justify-start text-left group relative overflow-hidden min-h-[320px] cursor-pointer">
                            
                            <div className="absolute top-4 right-4 text-xs font-mono px-2 py-1 rounded border border-white/10 text-white/50 group-hover:border-cyan-400/50 group-hover:text-cyan-400 transition-colors">
                                {post.category}
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-4 relative z-10 group-hover:text-cyan-300 transition-colors">{post.title}</h3>
                            <p className="text-slate-300 leading-relaxed relative z-10 mb-6">{post.desc}</p>
                            
                            <div className="mt-auto relative z-10 w-full pt-4 border-t border-white/10 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-mono">EST. READ: 8 MIN</span>
                                <span className="text-cyan-400">Read →</span>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default QualitySection;

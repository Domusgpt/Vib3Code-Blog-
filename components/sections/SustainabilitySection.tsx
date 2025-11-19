
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import { BLOG_CONTENT } from '../../constants';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const SustainabilitySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !listRef.current) return;
        const container = containerRef.current;

        // Visualizer Choreography - Organic, slow, hypersphere
        ScrollTrigger.create({
            trigger: listRef.current,
            scroller: container,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                visualizerRef.current?.updateParams({
                    rotationSpeed: 0.3 + (Math.sin(self.progress * Math.PI * 2) * 0.2), // Ebb and flow
                    shellWidth: 0.025 + (self.progress * 0.02),
                    morphFactor: 0.5 + (self.progress * 0.3)
                });
            }
        });

    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            <div className="min-h-[120vh] w-full flex flex-col items-center pt-32 pb-32 px-4">
                
                <h2 className="text-5xl md:text-6xl font-bold mb-6 text-center">Future Signals</h2>
                <p className="text-xl text-slate-400 mb-20 text-center max-w-xl">
                    Weak signals from the edge of tomorrow. Predictions for the post-AGI world.
                </p>

                <div ref={listRef} className="grid grid-cols-1 gap-6 max-w-4xl w-full">
                    {BLOG_CONTENT.sustainability.map((topic, i) => (
                        <div key={i} className="wave-card relative bg-slate-900/50 border border-white/5 rounded-xl p-8 flex flex-col md:flex-row md:items-center gap-6 overflow-hidden group hover:border-cyan-500/30 transition-colors duration-500 cursor-pointer">
                            
                            <div className="text-cyan-400 text-4xl opacity-50 group-hover:opacity-100 transition-opacity font-mono">0{i+1}</div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold text-white mb-2">{topic.title}</h3>
                                <p className="text-slate-400">{topic.desc}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500 text-cyan-400">
                                Read →
                            </div>

                            {/* Wave Reveal Effect Element */}
                            <div className="absolute inset-0 pointer-events-none animate-wave opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default SustainabilitySection;

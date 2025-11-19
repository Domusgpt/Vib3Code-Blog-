
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import { BLOG_CONTENT } from '../../constants';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const PillarsSection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !cardsRef.current) return;
        const container = containerRef.current;

        // Visualizer Choreography - Tetrahedrons sharpen on scroll
        ScrollTrigger.create({
            trigger: cardsRef.current,
            scroller: container,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                visualizerRef.current?.updateParams({
                    tetraThickness: 0.035 - (self.progress * 0.02), // Sharpen lines
                    rotationSpeed: 0.4 + (self.progress * 0.6),
                    colorShift: self.progress * 0.3
                });
            }
        });

    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            <div className="min-h-[120vh] w-full flex flex-col items-center pt-32 pb-32 px-4">
                
                <h2 className="text-5xl md:text-6xl font-bold mb-6 text-center">The Stack</h2>
                <p className="text-xl text-slate-400 mb-20 text-center max-w-xl">
                    The foundational technologies powering the next generation of the web.
                </p>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl w-full perspective-1000">
                    {BLOG_CONTENT.pillars.map((pillar, i) => (
                        <div key={i} className="group h-[320px] w-full relative preserve-3d cursor-pointer">
                            {/* Front */}
                            <div className="liquid-card absolute inset-0 backface-hidden bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 backdrop-blur-md transition-all duration-500 group-hover:border-teal-400/50 group-hover:shadow-[0_0_30px_rgba(38,166,154,0.2)]">
                                <div className="text-6xl mb-6">{pillar.icon}</div>
                                <h3 className="text-3xl font-bold text-white">{pillar.title}</h3>
                                <div className="absolute bottom-6 text-teal-400 text-sm opacity-50 group-hover:opacity-100">Hover to Inspect</div>
                            </div>
                            
                            {/* Back */}
                            <div className="liquid-card absolute inset-0 backface-hidden bg-gradient-to-br from-teal-900 to-slate-900 border border-teal-500/30 rounded-2xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]">
                                <h3 className="text-2xl font-bold text-teal-300 mb-4">{pillar.title}</h3>
                                <p className="text-center text-slate-300 leading-relaxed mb-6">{pillar.desc}</p>
                                <button className="px-6 py-2 rounded-full border border-teal-400/50 text-teal-400 hover:bg-teal-400 hover:text-black transition-colors">
                                    View Tutorials
                                </button>
                            </div>

                            {/* Hover Effect - using CSS group-hover to rotate */}
                            <style>{`
                                .group:hover { transform: rotateY(180deg); transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
                            `}</style>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PillarsSection;

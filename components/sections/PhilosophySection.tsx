
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';
import { BLOG_CONTENT } from '../../constants';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const PhilosophySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !gridRef.current) return;
        const container = containerRef.current;

        // Staggered Grid Reveal
        gsap.fromTo(gridRef.current.children, 
            { opacity: 0, scale: 0.8, y: 50 },
            { 
                opacity: 1, scale: 1, y: 0, 
                duration: 0.8, 
                stagger: 0.1,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: gridRef.current,
                    scroller: container,
                    start: "top 80%",
                    end: "bottom 80%",
                    toggleActions: "play none none reverse"
                }
            }
        );

        // Visualizer Choreography
        ScrollTrigger.create({
            trigger: gridRef.current,
            scroller: container,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                visualizerRef.current?.updateParams({
                    morphFactor: 0.8 + (self.progress * 0.2),
                    patternIntensity: 1.0 + (self.progress * 1.0),
                    colorShift: self.progress * 0.5
                });
            }
        });

    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            <div className="min-h-[120vh] w-full flex flex-col items-center pt-32 pb-32 px-4">
                
                <div className="text-center mb-16">
                    <h2 className="text-5xl md:text-6xl font-bold mb-6 font-sans">
                        Core <span className="text-purple-400">Concepts</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Exploring the theoretical frameworks and ethical landscapes of the <strong className="text-white">Post-Digital</strong> era.
                    </p>
                </div>

                <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-purple-500/20 border border-purple-500/20 w-full max-w-6xl">
                    {BLOG_CONTENT.philosophy.map((item, i) => (
                        <div key={i} className="bg-slate-950/90 p-10 aspect-square flex flex-col items-start justify-between text-left group grid-cell-hover transition-all duration-500 relative overflow-hidden cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="relative z-10">
                                <span className="text-xs font-mono text-purple-400 mb-2 block">0{i+1} // CONCEPT</span>
                                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed text-sm">{item.desc}</p>
                            </div>
                            
                            <div className="mt-6 text-purple-400 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 font-mono text-sm">
                                [ READ ENTRY ]
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PhilosophySection;

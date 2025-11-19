
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VisualizerRef } from '../VisualizerCanvas';

gsap.registerPlugin(ScrollTrigger);

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const ContactSection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        // Visualizer Choreography - Calm, geometric, high tech
        ScrollTrigger.create({
            trigger: formRef.current,
            scroller: container,
            start: "top center",
            end: "bottom center",
            scrub: 1,
            onUpdate: (self) => {
                visualizerRef.current?.updateParams({
                    gridDensity: 12 + (self.progress * 8),
                    rotationSpeed: 0.1, // Slow and steady
                    patternIntensity: 0.5 + (self.progress * 0.5)
                });
            }
        });
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto custom-scrollbar relative">
            <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
                
                <h2 className="text-5xl md:text-7xl font-bold mb-12 text-center tracking-tight">Join the Network</h2>

                <div ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
                    
                    {/* Holo Cards */}
                    {[
                        { label: "Discord", value: "vib3.code/discord" },
                        { label: "GitHub", value: "@vib3-labs" },
                        { label: "Substack", value: "vib3code.substack" },
                        { label: "Status", value: "Systems Operational" }
                    ].map((item, i) => (
                        <div key={i} className="holographic cursor-pointer relative bg-slate-900/80 border-2 border-cyan-500/20 p-8 overflow-hidden group hover:border-cyan-400 transition-colors duration-300">
                            <h3 className="text-cyan-500 text-sm tracking-widest uppercase mb-2">{item.label}</h3>
                            <p className="text-2xl md:text-3xl font-light text-white font-mono">{item.value}</p>
                            
                            {/* Glitch Hover Effect */}
                            <div className="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </div>
                    ))}

                </div>

                <div className="mt-16 flex flex-col items-center">
                    <p className="text-slate-400 mb-6">Subscribe to the weekly transmission.</p>
                    <button className="px-12 py-4 bg-cyan-500 text-slate-900 font-bold text-lg tracking-widest uppercase hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(79,195,247,0.5)]">
                        Initiate Sequence
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ContactSection;

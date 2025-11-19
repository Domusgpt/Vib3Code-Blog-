import React from 'react';

interface BlogSectionProps {
    title: string;
    subtitle: string;
    content: string;
    isActive: boolean;
}

const BlogSection: React.FC<BlogSectionProps> = ({ title, subtitle, content, isActive }) => {
    return (
        <div className={`
            relative w-full max-w-4xl mx-auto p-8 rounded-3xl
            transition-all duration-700 transform
            border border-white/10 backdrop-blur-xl
            ${isActive 
                ? 'opacity-100 translate-y-0 scale-100 bg-white/5' 
                : 'opacity-30 translate-y-24 scale-95 bg-black/20 grayscale'}
        `}>
            {/* Decorative Corner */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-400/30 rounded-tl-3xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500/30 rounded-br-3xl" />

            <div className="relative z-10">
                <h2 className="text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white/50">
                    {title}
                </h2>
                <h3 className="text-xl md:text-2xl text-cyan-400 mb-8 font-light tracking-wide">
                    {subtitle}
                </h3>
                
                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="leading-relaxed text-slate-300">
                        {content}
                    </p>
                    
                    {isActive && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-400/30 transition-colors">
                                <h4 className="font-bold text-white mb-2">Insight</h4>
                                <p className="text-sm text-slate-400">Deep dive analysis into the core mechanics of this subject.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-purple-400/30 transition-colors">
                                <h4 className="font-bold text-white mb-2">Application</h4>
                                <p className="text-sm text-slate-400">Real-world use cases and implementation strategies.</p>
                            </div>
                        </div>
                    )}
                </div>

                <button className="mt-8 px-8 py-3 rounded-full bg-white/10 hover:bg-cyan-500/20 border border-white/20 hover:border-cyan-400 text-white transition-all group flex items-center gap-2">
                    Explore Deeper
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>

            {/* Background Glow */}
            <div className={`
                absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 blur-3xl -z-10 transition-opacity duration-1000
                ${isActive ? 'opacity-100' : 'opacity-0'}
            `} />
        </div>
    );
};

export default BlogSection;

export const VISUALIZER_PROFILES = {
    hero: {
        geometryType: 'hypercube',
        gridDensity: 18,
        rotationSpeed: 0.2,
        colorScheme: { primary: [0.2, 0.6, 1.0], secondary: [0.8, 0.2, 1.0], background: [0.02, 0.02, 0.1] }
    },
    philosophy: {
        geometryType: 'hypersphere',
        gridDensity: 45,
        rotationSpeed: 0.8,
        morphFactor: 0.8,
        colorScheme: { primary: [0.8, 0.1, 0.4], secondary: [0.1, 0.8, 0.9], background: [0.1, 0.0, 0.05] }
    },
    pillars: {
        geometryType: 'hypertetrahedron',
        gridDensity: 35,
        rotationSpeed: 0.4,
        morphFactor: 0.3,
        colorScheme: { primary: [0.1, 0.9, 0.5], secondary: [0.9, 0.9, 0.1], background: [0.0, 0.1, 0.05] }
    },
    quality: {
        geometryType: 'hypercube',
        gridDensity: 28,
        rotationSpeed: 1.5,
        glitchIntensity: 0.05,
        colorScheme: { primary: [1.0, 0.5, 0.0], secondary: [0.0, 1.0, 1.0], background: [0.05, 0.02, 0.0] }
    },
    sustainability: {
        geometryType: 'hypersphere',
        gridDensity: 22,
        rotationSpeed: 0.3,
        colorScheme: { primary: [0.2, 0.8, 0.4], secondary: [0.2, 0.4, 0.9], background: [0.0, 0.05, 0.1] }
    },
    contact: {
        geometryType: 'hypertetrahedron',
        gridDensity: 12,
        rotationSpeed: 0.1,
        colorScheme: { primary: [0.9, 0.9, 0.9], secondary: [0.5, 0.5, 0.5], background: [0.0, 0.0, 0.0] }
    }
};

// Re-mapped to Blog Categories
export const SECTIONS = [
    { id: 'hero', title: 'Latest', icon: '⌘', subtitle: 'Featured Transmissions' },
    { id: 'philosophy', title: 'Concepts', icon: '★', subtitle: 'AI Theory & Ethics' },
    { id: 'pillars', title: 'The Stack', icon: '⬡', subtitle: 'React / Three / GPU' },
    { id: 'quality', title: 'Deep Dives', icon: '✦', subtitle: 'Technical Case Studies' },
    { id: 'sustainability', title: 'Future', icon: '∞', subtitle: 'Signals & Predictions' },
    { id: 'contact', title: 'Join', icon: '✉', subtitle: 'Community Access' }
];

// Blog Content Data
export const BLOG_CONTENT = {
    hero: {
        featured: [
            { title: "The Agentic Workflow", date: "Oct 12", category: "AI", desc: "Moving beyond chatbots to autonomous coding swarms." },
            { title: "Vibe Coding 101", date: "Oct 10", category: "Phil", desc: "Programming by intuition in the age of LLMs." },
            { title: "Shader Magic", date: "Oct 08", category: "WebGL", desc: "Mathematical art: Turning math into visual poetry." }
        ]
    },
    philosophy: [ // Concepts
        { title: "Prompt Engineering is Dead", desc: "Why context windows and RAG are replacing the perfect prompt." },
        { title: "The Ghost in the Machine", desc: "Emergent behavior in multi-agent systems and what it means for UX." },
        { title: "Post-Digital Aesthetics", desc: "Designing for interfaces that dream. Glassmorphism vs. Neumorphism vs. VIB3." },
        { title: "Code as Biology", desc: "Treating codebases as living organisms that evolve rather than structures we build." },
        { title: "The Attention Economy", desc: "How immersive web experiences capture focus in a dopamine-saturated world." },
        { title: "Hyper-Personalization", desc: "UI that reconfigures itself in real-time based on user intent." }
    ],
    pillars: [ // The Stack
        { title: "React Three Fiber", icon: "⚛️", desc: "Declarative 3D scenes for the modern web." },
        { title: "WebGPU", icon: "🚀", desc: "Unlocking native-level graphics performance in the browser." },
        { title: "GSAP", icon: "🎬", desc: "Orchestrating complex timelines and scroll-driven animations." },
        { title: "TensorFlow.js", icon: "🧠", desc: "Running inference entirely client-side for privacy and speed." }
    ],
    quality: [ // Deep Dives (Case Studies)
        { title: "Building VIB34D", category: "Case Study", desc: "How we built a 4D hypercube engine using raw WebGL and GLSL." },
        { title: "Generative UI", category: "Tutorial", desc: "Using noise functions to create organic, non-repeating layouts." },
        { title: "RAG Pipelines", category: "Backend", desc: "Constructing a knowledge retrieval system for technical documentation." },
        { title: "Audio Reactivity", category: "Audio", desc: "FFT analysis in the browser: syncing visuals to beat detection." },
        { title: "Global State", category: "State", desc: "Managing complex 3D scenes with Zustand and transient updates." },
        { title: "Performance", category: "Opt", desc: "Optimizing draw calls and geometry instancing for 60fps on mobile." }
    ],
    sustainability: [ // Future
        { title: "Compute Governance", desc: "The environmental impact of training massive models." },
        { title: "Model Collapse", desc: "What happens when AI trains on AI-generated data?" },
        { title: "The 1000x Dev", desc: "Will AI amplification create a new class of super-engineers?" },
        { title: "Neural Interfaces", desc: "Preparing web standards for BCI (Brain-Computer Interfaces)." }
    ]
};

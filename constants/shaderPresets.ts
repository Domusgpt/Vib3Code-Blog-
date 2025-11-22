import { ShaderUniforms } from '../services/vib3-plus/MultilayerHolographicShader';

export interface SectionPreset {
    id: string;
    title: string;
    icon: string;
    color: string;
    description: string;
    shaderParams: Partial<ShaderUniforms>;
}

export const SECTION_PRESETS: SectionPreset[] = [
    {
        id: 'hero',
        title: 'Latest',
        icon: '⌘',
        color: '#4FC3F7',
        description: 'Featured articles and recent transmissions from the VIB3CODE collective',
        shaderParams: {
            u_geometryType: 1, // Hypercube
            u_gridDensity: 6.0,
            u_morphFactor: 0.4,
            u_chaos: 0.05,
            u_speed: 1.0,
            u_hue: 0.55, // Cyan
            u_intensity: 1.0,
            u_saturation: 0.8,
            u_mouseIntensity: 0.6
        }
    },
    {
        id: 'philosophy',
        title: 'Concepts',
        icon: '★',
        color: '#F50057',
        description: 'AI Theory, Ethics & Post-Digital Philosophy',
        shaderParams: {
            u_geometryType: 2, // Sphere
            u_gridDensity: 8.0,
            u_morphFactor: 0.7,
            u_chaos: 0.08,
            u_speed: 0.6,
            u_hue: 0.92, // Magenta/Pink
            u_intensity: 1.1,
            u_saturation: 0.9,
            u_mouseIntensity: 0.7
        }
    },
    {
        id: 'pillars',
        title: 'The Stack',
        icon: '⬡',
        color: '#00E676',
        description: 'React, Three.js, WebGL & GPU Programming',
        shaderParams: {
            u_geometryType: 0, // Tetrahedron
            u_gridDensity: 5.0,
            u_morphFactor: 0.3,
            u_chaos: 0.03,
            u_speed: 1.2,
            u_hue: 0.35, // Green
            u_intensity: 0.9,
            u_saturation: 0.85,
            u_mouseIntensity: 0.5
        }
    },
    {
        id: 'quality',
        title: 'Deep Dives',
        icon: '✦',
        color: '#FF6D00',
        description: 'Technical Case Studies & Architectural Breakdowns',
        shaderParams: {
            u_geometryType: 5, // Fractal
            u_gridDensity: 7.0,
            u_morphFactor: 0.6,
            u_chaos: 0.12,
            u_speed: 1.5,
            u_hue: 0.08, // Orange
            u_intensity: 1.2,
            u_saturation: 0.95,
            u_mouseIntensity: 0.8
        }
    },
    {
        id: 'sustainability',
        title: 'Future',
        icon: '∞',
        color: '#00B8D4',
        description: 'Signals & Predictions from the Edge of Tomorrow',
        shaderParams: {
            u_geometryType: 6, // Wave
            u_gridDensity: 4.0,
            u_morphFactor: 0.8,
            u_chaos: 0.06,
            u_speed: 0.8,
            u_hue: 0.52, // Teal
            u_intensity: 0.95,
            u_saturation: 0.75,
            u_mouseIntensity: 0.4
        }
    },
    {
        id: 'contact',
        title: 'Join',
        icon: '✉',
        color: '#9C27B0',
        description: 'Community Access & Collaboration Portals',
        shaderParams: {
            u_geometryType: 7, // Crystal
            u_gridDensity: 3.0,
            u_morphFactor: 0.2,
            u_chaos: 0.02,
            u_speed: 0.5,
            u_hue: 0.82, // Purple
            u_intensity: 0.85,
            u_saturation: 0.7,
            u_mouseIntensity: 0.3
        }
    }
];

// Geometry type descriptions for reference
export const GEOMETRY_TYPES = {
    0: 'Tetrahedron - Simplest 3D polytope with 4 vertices',
    1: 'Hypercube - 8-cell tesseract in 4D space',
    2: 'Sphere - Continuous curved surface',
    3: 'Torus - Donut-shaped genus-1 surface',
    4: 'Klein Bottle - Non-orientable 4D manifold',
    5: 'Fractal - Self-similar recursive structure',
    6: 'Wave - Sinusoidal interference patterns',
    7: 'Crystal - Cubic lattice structure'
};

export const getPresetBySection = (sectionIndex: number): SectionPreset => {
    return SECTION_PRESETS[sectionIndex] || SECTION_PRESETS[0];
};

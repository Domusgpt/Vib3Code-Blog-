/**
 * Multilayer Holographic Shader System
 * Based on vib3-plus-engine's 5-layer architecture
 */

export interface ShaderUniforms {
    u_resolution: [number, number];
    u_time: number;
    u_mouse: [number, number];
    u_geometryType: number;
    u_gridDensity: number;
    u_morphFactor: number;
    u_chaos: number;
    u_speed: number;
    u_hue: number;
    u_intensity: number;
    u_saturation: number;
    u_dimension: number;
    u_rot4dXY: number;
    u_rot4dXZ: number;
    u_rot4dYZ: number;
    u_rot4dXW: number;
    u_rot4dYW: number;
    u_rot4dZW: number;
    u_mouseIntensity: number;
    u_clickIntensity: number;
    u_roleIntensity: number;
}

export const VERTEX_SHADER = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

export const FRAGMENT_SHADER = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_geometryType;
    uniform float u_gridDensity;
    uniform float u_morphFactor;
    uniform float u_chaos;
    uniform float u_speed;
    uniform float u_hue;
    uniform float u_intensity;
    uniform float u_saturation;
    uniform float u_dimension;
    uniform float u_rot4dXY;
    uniform float u_rot4dXZ;
    uniform float u_rot4dYZ;
    uniform float u_rot4dXW;
    uniform float u_rot4dYW;
    uniform float u_rot4dZW;
    uniform float u_mouseIntensity;
    uniform float u_clickIntensity;
    uniform float u_roleIntensity;

    #define PI 3.14159265359

    // 4D Rotation Matrices
    mat4 rotateXY(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, -s, 0.0, 0.0,
            s,  c, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
    }

    mat4 rotateXZ(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, 0.0, -s, 0.0,
            0.0, 1.0, 0.0, 0.0,
            s, 0.0,  c, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
    }

    mat4 rotateYZ(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1.0, 0.0, 0.0, 0.0,
            0.0,  c, -s, 0.0,
            0.0,  s,  c, 0.0,
            0.0, 0.0, 0.0, 1.0
        );
    }

    mat4 rotateXW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, 0.0, 0.0, -s,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            s, 0.0, 0.0,  c
        );
    }

    mat4 rotateYW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1.0, 0.0, 0.0, 0.0,
            0.0,  c, 0.0, -s,
            0.0, 0.0, 1.0, 0.0,
            0.0,  s, 0.0,  c
        );
    }

    mat4 rotateZW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0,  c, -s,
            0.0, 0.0,  s,  c
        );
    }

    // 4D to 3D projection
    vec3 project4Dto3D(vec4 p4d) {
        float perspective = 2.0 / (2.0 + p4d.w);
        return p4d.xyz * perspective;
    }

    // Hypersphere warp
    vec4 warpHypersphere(vec3 p, float strength) {
        float r = length(p);
        float theta = atan(p.y, p.x);
        float phi = acos(p.z / max(r, 0.001));
        float w = sin(r * 2.0 + u_time * u_speed * 0.001) * strength;

        return vec4(
            p.x * (1.0 + w * 0.5),
            p.y * (1.0 + w * 0.5),
            p.z * (1.0 + w * 0.5),
            w
        );
    }

    // Hypertetrahedron warp
    vec4 warpHypertetra(vec3 p, float strength) {
        vec3 n1 = normalize(vec3(1.0, 1.0, 1.0));
        vec3 n2 = normalize(vec3(-1.0, -1.0, 1.0));
        vec3 n3 = normalize(vec3(-1.0, 1.0, -1.0));
        vec3 n4 = normalize(vec3(1.0, -1.0, -1.0));

        float d1 = abs(dot(p, n1));
        float d2 = abs(dot(p, n2));
        float d3 = abs(dot(p, n3));
        float d4 = abs(dot(p, n4));

        float w = (d1 + d2 + d3 + d4) * 0.25 * strength;

        return vec4(p, w);
    }

    // Geometry Functions
    float tetrahedronLattice(vec3 p, float density) {
        vec3 q = fract(p * density) - 0.5;
        float d = min(min(
            abs(q.x + q.y + q.z),
            abs(q.x - q.y - q.z)),
            min(abs(-q.x + q.y - q.z),
                abs(-q.x - q.y + q.z)));
        return 1.0 - smoothstep(0.0, 0.15, d);
    }

    float hypercubeLattice(vec3 p, float density) {
        vec3 q = fract(p * density) - 0.5;
        vec3 d = abs(q);
        float edge = min(min(d.x, d.y), d.z);
        return 1.0 - smoothstep(0.4, 0.5, edge);
    }

    float sphereLattice(vec3 p, float density) {
        vec3 q = fract(p * density) - 0.5;
        float d = length(q);
        return smoothstep(0.5, 0.3, d);
    }

    float torusLattice(vec3 p, float density) {
        vec3 q = p * density;
        float r1 = 0.5;
        float r2 = 0.2;
        vec2 t = vec2(length(q.xy) - r1, q.z);
        float d = length(t) - r2;
        return 1.0 - smoothstep(0.0, 0.3, abs(d));
    }

    float kleinBottleLattice(vec3 p, float density) {
        vec3 q = p * density;
        float u = atan(q.y, q.x);
        float v = q.z * 0.5;
        vec3 klein = vec3(
            (2.0 + cos(u)) * cos(v),
            (2.0 + cos(u)) * sin(v),
            sin(u) + u_time * 0.0001
        );
        float d = length(q - klein);
        return 1.0 - smoothstep(0.0, 0.5, d);
    }

    float fractalLattice(vec3 p, float density) {
        vec3 q = p * density;
        float d = 0.0;
        float s = 1.0;
        for (int i = 0; i < 4; i++) {
            q = abs(q) - 1.0;
            d += length(q) / s;
            q = q * 2.0;
            s *= 2.0;
        }
        return 1.0 - smoothstep(0.0, 2.0, d);
    }

    float waveLattice(vec3 p, float density) {
        vec3 q = p * density;
        float wave = sin(q.x * 3.0 + u_time * u_speed * 0.002) *
                     cos(q.y * 3.0 + u_time * u_speed * 0.002) *
                     sin(q.z * 3.0 + u_time * u_speed * 0.002);
        return (wave + 1.0) * 0.5;
    }

    float crystalLattice(vec3 p, float density) {
        vec3 q = fract(p * density) - 0.5;
        float d = max(max(abs(q.x), abs(q.y)), abs(q.z));
        return 1.0 - smoothstep(0.3, 0.5, d);
    }

    // Dynamic geometry selector
    float getDynamicGeometry(vec3 p, float density, int geomType) {
        if (geomType == 0) return tetrahedronLattice(p, density);
        else if (geomType == 1) return hypercubeLattice(p, density);
        else if (geomType == 2) return sphereLattice(p, density);
        else if (geomType == 3) return torusLattice(p, density);
        else if (geomType == 4) return kleinBottleLattice(p, density);
        else if (geomType == 5) return fractalLattice(p, density);
        else if (geomType == 6) return waveLattice(p, density);
        else return crystalLattice(p, density);
    }

    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        // Normalize coordinates
        vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        // 3D position
        vec3 p = vec3(uv, 0.0);

        // Apply 4D warp based on geometry type morph
        int baseGeom = int(u_geometryType);
        float morphAmount = fract(u_geometryType);

        vec4 p4d;
        if (morphAmount < 0.5) {
            p4d = warpHypersphere(p, u_morphFactor);
        } else {
            p4d = warpHypertetra(p, u_morphFactor);
        }

        // Apply all 6 4D rotations
        p4d = rotateXY(u_rot4dXY) * p4d;
        p4d = rotateXZ(u_rot4dXZ) * p4d;
        p4d = rotateYZ(u_rot4dYZ) * p4d;
        p4d = rotateXW(u_rot4dXW) * p4d;
        p4d = rotateYW(u_rot4dYW) * p4d;
        p4d = rotateZW(u_rot4dZW) * p4d;

        // Project back to 3D
        vec3 p3d = project4Dto3D(p4d);

        // Calculate lattice value
        float lattice = getDynamicGeometry(p3d, u_gridDensity, baseGeom);

        // Add chaos/noise
        float noise = fract(sin(dot(p3d, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        lattice += noise * u_chaos * 0.1;

        // ===== 5-LAYER COMPOSITION =====

        // Base color from HSV
        vec3 baseColor = hsv2rgb(vec3(u_hue, u_saturation, 1.0));

        // Layer 1: Base Geometry (50%)
        vec3 layer1 = baseColor * lattice * 0.5;

        // Layer 2: Primary Shimmer (20%)
        vec3 layer2 = baseColor * sin(lattice * 8.0 + u_time * 0.001 * u_speed) * 0.2;

        // Layer 3: Harmonic Oscillations (15%)
        vec3 layer3 = baseColor * cos(lattice * 12.0 + u_time * 0.0008 * u_speed) * 0.15;

        // Layer 4: Brightness Modulation (60% + 10%)
        vec3 layer4 = vec3(lattice * 0.6) * baseColor;
        layer4 += vec3(sin(lattice * 15.0) * 0.1) * baseColor;

        // Layer 5: Mouse Interactivity
        vec2 mouseUV = u_mouse / u_resolution;
        float mouseDist = length(uv - (mouseUV * 2.0 - 1.0));
        float mouseGlow = exp(-mouseDist * 1.2) * u_mouseIntensity * 0.25;
        float mouseRipple = sin(mouseDist * 15.0 - u_time * 0.003) *
                            exp(-mouseDist * 2.0) * u_mouseIntensity * 0.1;
        vec3 layer5 = vec3(mouseGlow + mouseRipple) * baseColor * 0.8;

        // Additive composition
        vec3 color = (layer1 + layer2 + layer3 + layer4 + layer5) * u_intensity * u_roleIntensity;

        // Output with slight transparency for layering
        gl_FragColor = vec4(color, 0.95);
    }
`;

export class MultilayerHolographicShader {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram | null = null;
    private uniforms: { [key: string]: WebGLUniformLocation | null } = {};
    private buffer: WebGLBuffer | null = null;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.initialize();
    }

    private initialize(): void {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }

        this.program = this.gl.createProgram();
        if (!this.program) return;

        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(this.program));
            return;
        }

        // Get uniform locations
        const uniformNames = [
            'u_resolution', 'u_time', 'u_mouse', 'u_geometryType', 'u_gridDensity',
            'u_morphFactor', 'u_chaos', 'u_speed', 'u_hue', 'u_intensity',
            'u_saturation', 'u_dimension', 'u_rot4dXY', 'u_rot4dXZ', 'u_rot4dYZ',
            'u_rot4dXW', 'u_rot4dYW', 'u_rot4dZW', 'u_mouseIntensity',
            'u_clickIntensity', 'u_roleIntensity'
        ];

        uniformNames.forEach(name => {
            this.uniforms[name] = this.gl.getUniformLocation(this.program!, name);
        });

        // Create fullscreen quad
        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }

    private createShader(type: number, source: string): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) return null;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    public render(uniforms: Partial<ShaderUniforms>): void {
        if (!this.program) return;

        this.gl.useProgram(this.program);

        // Set uniforms
        Object.entries(uniforms).forEach(([name, value]) => {
            const location = this.uniforms[name];
            if (!location) return;

            if (Array.isArray(value)) {
                if (value.length === 2) {
                    this.gl.uniform2f(location, value[0], value[1]);
                }
            } else {
                this.gl.uniform1f(location, value as number);
            }
        });

        // Draw
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    public dispose(): void {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
        }
    }
}

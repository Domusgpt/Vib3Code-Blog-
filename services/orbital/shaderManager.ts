// shaderManager.ts — WebGL shader compilation and management for Orbital Viewer

// === SHADER SOURCES ===

const VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUV;

void main() {
  vUV = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const STITCHER_FRAGMENT = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2      uTileSize;
uniform float     uT;
uniform float     uFeatherPx;
uniform float     uSeamAngle;
uniform float     uWarpDeg;
uniform float     uStepDeg;
uniform float     uShear;

varying vec2 vUV;

const float PI = 3.1415926535897932384626433832795;

vec2 rotate2D(vec2 p, float ang) {
  float c = cos(ang), s = sin(ang);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 warpCylindrical(vec2 uv, float sDeg) {
  float s = radians(sDeg);
  vec2 p = uv * 2.0 - 1.0;
  float x = p.x;
  float y = p.y;
  float xang = atan(x);
  float xang2 = xang + s;
  float x2 = tan(xang2);
  float y2 = y * cos(s);
  vec2 q = vec2(x2, y2);
  vec2 outUV = (q + 1.0) * 0.5;
  return clamp(outUV, 0.0, 1.0);
}

vec2 applyShear(vec2 uv, float velocity, float shearFactor) {
  float shear = velocity * shearFactor;
  return vec2(uv.x + shear * (uv.y - 0.5), uv.y);
}

vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  vec2 uv = vUV;
  vec2 p = uv * 2.0 - 1.0;
  p = rotate2D(p, -uSeamAngle);
  vec2 uvR = (p + 1.0) * 0.5;

  float seamCenter = 0.5 + 0.2 * (uT - 0.5);
  float feather = uFeatherPx / uTileSize.x;

  float edge = (uvR.x - seamCenter) / max(feather, 1e-6);
  float mB = smoothstep(-1.0, 1.0, edge);
  float mA = 1.0 - mB;

  float warpA = -uWarpDeg * uT;
  float warpB = uWarpDeg * (1.0 - uT);

  vec2 uvA = warpCylindrical(uv, warpA);
  vec2 uvB = warpCylindrical(uv, warpB);

  float velocity = uT * 2.0 - 1.0;
  uvA = applyShear(uvA, velocity, uShear);
  uvB = applyShear(uvB, -velocity, uShear);

  vec4 a = texture2D(uTexA, uvA);
  vec4 b = texture2D(uTexB, uvB);

  vec3 aLin = toLin(a.rgb) * a.a;
  vec3 bLin = toLin(b.rgb) * b.a;
  float wa = mA * a.a;
  float wb = mB * b.a;
  float w = max(wa + wb, 1e-6);
  vec3 outLin = (aLin * mA + bLin * mB) / w;
  float outA = clamp(wa + wb, 0.0, 1.0);
  vec3 outRGB = toSrgb(outLin);

  gl_FragColor = vec4(outRGB, outA);
}
`;

const PARALLAX_FRAGMENT = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTile;
uniform vec2      uParallaxPx;
uniform vec2      uTileSize;
uniform float     uCoreR;
uniform float     uMidR;
uniform float     uRimR;
uniform float     uFeather;
uniform float     uMidFactor;
uniform float     uRimFactor;

varying vec2 vUV;

float alphaToSDF(float a) {
  return (a - 0.5) * 4.0;
}

vec4 sampleLayer(vec2 uv, vec2 offsetPx) {
  vec2 o = offsetPx / uTileSize;
  vec2 newUV = clamp(uv + o, 0.0, 1.0);
  return texture2D(uTile, newUV);
}

float smoothBand(float d, float r, float f) {
  return smoothstep(r + f, r - f, abs(d));
}

vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  vec4 base = texture2D(uTile, vUV);
  float d = alphaToSDF(base.a);

  float wCore = smoothBand(d, uCoreR, uFeather);
  float wMid  = smoothBand(d, uMidR,  uFeather);
  float wRim  = smoothBand(d, uRimR,  uFeather);

  float wSum = wCore + wMid + wRim + 1e-6;
  wCore /= wSum;
  wMid /= wSum;
  wRim /= wSum;

  vec4 colCore = sampleLayer(vUV, vec2(0.0));
  vec4 colMid  = sampleLayer(vUV, -uParallaxPx * uMidFactor);
  vec4 colRim  = sampleLayer(vUV, -uParallaxPx * uRimFactor);

  vec3 linCore = toLin(colCore.rgb) * colCore.a;
  vec3 linMid  = toLin(colMid.rgb) * colMid.a;
  vec3 linRim  = toLin(colRim.rgb) * colRim.a;

  vec3 outLin = linCore * wCore + linMid * wMid + linRim * wRim;
  vec3 outRGB = toSrgb(outLin);

  float outA = max(colCore.a, max(colMid.a, colRim.a));

  gl_FragColor = vec4(outRGB, outA);
}
`;

const SHADOW_FRAGMENT = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTile;
uniform vec2      uTileSize;
uniform vec2      uLightDir;
uniform float     uSkew;
uniform float     uBlurPx;
uniform float     uIntensity;
uniform float     uGroundY;
uniform vec3      uShadowColor;

varying vec2 vUV;

vec4 blur5(sampler2D tex, vec2 uv, vec2 dir) {
  vec4 sum = vec4(0.0);
  float total = 0.0;

  for (float i = -2.0; i <= 2.0; i += 1.0) {
    float weight = 1.0 - abs(i) * 0.2;
    vec2 offset = dir * i / uTileSize;
    sum += texture2D(tex, uv + offset) * weight;
    total += weight;
  }

  return sum / total;
}

float getShadowMask(vec2 uv) {
  float distFromGround = max(uGroundY - uv.y, 0.0);
  vec2 projOffset = uLightDir * distFromGround * uSkew / uTileSize.y;
  vec2 srcUV = uv - projOffset;

  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return 0.0;
  }

  vec2 blurDir = normalize(uLightDir + vec2(0.001));
  vec4 blurred = blur5(uTile, srcUV, blurDir * uBlurPx);

  float alpha = blurred.a;
  float falloff = 1.0 - distFromGround * 2.0;
  falloff = clamp(falloff, 0.0, 1.0);

  return alpha * falloff * uIntensity;
}

void main() {
  vec4 base = texture2D(uTile, vUV);

  if (vUV.y < uGroundY - 0.01) {
    gl_FragColor = base;
    return;
  }

  float shadowMask = getShadowMask(vUV);
  vec3 shadowed = mix(base.rgb, uShadowColor, shadowMask * (1.0 - base.a));

  gl_FragColor = vec4(shadowed, max(base.a, shadowMask * 0.5));
}
`;

const SIMPLE_FRAGMENT = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexture;
uniform float uOpacity;

varying vec2 vUV;

void main() {
  vec4 color = texture2D(uTexture, vUV);
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
`;

const ZOOM_FRAGMENT = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexture;
uniform vec2      uTextureSize;
uniform vec2      uViewport;
uniform vec2      uCenter;
uniform float     uZoom;
uniform float     uUnsharpAmount;
uniform float     uUnsharpThreshold;

varying vec2 vUV;

vec4 sampleBicubic(sampler2D tex, vec2 uv, vec2 texSize) {
  // Simplified bicubic with Catmull-Rom weights
  vec2 texel = uv * texSize;
  vec2 i = floor(texel);
  vec2 f = fract(texel);

  // Cubic weights
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);

  vec2 s0 = w0 + w1;
  vec2 s1 = w2 + w3;
  vec2 t0 = (i - 0.5 + w1 / s0) / texSize;
  vec2 t1 = (i + 1.5 + w3 / s1) / texSize;

  return (texture2D(tex, vec2(t0.x, t0.y)) * s0.x +
          texture2D(tex, vec2(t1.x, t0.y)) * s1.x) * s0.y +
         (texture2D(tex, vec2(t0.x, t1.y)) * s0.x +
          texture2D(tex, vec2(t1.x, t1.y)) * s1.x) * s1.y;
}

void main() {
  // Apply zoom centered at uCenter
  vec2 uv = (vUV - uCenter) / uZoom + uCenter;

  // Clamp to valid UV range
  uv = clamp(uv, 0.0, 1.0);

  vec4 color;
  if (uZoom > uUnsharpThreshold) {
    // Use bicubic sampling with unsharp mask
    color = sampleBicubic(uTexture, uv, uTextureSize);

    // Unsharp mask
    vec2 offset = 1.0 / uTextureSize;
    vec4 blur = (
      texture2D(uTexture, uv + vec2(-offset.x, 0.0)) +
      texture2D(uTexture, uv + vec2(offset.x, 0.0)) +
      texture2D(uTexture, uv + vec2(0.0, -offset.y)) +
      texture2D(uTexture, uv + vec2(0.0, offset.y))
    ) * 0.25;

    color = color + (color - blur) * uUnsharpAmount;
  } else {
    color = texture2D(uTexture, uv);
  }

  gl_FragColor = color;
}
`;

// === TYPES ===

export type ShaderType = 'stitcher' | 'parallax' | 'shadow' | 'simple' | 'zoom';

export interface ShaderProgram {
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface StitchUniforms {
  texA: WebGLTexture;
  texB: WebGLTexture;
  tileSize: [number, number];
  t: number;
  seamAngle: number;
  featherPx: number;
  warpDeg: number;
  stepDeg: number;
  shear: number;
}

export interface ParallaxUniforms {
  tile: WebGLTexture;
  parallaxPx: [number, number];
  tileSize: [number, number];
  coreR: number;
  midR: number;
  rimR: number;
  feather: number;
  midFactor: number;
  rimFactor: number;
}

export interface ShadowUniforms {
  tile: WebGLTexture;
  tileSize: [number, number];
  lightDir: [number, number];
  skew: number;
  blurPx: number;
  intensity: number;
  groundY: number;
  shadowColor: [number, number, number];
}

export interface ZoomUniforms {
  texture: WebGLTexture;
  textureSize: [number, number];
  viewport: [number, number];
  center: [number, number];
  zoom: number;
  unsharpAmount: number;
  unsharpThreshold: number;
}

// === SHADER MANAGER CLASS ===

export class OrbitalShaderManager {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private programs: Map<ShaderType, ShaderProgram> = new Map();
  private quadBuffer: WebGLBuffer | null = null;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.initQuadBuffer();
  }

  /**
   * Get or create a shader program
   */
  getProgram(type: ShaderType): ShaderProgram {
    let program = this.programs.get(type);
    if (!program) {
      program = this.compileProgram(type);
      this.programs.set(type, program);
    }
    return program;
  }

  /**
   * Set uniforms for stitcher shader
   */
  setStitchUniforms(uniforms: StitchUniforms): void {
    const { gl } = this;
    const prog = this.getProgram('stitcher');

    gl.useProgram(prog.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.texA);
    gl.uniform1i(prog.uniforms.uTexA, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.texB);
    gl.uniform1i(prog.uniforms.uTexB, 1);

    gl.uniform2f(prog.uniforms.uTileSize, uniforms.tileSize[0], uniforms.tileSize[1]);
    gl.uniform1f(prog.uniforms.uT, uniforms.t);
    gl.uniform1f(prog.uniforms.uSeamAngle, uniforms.seamAngle);
    gl.uniform1f(prog.uniforms.uFeatherPx, uniforms.featherPx);
    gl.uniform1f(prog.uniforms.uWarpDeg, uniforms.warpDeg);
    gl.uniform1f(prog.uniforms.uStepDeg, uniforms.stepDeg);
    gl.uniform1f(prog.uniforms.uShear, uniforms.shear);
  }

  /**
   * Set uniforms for parallax shader
   */
  setParallaxUniforms(uniforms: ParallaxUniforms): void {
    const { gl } = this;
    const prog = this.getProgram('parallax');

    gl.useProgram(prog.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.tile);
    gl.uniform1i(prog.uniforms.uTile, 0);

    gl.uniform2f(prog.uniforms.uParallaxPx, uniforms.parallaxPx[0], uniforms.parallaxPx[1]);
    gl.uniform2f(prog.uniforms.uTileSize, uniforms.tileSize[0], uniforms.tileSize[1]);
    gl.uniform1f(prog.uniforms.uCoreR, uniforms.coreR);
    gl.uniform1f(prog.uniforms.uMidR, uniforms.midR);
    gl.uniform1f(prog.uniforms.uRimR, uniforms.rimR);
    gl.uniform1f(prog.uniforms.uFeather, uniforms.feather);
    gl.uniform1f(prog.uniforms.uMidFactor, uniforms.midFactor);
    gl.uniform1f(prog.uniforms.uRimFactor, uniforms.rimFactor);
  }

  /**
   * Set uniforms for shadow shader
   */
  setShadowUniforms(uniforms: ShadowUniforms): void {
    const { gl } = this;
    const prog = this.getProgram('shadow');

    gl.useProgram(prog.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.tile);
    gl.uniform1i(prog.uniforms.uTile, 0);

    gl.uniform2f(prog.uniforms.uTileSize, uniforms.tileSize[0], uniforms.tileSize[1]);
    gl.uniform2f(prog.uniforms.uLightDir, uniforms.lightDir[0], uniforms.lightDir[1]);
    gl.uniform1f(prog.uniforms.uSkew, uniforms.skew);
    gl.uniform1f(prog.uniforms.uBlurPx, uniforms.blurPx);
    gl.uniform1f(prog.uniforms.uIntensity, uniforms.intensity);
    gl.uniform1f(prog.uniforms.uGroundY, uniforms.groundY);
    gl.uniform3f(prog.uniforms.uShadowColor, uniforms.shadowColor[0], uniforms.shadowColor[1], uniforms.shadowColor[2]);
  }

  /**
   * Set uniforms for zoom shader
   */
  setZoomUniforms(uniforms: ZoomUniforms): void {
    const { gl } = this;
    const prog = this.getProgram('zoom');

    gl.useProgram(prog.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.texture);
    gl.uniform1i(prog.uniforms.uTexture, 0);

    gl.uniform2f(prog.uniforms.uTextureSize, uniforms.textureSize[0], uniforms.textureSize[1]);
    gl.uniform2f(prog.uniforms.uViewport, uniforms.viewport[0], uniforms.viewport[1]);
    gl.uniform2f(prog.uniforms.uCenter, uniforms.center[0], uniforms.center[1]);
    gl.uniform1f(prog.uniforms.uZoom, uniforms.zoom);
    gl.uniform1f(prog.uniforms.uUnsharpAmount, uniforms.unsharpAmount);
    gl.uniform1f(prog.uniforms.uUnsharpThreshold, uniforms.unsharpThreshold);
  }

  /**
   * Draw fullscreen quad
   */
  drawQuad(): void {
    const { gl } = this;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    // Position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // TexCoord attribute
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Create texture from ImageData
   */
  createTexture(imageData: ImageData): WebGLTexture {
    const { gl } = this;

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageData.data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  /**
   * Create texture from Image/Canvas/ImageBitmap
   */
  createTextureFromImage(image: TexImageSource): WebGLTexture {
    const { gl } = this;

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    const { gl } = this;

    this.programs.forEach(prog => {
      gl.deleteProgram(prog.program);
    });
    this.programs.clear();

    if (this.quadBuffer) {
      gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }
  }

  // === PRIVATE ===

  private initQuadBuffer(): void {
    const { gl } = this;

    // Fullscreen quad: position (x,y) + texcoord (u,v)
    const vertices = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  private compileProgram(type: ShaderType): ShaderProgram {
    const { gl } = this;

    const fragmentSource = this.getFragmentSource(type);
    const vertexShader = this.compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Bind attribute locations
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.bindAttribLocation(program, 1, 'aTexCoord');

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader link error: ${error}`);
    }

    // Get uniform locations
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const uniformNames = this.getUniformNames(type);
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    // Cleanup individual shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return {
      program,
      attributes: { aPosition: 0, aTexCoord: 1 },
      uniforms
    };
  }

  private compileShader(source: string, type: number): WebGLShader {
    const { gl } = this;

    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }

    return shader;
  }

  private getFragmentSource(type: ShaderType): string {
    switch (type) {
      case 'stitcher': return STITCHER_FRAGMENT;
      case 'parallax': return PARALLAX_FRAGMENT;
      case 'shadow': return SHADOW_FRAGMENT;
      case 'zoom': return ZOOM_FRAGMENT;
      case 'simple': return SIMPLE_FRAGMENT;
      default: throw new Error(`Unknown shader type: ${type}`);
    }
  }

  private getUniformNames(type: ShaderType): string[] {
    switch (type) {
      case 'stitcher':
        return ['uTexA', 'uTexB', 'uTileSize', 'uT', 'uFeatherPx', 'uSeamAngle', 'uWarpDeg', 'uStepDeg', 'uShear'];
      case 'parallax':
        return ['uTile', 'uParallaxPx', 'uTileSize', 'uCoreR', 'uMidR', 'uRimR', 'uFeather', 'uMidFactor', 'uRimFactor'];
      case 'shadow':
        return ['uTile', 'uTileSize', 'uLightDir', 'uSkew', 'uBlurPx', 'uIntensity', 'uGroundY', 'uShadowColor'];
      case 'zoom':
        return ['uTexture', 'uTextureSize', 'uViewport', 'uCenter', 'uZoom', 'uUnsharpAmount', 'uUnsharpThreshold'];
      case 'simple':
        return ['uTexture', 'uOpacity'];
      default:
        return [];
    }
  }
}

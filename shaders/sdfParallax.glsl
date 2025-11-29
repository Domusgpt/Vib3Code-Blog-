// sdfParallax.glsl — 2–3 layer faux-parallax using SDF thresholds from alpha
// Inputs: a base tile texture with premultiplied alpha (or separate alpha channel).

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTile;        // RGBA, tile (176×176 or subrect)
uniform vec2      uParallaxPx;  // screen-space offset in pixels (x,y) relative to tile size
uniform vec2      uTileSize;    // (176,176)
uniform float     uCoreR;       // SDF radii (pixels) for thresholds
uniform float     uMidR;
uniform float     uRimR;
uniform float     uFeather;     // feather (pixels) around thresholds
uniform float     uMidFactor;   // 0..1 blend weight for mid layer offset
uniform float     uRimFactor;   // 0..1 blend weight for rim layer offset
uniform float     uTime;        // optional time for subtle animation

varying vec2      vUV;          // 0..1

// Decode signed distance from alpha using a quick approximate transform.
// If you have a precomputed SDF texture, bind it instead and read distance directly.
float alphaToSDF(float a) {
  // Map alpha 0..1 to pseudo distance in pixels: assume 2px bleed at the edge
  return (a - 0.5) * 4.0; // ~[-2..+2] px around the contour
}

vec4 sampleLayer(vec2 uv, vec2 offsetPx) {
  vec2 o = offsetPx / uTileSize; // normalize to 0..1
  vec2 newUV = clamp(uv + o, 0.0, 1.0);
  return texture2D(uTile, newUV);
}

float smoothBand(float d, float r, float f) {
  // 1 inside band (|d| < r), 0 outside, smoothed over feather f
  float a = smoothstep(r + f, r - f, abs(d));
  return a;
}

// Gamma helpers
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  vec4 base = texture2D(uTile, vUV);
  float d = alphaToSDF(base.a);

  // Layer weights by distance bands
  float wCore = smoothBand(d, uCoreR, uFeather);
  float wMid  = smoothBand(d, uMidR,  uFeather);
  float wRim  = smoothBand(d, uRimR,  uFeather);

  // Normalize weights
  float wSum = wCore + wMid + wRim + 1e-6;
  wCore /= wSum;
  wMid /= wSum;
  wRim /= wSum;

  // Offsets: core stationary, mid/rim move with fractions
  vec4 colCore = sampleLayer(vUV, vec2(0.0));
  vec4 colMid  = sampleLayer(vUV, -uParallaxPx * uMidFactor);
  vec4 colRim  = sampleLayer(vUV, -uParallaxPx * uRimFactor);

  // Gamma-correct blend
  vec3 linCore = toLin(colCore.rgb) * colCore.a;
  vec3 linMid  = toLin(colMid.rgb) * colMid.a;
  vec3 linRim  = toLin(colRim.rgb) * colRim.a;

  vec3 outLin = linCore * wCore + linMid * wMid + linRim * wRim;
  vec3 outRGB = toSrgb(outLin);

  // Preserve alpha (max of shifted samples to avoid holes)
  float outA = max(colCore.a, max(colMid.a, colRim.a));

  gl_FragColor = vec4(outRGB, outA);
}

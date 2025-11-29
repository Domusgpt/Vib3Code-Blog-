// stitcher.glsl — single-pass stitch with cylindrical warp + rotated, feathered seam
// Designed for 4×3 tiles (GEN_CELL=176) with 20% overscan (crop later to 146×146).
// Inputs: two adjacent frames A (current angle) and B (next angle).
// t ∈ [0,1]: fractional phase between A and B (0=A, 1=B).
// seamAngle: angle (radians) of motion direction; 0 = horizontal motion (vertical seam).
// featherPx: soft blend width in pixels (recommend 8–12 at GEN_CELL=176).
// warpDeg: small rotation compensation in degrees; usually t*stepDeg (stepDeg=30° for 12).
// stepDeg: step angle between real frames (e.g., 30° for 12).

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2      uTileSize;   // (176,176)
uniform float     uT;          // 0..1
uniform float     uFeatherPx;  // ~8..12
uniform float     uSeamAngle;  // radians
uniform float     uWarpDeg;    // small, <= 6 deg typical
uniform float     uStepDeg;    // 30 for 12
uniform float     uShear;      // motion shear factor ~0.10

varying vec2 vUV;              // normalized 0..1 within tile

// --- helpers
const float PI = 3.1415926535897932384626433832795;

vec2 rotate2D(vec2 p, float ang) {
  float c = cos(ang), s = sin(ang);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Cylindrical warp approximation around vertical axis (yaw-like)
// s in degrees; positive rotates right edge toward viewer
vec2 warpCylindrical(vec2 uv, float sDeg) {
  float s = radians(sDeg);
  // center to [-1,1]
  vec2 p = uv * 2.0 - 1.0;
  // horizontal bend: x' = tan(atan(x) + s)
  float x = p.x;
  float y = p.y;
  float xang = atan(x);
  float xang2 = xang + s;
  float x2 = tan(xang2);
  // mild vertical squash for large s
  float y2 = y * cos(s);
  vec2 q = vec2(x2, y2);
  // back to 0..1; clamp to avoid sampling outside
  vec2 outUV = (q + 1.0) * 0.5;
  return clamp(outUV, 0.0, 1.0);
}

// Conical warp for vertical (pitch) motion
vec2 warpConical(vec2 uv, float sDeg) {
  float s = radians(sDeg);
  vec2 p = uv * 2.0 - 1.0;
  // vertical squash based on pitch
  float y2 = p.y + s * 0.5;
  float x2 = p.x * (1.0 - abs(s) * 0.1);
  vec2 q = vec2(x2, y2);
  vec2 outUV = (q + 1.0) * 0.5;
  return clamp(outUV, 0.0, 1.0);
}

// Motion shear for perceived smoothness
vec2 applyShear(vec2 uv, float velocity, float shearFactor) {
  float shear = velocity * shearFactor;
  return vec2(uv.x + shear * (uv.y - 0.5), uv.y);
}

// Gamma-aware blend
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  // Rotate UV space so seam is aligned vertically in local coords
  vec2 uv = vUV;
  vec2 p = uv * 2.0 - 1.0;               // [-1,1] tile space
  p = rotate2D(p, -uSeamAngle);          // align motion with +x
  vec2 uvR = (p + 1.0) * 0.5;            // back to 0..1

  // Seam position slides with t; center ~0.5
  float seamCenter = 0.5 + 0.2 * (uT - 0.5); // small drift
  float feather = uFeatherPx / uTileSize.x;  // normalized

  // Masks: left favors A, right favors B; smooth feather at seam
  float edge = (uvR.x - seamCenter) / max(feather, 1e-6);
  float mB = smoothstep(-1.0, 1.0, edge);    // 0 on left, 1 on right
  float mA = 1.0 - mB;

  // Apply small opposing cylindrical warps
  float warpA = -uWarpDeg * uT;
  float warpB = uWarpDeg * (1.0 - uT);

  vec2 uvA = warpCylindrical(uv, warpA);
  vec2 uvB = warpCylindrical(uv, warpB);

  // Apply motion shear
  float velocity = uT * 2.0 - 1.0; // -1 to 1
  uvA = applyShear(uvA, velocity, uShear);
  uvB = applyShear(uvB, -velocity, uShear);

  vec4 a = texture2D(uTexA, uvA);
  vec4 b = texture2D(uTexB, uvB);

  // Alpha-aware, gamma-correct blend
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

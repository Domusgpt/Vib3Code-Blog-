// shadowProject.glsl — soft contact shadow from alpha by planar projection

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTile;        // RGBA tile (premultiplied or straight alpha)
uniform vec2      uTileSize;    // (176,176)
uniform vec2      uLightDir;    // normalized 2D light direction on ground plane (x right, y down), e.g., (0.4, 0.2)
uniform float     uSkew;        // projection scale in pixels (e.g., 10..20)
uniform float     uBlurPx;      // blur radius in pixels (we do a cheap 5-tap here)
uniform float     uIntensity;   // 0..1 multiplier
uniform float     uGroundY;     // Y position of ground plane in normalized coords (e.g., 0.85)
uniform vec3      uShadowColor; // shadow tint (usually dark)

varying vec2      vUV;          // 0..1

// 5-tap box blur kernel
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

// Sample shadow mask from projected position
float getShadowMask(vec2 uv) {
  // Project UV back to object space
  float distFromGround = max(uGroundY - uv.y, 0.0);
  vec2 projOffset = uLightDir * distFromGround * uSkew / uTileSize.y;

  vec2 srcUV = uv - projOffset;

  // Check bounds
  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return 0.0;
  }

  // Get alpha at source position (blurred for softness)
  vec2 blurDir = normalize(uLightDir + vec2(0.001));
  vec4 blurred = blur5(uTile, srcUV, blurDir * uBlurPx);

  // Shadow strength from alpha, attenuated by distance
  float alpha = blurred.a;
  float falloff = 1.0 - distFromGround * 2.0;
  falloff = clamp(falloff, 0.0, 1.0);

  return alpha * falloff * uIntensity;
}

void main() {
  vec4 base = texture2D(uTile, vUV);

  // Only render shadow below ground plane
  if (vUV.y < uGroundY - 0.01) {
    gl_FragColor = base;
    return;
  }

  // Get shadow intensity
  float shadowMask = getShadowMask(vUV);

  // Blend shadow with existing content
  vec3 shadowed = mix(base.rgb, uShadowColor, shadowMask * (1.0 - base.a));

  // If we're in the shadow region (below object), darken
  gl_FragColor = vec4(shadowed, max(base.a, shadowMask * 0.5));
}

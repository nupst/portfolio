import * as THREE from 'three';

// Procedural wildflowers, two tiers, no external assets. Ported from the
// sandbox project (six species, no "spike" — spike lives only in the heavier
// wildflowers/ system, which we intentionally do not use here).
//  - Near tier: parametric petals per species. Curvature is real geometry:
//    the midrib follows a progressive arc, the cross-section is cupped, the
//    rim ripples. Vertex normals are computed and lit against the sun
//    direction, and the backface gets a darker warm tint — together that
//    gives petals visible curvature and depth instead of flat facets.
//  - Far tier: cross-quad cards with a canvas-drawn sprite, tinted per
//    instance to match the species mix. (Disabled for the top-down view here.)
// createFlowerField(options) returns { mesh, update, dispose }.
//
// Ported additions for the portfolio's fixed top-down meadow:
//  - stalkScale / headScale multiply flower HEIGHT and HEAD SIZE without
//    touching x/z placement, so the natively tiny flowers scale up to sit
//    among the grass blades and stay readable from straight above.

// Six wild species. Each gets its OWN petal silhouette — not one teardrop
// with different sizes:
//   profile {a, b}: beta-curve width profile. a small = wide from the base
//   (strap), a large = width concentrated at the tip (trumpet/fan);
//   b small = broad rounded tip, b large = long taper.
//   teeth: serrated rim at the tip (real geometry, cuts into the outline).
//   layout: explicit per-petal arrangement (asymmetric flowers like violets).
const SPECIES = [
  { // cúc trắng — daisy: many narrow STRAPS, near-constant width, round tip
    petals: 9,
    petal: { length: 0.020, width: 0.007, cup: 0.005, arc: 1.2, wave: 0.0010, waveFreq: 2, profile: { a: 0.15, b: 0.3 } },
    open: [1.25, 1.55],
    petalColor: 0xf6f2e4, petalBase: 0xe7dfb4, core: 0xc4691a, // dark-orange centre
    weight: 3,
  },
  { // mao lương vàng — buttercup: OBOVATE petals (widest near the tip),
    // deeply cupped into a bowl
    petals: 5,
    petal: { length: 0.014, width: 0.014, cup: 0.012, arc: 0.7, wave: 0.0006, waveFreq: 2, profile: { a: 1.2, b: 0.35 } },
    open: [0.75, 1.05],
    petalColor: 0xf2c93d, petalBase: 0xd9a92a, core: 0xb9871f,
    weight: 2,
  },
  { // anh túc cam → trumpet/loa kèn: petals stand up into a funnel with a
    // central hole; width flares toward the tip (profile a large), edges cup
    // in to form the tube walls.
    petals: 6,
    petal: { length: 0.026, width: 0.020, cup: 0.024, arc: 1.15, wave: 0.0030, waveFreq: 6, profile: { a: 1.6, b: 0.2 } },
    open: [0.4, 0.6],       // near-upright → tube, not a flat splay
    petalInset: -0.008,     // push bases OUT → open a central hole (trumpet)
    petalColor: 0xd2603a, petalBase: 0xc04c2e, core: 0x38281e,
    weight: 1.2,
  },
  { // thanh cúc — cornflower: TRUMPETS, nearly all width at the tip,
    // rim cut into deep teeth
    petals: 12,
    petal: { length: 0.016, width: 0.008, cup: 0.004, arc: 1.1, wave: 0.0008, waveFreq: 3, profile: { a: 2.0, b: 0.08 }, teeth: { amp: 0.005, freq: 3 } },
    open: [1.1, 1.45],
    petalColor: 0x6f7fd0, petalBase: 0x4d5cae, core: 0x2e3560,
    weight: 1.5,
  },
  { // cánh bướm hồng — cosmos: broad blunt petals with a NOTCHED tip
    petals: 8,
    petal: { length: 0.024, width: 0.014, cup: 0.006, arc: 1.0, wave: 0.0012, waveFreq: 2, profile: { a: 0.6, b: 0.25 }, teeth: { amp: 0.0024, freq: 1.5 } },
    open: [1.2, 1.5],
    petalColor: 0xe89ab8, petalBase: 0xd77ba0, core: 0xe8bc45,
    weight: 1.5,
  },
  { // hoa tím nhỏ — violet: OVAL petals in an ASYMMETRIC face —
    // two up, two out, one big lower lip
    petals: 5,
    petal: { length: 0.012, width: 0.009, cup: 0.004, arc: 0.9, wave: 0.0006, waveFreq: 2, profile: { a: 0.5, b: 0.5 } },
    open: [1.0, 1.3],
    layout: [
      { yaw: -0.55, scale: 0.85, open: 0.8 },
      { yaw: 0.55, scale: 0.85, open: 0.8 },
      { yaw: -1.75, scale: 0.95, open: 1.0 },
      { yaw: 1.75, scale: 0.95, open: 1.0 },
      { yaw: Math.PI, scale: 1.5, open: 1.25 }, // lower lip
    ],
    petalColor: 0x9a7fd1, petalBase: 0x7a5cba, core: 0xe8d95a,
    stalk: [0.26, 0.4],
    weight: 1.6,
  },
];

// Shared wind: same gust shape as the sandbox so flowers sway with the field.
const WIND_GLSL = /* glsl */ `
  float windNoise(vec2 p, float t) {
    return sin(p.x * 0.35 + t) * 0.6
         + sin(p.y * 0.28 + t * 1.37 + 1.7) * 0.4;
  }
`;

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uCameraPos;
  uniform vec3 uLightTint;
  uniform float uExposure;
  vec3 applyFog(vec3 color, vec3 worldPos) {
    color *= uLightTint * uExposure;
    float dist = distance(worldPos, uCameraPos);
    return mix(color, uFogColor, smoothstep(uFogNear, uFogFar, dist));
  }
`;

// Ashima 2D simplex noise — the EXACT field grass.js uses, so the same gusts
// sweep across both grass and flowers.
const SNOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

// windSway(basePos) returns the SAME horizontal gust displacement grass.js
// applies to its blades (same windDir, same 2-octave gust + slow breeze +
// lateral sway, same cursor push), so flowers and grass move together.
const SWAY_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWind;      // wind strength (grass uses 1.0)
  uniform vec2  uWindDir;   // normalized wind direction (matches grass)
  uniform vec3  uMouse;     // world-space cursor point on the ground
  uniform float uMouseOn;   // 0..1 pointer presence
  uniform float uPushR;     // cursor push radius
  uniform float uSwayAmt;   // maps grass sway units → flower head travel
  ${SNOISE_GLSL}
  vec2 windSway(vec2 basePos) {
    vec2 windDir = uWindDir;
    vec2 perp = vec2(-windDir.y, windDir.x);
    vec2 wp = basePos * 0.13 - windDir * (uTime * 0.9);
    float gust = snoise(wp) * 0.62 + snoise(wp * 2.4 + 7.0) * 0.30;
    float breeze = 0.6 + 0.4 * snoise(basePos * 0.02 - windDir * (uTime * 0.22));
    float lateral = snoise(wp * 1.3 + 21.0) * 0.22;
    float forward = (gust * 0.7 + 0.3) * breeze;
    vec2 sway = (windDir * forward + perp * lateral) * uWind;
    // Cursor push — same keying off the base as grass, so flowers lean aside too.
    vec2 d = basePos - uMouse.xz;
    float r = length(d) + 1e-4;
    float k = 1.0 - smoothstep(0.0, uPushR, r);
    float push = k * k * (0.35 + 0.65 * uMouseOn);
    sway += (d / r) * push * 0.6;
    return sway * uSwayAmt;
  }
`;

// --- Near tier: parametric petal -------------------------------------------

// Beta-curve width profile: peak position and tip/base roundness controlled
// by (a, b). Normalized so the peak equals 1.
function makeProfile(a, b) {
  const vPeak = a / (a + b);
  const peak = Math.pow(vPeak, a) * Math.pow(1 - vPeak, b);
  return v => {
    const vv = Math.min(Math.max(v, 0.001), 0.999);
    return Math.pow(vv, a) * Math.pow(1 - vv, b) / peak;
  };
}

// Petal surface on a fine grid. The midrib is an ARC (closed-form: the strip
// bends progressively through space), the cross-section is cupped, the rim
// ripples, and optional TEETH cut real serrations into the tip outline.
function createPetalGeometry({
  length = 0.02,
  width = 0.01,
  cup = 0.006,
  arc = 1.0,          // total midrib bend in radians tip-to-base
  wave = 0.0012,
  waveFreq = 3,
  profile = { a: 0.75, b: 0.75 },
  teeth = null,       // { amp, freq }: tip serration depth (world) and count
  wSegs = 8,
  lSegs = 12,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const widthAt = makeProfile(profile.a, profile.b);
  // Closed-form arc spine: position along the midrib at parameter v
  const spineY = v => (arc === 0 ? v * length : (length / arc) * Math.sin(arc * v));
  const spineZ = v => (arc === 0 ? 0 : (length / arc) * (1 - Math.cos(arc * v)));

  for (let j = 0; j <= lSegs; j++) {
    const v = j / lSegs;
    for (let i = 0; i <= wSegs; i++) {
      const u = i / wSegs;
      const e = u * 2 - 1;

      // Teeth pull the tip edge back along the spine, deeper between teeth —
      // a real serrated silhouette, strongest at the very tip.
      let vv = v;
      if (teeth) {
        const cut = (teeth.amp / length) * (0.5 + 0.5 * Math.cos(u * teeth.freq * Math.PI * 2));
        vv = v - cut * Math.pow(Math.max(0, (v - 0.6) / 0.4), 2);
      }

      const ang = arc * vv;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const hw = width * 0.5 * widthAt(vv);

      // Offsets perpendicular to the local midrib direction:
      // cup folds edges toward the surface normal, wave ripples the rim.
      let n = cup * e * e * Math.sin(Math.PI * vv);
      n -= wave * Math.sin(vv * waveFreq * Math.PI * 2) * e * e;

      positions.push(
        e * hw,
        spineY(vv) - n * sinA,
        spineZ(vv) + n * cosA
      );
      uvs.push(u, v);
    }
  }
  const stride = wSegs + 1;
  for (let j = 0; j < lSegs; j++) {
    for (let i = 0; i < wSegs; i++) {
      const a = j * stride + i;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const petalVertexShader = /* glsl */ `
  uniform float uPetalInset;  // pull the petal base toward the head centre (closes the core gap)
  attribute vec3 aCenter;     // flower head position (top of the stalk)
  attribute float aYaw;       // petal angle around the head axis
  attribute float aOpen;      // 0 = closed upright, ~1.5 = fully splayed
  attribute float aScale;
  attribute float aPhase;
  attribute float aColorVar;

  varying float vU;
  varying float vV;
  varying float vEdge;
  varying float vColorVar;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  ${SWAY_GLSL}

  vec3 rotX(vec3 p, float c, float s) { return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c); }
  vec3 rotY(vec3 p, float c, float s) { return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c); }

  void main() {
    vU = uv.x;
    vV = uv.y;
    vEdge = abs(uv.x * 2.0 - 1.0);
    vColorVar = aColorVar;

    float co = cos(aOpen), so = sin(aOpen);
    float cy = cos(aYaw), sy = sin(aYaw);

    // Slide the petal down its own spine so its base overlaps the centre,
    // covering the ring that used to show between the petals and the core.
    vec3 lp = position;
    lp.y -= uPetalInset;
    vec3 pos = rotY(rotX(lp * aScale, co, so), cy, sy);
    vNormal = rotY(rotX(normal, co, so), cy, sy);

    vec3 worldPos = aCenter + pos;

    // Whole head rides the SAME gust field + cursor push as the grass blades.
    worldPos.xz += windSway(aCenter.xz);

    vWorldPos = worldPos;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const petalFragmentShader = /* glsl */ `
  uniform vec3 uPetalColor;
  uniform vec3 uPetalBaseColor;
  uniform vec3 uSunDir;
  uniform float uGlow;   // brightness lift so petals cross the bloom threshold
  ${FOG_GLSL}

  varying float vU;
  varying float vV;
  varying float vEdge;
  varying float vColorVar;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    // Three-stop ramp: deep saturated base -> mid -> pale rim. Real petals
    // wash out toward the rim because the tissue thins.
    vec3 color = mix(uPetalBaseColor, uPetalColor, smoothstep(0.0, 0.4, vV));
    vec3 rim = mix(color, vec3(1.0), 0.35);
    color = mix(color, rim, smoothstep(0.7, 1.0, vV));
    color *= 0.94 + vColorVar * 0.12;

    // Veins: fine ridges radiating from the base, wobbling slightly and
    // fading toward the rim. Shading-only — no texture needed.
    float vein = sin(vU * 44.0 + sin(vV * 7.0) * 0.8);
    float veinShade = 1.0 - (0.5 + 0.5 * vein) * 0.08 * (1.0 - vV * 0.6);
    color *= veinShade;

    vec3 N = normalize(vNormal);
    float ndl = dot(N, uSunDir);

    // Wrap diffuse: petals scatter light, terminator is soft, never black
    float wrap = clamp((abs(ndl) + 0.5) / 1.5, 0.0, 1.0);
    color *= 0.55 + 0.5 * wrap;

    // Translucency: sun on the far side glows through the tissue, strongest
    // where the petal is thin (toward the rim)
    float back = clamp(-ndl, 0.0, 1.0);
    color += uPetalColor * back * (0.18 + 0.22 * vV);

    // Thickness cues: warm darker underside, slight rim occlusion
    if (!gl_FrontFacing) {
      color *= vec3(0.88, 0.84, 0.82);
    }
    color *= 1.0 - pow(vEdge, 4.0) * 0.10;

    color *= uGlow;   // petals glow — fed into the selective bloom pass
    gl_FragColor = vec4(applyFog(color, vWorldPos), 1.0);
  }
`;

// Stalks share a simple shader: sway bend ~ uv.y².
const stalkVertexShader = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aColorVar;

  varying float vHeight;
  varying float vColorVar;
  varying vec3 vWorldPos;

  ${SWAY_GLSL}

  void main() {
    vHeight = uv.y;
    vColorVar = aColorVar;

    vec3 worldPos = position * aScale + aOffset;
    // Base stays planted; the tip follows the gust (uv.y² bend) like a blade.
    worldPos.xz += windSway(aOffset.xz) * (uv.y * uv.y);

    vWorldPos = worldPos;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const stalkFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  ${FOG_GLSL}

  varying float vHeight;
  varying float vColorVar;
  varying vec3 vWorldPos;

  void main() {
    vec3 color = mix(uColorA, uColorB, vHeight) * (0.9 + vColorVar * 0.2);
    gl_FragColor = vec4(applyFog(color, vWorldPos), 1.0);
  }
`;

// Cores carry a per-instance color (species core color).
const coreVertexShader = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aScale;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying vec3 vWorldPos;

  ${SWAY_GLSL}

  void main() {
    vColor = aColor;
    vec3 worldPos = position * aScale + aOffset;
    // Same full-head sway as the petals (shared base xz) → core stays bound.
    worldPos.xz += windSway(aOffset.xz);
    vWorldPos = worldPos;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const coreFragmentShader = /* glsl */ `
  uniform float uGlow;
  ${FOG_GLSL}
  varying vec3 vColor;
  varying vec3 vWorldPos;
  void main() {
    gl_FragColor = vec4(applyFog(vColor * uGlow, vWorldPos), 1.0);
  }
`;

// --- Far tier: canvas-drawn flower card -------------------------------------

function drawFlowerSprite() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 256);

  ctx.strokeStyle = '#41682a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(64, 256);
  ctx.quadraticCurveTo(74, 160, 64, 66);
  ctx.stroke();
  ctx.fillStyle = '#4a7430';
  for (const [lx, ly, rot] of [[52, 190, -0.9], [80, 150, 0.8]]) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Petals stay white — the shader tints them per instance by species color
  ctx.fillStyle = '#f2f0ea';
  const cx = 64, cy = 52;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#e2b23c';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const cardVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uWindScale;

  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aYaw;
  attribute float aPhase;
  attribute vec3 aTint;

  varying vec2 vUv;
  varying vec3 vTint;
  varying vec3 vWorldPos;

  ${WIND_GLSL}

  void main() {
    vUv = uv;
    vTint = aTint;

    vec3 pos = position * aScale;
    float c = cos(aYaw);
    float s = sin(aYaw);
    pos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);

    vec3 worldPos = pos + aOffset;
    float t = uTime * uWindSpeed;
    vec2 sway = vec2(
      windNoise(aOffset.xz * uWindScale, t),
      windNoise(aOffset.zx * uWindScale, t * 0.8 + 2.0) * 0.5
    );
    sway += 0.15 * sin(t * 2.3 + aPhase * 6.2831);
    worldPos.xz += sway * uv.y * uv.y * uWindStrength;

    vWorldPos = worldPos;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const cardFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  ${FOG_GLSL}

  varying vec2 vUv;
  varying vec3 vTint;
  varying vec3 vWorldPos;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.5) discard;
    // Tint only the bright (petal) pixels toward the species color;
    // stem/leaf pixels keep their green.
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 color = mix(tex.rgb, tex.rgb * vTint, smoothstep(0.55, 0.8, lum));
    gl_FragColor = vec4(applyFog(color, vWorldPos), 1.0);
  }
`;

function createCrossQuadGeometry(width, height) {
  const hw = width / 2;
  const positions = [
    -hw, 0, 0, hw, 0, 0, hw, height, 0, -hw, height, 0,
    0, 0, -hw, 0, 0, hw, 0, height, hw, 0, height, -hw,
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// --- Field assembly ----------------------------------------------------------

function instancedFrom(source, count) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = source.index;
  geo.attributes.position = source.attributes.position;
  geo.attributes.uv = source.attributes.uv;
  if (source.attributes.normal) geo.attributes.normal = source.attributes.normal;
  geo.instanceCount = count;
  return geo;
}

function pickSpecies() {
  const total = SPECIES.reduce((s, sp) => s + sp.weight, 0);
  let r = Math.random() * total;
  for (let s = 0; s < SPECIES.length; s++) {
    r -= SPECIES[s].weight;
    if (r <= 0) return s;
  }
  return SPECIES.length - 1;
}

export function createFlowerField({
  fieldRadius = 15,
  innerRadius = 7,
  nearCount = 380,
  cardCount = 800,
  stalkScale = 1,   // multiply stalk height (raises heads toward the grass tips)
  headScale = 1,    // multiply head size (scales petals + core, not placement)
  droop = 0,        // extra petal splay (radians) — >0 tips the petals downward
  coreScale = 1,    // enlarge the center disc so it meets the petal ring (no gap)
  coreDrop = 0,     // lower the core (× head size) so it nests INTO the petals
  petalInset = 0,   // slide petal bases toward the centre (spine units) to close the gap
  glow = 1.25,      // petal/core brightness lift feeding the bloom pass
  sway = 0.16,      // grass-sway units → flower head horizontal travel
  pushRadius = 2.6, // cursor push radius (match the grass field)
  windDir = [0.82, 0.44],           // wind direction (match grass.js)
  fog = { color: 0xcfd8c9, near: 20, far: 90 },
  wind = { strength: 1.0, speed: 1.2, scale: 1.0 }, // strength = grass uWind
} = {}) {
  const group = new THREE.Group();
  const disposables = [];

  const sharedUniforms = {
    uTime: { value: 0 },
    // Synced-with-grass wind (same snoise gusts, direction, cursor push):
    uWind: { value: wind.strength },
    uWindDir: { value: new THREE.Vector2(windDir[0], windDir[1]).normalize() },
    uMouse: { value: new THREE.Vector3(0, 0, 2) },
    uMouseOn: { value: 0 },
    uPushR: { value: pushRadius },
    uSwayAmt: { value: sway },
    uGlow: { value: glow },
    uPetalInset: { value: petalInset },
    // Legacy card-tier wind (only used when cardCount > 0):
    uWindStrength: { value: 0.09 },
    uWindSpeed: { value: wind.speed },
    uWindScale: { value: wind.scale },
    uFogColor: { value: new THREE.Color(fog.color) },
    uFogNear: { value: fog.near },
    uFogFar: { value: fog.far },
    uCameraPos: { value: new THREE.Vector3() },
    uLightTint: { value: new THREE.Color(1, 1, 1) },
    uExposure: { value: 1 },
  };
  const sunDir = new THREE.Vector3(20, 30, 10).normalize();

  // -- Heads, grouped by species
  const heads = [];
  for (let f = 0; f < nearCount; f++) {
    const r = innerRadius * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const sIdx = pickSpecies();
    const sp = SPECIES[sIdx];
    const stalk = sp.stalk ?? [0.42, 0.65];
    heads.push({
      species: sIdx,
      x: Math.cos(theta) * r,
      z: Math.sin(theta) * r,
      h: (stalk[0] + Math.random() * (stalk[1] - stalk[0])) * stalkScale,
      phase: Math.random(),
      colorVar: Math.random(),
      open: sp.open[0] + Math.random() * (sp.open[1] - sp.open[0]),
      size: (0.85 + Math.random() * 0.35) * headScale,
    });
  }

  // -- Stalks (all species share one mesh)
  {
    const positions = [];
    const uvs = [];
    const indices = [];
    const SEGS = 4;
    for (let i = 0; i <= SEGS; i++) {
      const v = i / SEGS;
      const w = 0.005 * (1 - v * 0.5) * 0.5;
      positions.push(-w, v, 0, w, v, 0);
      uvs.push(0, v, 1, v);
    }
    for (let i = 0; i < SEGS; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const strip = new THREE.BufferGeometry();
    strip.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    strip.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    strip.setIndex(indices);

    const geo = instancedFrom(strip, nearCount);
    const offsets = new Float32Array(nearCount * 3);
    const scales = new Float32Array(nearCount);
    const phases = new Float32Array(nearCount);
    const colorVars = new Float32Array(nearCount);
    const bends = new Float32Array(nearCount);
    heads.forEach((hd, f) => {
      offsets[f * 3] = hd.x;
      offsets[f * 3 + 1] = 0;
      offsets[f * 3 + 2] = hd.z;
      scales[f] = hd.h;
      phases[f] = hd.phase;
      colorVars[f] = hd.colorVar;
      bends[f] = 0;
    });
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aColorVar', new THREE.InstancedBufferAttribute(colorVars, 1));
    geo.setAttribute('aBend', new THREE.InstancedBufferAttribute(bends, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: stalkVertexShader,
      fragmentShader: stalkFragmentShader,
      uniforms: {
        ...sharedUniforms,
        uColorA: { value: new THREE.Color(0x35571f) },
        uColorB: { value: new THREE.Color(0x5b8433) },
      },
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(geo, mat);
  }

  // -- Cores: domed fan, per-instance species color
  {
    const RIM = 8;
    const positions = [0, 0.0006, 0];   // near-flat centre (was 0.003) so a bigger
    const uvs = [0.5, 1];               // core reads as a flat disc, not a bump
    const indices = [];
    for (let i = 0; i <= RIM; i++) {
      const a = (i / RIM) * Math.PI * 2;
      positions.push(Math.cos(a) * 0.0045, 0, Math.sin(a) * 0.0045);
      uvs.push(0.5 + Math.cos(a) * 0.5, 0.5);
    }
    for (let i = 1; i <= RIM; i++) indices.push(0, i, i + 1);
    const fan = new THREE.BufferGeometry();
    fan.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fan.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    fan.setIndex(indices);

    const geo = instancedFrom(fan, nearCount);
    const offsets = new Float32Array(nearCount * 3);
    const scales = new Float32Array(nearCount);
    const phases = new Float32Array(nearCount);
    const colors = new Float32Array(nearCount * 3);
    const tmp = new THREE.Color();
    heads.forEach((hd, f) => {
      offsets[f * 3] = hd.x;
      offsets[f * 3 + 1] = hd.h - coreDrop * hd.size;   // sink the core into the petals
      offsets[f * 3 + 2] = hd.z;
      scales[f] = hd.size * coreScale;
      phases[f] = hd.phase;
      tmp.set(SPECIES[hd.species].core).multiplyScalar(0.9 + hd.colorVar * 0.2);
      colors[f * 3] = tmp.r;
      colors[f * 3 + 1] = tmp.g;
      colors[f * 3 + 2] = tmp.b;
    });
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: { ...sharedUniforms },
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(geo, mat);
  }

  // -- Petals: one instanced mesh per species (own geometry + palette)
  SPECIES.forEach((sp, sIdx) => {
    const mine = heads.filter(h => h.species === sIdx);
    if (mine.length === 0) return;
    const petalCount = mine.length * sp.petals;

    const geo = instancedFrom(createPetalGeometry(sp.petal), petalCount);
    const centers = new Float32Array(petalCount * 3);
    const yaws = new Float32Array(petalCount);
    const opens = new Float32Array(petalCount);
    const scales = new Float32Array(petalCount);
    const phases = new Float32Array(petalCount);
    const colorVars = new Float32Array(petalCount);
    let pi = 0;
    for (const hd of mine) {
      // Whole-flower yaw so asymmetric faces don't all point the same way
      const headYaw = Math.random() * Math.PI * 2;
      for (let k = 0; k < sp.petals; k++) {
        const L = sp.layout ? sp.layout[k] : null;
        centers[pi * 3] = hd.x;
        centers[pi * 3 + 1] = hd.h;
        centers[pi * 3 + 2] = hd.z;
        yaws[pi] = headYaw
          + (L ? L.yaw : (k / sp.petals) * Math.PI * 2)
          + (Math.random() - 0.5) * (L ? 0.08 : 0.22);
        opens[pi] = hd.open * (L ? L.open : 1) + droop + (sp.droop || 0) + (Math.random() - 0.5) * 0.15;
        scales[pi] = hd.size * (L ? L.scale : 1) * (0.92 + Math.random() * 0.16);
        phases[pi] = hd.phase;
        colorVars[pi] = hd.colorVar;
        pi++;
      }
    }
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(centers, 3));
    geo.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yaws, 1));
    geo.setAttribute('aOpen', new THREE.InstancedBufferAttribute(opens, 1));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aColorVar', new THREE.InstancedBufferAttribute(colorVars, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: petalVertexShader,
      fragmentShader: petalFragmentShader,
      uniforms: {
        ...sharedUniforms,
        uPetalColor: { value: new THREE.Color(sp.petalColor) },
        uPetalBaseColor: { value: new THREE.Color(sp.petalBase) },
        uSunDir: { value: sunDir },
        // Per-species inset overrides the global one: negative pushes petal
        // bases OUTWARD, opening a central hole (trumpet / loa kèn).
        uPetalInset: { value: sp.petalInset ?? petalInset },
      },
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(geo, mat);
  });

  // -- Far cards, tinted by species palette
  let cardTexture = null;
  if (cardCount > 0) {
    cardTexture = drawFlowerSprite();
    const geo = instancedFrom(createCrossQuadGeometry(0.22, 0.55), cardCount);
    const offsets = new Float32Array(cardCount * 3);
    const scales = new Float32Array(cardCount);
    const yaws = new Float32Array(cardCount);
    const phases = new Float32Array(cardCount);
    const tints = new Float32Array(cardCount * 3);
    const tmp = new THREE.Color();
    for (let f = 0; f < cardCount; f++) {
      const a = (innerRadius / fieldRadius) ** 2;
      const r = fieldRadius * Math.sqrt(a + Math.random() * (1 - a));
      const theta = Math.random() * Math.PI * 2;
      offsets[f * 3] = Math.cos(theta) * r;
      offsets[f * 3 + 1] = 0;
      offsets[f * 3 + 2] = Math.sin(theta) * r;
      scales[f] = 0.75 + Math.random() * 0.5;
      yaws[f] = Math.random() * Math.PI * 2;
      phases[f] = Math.random();
      tmp.set(SPECIES[pickSpecies()].petalColor);
      tints[f * 3] = tmp.r;
      tints[f * 3 + 1] = tmp.g;
      tints[f * 3 + 2] = tmp.b;
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    geo.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yaws, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: cardVertexShader,
      fragmentShader: cardFragmentShader,
      uniforms: {
        ...sharedUniforms,
        uMap: { value: cardTexture },
      },
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(geo, mat);
  }

  return {
    mesh: group,
    // mouse/mouseOn come straight from the grass field so the cursor pushes
    // flowers and blades identically.
    update(time, camera, mouse, mouseOn) {
      sharedUniforms.uTime.value = time;
      sharedUniforms.uCameraPos.value.copy(camera.position);
      if (mouse) sharedUniforms.uMouse.value.copy(mouse);
      if (mouseOn !== undefined) sharedUniforms.uMouseOn.value = mouseOn;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      if (cardTexture) cardTexture.dispose();
    },
  };
}

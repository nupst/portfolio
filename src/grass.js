// Three.js grass meadow — replaces the old 2D-canvas blade field.
// GPU-instanced blades, layered wind, pointer interaction (blades part and
// glow around the cursor), fog fading into the page background (#050807).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createFlowerField } from './flowers.js';

// Adobe palette: olive greens fading to earthy browns.
const BG = new THREE.Color('#cfe6da');        // bright daylight haze — no black background
const GROUND = new THREE.Color('#593a2f');    // dark earthy brown ground (#593A2F)
const GROUND_DEPTH = 0.0;                      // 0 = flat ground (bowl depression disabled)
const BLADE_BASE = new THREE.Color('#735d34'); // olive-brown root (#735D34)
const BLADE_TIP = new THREE.Color('#788c30');  // bright olive-green tip (#788C30)
const BLADE_DRY = new THREE.Color('#6b732f');  // duller olive-green variation (#6B732F)
const HOT = new THREE.Color('#cdd98a');        // light olive cursor highlight

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMouse;      // world-space point on the ground
  uniform float uMouseOn;   // 0..1 pointer presence
  uniform float uPushR;     // interaction radius
  uniform float uWind;      // wind strength
  uniform float uSunRadius;  // radius of the overhead sun pool
  uniform float uGroundR;      // ground disc radius (for UV mapping)
  uniform float uGroundRepeat; // ground texture repeat
  uniform float uGroundDepth;  // bowl depression depth (matches ground geometry)

  attribute vec3 aOffset;   // blade root position
  attribute vec4 aRand;     // x: yaw, y: height mul, z: phase, w: color jitter
  attribute float aLean;    // resting lean amount

  varying float vT;         // 0 root .. 1 tip
  varying float vJitter;
  varying float vPush;
  varying float vFogDepth;
  varying vec3 vNormal;     // world-space blade face normal (for lighting)
  varying float vTint;      // low-freq spatial colour variation
  varying float vCloud;     // drifting sunlight patches (cloud shadows)
  varying float vSunPool;   // overhead sun pool — bright centre, fades to edge
  varying vec2 vGroundUV;   // ground-texture coord under this blade

  // — Ashima 2D simplex noise — a smooth, continuous field used for wind.
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

  void main() {
    float t = position.y;               // blade geometry stores t in y
    vT = t;
    vJitter = aRand.w;

    float yaw = aRand.x;
    float c = cos(yaw), s = sin(yaw);

    // Procedural height & width: low-freq spatial noise creates patches of
    // taller/shorter and wider/narrower blades, not per-blade randomness.
    float heightNoise = snoise(aOffset.xz * 0.035 + 100.0) * 0.18;      // ±18% height variation
    float widthNoise = snoise(aOffset.xz * 0.032 + 200.0) * 0.22;       // ±22% width variation
    float height = aRand.y * (1.0 + heightNoise);
    float width = mix(1.35, 0.85, aRand.w) * (1.0 + widthNoise);

    // Coherent wind: ONE flowing noise field sampled at the blade's world
    // position and scrolled along the wind direction. Gusts sweep across the
    // whole meadow so neighbouring blades move together — no per-blade jitter.
    vec2 windDir = normalize(vec2(0.82, 0.44));
    vec2 perp = vec2(-windDir.y, windDir.x);
    vec2 wp = aOffset.xz * 0.13 - windDir * (uTime * 0.9);
    float gust = snoise(wp) * 0.62 + snoise(wp * 2.4 + 7.0) * 0.30;          // 2-octave gust
    float breeze = 0.6 + 0.4 * snoise(aOffset.xz * 0.02 - windDir * (uTime * 0.22)); // slow strength drift
    float lateral = snoise(wp * 1.3 + 21.0) * 0.22;                          // gentle sideways sway
    float forward = (gust * 0.7 + 0.3) * breeze;                             // mostly downwind, mild backsway

    // Every blade carries an intrinsic resting curl along its own facing
    // direction (always > 0), so it shows a natural bend even with no wind.
    vec2 faceDir = vec2(cos(yaw), sin(yaw));
    float restCurl = 0.42 + 0.30 * fract(aRand.z * 0.1592);                  // 0.42 .. 0.72 per blade
    vec2 sway = faceDir * (restCurl + aLean * 0.35)
              + (windDir * forward + perp * lateral) * uWind;                // wind on top

    // Low-frequency spatial tint → soft colour patches across the field.
    vTint = snoise(aOffset.xz * 0.045 + 50.0);

    // Dappled sunlight: two low-frequency patch fields drifting with the wind,
    // mapped to 0 (in shade) .. 1 (full sun) with plenty of spread so bright and
    // shadowed patches sweep visibly across the meadow.
    float cl = snoise(aOffset.xz * 0.05 - windDir * (uTime * 0.28) + 33.0) * 0.6
             + snoise(aOffset.xz * 0.11 - windDir * (uTime * 0.42) + 12.0) * 0.4;
    vCloud = clamp(cl * 1.1 + 0.5, 0.0, 1.0);

    // Overhead sun: a broad pool of light pouring straight down at the centre,
    // fading out toward the edges of the field (sun high above the viewer).
    float sunDist = length(aOffset.xz) / uSunRadius;
    vSunPool = 1.0 - smoothstep(0.1, 1.0, sunDist);

    // Ground-texture UV under the blade root (matches the ground disc's mapping).
    vGroundUV = vec2((aOffset.x / uGroundR + 1.0) * 0.5,
                     (-aOffset.z / uGroundR + 1.0) * 0.5) * uGroundRepeat;

    // Pointer: push blades away from the cursor. Keyed off the root so the whole
    // blade reacts together (stable) instead of feeding back on the tip.
    vec2 d = aOffset.xz - uMouse.xz;
    float r = length(d) + 1e-4;
    float k = 1.0 - smoothstep(0.0, uPushR, r);
    float push = k * k * (0.35 + 0.65 * uMouseOn);
    vPush = push;
    sway += (d / r) * push * 0.6;   // gentle: the cursor only leans blades aside, never flattens them

    // Bend the centreline as a CIRCULAR ARC of fixed length. Each vertex is
    // placed by its along-blade arc length s = t * height on a circle, so the
    // length measured ALONG the blade stays exactly uHeight for any bend — the
    // blade curves over but can never be pulled longer than a single blade.
    float swayLen = length(sway);
    vec2 bd = swayLen > 0.04 ? sway / swayLen : faceDir;   // always a valid bend direction
    // Min keeps EVERY blade curved; the low max means wind/cursor only sway and
    // lean the blades — they never bend flat (which read as stretching).
    float phi = clamp(swayLen * 0.5, 0.18, 0.7);
    float safePhi = max(phi, 1e-3);
    float R = height / safePhi;                            // arc radius (length / angle)
    float alpha = t * safePhi;                             // angle at arc length t*height
    float cy = R * sin(alpha);                             // vertical rise (>= 0)
    vec2 horiz = bd * (R * (1.0 - cos(alpha)));            // horizontal sweep along bend dir

    // Sit the blade root on the curved ground bowl (same quadratic depression as
    // the ground disc), so blades follow the surface instead of a flat plane.
    float gFrac = min(length(aOffset.xz) / uGroundR, 1.0);
    float groundY = -uGroundDepth * (1.0 - gFrac * gFrac);

    vec3 center = vec3(aOffset.x + horiz.x, groundY + cy, aOffset.z + horiz.y);

    // Tapered width, added perpendicular to the blade's facing direction.
    float halfW = position.x * 0.08 * width * (1.0 - t * 0.82);
    vec3 pos = center + vec3(c * halfW, 0.0, -s * halfW);

    // World-space blade normal: perpendicular to the along-blade tangent and the
    // (horizontal) width direction. The mesh has an identity transform, so this
    // is already in world space.
    float sa = sin(alpha), ca = cos(alpha);
    vec3 tangent = normalize(vec3(bd.x * sa, ca, bd.y * sa));
    vec3 wdir = vec3(c, 0.0, -s);
    vNormal = normalize(cross(tangent, wdir));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uDry;
  uniform vec3 uHot;
  uniform vec3 uFog;
  uniform float uFogDensity;
  uniform vec3 uLightDir;    // world-space sun direction (normalized)
  uniform vec3 uSunColor;
  uniform float uSunStrength;
  uniform vec3 uSkyColor;    // hemisphere ambient — sky (up)
  uniform vec3 uGroundColor; // hemisphere ambient — ground (down)
  uniform float uSunRadius;  // radius of the overhead sun pool
  uniform sampler2D uShadowMap; // screen-space shadows cast by the UI cards
  uniform vec2 uResolution;     // drawing-buffer size in pixels
  uniform sampler2D uGroundTex; // ground material — grass roots blend into it
  uniform float uHasGroundTex;

  varying float vT;
  varying float vJitter;
  varying float vPush;
  varying float vFogDepth;
  varying vec3 vNormal;
  varying float vTint;
  varying float vCloud;
  varying float vSunPool;
  varying vec2 vGroundUV;

  void main() {
    // Soft blade colour. Tip hue blends per-blade jitter with the low-freq
    // spatial tint so the meadow varies in gentle patches, not sharp per-blade.
    float tipMix = clamp(vJitter * 0.4 + vTint * 0.3 + 0.3, 0.0, 1.0);
    vec3 tipCol = mix(uTip, uDry, tipMix);
    // Lift the root slightly toward the tip so the base isn't a hard dark band.
    vec3 rootCol = mix(uBase, uTip, 0.18);
    // Smootherstep gradient root→tip for a soft, bandless blend.
    float g = smoothstep(0.0, 1.0, vT);
    g = g * g * (3.0 - 2.0 * g);
    vec3 albedo = mix(rootCol, tipCol, g);
    albedo *= 0.84 + 0.16 * vT;   // gentle base shading

    // Blend the blade root into the actual ground material beneath it, so the
    // grass reads as growing out of the earth rather than floating on it.
    if (uHasGroundTex > 0.5) {
      vec3 gcol = texture2D(uGroundTex, vGroundUV).rgb;
      float rootBlend = (1.0 - smoothstep(0.0, 0.45, vT)) * 0.8;
      albedo = mix(albedo, gcol, rootBlend);
    }

    // — world lighting —
    vec3 N = normalize(vNormal);
    // Half-lambert sun: smooth across the double-sided blades, no hard flip.
    float diff = dot(N, uLightDir) * 0.5 + 0.5;
    // Hemisphere ambient: up-facing catches sky, down-facing the ground.
    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(uGroundColor, uSkyColor, hemi);
    // Overhead sun pool × drifting cloud dapple = the amount of sun on this blade.
    // Bright daytime: shaded patches stay well-lit, sun pool only adds highlight.
    float sunAmt = mix(0.62, 1.35, vCloud) * (0.7 + 0.5 * vSunPool);
    float sun = diff * uSunStrength * sunAmt;
    vec3 col = albedo * (ambient + uSunColor * sun);

    // Warm light pouring down onto the tips under the sun pool — the "sun".
    float toTip = smoothstep(0.2, 1.0, vT);
    col += uSunColor * vSunPool * toTip * (0.4 + 0.6 * vCloud) * 0.55;

    // Extra sheen where the sun directly catches sunlit tips.
    float sheen = pow(max(diff, 0.0), 3.0) * toTip * smoothstep(0.45, 1.0, vCloud) * vSunPool;
    col += uSunColor * sheen * 0.5;

    // Soft shadows dropped by the floating UI cards (screen-space map).
    float cardShadow = texture2D(uShadowMap, clamp(gl_FragCoord.xy / uResolution, 0.0, 1.0)).a;
    col *= 1.0 - cardShadow * 0.5;

    // Interaction: ONLY the touched blades brighten — no glow in the air.
    col += uHot * vPush * (0.3 + 0.7 * vT);

    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    col = mix(col, uFog, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function curvedGroundGeometry(radius = 70, radialSegs = 48, depth = 4.2) {
  // Curved ground disc: shallow bowl depression visible from top-down camera.
  // Depth controls how much the center sinks (curves inward).
  const positions = [];
  const uvs = [];
  const index = [];

  const thetaSegs = radialSegs;
  const rSegs = 16;  // radial segments for smoother curve

  // Generate vertices: concentric rings with increasing radius
  for (let r = 0; r <= rSegs; r++) {
    const rFrac = r / rSegs;  // 0 at center, 1 at edge
    const currentRadius = rFrac * radius;
    // Curve: quadratic depression, deepest at center
    const y = -depth * (1 - rFrac * rFrac);

    for (let t = 0; t <= thetaSegs; t++) {
      const theta = (t / thetaSegs) * Math.PI * 2;
      const x = currentRadius * Math.cos(theta);
      const z = currentRadius * Math.sin(theta);
      positions.push(x, y, z);

      // UV coordinates: angle (u) and radius (v)
      const u = t / thetaSegs;
      const v = rFrac;
      uvs.push(u, v);
    }
  }

  // Generate triangles connecting the rings
  for (let r = 0; r < rSegs; r++) {
    for (let t = 0; t < thetaSegs; t++) {
      const a = r * (thetaSegs + 1) + t;
      const b = a + 1;
      const c = a + (thetaSegs + 1);
      const d = c + 1;

      index.push(a, b, c);
      index.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
  geo.computeVertexNormals();
  return geo;
}

function bladeGeometry(segments = 4) {
  // Thin tapered strip; x = ±0.5 (halved & tapered in the shader), y = t 0..1.
  const positions = [];
  const index = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    if (i === segments) {
      positions.push(0, 1, 0); // tip point
    } else {
      positions.push(-0.5, t, 0, 0.5, t, 0);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (i === segments - 1) {
      index.push(a, b, a + 2); // last quad collapses into the tip vertex
    } else {
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  return geo;
}

// Deterministic pseudo-random (stable field between reloads).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGrassField(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null; // no WebGL — CSS gradient fallback stays visible
  }
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  // Near top-down view: camera high above the field looking down, with a slight
  // tilt so the blades keep a little body instead of collapsing to dots.
  const CAM_BASE = new THREE.Vector3(0, 7.6, 1.9);
  camera.position.copy(CAM_BASE);
  const LOOK_AT = new THREE.Vector3(0, 0, 0);
  camera.lookAt(LOOK_AT);

  const fogDensity = 0.02;

  // — curved ground bowl under the blades — lit by real lights so it matches the sun —
  // The bowl curves inward (depression) so it's visible from the top-down camera.
  const ground = new THREE.Mesh(
    curvedGroundGeometry(70, 48, GROUND_DEPTH),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1, metalness: 0 })
  );
  ground.position.y = 0;  // bowl is already centered in its geometry
  scene.add(ground);
  scene.fog = new THREE.FogExp2(BG, fogDensity);

  // World lighting for the ground (the blades are lit inside their own shader,
  // with uLightDir kept in sync with this sun direction).
  scene.add(new THREE.HemisphereLight(0xe4eef2, 0x55603f, 1.25));
  const sun = new THREE.DirectionalLight(0xfff3d2, 1.6);
  sun.position.set(0.12, 0.97, 0.16);
  scene.add(sun);

  // Rocky/mossy ground texture. Save the supplied image to
  // public/textures/ground.jpg — if it's missing the flat GROUND colour stays.
  new THREE.TextureLoader().load(
    import.meta.env.BASE_URL + 'textures/ground.jpg',
    (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(26, 26);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      ground.material.map = tex;
      ground.material.color.set(0xffffff); // full daylight
      ground.material.needsUpdate = true;
      // Share the texture with the grass shader so blade roots blend into it.
      uniforms.uGroundTex.value = tex;
      uniforms.uHasGroundTex.value = 1;
    },
    undefined,
    () => { /* texture missing — keep the flat colour, no error */ }
  );

  // — instanced blades, jittered grid for even, gap-free coverage —
  const coarse = matchMedia('(pointer: coarse)').matches;
  const COUNT = coarse ? 50700 : 118300;  // +30% additional density (91k→118k, 39k→51k)
  const FIELD = 13;          // field half-extent (units) — sized to fill a top-down frame

  const geo = new THREE.InstancedBufferGeometry();
  const blade = bladeGeometry(4);
  geo.index = blade.index;
  geo.setAttribute('position', blade.getAttribute('position'));

  const offsets = new Float32Array(COUNT * 3);
  const rands = new Float32Array(COUNT * 4);
  const leans = new Float32Array(COUNT);
  const rng = mulberry32(1337);
  const cols = Math.ceil(Math.sqrt(COUNT));
  let n = 0;
  for (let i = 0; i < cols && n < COUNT; i++) {
    for (let j = 0; j < cols && n < COUNT; j++) {
      // Jittered grid over a disc centred under the camera — even, gap-free
      // coverage in every direction for the top-down view.
      const u = (i + rng()) / cols;       // 0..1
      const v = (j + rng()) / cols;       // 0..1
      const x = (u - 0.5) * 2 * FIELD;
      const z = (v - 0.5) * 2 * FIELD;
      if (x * x + z * z > FIELD * FIELD) continue;   // clip to disc
      offsets[n * 3 + 0] = x;
      offsets[n * 3 + 1] = 0;
      offsets[n * 3 + 2] = z;
      rands[n * 4 + 0] = rng() * Math.PI * 2;        // yaw
      rands[n * 4 + 1] = 0.5 + rng() * 0.55;         // height (shorter, tighter range)
      rands[n * 4 + 2] = rng() * Math.PI * 2;        // phase
      rands[n * 4 + 3] = rng();                      // color jitter
      leans[n] = (rng() - 0.5) * 0.7;                // resting lean — visible sweep from above
      n++;
    }
  }
  geo.instanceCount = n;
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets.subarray(0, n * 3), 3));
  geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rands.subarray(0, n * 4), 4));
  geo.setAttribute('aLean', new THREE.InstancedBufferAttribute(leans.subarray(0, n), 1));

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 2) },
    uMouseOn: { value: 0 },
    uPushR: { value: 2.6 },
    uWind: { value: 1 },
    uBase: { value: BLADE_BASE },
    uTip: { value: BLADE_TIP },
    uDry: { value: BLADE_DRY },
    uHot: { value: HOT },
    uFog: { value: BG },
    uFogDensity: { value: fogDensity },
    uLightDir: { value: new THREE.Vector3(0.12, 0.97, 0.16).normalize() }, // nearly straight down
    uSunColor: { value: new THREE.Color('#fff3d2') },
    uSunStrength: { value: 1.15 },
    uSkyColor: { value: new THREE.Color('#c2dae0') },
    uGroundColor: { value: new THREE.Color('#5c4a30') }, // warm earthy bounce (palette browns)
    uSunRadius: { value: FIELD },
    uShadowMap: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uGroundTex: { value: null },
    uHasGroundTex: { value: 0 },
    uGroundR: { value: 70 },        // must match the ground disc radius
    uGroundRepeat: { value: 26 },   // must match ground texture repeat
    uGroundDepth: { value: GROUND_DEPTH } // must match the ground bowl depth
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    side: THREE.DoubleSide
  });
  const grass = new THREE.Mesh(geo, mat);
  grass.frustumCulled = false;
  scene.add(grass);

  // — wildflowers scattered through the same disc, interspersed with the grass —
  // Six species (no "spike"); near-tier real petals only (the far-tier cards are
  // upright cross-quads that read as edges from straight above, so they're off).
  // stalkScale/headScale enlarge the natively tiny flowers so their heads sit at
  // grass-tip height and stay legible from the top-down camera.
  const flowers = createFlowerField({
    innerRadius: FIELD,          // fill the whole grass disc
    fieldRadius: FIELD,
    nearCount: coarse ? 1800 : 4200,
    cardCount: 0,                // cards look wrong top-down — disable
    stalkScale: 1.6,             // raise heads toward the grass tips
    headScale: 6.5,              // enlarge heads so flowers read from above
    droop: 0.3,                  // tip the petals slightly downward
    glow: 1.1,                   // gentle brightness lift for the bloom pass
    sway: 0.16,                  // head travel per unit of grass sway
    pushRadius: 2.6,             // match the grass cursor push
    fog: { color: '#cfe6da', near: 40, far: 100 } // match BG; flowers are close so fog barely bites
    // wind defaults: strength 1.0 (= grass uWind), direction (0.82,0.44)
  });
  scene.add(flowers.mesh);

  // — selective bloom: ONLY the flowers glow, the grass stays crisp —
  // The bloom pass renders just the flower layer (rest of the scene absent,
  // cleared to black), blurs it, and the final pass adds that glow back over a
  // normal full-scene render.
  const BLOOM_LAYER = 1;
  flowers.mesh.traverse((o) => { if (o.isMesh) o.layers.enable(BLOOM_LAYER); });

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera, null, new THREE.Color(0, 0, 0), 1));
  // strength, radius, threshold — a faint halo on the brightest flowers only
  // (strength 0.075 = the earlier 0.75 cut 10×, per request).
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.075, 0.35, 0.6);
  bloomComposer.addPass(bloomPass);

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  const combinePass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
      }`
  }), 'baseTexture');
  combinePass.needsSwap = true;
  finalComposer.addPass(combinePass);

  function renderBloom() {
    camera.layers.set(BLOOM_LAYER);   // bloom pass: flowers only
    bloomComposer.render();
    camera.layers.set(0);             // final pass: whole scene + glow
    finalComposer.render();
  }

  // — screen-space shadows from the floating UI cards —
  // The glass cards are DOM elements above the canvas, so real shadow mapping
  // can't see them. Instead their viewport rects are drawn (offset along the
  // sun direction, blurred for softness) into a small canvas that the grass
  // shader samples by gl_FragCoord.
  const SHADOW_SCALE = 0.25;                 // quarter-res is plenty for soft blobs
  const SHADOW_OFF_X = 16, SHADOW_OFF_Y = 20; // px, opposite the sun (upper-left)
  const shadowCanvas = document.createElement('canvas');
  const shadowCtx = shadowCanvas.getContext('2d');
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  shadowTex.minFilter = THREE.LinearFilter;
  shadowTex.magFilter = THREE.LinearFilter;
  shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
  shadowTex.generateMipmaps = false;
  uniforms.uShadowMap.value = shadowTex;

  let shadowDirty = true;
  function updateCardShadows() {
    shadowDirty = false;
    const w = Math.max(1, Math.round(innerWidth * SHADOW_SCALE));
    const h = Math.max(1, Math.round(innerHeight * SHADOW_SCALE));
    if (shadowCanvas.width !== w || shadowCanvas.height !== h) {
      shadowCanvas.width = w;
      shadowCanvas.height = h;
    }
    shadowCtx.setTransform(1, 0, 0, 1, 0, 0);
    shadowCtx.clearRect(0, 0, w, h);
    shadowCtx.filter = `blur(${Math.max(2, 6 * SHADOW_SCALE * 4)}px)`;
    shadowCtx.fillStyle = 'rgba(0,0,0,0.9)';
    const els = document.querySelectorAll('.panel, .contact, .site-header');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80 || r.width === 0) continue;
      shadowCtx.fillRect(
        (r.left + SHADOW_OFF_X) * SHADOW_SCALE,
        (r.top + SHADOW_OFF_Y) * SHADOW_SCALE,
        r.width * SHADOW_SCALE,
        r.height * SHADOW_SCALE
      );
    }
    shadowTex.needsUpdate = true;
  }
  const markShadowsDirty = () => { shadowDirty = true; };
  addEventListener('scroll', markShadowsDirty, { passive: true });

  // — pointer → ground-plane raycast —
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const targetMouse = new THREE.Vector3(0, 0, 2);
  let targetOn = 0;
  let parallaxX = 0, parallaxY = 0, targetPX = 0, targetPY = 0;

  function onMove(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      hit.clampLength(0, 60);
      targetMouse.copy(hit);
      targetOn = 1;
    }
    targetPX = ndc.x;
    targetPY = ndc.y;
  }
  function onLeave() { targetOn = 0; }
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerleave', onLeave);
  document.addEventListener('mouseleave', onLeave);

  // — resize —
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    bloomComposer.setPixelRatio(dpr);
    bloomComposer.setSize(w, h);
    finalComposer.setPixelRatio(dpr);
    finalComposer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    shadowDirty = true;
  }
  resize();
  addEventListener('resize', resize);

  // — animation loop —
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeScale = reduced ? 0.18 : 1;
  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;

  let shadowTick = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt * timeScale;

    // Refresh card shadows when scrolled/resized, plus a slow periodic pass to
    // catch layout changes (language toggle, content edits).
    if (shadowDirty || ++shadowTick >= 60) {
      shadowTick = 0;
      updateCardShadows();
    }

    uniforms.uMouse.value.lerp(targetMouse, 1 - Math.pow(0.0008, dt));
    uniforms.uMouseOn.value += (targetOn - uniforms.uMouseOn.value) * Math.min(1, dt * 3);

    if (!reduced) {
      parallaxX += (targetPX - parallaxX) * Math.min(1, dt * 2.5);
      parallaxY += (targetPY - parallaxY) * Math.min(1, dt * 2.5);
      // Gentle drift across the field + a slow vertical bob; keeps the
      // top-down view alive without changing the overhead framing.
      camera.position.set(
        CAM_BASE.x + parallaxX * 1.1,
        CAM_BASE.y + Math.sin(uniforms.uTime.value * 0.22) * 0.12,
        CAM_BASE.z - parallaxY * 1.1
      );
      camera.lookAt(LOOK_AT);
    }
    flowers.update(uniforms.uTime.value, camera, uniforms.uMouse.value, uniforms.uMouseOn.value);
    renderBloom();
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) {
      cancelAnimationFrame(raf);
      running = false;
      clock.stop();
    } else if (!document.hidden && !running) {
      clock.start();
      running = true;
      frame();
    }
  });

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', resize);
      removeEventListener('scroll', markShadowsDirty);
      shadowTex.dispose();
      flowers.dispose();
      bloomComposer.dispose();
      finalComposer.dispose();
      renderer.dispose();
    }
  };
}

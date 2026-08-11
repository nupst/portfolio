// Three.js grass meadow — replaces the old 2D-canvas blade field.
// GPU-instanced blades, layered wind, pointer interaction (blades part and
// glow around the cursor), fog fading into the page background (#050807).
import * as THREE from 'three';

const BG = new THREE.Color('#050807');
const GROUND = new THREE.Color('#081009');
const BLADE_BASE = new THREE.Color('#152c22');
const BLADE_TIP = new THREE.Color('#5a9a70');
const BLADE_DRY = new THREE.Color('#6f9a58'); // warm-green variation for natural mix
const HOT = new THREE.Color('#9ed0b0');       // cursor glow — same as old effect

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMouse;      // world-space point on the ground
  uniform float uMouseOn;   // 0..1 pointer presence
  uniform float uPushR;     // interaction radius
  uniform float uWind;      // wind strength

  attribute vec3 aOffset;   // blade root position
  attribute vec4 aRand;     // x: yaw, y: height mul, z: phase, w: color jitter
  attribute float aLean;    // resting lean amount

  varying float vT;         // 0 root .. 1 tip
  varying float vJitter;
  varying float vPush;
  varying float vFogDepth;
  varying vec3 vNormal;     // world-space blade face normal (for lighting)
  varying float vTint;      // low-freq spatial colour variation

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
    float height = aRand.y;
    float width = mix(1.35, 0.85, aRand.w);

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
    vec2 sway = (windDir * forward + perp * lateral) * uWind
              + vec2(cos(yaw), sin(yaw)) * aLean;                            // + static resting lean

    // Low-frequency spatial tint → soft colour patches across the field.
    vTint = snoise(aOffset.xz * 0.045 + 50.0);

    // Pointer: push blades away from the cursor. Keyed off the root so the whole
    // blade reacts together (stable) instead of feeding back on the tip.
    vec2 d = aOffset.xz - uMouse.xz;
    float r = length(d) + 1e-4;
    float k = 1.0 - smoothstep(0.0, uPushR, r);
    float push = k * k * (0.35 + 0.65 * uMouseOn);
    vPush = push;
    sway += (d / r) * push * 1.4;

    // Bend the centreline as a CIRCULAR ARC of fixed length. Each vertex is
    // placed by its along-blade arc length s = t * height on a circle, so the
    // length measured ALONG the blade stays exactly uHeight for any bend — the
    // blade curves over but can never be pulled longer than a single blade.
    float swayLen = length(sway);
    vec2 bd = swayLen > 1e-4 ? sway / swayLen : vec2(0.0);  // bend direction
    float phi = clamp(swayLen * 0.55, 0.0, 1.15);          // total bend angle — capped so blades stay upright, never lie flat
    float safePhi = max(phi, 1e-3);
    float R = height / safePhi;                            // arc radius (length / angle)
    float alpha = t * safePhi;                             // angle at arc length t*height
    float cy = R * sin(alpha);                             // vertical rise (>= 0)
    vec2 horiz = bd * (R * (1.0 - cos(alpha)));            // horizontal sweep along bend dir

    vec3 center = vec3(aOffset.x + horiz.x, cy, aOffset.z + horiz.y);

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

  varying float vT;
  varying float vJitter;
  varying float vPush;
  varying float vFogDepth;
  varying vec3 vNormal;
  varying float vTint;

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

    // — world lighting —
    vec3 N = normalize(vNormal);
    // Half-lambert sun: smooth across the double-sided blades, no hard flip.
    float diff = dot(N, uLightDir) * 0.5 + 0.5;
    // Hemisphere ambient: up-facing catches sky, down-facing the ground.
    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(uGroundColor, uSkyColor, hemi);
    vec3 col = albedo * (ambient + uSunColor * (diff * uSunStrength));

    // Interaction: ONLY the touched blades brighten — no glow in the air.
    col += uHot * vPush * (0.3 + 0.7 * vT);

    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    col = mix(col, uFog, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

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

  const fogDensity = 0.026;

  // — ground disc under the blades — lit by real lights so it matches the sun —
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(70, 48),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
  scene.fog = new THREE.FogExp2(BG, fogDensity);

  // World lighting for the ground (the blades are lit inside their own shader,
  // with uLightDir kept in sync with this sun direction).
  scene.add(new THREE.HemisphereLight(0x9fb4bd, 0x1a2019, 0.9));
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.2);
  sun.position.set(-0.35, 0.82, 0.45);
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
      ground.material.color.set(0xbfbfbf); // slight darken to blend with the dark meadow
      ground.material.needsUpdate = true;
    },
    undefined,
    () => { /* texture missing — keep the flat colour, no error */ }
  );

  // — instanced blades, jittered grid for even, gap-free coverage —
  const coarse = matchMedia('(pointer: coarse)').matches;
  const COUNT = coarse ? 30000 : 70000;
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
    uLightDir: { value: new THREE.Vector3(-0.35, 0.82, 0.45).normalize() },
    uSunColor: { value: new THREE.Color('#ffe9c4') },
    uSunStrength: { value: 0.85 },
    uSkyColor: { value: new THREE.Color('#7d97a0') },
    uGroundColor: { value: new THREE.Color('#1f2b22') }
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
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // — animation loop —
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeScale = reduced ? 0.18 : 1;
  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt * timeScale;

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
    renderer.render(scene, camera);
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
      renderer.dispose();
    }
  };
}

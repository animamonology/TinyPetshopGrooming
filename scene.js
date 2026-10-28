/* TinyPet 3D layer: a glossy paw (opens and closes the story) and soap bubbles drifting behind every chapter. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 899px)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

function makeRenderer() {
  try {
    return new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, powerPreference: 'high-performance' });
  } catch {
    canvas.remove(); // no WebGL: the page still tells the whole story without it
    return null;
  }
}

const renderer = makeRenderer();
if (renderer) init(renderer);

function init(renderer) {
  // ponytail: DPR capped at 1.75 on phones; 3x iPhone screens cost 3x the pixels for bubbles nobody inspects
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x4a2a7a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xf08a24, 30, 30);
  rim.position.set(-5, -2, 4);
  scene.add(rim);

  /* ---------- paw: one pad + four toe beans ---------- */
  const paw = new THREE.Group();
  const padMat = new THREE.MeshPhysicalMaterial({ color: 0x7c4fc0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 1, sheenColor: new THREE.Color(0xffb8dc) });
  const toeMat = padMat.clone();
  toeMat.color = new THREE.Color(0xf3a0c8);
  const ball = new THREE.SphereGeometry(1, 64, 40);
  const pad = new THREE.Mesh(ball, padMat);
  pad.scale.set(1.45, 1.15, 0.75);
  pad.position.y = -0.55;
  paw.add(pad);
  [[-1.55, 0.75, -0.35], [-0.58, 1.55, -0.12], [0.58, 1.55, 0.12], [1.55, 0.75, 0.35]].forEach(([x, y, rz]) => {
    const toe = new THREE.Mesh(ball, toeMat);
    toe.scale.set(0.5, 0.62, 0.42);
    toe.position.set(x, y, 0.1);
    toe.rotation.z = rz;
    paw.add(toe);
  });
  scene.add(paw);

  /* ---------- bubbles: one instanced draw call, thin-film colours in the shader ---------- */
  const COUNT = small ? 18 : 40;
  const bubbleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), vV));
        float rimF = pow(f, 2.2);
        vec3 film = 0.55 + 0.45 * cos(6.2831 * (f * 1.4 + vec3(0.0, 0.33, 0.67)) + uTime * 0.25);
        float spec = pow(max(dot(normalize(vN), normalize(vec3(-0.45, 0.6, 1.0))), 0.0), 60.0);
        vec3 col = mix(film, vec3(1.0), spec);
        gl_FragColor = vec4(col, rimF * 0.6 + spec * 0.8 + 0.02);
      }`,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), bubbleMat, COUNT);
  scene.add(bubbles);

  const rand = (a, b) => a + Math.random() * (b - a);
  const seeds = Array.from({ length: COUNT }, () => ({
    x: rand(-1, 1), y: rand(-1, 1), z: rand(-7, 3), s: rand(0.1, small ? 0.42 : 0.55), v: rand(0.18, 0.55), p: rand(0, 6.28),
  }));
  const dummy = new THREE.Object3D();

  /* ---------- sizing (canvas is 100lvh, so the iOS toolbar does not resize it) ---------- */
  let viewW = 1, viewH = 1;
  const halfAt = (z) => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - z);
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === viewW && h === viewH) return;
    viewW = w; viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  /* ---------- scroll + pointer input ---------- */
  let lastY = scrollY, vel = 0, px = 0, py = 0;
  if (!coarse) addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; });

  let intro = window.__tpIntro ? 1 : 0;
  const introTarget = { v: window.__tpIntro ? 1 : 0 };
  addEventListener('tinypet:intro', () => { introTarget.v = 1; });

  const clamp01 = (n) => Math.min(Math.max(n, 0), 1);
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const vh = innerHeight;
    const docH = document.documentElement.scrollHeight;
    const y = scrollY;
    vel += ((y - lastY) / Math.max(dt, 1e-3) / vh - vel) * 0.1; // screens per second, smoothed
    lastY = y;
    intro += (introTarget.v - intro) * 0.05;

    // paw: big in the hero, spins up and away; returns for the last screen like a stamp
    const leave = ease(clamp01(y / (vh * 0.9)));
    const back = ease(clamp01((y - (docH - vh * 2)) / vh));
    const show = Math.max(1 - leave, back) * intro;
    paw.visible = show > 0.01;
    if (paw.visible) {
      const homeX = small ? 1.3 : 4.3, homeY = small ? 3.2 : -2.5; // desktop: lower right, clear of the photo stack
      const outro = back > 0; // leave is pinned at 1 by now, so compare to 0, not to leave
      const baseX = outro ? 0 : homeX;
      const baseY = outro ? 0.9 - (1 - back) * 6 : homeY + leave * 6;
      paw.position.set(baseX + px * 0.6, baseY - py * 0.4, outro ? -3 : 0);
      paw.scale.setScalar((outro ? (small ? 0.95 : 1.5) : (small ? 0.62 : 0.95)) * show); // outro: a big stamp behind the last line
      paw.rotation.set(-0.35 + Math.sin(t * 0.8) * 0.08 + py * 0.3, Math.sin(t * 0.6) * 0.3 + px * 0.6 + (outro ? (1 - back) * 4 : leave * 3), -0.25 + (outro ? 0 : leave * 1.2));
    }

    // bubbles rise; scrolling down pushes them up faster, like stirring bath water
    const lift = 1 + Math.min(Math.abs(vel) * 2.5, 6);
    const dir = vel < -0.05 ? -1 : 1; // scrolling back up lets them sink
    for (let i = 0; i < COUNT; i++) {
      const b = seeds[i];
      const hh = halfAt(b.z), hw = hh * camera.aspect;
      b.y += (b.v * dt * lift * dir) / hh;
      if (b.y > 1.15) { b.y = -1.15; b.x = rand(-1, 1); }
      if (b.y < -1.15) { b.y = 1.15; b.x = rand(-1, 1); }
      const wob = Math.sin(t * 1.3 + b.p) * 0.04;
      dummy.position.set((b.x + wob) * hw + px * (b.z + 7) * 0.12, b.y * hh, b.z);
      const pulse = 1 + Math.sin(t * 2 + b.p) * 0.04;
      dummy.scale.set(b.s * pulse, b.s / pulse, b.s);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    bubbleMat.uniforms.uTime.value = t;
    camera.position.x += (px * 0.5 - camera.position.x) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  if (reduce) {
    introTarget.v = intro = 1;
    frame();
    addEventListener('resize', frame);
    addEventListener('scroll', frame, { passive: true });
    return;
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : frame));
}

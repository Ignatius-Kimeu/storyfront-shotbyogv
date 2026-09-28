/* Home hero — "The Aperture": a lens barrel whose nine-blade iris opens on Shotbyogv portraits.
   Built from code with three.js (no downloaded models). Falls back to a still if WebGL isn't available. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const hero = document.querySelector('.hero');
const canvas = hero.querySelector('canvas');
const fst = hero.querySelector('.fstop'), cred = hero.querySelector('.credit'), readout = hero.querySelector('.readout');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 760;
const DIR = small ? 'images/thumbs/' : 'images/';
const SHOTS = [
  ['amber-kimono-2', 'Portrait · amber kimono'],
  ['pokello-lv-denim', 'Pokello · red carpet'],
  ['floral-hat-portrait', 'Editorial · florals'],
  ['fireboy-stage-2', 'Fireboy DML · live'],
  ['yellow-fur-portrait', 'Editorial · night'],
  ['wide-brim-hat-portrait', 'Portrait · golden hour'],
  ['gold-corset-portrait-2', 'Studio · gold'],
];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
} catch (e) { hero.classList.add('no-gl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
camera.position.set(0, 0, 7.2);
const rig = new THREE.Group(); scene.add(rig);
const lens = new THREE.Group(); rig.add(lens);

/* photo deep in the barrel */
const loader = new THREE.TextureLoader();
const fitCover = t => { const a = t.image.width / t.image.height;
  if (a < 1) { t.repeat.set(1, a); t.offset.set(0, (1 - a) * 0.62); } else { t.repeat.set(1 / a, 1); t.offset.set((1 - 1 / a) / 2, 0); } };
const texes = SHOTS.map(([n]) => { const t = loader.load(DIR + n + '.jpg', fitCover); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
const HOUSING = 1.02;
const photoMat = new THREE.MeshBasicMaterial({ map: texes[0], toneMapped: false });
const photo = new THREE.Mesh(new THREE.CircleGeometry(HOUSING, 96), photoMat); photo.position.z = -0.42; lens.add(photo);
const vig = new THREE.Mesh(new THREE.CircleGeometry(HOUSING, 96), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec2 v;void main(){float d=distance(v,vec2(.5))*2.;gl_FragColor=vec4(0,0,0,smoothstep(.4,1.,d)*.85);}' }));
vig.position.z = -0.41; lens.add(vig);

/* iris blades, stencilled so they only draw inside the opening */
const N = 9, Rb = 5;
const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, metalness: .85, roughness: .34, clearcoat: .6, clearcoatRoughness: .25,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
const mask = new THREE.Mesh(new THREE.CircleGeometry(HOUSING + 0.03, 128), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false,
  stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp }));
mask.renderOrder = -1; mask.position.z = 0.03; lens.add(mask);
const shape = new THREE.Shape(); const a0 = -0.36, a1 = 0.36, steps = 48;
for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; const x = -(Rb - Rb * Math.cos(a)), y = Rb * Math.sin(a); i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
shape.lineTo(2.6, 1.9); shape.lineTo(2.6, -1.9); shape.closePath();
const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 48 });
const blades = [];
for (let i = 0; i < N; i++) { const pivot = new THREE.Group(), m = new THREE.Mesh(bladeGeo, bladeMat); pivot.add(m); lens.add(pivot); blades.push({ pivot, m, base: i / N * Math.PI * 2 }); }
function setAperture(r) {
  const rad = THREE.MathUtils.lerp(0.0, 1.08, r), twist = (1 - r) * 0.9;
  blades.forEach((b, i) => { b.pivot.rotation.z = b.base + twist; b.m.position.set(rad, 0, -0.3 + i * 0.0016); b.m.rotation.set(0, 0.035, 0); });
}

/* barrel: engraved front ring, knurled grip, coated front glass */
const metal = new THREE.MeshPhysicalMaterial({ color: 0x111114, metalness: .9, roughness: .42, clearcoat: .3 });
function engraved() {
  const c = document.createElement('canvas'); c.width = c.height = 2048; const g = c.getContext('2d');
  g.fillStyle = '#0d0d10'; g.fillRect(0, 0, 2048, 2048); g.translate(1024, 1024);
  g.fillStyle = '#e9ebf5'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 44px Manrope, sans-serif';
  const txt = 'SHOTBYOGV  ·  HYBRID VISUAL CREATOR  ·  HARARE | WORLDWIDE  ·  EXPLORE.CREATE.INSPIRE  ·  MOBILE + CAMERA  ·  ';
  for (let i = 0; i < txt.length; i++) { g.save(); g.rotate(i / txt.length * Math.PI * 2); g.translate(0, -905); g.fillText(txt[i], 0, 0); g.restore(); }
  g.strokeStyle = 'rgba(107,123,255,.55)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 962, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 850, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const ringGeo = new THREE.RingGeometry(HOUSING, 1.42, 160, 1);
{ const p = ringGeo.attributes.position, uv = ringGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3 + .5, p.getY(i) / 3 + .5); }
let ringMat;
document.fonts && document.fonts.ready.then(() => { if (ringMat) { ringMat.map = engraved(); ringMat.needsUpdate = true; } });
ringMat = new THREE.MeshPhysicalMaterial({ map: engraved(), metalness: .6, roughness: .5, clearcoat: .5 });
const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.z = 0.02; lens.add(ring);
const lip = new THREE.Mesh(new THREE.TorusGeometry(HOUSING + 0.01, 0.035, 24, 160), metal); lip.position.z = 0.01; lens.add(lip);
const kg = new THREE.CylinderGeometry(1.5, 1.5, 0.9, 360, 6, true);
{ const p = kg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.012 * Math.sign(Math.sin(a * 120)); p.setX(i, x * k); p.setZ(i, z * k); } kg.computeVertexNormals(); }
const knurl = new THREE.Mesh(kg, metal); knurl.rotation.x = Math.PI / 2; knurl.position.z = -0.44; lens.add(knurl);
const rim = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.05, 24, 200), metal); rim.position.z = 0.02; lens.add(rim);
const glass = new THREE.Mesh(new THREE.SphereGeometry(3.2, 96, 48, 0, Math.PI * 2, 0, Math.asin(HOUSING / 3.2)),
  new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .02, ior: 1.52, iridescence: 1, iridescenceIOR: 1.28, iridescenceThicknessRange: [180, 420],
    envMapIntensity: 1.6, transparent: true, opacity: .14, depthWrite: false }));
glass.rotation.x = Math.PI / 2; glass.position.z = 0.06 - 3.2 * Math.cos(Math.asin(HOUSING / 3.2)); glass.renderOrder = 5; lens.add(glass);
const key = new THREE.PointLight(0xdfe4ff, 40, 20); key.position.set(3, 2.5, 4); scene.add(key);
const rimLight = new THREE.PointLight(0x3d5bff, 18, 12); rimLight.position.set(-3, -2, 2); scene.add(rimLight);
scene.add(new THREE.AmbientLight(0xffffff, .08));

/* layout: lens right on desktop, top-centre on phones */
function layout() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const mobile = w < 760;
  const vh = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
  const s = mobile ? Math.min(0.74 * vw / 3, 0.3 * vh / 3 * 1.4) : Math.min(0.72 * vh / 3, 0.42 * vw / 3);
  lens.scale.setScalar(s);
  lens.position.set(mobile ? 0 : vw / 2 - 1.5 * s - vw * 0.07, mobile ? vh / 2 - 1.5 * s - vh * 0.1 : 0.04 * vh, 0);
}
const v3 = new THREE.Vector3();
function placeReadout() {
  const w = hero.clientWidth, h = hero.clientHeight;
  v3.copy(lens.position).project(camera); const fx = (v3.x * .5 + .5) * w;
  v3.set(lens.position.x, lens.position.y - 1.5 * lens.scale.x, 0).project(camera); const by = (-v3.y * .5 + .5) * h;
  readout.style.left = fx + 'px'; readout.style.top = (by + 10) + 'px';
}
new ResizeObserver(layout).observe(hero); layout();

/* motion */
let ap = 0, idx = 0, phase = 'opening', t0 = performance.now(), stop = 1, mx = 0, my = 0, visible = true, started = false;
const FST = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8'];
cred.textContent = SHOTS[0][1];
const shutter = () => { if (phase === 'open') phase = 'closing'; };
canvas.addEventListener('click', shutter);
canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shutter(); } });
hero.addEventListener('wheel', e => { if (Math.abs(e.deltaY) < 40) return; stop = THREE.MathUtils.clamp(stop - e.deltaY * 0.0006, 0.35, 1); }, { passive: true });
addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; });
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) clock.getDelta(); }).observe(hero);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!visible || document.hidden) return;
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  if (!started) { return; }
  if (phase === 'open' && now - t0 > 4200 && !reduce) shutter();
  const speed = phase === 'closing' ? 16 : 4.2;
  ap += ((phase === 'closing' ? 0 : stop) - ap) * (1 - Math.exp(-speed * dt));
  if (phase === 'closing' && ap < 0.012) {
    idx = (idx + 1) % SHOTS.length; photoMat.map = texes[idx]; cred.style.opacity = 0;
    setTimeout(() => { cred.textContent = SHOTS[idx][1]; cred.style.opacity = 1; }, 350);
    phase = 'opening'; t0 = now;
  }
  if (phase === 'opening' && ap > 0.95 * stop) { phase = 'open'; t0 = now; }
  setAperture(ap);
  fst.textContent = FST[Math.round((1 - Math.min(ap, 1)) * (FST.length - 1))];
  rig.rotation.y += ((mx * 0.26) - rig.rotation.y) * 0.06;
  rig.rotation.x += ((my * 0.18) - rig.rotation.x) * 0.06;
  key.position.x = 3 + mx * 2.5; key.position.y = 2.5 - my * 2;
  photo.position.x = -rig.rotation.y * 0.12; photo.position.y = rig.rotation.x * 0.12;
  renderer.render(scene, camera); placeReadout();
}
setAperture(reduce ? 1 : 0); if (reduce) { ap = 1; phase = 'open'; }
renderer.render(scene, camera);
const begin = () => { if (started) return; started = true; clock.getDelta(); t0 = performance.now(); hero.classList.add('gl-ready'); };
document.addEventListener('splashdone', begin); setTimeout(begin, 1500);
tick();

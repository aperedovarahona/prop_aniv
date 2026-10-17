import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const MOBILE = /Android|iPhone|iPad/i.test(navigator.userAgent)
// Capas: fina = polvo de estrellas · nube = gas difuso · brillantes = estrellas con destello
const LAYERS = [
  { n: MOBILE ? 18000 : 50000, size: [0.6, 1.6], pw: 0.7,  R: 6,   jit: 0.3,  sc: [0.1, 0.06],  y: 0.12, shell: [0.97, 1.03], bulge: 0.15, alpha: 1,    minA: 0.5,  tw: 0, pow: 1 },
  { n: MOBILE ? 2200 : 4500,   size: [14, 34],   pw: 0.85, R: 6.5, jit: 0.55, sc: [0.35, 0.16], y: 0.35, shell: [0.8, 1.05],  bulge: 0.1,  alpha: 0.07, minA: 0.12, tw: 0, pow: 2 },
  { n: MOBILE ? 500 : 1100,    size: [3, 5.5],   pw: 0.8,  R: 6,   jit: 0.2,  sc: [0.08, 0.05], y: 0.1,  shell: [0.98, 1.02], bulge: 0.05, alpha: 1,    minA: 0.6,  tw: 1, pow: 1 },
]
const PAL = ['#ff4f9a', '#8a5cff', '#ff8a5c', '#2fb5ff'].map((c) => new THREE.Color(c))
const ARMS = 3
const COLORS = { foto: '#ff7ab8', carta: '#ffb07a', nota: '#5fd6ff', memoria: '#a98bff' }
const ease = (x) => x * x * (3 - 2 * x)
const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
const _v = new THREE.Vector3()

// Rotación diferencial: idéntica a la del vertex shader
const swirl = (p, t, m) => {
  const r = Math.hypot(p.x, p.z)
  const a = t * 0.035 * m * (1.4 / (0.4 + r * 0.5))
  const c = Math.cos(a), s = Math.sin(a)
  const x = p.x
  p.x = c * x + s * p.z
  p.z = -s * x + c * p.z
  return p
}

const vert = /* glsl */ `
uniform float uTime, uMorph, uDetail, uPx, uMinA, uTw;
attribute vec3 aGal; attribute vec3 aCol; attribute float aRand, aSize;
varying vec3 vCol; varying float vA;
void main(){
  vec3 p = mix(position, aGal, uMorph);
  float r = length(p.xz);
  float ang = uTime * 0.035 * uMorph * (1.4 / (0.4 + r * 0.5));
  float c = cos(ang), s = sin(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p += normalize(position) * sin(uTime * 1.5 + aRand * 40.) * 0.02 * (1. - uMorph);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float vis = step(aRand, uDetail);
  float tw = 1. - uTw * .35 * (.5 + .5 * sin(uTime * 2.5 + aRand * 80.));
  gl_PointSize = aSize * uPx * vis / -mv.z;
  // Esfera: halo cian en el borde y tonos cálidos al centro; galaxia: color por radio
  vec3 nv = normalize(normalMatrix * normalize(position));
  float rim = smoothstep(.3, .95, 1. - abs(nv.z));
  vCol = mix(mix(aCol, vec3(.18, .72, 1.), rim), aCol, uMorph) * 0.75;
  vA = vis * mix(1. + rim * .5, clamp(r * .35, uMinA, 1.), uMorph) * tw;   // evita el núcleo quemado
  gl_Position = projectionMatrix * mv;
}`
const frag = /* glsl */ `
uniform float uAlpha, uPow;
varying vec3 vCol; varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  gl_FragColor = vec4(vCol, pow(smoothstep(.5, 0., d), uPow) * uAlpha * vA);
}`

function buildLayer(L) {
  const n = L.n
  const P = new Float32Array(n * 3), G = new Float32Array(n * 3), C = new Float32Array(n * 3)
  const R = new Float32Array(n), S = new Float32Array(n)
  const inner = new THREE.Color('#ff9a6b'), outer = new THREE.Color('#2fb8ff'), c = new THREE.Color()
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rr = Math.sqrt(1 - u * u)
    const rad = 2 * (L.shell[0] + Math.random() * (L.shell[1] - L.shell[0]))
    P.set([rr * Math.cos(th) * rad, u * rad, rr * Math.sin(th) * rad], i * 3)

    const bulge = Math.random() < L.bulge
    const r = bulge ? Math.abs(g()) * 1.1 : Math.pow(Math.random(), L.pw) * L.R
    const ang = bulge ? Math.random() * 6.2832 : ((i % ARMS) / ARMS) * 6.2832 + r * 1.1 + g() * L.jit
    const sc = L.sc[0] + r * L.sc[1]
    const y = bulge ? g() * 0.4 : g() * L.y * (1.3 - r / L.R)
    G.set([Math.cos(ang) * r + g() * sc, y, Math.sin(ang) * r + g() * sc], i * 3)

    const t = r / 6
    c.copy(inner).lerp(PAL[(Math.random() * PAL.length) | 0], Math.min(t * 2.2, 1)).lerp(outer, Math.max(t - 0.5, 0) / 0.5).multiplyScalar(0.6 + Math.random() * 0.4)
    C.set([c.r, c.g, c.b], i * 3)
    R[i] = Math.random()
    S[i] = L.size[0] + Math.random() * (L.size[1] - L.size[0])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3))
  geo.setAttribute('aGal', new THREE.BufferAttribute(G, 3))
  geo.setAttribute('aCol', new THREE.BufferAttribute(C, 3))
  geo.setAttribute('aRand', new THREE.BufferAttribute(R, 1))
  geo.setAttribute('aSize', new THREE.BufferAttribute(S, 1))
  return geo
}

function buildStars() {
  const n = 2600, P = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rr = Math.sqrt(1 - u * u), d = 25 + Math.random() * 25
    P.set([rr * Math.cos(th) * d, u * d, rr * Math.sin(th) * d], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3))
  return geo
}

function glowTex() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}

// ===== Corazón central =====
const gs = (x, c, w) => Math.exp(-((x - c) ** 2) / w)

const heartVert = /* glsl */ `
uniform float uForm, uBeat, uPx;
attribute float aRand, aK;
varying float vK, vA;
void main(){
  float s = (0.3 + 0.7 * uForm) * (1. + uBeat);
  vec4 mv = modelViewMatrix * vec4(position * s, 1.);
  float vis = step(aRand, uForm);
  gl_PointSize = (1.2 + aK) * uPx * vis / -mv.z;
  vK = aK; vA = vis;
  gl_Position = projectionMatrix * mv;
}`
const heartFrag = /* glsl */ `
varying float vK, vA;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  vec3 c = mix(vec3(.75, 0., .1), vec3(1., .25, .35), vK);
  gl_FragColor = vec4(c, smoothstep(.5, 0., d) * .9 * vA);
}`

// Volumen del corazón por muestreo con la ecuación implícita
function buildHeart() {
  const n = 2200, P = new Float32Array(n * 3), R = new Float32Array(n), K = new Float32Array(n)
  for (let i = 0; i < n; ) {
    const x = (Math.random() - 0.5) * 3, y = (Math.random() - 0.5) * 3, z = (Math.random() - 0.5) * 3
    const a = x * x + 2.25 * y * y + z * z - 1
    if (a * a * a - x * x * z * z * z - 0.1125 * y * y * z * z * z > 0) continue
    P.set([x * 0.75, z * 0.75, y * 0.75], i * 3)
    R[i] = Math.random(); K[i] = Math.random(); i++
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3))
  geo.setAttribute('aRand', new THREE.BufferAttribute(R, 1))
  geo.setAttribute('aK', new THREE.BufferAttribute(K, 1))
  return geo
}

// Posición del recuerdo i: sobre la esfera (a) y sobre un brazo de la galaxia (b)
function place(i) {
  // Secuencias de baja discrepancia: cada recuerdo conserva su posición aunque se agreguen más
  const f = (x) => x - Math.floor(x)
  const y = 1 - 2 * f(i * 0.6180339887 + 0.31), rr = Math.sqrt(1 - y * y), th = i * 2.39996
  const a = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(2.1)
  const r = 1.3 + 3.8 * f(i * 0.7548776662 + 0.2), ang = (i % ARMS) * (6.2832 / ARMS) + r * 1.1 + 0.2
  const b = new THREE.Vector3(Math.cos(ang) * r, Math.sin(i * 5) * 0.25, Math.sin(ang) * r)
  return { a, b }
}

function starTex() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 40)
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128)
  x.fillStyle = '#fff'
  const spike = (l, w) => {
    x.beginPath(); x.moveTo(64, 64 - l)
    x.quadraticCurveTo(64 + w, 64 - w, 64 + l, 64); x.quadraticCurveTo(64 + w, 64 + w, 64, 64 + l)
    x.quadraticCurveTo(64 - w, 64 + w, 64 - l, 64); x.quadraticCurveTo(64 - w, 64 - w, 64, 64 - l); x.fill()
  }
  spike(62, 5)                                                   // rayos principales
  x.save(); x.translate(64, 64); x.rotate(Math.PI / 4); x.translate(-64, -64); spike(30, 3); x.restore() // diagonales
  return new THREE.CanvasTexture(cv)
}

function Node({ item, i, n, m, seen, onOpen, tex, star }) {
  const grp = useRef(), st = useRef(), orb = useRef(), halo = useRef(), flash = useRef()
  const k = useRef(seen ? 1 : 0), t0 = useRef(-9), prev = useRef(seen)
  const { a, b } = useMemo(() => place(i), [i])
  const color = COLORS[item.tipo]
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, e = ease(m.current)
    grp.current.position.copy(swirl(_v.copy(a).lerp(b, e), t, e))
    if (seen && !prev.current) t0.current = t                    // instante de apertura
    prev.current = seen
    k.current = THREE.MathUtils.damp(k.current, seen ? 1 : 0, 3, dt)
    const o = ease(Math.min(Math.max(k.current, 0), 1))
    // estrella discreta: titila suave y se desvanece girando
    st.current.material.opacity = (1 - o) * (0.5 + 0.3 * Math.sin(t * 2 + i * 1.7))
    st.current.material.rotation = Math.sin(t * 0.8 + i) * 0.2 + o * 1.4
    st.current.scale.setScalar(0.55 * (1 + Math.sin(t * 3 + i) * 0.12) * (1 - o * 0.5))
    // esfera: nace desde el centro de la estrella
    orb.current.scale.setScalar(Math.max(o, 0.001))
    halo.current.material.opacity = 0.3 * o
    halo.current.scale.setScalar(Math.max(0.38 * o, 0.001))
    // destello breve al abrir
    const f = Math.max(0, 1 - (t - t0.current) / 1.1)
    flash.current.material.opacity = f * f * 0.6
    flash.current.scale.setScalar(0.35 + (1 - f) * 0.9)
  })
  const add = { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }
  return (
    <group ref={grp}>
      <sprite ref={st}><spriteMaterial map={star} color={color} {...add} /></sprite>
      <sprite ref={flash}><spriteMaterial map={tex} color="#ffffff" {...add} /></sprite>
      <sprite ref={halo}><spriteMaterial map={tex} color={color} {...add} /></sprite>
      <mesh ref={orb}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh
        onClick={(e) => { e.stopPropagation(); if (e.delta < 6) onOpen(item) }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({ progress, items, seen, onOpen }) {
  const m = useRef(0), grp = useRef(), core = useRef(), stars = useRef()
  const starGeo = useMemo(buildStars, [])
  const tex = useMemo(glowTex, [])
  const starT = useMemo(starTex, [])
  const heartGeo = useMemo(buildHeart, [])
  const hu = useMemo(() => ({ uForm: { value: 0 }, uBeat: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 1.75) * 18 } }), [])
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uMorph: { value: 0 }, uDetail: { value: 0.3 },
    uPx: { value: Math.min(window.devicePixelRatio, 1.75) * 18 },
  }), [])
  // Cada capa comparte los uniforms de tiempo/morfismo y define su propio brillo
  const layers = useMemo(() => LAYERS.map((L) => ({
    geo: buildLayer(L),
    u: { ...uniforms, uAlpha: { value: L.alpha }, uMinA: { value: L.minA }, uTw: { value: L.tw }, uPow: { value: L.pow } },
  })), [uniforms])

  useFrame(({ clock }, dt) => {
    m.current = THREE.MathUtils.damp(m.current, progress, 0.9, dt)
    const e = ease(m.current)
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uMorph.value = e
    uniforms.uDetail.value = 0.3 + 0.7 * m.current           // más interacción = más detalle
    grp.current.scale.setScalar(0.9 + 0.3 * e)                // la esfera crece
    const ph = (clock.elapsedTime * 1.25) % 1                  // ~75 lpm
    const beat = 0.08 * gs(ph, 0.1, 0.003) + 0.05 * gs(ph, 0.3, 0.004) // lub-dub suave
    hu.uForm.value = m.current                                  // el corazón se forma con el progreso
    hu.uBeat.value = beat
    core.current.material.opacity = m.current * 0.5
    core.current.scale.setScalar((2.2 + 2.2 * m.current) * (1 + beat * 2))
    stars.current.material.opacity = 0.25 + 0.6 * m.current
  })

  return (
    <>
      <points ref={stars} geometry={starGeo} frustumCulled={false}>
        <pointsMaterial size={0.12} color="#bfe6ff" transparent opacity={0.25} depthWrite={false} sizeAttenuation />
      </points>
      <group ref={grp}>
        {layers.map((l, k) => (
          <points key={k} geometry={l.geo} frustumCulled={false}>
            <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={l.u} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        ))}
        <sprite ref={core}>
          <spriteMaterial map={tex} color="#ff3d7a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
        <points geometry={heartGeo} frustumCulled={false}>
          <shaderMaterial vertexShader={heartVert} fragmentShader={heartFrag} uniforms={hu} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
        {items.map((it, i) => (
          <Node key={it.id} item={it} i={i} n={items.length} m={m} seen={seen.has(it.id)} onOpen={onOpen} tex={tex} star={starT} />
        ))}
      </group>
    </>
  )
}

export default function Galaxy(props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2, 9], fov: 50 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <Scene {...props} />
      <OrbitControls enablePan={false} enableDamping rotateSpeed={0.6} minDistance={3.5} maxDistance={16} autoRotate autoRotateSpeed={0.25} />
    </Canvas>
  )
}

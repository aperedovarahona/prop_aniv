import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import Galaxy from './Galaxy'
import { agregarRecuerdo, cargarNube } from './nube'
import { CONFIG, ITEMS } from './data'

const KEY = 'galaxia-vistos-v1'
const ADMIN = CONFIG.mostrarBotonAgregar || new URLSearchParams(location.search).has('admin')
const STAGES = [
  { t: 0, n: 'Esfera dormida' },
  { t: 0.25, n: 'Primeras estrellas', msg: 'La esfera empieza a abrirse y aparecen las primeras estrellas.' },
  { t: 0.5, n: 'Nebulosa naciente', msg: 'Nace una nebulosa y el cielo se llena de brillo.' },
  { t: 0.75, n: 'Brazos espirales', msg: 'Los brazos de la galaxia ya giran alrededor de su núcleo.' },
  { t: 1, n: 'Galaxia completa', msg: 'Has abierto todos los recuerdos. Esta galaxia es tuya.' },
]

const swal = Swal.mixin({
  background: '#071028', color: '#eef6ff', confirmButtonColor: '#2f9bff', cancelButtonColor: '#27365e',
  backdrop: 'rgba(2,4,15,.75)', customClass: { popup: 'swal-glass' },
})
const esc = (s = '') => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const embed = (u) => {
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return `<iframe class="mem-video" src="https://www.youtube.com/embed/${yt[1]}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
  const vm = u.match(/vimeo\.com\/(\d+)/)
  if (vm) return `<iframe class="mem-video" src="https://player.vimeo.com/video/${vm[1]}" allowfullscreen loading="lazy"></iframe>`
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return `<video class="mem-video" src="${esc(u)}" controls preload="metadata"></video>`
  return `<a class="mem-link" href="${esc(u)}" target="_blank" rel="noopener">▶ Ver video</a>`
}
const render = (it) => [
  ...it.imgs.map((s) => `<img class="mem-img" src="${esc(s)}" alt="">`),
  ...it.videos.map(embed),
  ...it.audios.map((s) => `<audio class="mem-audio" controls preload="none" src="${esc(s)}"></audio>`),
  it.texto && `<p class="mem-text">${esc(it.texto)}</p>`,
].filter(Boolean).join('')

// Inicio en hora de Bolivia (UTC-4, sin horario de verano): 'dd/mm/yyyy HH:mm'
const INICIO = (() => {
  const [, d, mo, y, h, mi] = CONFIG.inicio.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/).map(Number)
  return Date.UTC(y, mo - 1, d, h + 4, mi)
})()
const BO = -4 * 36e5

// Tiempo transcurrido según calendario (meses de distinta duración), en hora de Bolivia
const transcurrido = (now = Date.now()) => {
  const a = new Date(INICIO + BO), b = new Date(Math.max(now, INICIO) + BO) // getUTC* = hora de Bolivia
  let y = b.getUTCFullYear() - a.getUTCFullYear(), mo = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate()
  let h = b.getUTCHours() - a.getUTCHours(), mi = b.getUTCMinutes() - a.getUTCMinutes(), s = b.getUTCSeconds() - a.getUTCSeconds()
  if (s < 0) { s += 60; mi-- }
  if (mi < 0) { mi += 60; h-- }
  if (h < 0) { h += 24; d-- }
  if (d < 0) { d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); mo-- }
  if (mo < 0) { mo += 12; y-- }
  return { y, mo, d, h, mi, s }
}

const textoTiempo = () => {
  const t = transcurrido()
  const p = [[t.y, 'año', 'años'], [t.mo, 'mes', 'meses'], [t.d, 'día', 'días'], [t.h, 'hora', 'horas']]
    .filter(([v]) => v).map(([v, u, pl]) => `${v} ${v === 1 ? u : pl}`)
  return `Llevamos ${p.length ? p.join(', ') : 'unos minutos'} juntos`
}

// Contador en vivo (estado propio: no vuelve a renderizar la escena 3D)
function Tiempo() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const t = transcurrido(now)
  const u = [[t.y, 'años'], [t.mo, 'meses'], [t.d, 'días'], [t.h, 'horas'], [t.mi, 'min'], [t.s, 'seg']]
  const from = u.findIndex(([v], k) => v > 0 || k >= 2) // oculta años/meses mientras sean 0
  return (
    <div className="time">
      {u.slice(from).map(([v, l]) => <span key={l}><b>{String(v).padStart(2, '0')}</b><i>{l}</i></span>)}
    </div>
  )
}

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

export default function App() {
  const [vistos, setVistos] = useState(load)
  const set = useMemo(() => new Set(vistos), [vistos])
  const [nube, setNube] = useState([])
  const items = useMemo(() => [...ITEMS, ...nube], [nube])
  const meta = CONFIG.meta || items.length || 1             // recuerdos necesarios para la galaxia completa
  const progress = Math.min(1, vistos.length / meta)
  useEffect(() => { cargarNube().then(setNube) }, [])
  const stage = [...STAGES].reverse().find((s) => progress >= s.t)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(vistos)) } catch {} }, [vistos])

  useEffect(() => {
    swal.fire({
      title: `Para ti, ${esc(CONFIG.nombre)}`,
      html: `<p class="mem-text">${esc(CONFIG.intro)}</p><p class="mem-date">${textoTiempo()} ✦</p>`,
      confirmButtonText: 'Entrar',
      allowOutsideClick: false,
    })
  }, [])

  const abrir = async (item) => {
    const nuevo = !set.has(item.id)
    const antes = progress
    if (nuevo) setVistos((v) => [...v, item.id])
    await swal.fire({
      title: esc(item.titulo),
      html: render(item),
      width: 560,
      confirmButtonText: 'Guardar en mi galaxia',
      customClass: { popup: `swal-glass tipo-${item.tipo}` },
    })
    if (!nuevo) return
    const ahora = Math.min(1, (vistos.length + 1) / meta)
    const hito = STAGES.filter((s) => s.t > 0 && antes < s.t && ahora >= s.t).pop()
    if (hito) {
      await swal.fire({ iconHtml: '<span class="star">✦</span>', customClass: { popup: 'swal-glass', icon: 'swal-star' }, title: hito.n, text: hito.msg, confirmButtonText: 'Seguir explorando' })
    }
  }

  const agregar = async () => {
    const it = await agregarRecuerdo(swal)
    if (!it) return
    setNube((n) => [...n, it])
    await swal.fire({ iconHtml: '<span class="star">✦</span>', customClass: { popup: 'swal-glass', icon: 'swal-star' }, title: 'Estrella creada', text: 'El recuerdo ya aparece en la galaxia.', confirmButtonText: 'Genial' })
  }

  const reiniciar = async () => {
    const r = await swal.fire({ title: '¿Reiniciar la galaxia?', text: 'Volverá a ser una esfera dormida.', showCancelButton: true, confirmButtonText: 'Reiniciar', cancelButtonText: 'Cancelar' })
    if (r.isConfirmed) setVistos([])
  }

  return (
    <main>
      <Galaxy progress={progress} items={items} seen={set} onOpen={abrir} />
      <header className="hud top">
        <h1>{CONFIG.titulo}</h1>
        <Tiempo />
      </header>
      <footer className="hud bottom">
        <div className="stage"><span>{stage.n}</span><span>{vistos.length}/{items.length}</span></div>
        <div className="bar"><i style={{ width: `${progress * 100}%` }} /></div>
        <p className="hint">Arrastra para girar · Rueda o pellizco para acercar · Toca una estrella</p>
        {ADMIN && <button className="add" onClick={agregar}>+ Agregar recuerdo</button>}
        <button onClick={reiniciar}>Reiniciar</button>
      </footer>
    </main>
  )
}

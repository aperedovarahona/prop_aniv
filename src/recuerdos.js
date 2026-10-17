// Generación automática de recuerdos a partir de /src/recuerdos/ (sin carpetas ni JSON).
// Nomenclatura: texto001.txt · img001.jpg (img001_2.jpg …) · audio001.mp3 · video001.txt (enlaces) o video001.mp4
// Todos los archivos con el mismo número forman UNA estrella.
const txt = import.meta.glob('/src/recuerdos/*.txt', { eager: true, query: '?raw', import: 'default' })
const media = import.meta.glob('/src/recuerdos/*.{jpg,jpeg,png,webp,gif,avif,mp3,wav,ogg,m4a,mp4,webm}', { eager: true, query: '?url', import: 'default' })

const TIPOS = ['foto', 'carta', 'nota', 'memoria']
const NOMBRE = { foto: 'Foto', carta: 'Carta', nota: 'Nota', memoria: 'Memoria' }
const RX = /^(texto|img|foto|audio|video)(\d+)(?:[_-][\w-]+)?\.\w+$/i
const KEYS = /^\s*(tipo|t[ií]tulo|fecha)\s*:\s*(.*)$/i

const slots = {}
const slot = (n) => (slots[n] ||= { n: Number(n), id: n.padStart(3, '0'), raw: '', imgs: [], audios: [], videos: [] })
const parts = (p) => { const m = RX.exec(p.split('/').pop()); return m && [m[1].toLowerCase(), m[2]] }

// Cabecera opcional en texto###.txt:  tipo: carta / titulo: ... / --- (una línea "fecha:" se acepta pero se ignora)
function parse(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  const cut = lines.findIndex((l) => l.trim() === '---')
  const meta = {}
  let body = lines
  if (cut > 0 && lines.slice(0, cut).every((l) => !l.trim() || KEYS.test(l))) {
    lines.slice(0, cut).forEach((l) => { const m = l.match(KEYS); if (m) meta[m[1].toLowerCase().replace('í', 'i')] = m[2].trim() })
    body = lines.slice(cut + 1)
  }
  return { meta, texto: body.join('\n').trim() }
}

Object.keys(txt).sort().forEach((p) => {
  const x = parts(p); if (!x) return
  const s = slot(x[1])
  if (x[0] === 'texto') s.raw += (s.raw ? '\n\n' : '') + txt[p]
  else if (x[0] === 'video') s.videos.push(...txt[p].split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)))
})
Object.keys(media).sort().forEach((p) => {
  const x = parts(p); if (!x) return
  const s = slot(x[1])
  if (x[0] === 'audio') s.audios.push(media[p])
  else if (x[0] === 'video') s.videos.push(media[p])
  else s.imgs.push(media[p])
})

export const ITEMS = Object.values(slots).sort((a, b) => a.n - b.n).map((s) => {
  const { meta, texto } = parse(s.raw)
  const tipo = TIPOS.includes(meta.tipo) ? meta.tipo
    : s.imgs.length ? 'foto' : s.audios.length || s.videos.length ? 'memoria' : texto.length > 280 ? 'carta' : 'nota'
  return {
    id: s.id, tipo, texto,
    titulo: meta.titulo || `${NOMBRE[tipo]} ${s.id}`,
    imgs: s.imgs, audios: s.audios, videos: s.videos,
  }
}).filter((it) => it.texto || it.imgs.length || it.audios.length || it.videos.length)

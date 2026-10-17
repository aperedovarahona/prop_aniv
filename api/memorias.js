// GET  /api/memorias            → lista pública de recuerdos de la nube
// GET  /api/memorias?verificar=1 → 204 si la contraseña es correcta
// POST /api/memorias            → crea un recuerdo (requiere contraseña)
import { put, list } from '@vercel/blob'
import { autorizado, claveDe } from './_auth.js'

const TIPOS = ['foto', 'carta', 'nota', 'memoria']
const BLOB = /^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\//
const urls = (a, rx) => (Array.isArray(a) ? a.filter((u) => typeof u === 'string' && rx.test(u)).slice(0, 12) : [])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'GET' && !req.query.verificar) {
      const { blobs } = await list({ prefix: 'memorias/data/', limit: 1000 })
      const items = await Promise.all(blobs.map((b) => fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => null)))
      return res.status(200).json(items.filter(Boolean).sort((a, b) => a.creado - b.creado))
    }

    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD en Vercel' })
    if (!autorizado(claveDe(req))) return res.status(401).json({ error: 'Contraseña incorrecta' })
    if (req.method === 'GET') return res.status(204).end()

    if (req.method === 'POST') {
      const b = req.body || {}
      const id = 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const item = {
        id,
        tipo: TIPOS.includes(b.tipo) ? b.tipo : 'nota',
        titulo: String(b.titulo || '').slice(0, 120),
        texto: String(b.texto || '').slice(0, 20000),
        imgs: urls(b.imgs, BLOB),
        audios: urls(b.audios, BLOB),
        videos: urls(b.videos, /^https?:\/\//i),
        creado: Date.now(),
      }
      if (!item.texto && !item.imgs.length && !item.audios.length && !item.videos.length) {
        return res.status(400).json({ error: 'El recuerdo está vacío' })
      }
      await put(`memorias/data/${id}.json`, JSON.stringify(item), { access: 'public', contentType: 'application/json', addRandomSuffix: false })
      return res.status(201).json(item)
    }
    res.status(405).json({ error: 'Método no permitido' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

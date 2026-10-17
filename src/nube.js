// Recuerdos agregados desde la web: archivos en Vercel Blob + API en /api (ver README)
import Swal from 'sweetalert2'
import { upload } from '@vercel/blob/client'

const KEY = 'galaxia-admin'
const NOMBRE = { foto: 'Foto', carta: 'Carta', nota: 'Nota', memoria: 'Memoria' }
const claveGuardada = () => { try { return sessionStorage.getItem(KEY) || '' } catch { return '' } }
const guardarClave = (c) => { try { sessionStorage.setItem(KEY, c) } catch {} }

const normalizar = (it) => ({ imgs: [], audios: [], videos: [], texto: '', ...it, titulo: it.titulo || NOMBRE[it.tipo] || 'Recuerdo' })

export async function cargarNube() {
  try {
    const r = await fetch('/api/memorias', { cache: 'no-store' })
    const d = await r.json()
    return Array.isArray(d) ? d.map(normalizar) : []
  } catch { return [] } // sin API (p. ej. `npm run dev`): solo los recuerdos de la carpeta
}

// Reduce las fotos a máx. 1600 px (JPG) antes de subirlas
async function comprimir(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const cv = document.createElement('canvas')
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k)
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.82))
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f
  } catch { return f }
}

const limpio = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_')
const subir = async (f, clave) =>
  (await upload(`memorias/media/${limpio(f.name)}`, f, { access: 'public', handleUploadUrl: '/api/subir', clientPayload: clave })).url

async function verificar(clave) {
  const r = await fetch('/api/memorias?verificar=1', { headers: { 'x-admin-password': encodeURIComponent(clave) } })
  if (r.status === 204) return guardarClave(clave)
  if (r.status === 401) throw new Error('Contraseña incorrecta')
  const d = await r.json().catch(() => ({}))
  throw new Error(d.error || 'La API no está disponible. En local usa «vercel dev»; en Vercel revisa el README.')
}

async function crear(d, clave) {
  await verificar(clave)
  let imgs = [], audios = []
  try {
    for (const f of d.imgs) imgs.push(await subir(await comprimir(f), clave))
    if (d.audio) audios = [await subir(d.audio, clave)]
  } catch (e) { throw new Error('No se pudo subir un archivo: ' + e.message) }
  const tipo = d.tipo || (imgs.length ? 'foto' : audios.length || d.videos.length ? 'memoria' : d.texto.length > 280 ? 'carta' : 'nota')
  const r = await fetch('/api/memorias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': encodeURIComponent(clave) },
    body: JSON.stringify({ tipo, titulo: d.titulo, texto: d.texto, imgs, audios, videos: d.videos }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'No se pudo guardar el recuerdo')
  return normalizar(j)
}

const attr = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
const formulario = (clave) => `
  <div class="form">
    <input id="f-clave" class="swal2-input" type="password" placeholder="Contraseña de administrador" autocomplete="current-password" value="${attr(clave)}">
    <select id="f-tipo" class="swal2-select">
      <option value="">Tipo: automático</option><option value="foto">Foto</option><option value="carta">Carta</option>
      <option value="nota">Nota</option><option value="memoria">Memoria</option>
    </select>
    <input id="f-titulo" class="swal2-input" placeholder="Título (opcional)" maxlength="120">
    <textarea id="f-texto" class="swal2-textarea" placeholder="Texto del recuerdo"></textarea>
    <label class="f-file">Imágenes (hasta 10)<input id="f-imgs" type="file" accept="image/*" multiple></label>
    <label class="f-file">Audio (opcional)<input id="f-audio" type="file" accept="audio/*"></label>
    <textarea id="f-videos" class="swal2-textarea" placeholder="Enlaces de video, uno por línea (YouTube, Vimeo...)"></textarea>
  </div>`

// Abre el formulario; devuelve el recuerdo creado o null
export async function agregarRecuerdo(swal) {
  const { value } = await swal.fire({
    title: 'Nuevo recuerdo', width: 520, html: formulario(claveGuardada()),
    showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
    focusConfirm: false, showLoaderOnConfirm: true, allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const q = (s) => Swal.getPopup().querySelector(s)
      const clave = q('#f-clave').value
      const d = {
        tipo: q('#f-tipo').value, titulo: q('#f-titulo').value.trim(), texto: q('#f-texto').value.trim(),
        imgs: [...q('#f-imgs').files], audio: q('#f-audio').files[0],
        videos: q('#f-videos').value.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)),
      }
      if (!clave) return Swal.showValidationMessage('Escribe la contraseña')
      if (!d.texto && !d.imgs.length && !d.audio && !d.videos.length) return Swal.showValidationMessage('Agrega un texto, imagen, audio o video')
      if (d.imgs.length > 10) return Swal.showValidationMessage('Máximo 10 imágenes')
      if (d.audio && d.audio.size > 30 * 1024 * 1024) return Swal.showValidationMessage('El audio supera los 30 MB')
      try { return await crear(d, clave) } catch (e) { Swal.showValidationMessage(e.message) }
    },
  })
  return value || null
}

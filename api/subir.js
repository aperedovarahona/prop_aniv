// Subida directa del navegador a Vercel Blob (evita el límite de 4.5 MB de las funciones)
import { handleUpload } from '@vercel/blob/client'
import { autorizado } from './_auth.js'

const TIPOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg',
]

export default async function handler(req, res) {
  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!autorizado(clientPayload || '')) throw new Error('Contraseña incorrecta')
        if (!pathname.startsWith('memorias/media/')) throw new Error('Ruta no permitida')
        return { allowedContentTypes: TIPOS, maximumSizeInBytes: 30 * 1024 * 1024, addRandomSuffix: true }
      },
      onUploadCompleted: async () => {},
    })
    res.status(200).json(json)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}

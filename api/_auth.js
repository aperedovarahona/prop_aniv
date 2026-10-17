import { timingSafeEqual } from 'node:crypto'

// Contraseña enviada por el cliente (cabecera x-admin-password, codificada con encodeURIComponent)
export const claveDe = (req) => {
  try { return decodeURIComponent(req.headers['x-admin-password'] || '') } catch { return '' }
}

export const autorizado = (clave = '') => {
  const real = process.env.ADMIN_PASSWORD || ''
  const a = Buffer.from(String(clave)), b = Buffer.from(real)
  return real.length > 0 && a.length === b.length && timingSafeEqual(a, b)
}

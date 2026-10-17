// ====== CONFIGURACIÓN ======
export const CONFIG = {
  nombre: 'Helen',
  titulo: 'Nuestra Galaxia',
  inicio: '17/09/2026 19:00', // dd/mm/yyyy HH:mm · hora de Bolivia (UTC-4)
  intro: 'Cada recuerdo que abras hará crecer esta galaxia. Empieza tocando una estrella.',
  meta: 35,                    // recuerdos que hay que abrir para completar la galaxia (0 = usar el total)
  mostrarBotonAgregar: true,   // true: botón siempre visible · false: solo aparece al abrir /?admin (úsalo al regalarlo)
}

// El contenido vive en src/recuerdos/<carpeta>/ (ver README.md)
export { ITEMS } from './recuerdos'

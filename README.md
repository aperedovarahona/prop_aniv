# ✦ Nuestra Galaxia

Sitio web interactivo en **React + Three.js** (react-three-fiber). Una esfera de partículas con recuerdos (fotos, cartas, notas y memorias) que, al abrirlos, se transforma poco a poco en una galaxia espiral con un **corazón rojo latiendo** en el centro.

## Contenido

1. [Requisitos](#requisitos)
2. [Inicio rápido](#inicio-rápido)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Agregar recuerdos](#agregar-recuerdos) · [Agregar desde la web](#agregar-desde-la-web-nube)
5. [Configuración general](#configuración-general)
6. [Cómo evoluciona la galaxia](#cómo-evoluciona-la-galaxia)
7. [Personalización](#personalización)
8. [Despliegue en Vercel](#despliegue-en-vercel)
9. [Rendimiento y límites](#rendimiento-y-límites)
10. [Solución de problemas](#solución-de-problemas)

## Requisitos

- Node.js 18 o superior
- npm (incluido con Node.js)

## Inicio rápido

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # build de producción en /dist
npm run preview    # probar el build localmente
```

## Estructura del proyecto

```
galaxia-novia/
├── index.html
├── api/                  # funciones de Vercel (backend)
│   ├── memorias.js       # GET lista · POST crea recuerdos de la nube
│   ├── subir.js          # token de subida directa a Vercel Blob
│   └── _auth.js          # verificación de contraseña
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx          # punto de entrada
    ├── App.jsx           # interfaz (HUD), modales SweetAlert2, progreso
    ├── Galaxy.jsx        # escena 3D: esfera/galaxia en capas, corazón, estrellas
    ├── data.js           # CONFIG (nombre, título, fecha de inicio)
    ├── recuerdos.js      # genera los recuerdos automáticamente desde la carpeta
    ├── nube.js           # recuerdos agregados desde la web (formulario + Vercel Blob)
    ├── styles.css
    └── recuerdos/        # ← AQUÍ VA TODO EL CONTENIDO (carpeta plana)
        ├── texto001.txt
        ├── img001.jpg
        ├── texto002.txt
        └── ...
```

> No hay servidor ni base de datos: la generación ocurre al compilar (Vite lee la carpeta). En desarrollo se actualiza sola; en Vercel se genera en cada despliegue.

## Agregar recuerdos

**Todos los archivos que compartan el mismo número forman una estrella.** Pon los archivos directamente en `src/recuerdos/` (sin subcarpetas ni JSON). Soporta decenas de recuerdos (pensado para 50–70).

| Archivo | Qué es | Notas |
|---------|--------|-------|
| `texto001.txt` | Texto del recuerdo | UTF-8, respeta saltos de línea. |
| `img001.jpg` | Imagen | `.jpg .jpeg .png .webp .gif .avif`. Para varias: `img001_2.jpg`, `img001_3.jpg`. |
| `audio001.mp3` | Audio | `.mp3 .wav .ogg .m4a`. No se reproduce solo. |
| `video001.txt` | Enlaces a video | Un enlace por línea (YouTube/Vimeo se incrustan). |
| `video001.mp4` | Video local | `.mp4 .webm`. Pesa mucho; prefiere enlaces. |

Ejemplo: la estrella **014** con foto, texto y audio:

```
src/recuerdos/texto014.txt
src/recuerdos/img014.jpg
src/recuerdos/audio014.mp3
```

### Datos automáticos

Si solo subes los archivos, el sistema deduce todo:

- **Tipo:** con imagen → `foto` · con audio/video → `memoria` · solo texto de más de 280 caracteres → `carta` · texto corto → `nota`.
- **Título:** `Foto 014`, `Carta 014`, etc.

### Cabecera opcional (para definir título o tipo)

Al inicio de `texto###.txt`, antes de una línea `---` (los recuerdos ya no llevan fecha; una línea `fecha:` se ignora):

```
tipo: carta
titulo: Lo que nunca te dije
---
Mi amor,

Aquí empieza el texto...
```

| Clave    | Valores |
|----------|---------|
| `tipo`   | `foto`, `carta`, `nota`, `memoria` (define color de la estrella y estilo del modal) |
| `titulo` | Texto libre |

### Reglas

- El **orden** lo define el número (001, 002, ...). Puedes saltarte números.
- Un número sin ningún archivo válido no genera estrella.
- Nombres exactos: `texto`, `img` (o `foto`), `audio`, `video` + número. Cualquier otro archivo se ignora.
- El progreso se calcula sobre el total de estrellas generadas.
- **Espacios reservados (031 a 040):** son 10 estrellas de tipo `foto` para imágenes con algo de texto. Reemplaza `img031.jpg` por tu foto (mismo nombre; si usas otra extensión, borra el `.jpg` de relleno) y edita `texto031.txt` con tus palabras. Lo mismo para 032 a 040.
- Los 30 textos incluidos (`texto001.txt` a `texto030.txt`) son los definitivos. Cada uno trae `tipo` y `titulo` en su cabecera (puedes cambiarlos). Para sumar una foto o un audio a una estrella, agrega `img001.jpg` o `audio001.mp3` con el mismo número.

## Agregar desde la web (nube)

Además de la carpeta `src/recuerdos/` (que se publica con cada despliegue), puedes **agregar más recuerdos desde el propio sitio ya desplegado**, sin tocar código ni redesplegar. Se guardan en **Vercel Blob** y aparecen como estrellas nuevas.

### Configuración (una sola vez)

1. Despliega el proyecto en Vercel (ver [Despliegue](#despliegue-en-vercel)).
2. En el proyecto: **Storage → Create → Blob** y conéctalo. Esto crea solo la variable `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables** agrega `ADMIN_PASSWORD` con la contraseña que quieras (mejor solo caracteres comunes).
4. Haz un nuevo despliegue (*Redeploy*) para que tome las variables.

### Uso

1. Abre `https://tu-sitio.vercel.app/?admin`. Solo con `?admin` aparece el botón **+ Agregar recuerdo**; sin eso ella no lo ve. (Por defecto `mostrarBotonAgregar` está en `true` en `src/data.js` y se ve siempre; ponlo en `false` antes de regalarlo para que solo aparezca con `?admin`.)
2. Completa el formulario: tipo (o automático), título, texto, hasta 10 imágenes, un audio y enlaces de video. Escribe la contraseña (se recuerda mientras la pestaña esté abierta).
3. Al guardar, las imágenes se reducen a 1600 px, se suben directo a Blob y se crea la estrella.

### Cómo funciona

| Pieza | Función |
|-------|---------|
| `api/memorias.js` | `GET` devuelve la lista pública; `POST` crea el recuerdo (guarda un `.json` en Blob). |
| `api/subir.js` | Entrega un token para subir archivos directo desde el navegador (hasta 30 MB, solo imagen/audio). |
| `api/_auth.js` | Compara la contraseña con `ADMIN_PASSWORD`. |
| `src/nube.js` | Formulario, compresión de fotos, subida y carga de la lista. |

- Los recuerdos de la carpeta van primero y los de la nube después, en orden de creación.
- Cada estrella conserva su posición aunque agregues más.
- Los archivos de Blob son públicos (con URL difícil de adivinar). No subas nada que deba ser privado.
- No hay botón para borrar: elimina archivos desde **Storage → Blob** en el panel de Vercel (borra el `.json` de `memorias/data/` para quitar la estrella).
- Revisa los límites de tu plan de Vercel Blob si subes muchas fotos o audios.

### Probar en local

`npm run dev` solo sirve la parte visual (la API no existe y se usan únicamente los recuerdos de la carpeta). Para probar la API:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

## Configuración general

Edita `src/data.js`:

```js
export const CONFIG = {
  nombre: 'Mi amor',          // saludo inicial
  titulo: 'Nuestra Galaxia',  // título en pantalla
  inicio: '17/09/2026 19:00', // dd/mm/yyyy HH:mm (hora de Bolivia) → contador de tiempo
  intro: 'Texto del mensaje de bienvenida.',
  meta: 40,                   // recuerdos a abrir para completar la galaxia (0 = usar el total)
  mostrarBotonAgregar: true,  // true: siempre visible · false: solo aparece en /?admin
}
```

## Cómo evoluciona la galaxia

`progreso = recuerdos abiertos / meta` (`CONFIG.meta`, 40 por defecto; con `0` se usa el total). Así, los recuerdos que agregues después de completar la galaxia no la "encogen".

- **Esfera → galaxia:** las partículas pasan de la esfera a una espiral de 3 brazos de forma continua.
- **Crecimiento:** la escena aumenta de tamaño con el progreso (además del zoom manual).
- **Nube y detalle:** 3 capas (polvo fino, gas difuso tipo nebulosa y estrellas con destello). Más progreso = más partículas visibles, más nube y más estrellas de fondo.
- **Corazón rojo:** se forma en el centro partícula a partícula y late suavemente (ritmo "lub-dub").
- **Contador:** muestra el tiempo transcurrido desde `CONFIG.inicio` (años, meses, días, horas, minutos y segundos), calculado con el calendario y la hora de Bolivia, y se actualiza cada segundo.
- **Estrellas y esferas:** un recuerdo sin abrir se ve como una estrella discreta que titila suavemente; al abrirlo se desvanece girando, aparece un destello breve y nace una esferita un poco más grande que las partículas de la nebulosa, con un brillo suave.
- **Hitos:** al llegar a 25 %, 50 %, 75 % y 100 % aparece un modal con la nueva etapa.
- El progreso se guarda en `localStorage` (por navegador/dispositivo). El botón **Reiniciar** lo borra.

Controles: arrastrar para girar · rueda o pellizco para zoom · tocar una estrella para abrirla.

## Personalización

| Qué | Dónde |
|-----|-------|
| Colores de las estrellas por tipo | `COLORS` en `src/Galaxy.jsx` |
| Paleta (cian, rosa, naranja, violeta; basada en la imagen de referencia) | `PAL`, `inner`, `outer` en `buildLayer()`, `COLORS` por tipo y el halo cian de la esfera (`vec3(.18, .72, 1.)`) en el shader; fondo y botones en `styles.css` |
| Densidad, tamaño y brillo de la galaxia | `LAYERS` en `src/Galaxy.jsx` (3 capas: `fina`, `nube` y `brillantes`; `n` = partículas, `alpha` = opacidad de la nube) |
| Número de brazos | `ARMS` en `src/Galaxy.jsx` |
| Tamaño del corazón | factor `0.75` en `buildHeart()` |
| Partículas del corazón | `n` en `buildHeart()` |
| Velocidad del latido | `clock.elapsedTime * 1.25` (1.25 ≈ 75 lpm) |
| Intensidad del latido | `0.08` y `0.05` en el cálculo de `beat` |
| Color del brillo del corazón | `color="#ff2d55"` del sprite `core` |
| Hitos (porcentajes y textos) | `STAGES` en `src/App.jsx` |
| Tipografías y estilo de modales | `index.html` y `src/styles.css` |

Todos los mensajes y confirmaciones usan **SweetAlert2** (sin `alert`, `confirm` ni `prompt`).

## Despliegue en Vercel

**Opción A: desde GitHub**
1. Sube el proyecto a un repositorio (`node_modules` y `dist` ya están en `.gitignore`).
2. En [vercel.com](https://vercel.com) → *Add New → Project* → importa el repositorio.
3. Vercel detecta Vite automáticamente (Build: `npm run build`, Output: `dist`). Pulsa *Deploy*.
4. Cada `git push` redespliega el sitio.

**Opción B: CLI**
```bash
npm i -g vercel
vercel          # primer despliegue (preview)
vercel --prod   # producción
```

## Rendimiento y límites

- Cada partícula se calcula en la GPU (shader), no en JavaScript.
- El pixel ratio está limitado a 1.75 y no hay postprocesado.
- `three` se separa en un chunk propio para cachear mejor.
- **Optimiza el contenido:** imágenes a ≤ 1600 px y ≤ 500 KB (WebP/JPG), audios en MP3 comprimido.
- **Videos:** usa enlaces de YouTube/Vimeo (no listados) en lugar de archivos `.mp4` pesados, que aumentan el repositorio y el tiempo de despliegue.
- Para privacidad total, comparte solo el enlace con ella; el sitio no tiene contraseña.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| No aparece un recuerdo nuevo | Revisa el nombre exacto (`texto001.txt`, `img001.jpg`) y que esté directo en `src/recuerdos/`. Reinicia `npm run dev`. |
| La imagen no se ve | Revisa la extensión y que el número coincida con el de su texto. |
| Va lento en el celular | Baja `n` en `LAYERS` (fina y nube) y las partículas del corazón. |
| Quiero empezar de cero | Botón **Reiniciar** o borrar `galaxia-vistos-v1` del `localStorage`. |
| `npm install` falla con `ERESOLVE` | Borra `node_modules` y `package-lock.json`, y ejecuta `npm install --legacy-peer-deps` (el proyecto ya incluye un `.npmrc` con esa opción). Evita instalar dentro de carpetas sincronizadas (OneDrive/Dropbox): pueden dejar `node_modules` corrupto. |
| El botón "Agregar recuerdo" no aparece | Abre el sitio con `/?admin` al final de la URL, o pon `mostrarBotonAgregar: true`. |
| "La API no está disponible" | En local usa `vercel dev`. En Vercel confirma que conectaste Blob y que redesplegaste después de crear las variables. |
| "Contraseña incorrecta" / "Falta configurar ADMIN_PASSWORD" | Crea o revisa `ADMIN_PASSWORD` en Settings → Environment Variables y redespliega. |
| Pantalla negra | Comprueba que el navegador tenga WebGL activado. |

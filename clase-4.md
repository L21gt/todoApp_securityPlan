---
marp: true
theme: default
paginate: true
class: lead
backgroundColor: #ffffff
---

# Patrones de Diseno Orientados a la Seguridad
## Clase 4: Zero Trust — Primera Linea de Codigo Seguro

Ingeniero Berny Cardona

> *"Nunca confies, siempre verifica. Incluso dentro de tu propia red."*

---

# Parte 1: Repaso Rapido
## Lo que aprendimos en Clases 1, 2 y 3

---

## Clase 1 — Security by Design

Auditamos la todoApp y encontramos **12 vulnerabilidades**.

**Conceptos clave**:
- **OWASP Top 10**: Las 10 categorias de vulnerabilidades mas comunes en aplicaciones web
- **IDOR** (Insecure Direct Object Reference): Acceder a recursos ajenos cambiando un ID en la URL
- **Injection**: Cuando la entrada del usuario se ejecuta como codigo
- **Security by Design**: La seguridad no se agrega al final, se disena desde el inicio

> La todoApp tiene **cero controles**. Cualquiera hace cualquier cosa.

---

## Clase 2 — Los 7 Principios de Diseno Seguro

| # | Principio | En una frase |
|---|-----------|-------------|
| 1 | **Menor Privilegio** | Solo los permisos necesarios, ni uno mas |
| 2 | **Defensa en Profundidad** | Multiples capas independientes |
| 3 | **Fail Secure** | Al fallar, denegar y no revelar info |
| 4 | **Separacion de Responsabilidades** | Cada componente hace una sola cosa |
| 5 | **Economia de Mecanismo** | Simple = menos superficie de ataque |
| 6 | **Zero Trust** | No confiar en nada por defecto |
| 7 | **Seguro por Defecto** | Todo cerrado, se abre con razon explicita |

---

## Clase 3 — Threat Modeling con STRIDE

STRIDE son **6 preguntas** que se hacen a cada componente:

| Letra | La pregunta |
|-------|------------|
| **S** — Spoofing | Alguien puede **hacerse pasar** por otro? |
| **T** — Tampering | Alguien puede **modificar datos** ajenos? |
| **R** — Repudiation | Alguien puede **negar** haber hecho algo? |
| **I** — Info Disclosure | Se **filtra** informacion privada? |
| **D** — Denial of Service | Pueden **tumbar** el servicio? |
| **E** — Elevation of Privilege | Pueden **escalar permisos**? |

> STRIDE encontro amenazas que la auditoria NO habia encontrado.

---

## Los 3 Documentos que Tenemos

```
Tarea 1: Auditoria         → QUE vulnerabilidades existen?
Tarea 2: Plan Remediacion  → COMO las arreglamos?
Tarea 3: Threat Model      → POR QUE un atacante las explotaria?
```

Hoy empezamos a **arreglarlas con codigo**.

---

# Parte 2: Desafio de Repaso
## Pongamos a prueba lo aprendido

---

# Parte 3: Zero Trust
## El Principio que Guia Todo

---

## Modelo Tradicional vs Zero Trust

**Castle & Moat (antiguo)**:
```
Internet → [Firewall] → Red interna: TODO confiable
```
Si el atacante pasa el firewall, tiene acceso a todo.

**Zero Trust**:
```
Cada request → Autenticado? → Autorizado? → Input valido? → Procesado
                  No → 401      No → 403      No → 422
```

> "Nunca confies, siempre verifica" — en CADA request, sin excepcion.

---

## Zero Trust en la todoApp: El Plan

```
ANTES (todoApp actual):
Request HTTP → Express → MongoDB
         (sin nada en medio)

DESPUES (lo que vamos a construir):
Request HTTP
  → [Helmet]        Clase 4 (HOY)
  → [CORS]          Clase 4 (HOY)
  → [Rate Limit]    Clase 17
  → [Auth JWT]      Clase 5-6
  → [Authorize]     Clase 9-11
  → [Validate]      Clase 13
  → [Handler]
  → [Audit Log]     Clase 15
  → [Error Handler] Clase 16
```

Hoy agregamos las **primeras 2 capas**.

---

## La Arquitectura de Middlewares

```
src/
├── middleware/         ← NUEVO: capas de seguridad
│   ├── security.js    ← Helmet + CORS + limites (hoy)
│   ├── auth.js        ← JWT (clase 5)
│   ├── authorize.js   ← RBAC (clase 9)
│   └── validate.js    ← Joi (clase 13)
├── services/          ← NUEVO: logica de seguridad
├── security/          ← NUEVO: rate limiting, crypto
├── errors/            ← NUEVO: manejo seguro de errores
├── models/
├── routes/
├── app.js             ← Conectar middlewares aqui
└── server.js          ← Variables de entorno
```

---

# Parte 4: Primer Codigo de Seguridad
## Helmet + CORS + Variables de Entorno

---

## Paso 1: Instalar Dependencias

```bash
npm install helmet cors dotenv
```

| Paquete | Que hace |
|---------|---------|
| `helmet` | Agrega headers de seguridad HTTP automaticamente |
| `cors` | Controla quien puede llamar tu API desde un navegador |
| `dotenv` | Carga variables de entorno desde `.env` (no hardcodear secretos) |

---

## Paso 2: Crear la Estructura de Directorios

```bash
mkdir -p src/middleware src/services src/security src/errors
```

Estos directorios estaran **vacios por ahora**. Los iremos llenando clase a clase.

Es como construir los cimientos de una casa antes de levantar paredes.

---

## Paso 3: Variables de Entorno — .env

**ANTES** (hardcodeado en server.js):
```javascript
mongoose.connect('mongodb://localhost:27017/todo_app')
```

**DESPUES** (.env):
```env
# .env — NUNCA se sube a git
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/todo_app
CORS_ORIGIN=http://localhost:3000
```

```javascript
// server.js — lee de variable de entorno
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
```

---

## Por que .env es Importante

**Sin .env** (el codigo actual):
```
Codigo fuente = secretos incluidos
Si alguien ve tu repo en GitHub → ve tu connection string
Si la BD cambia → editas el codigo y redespliegas
```

**Con .env**:
```
Codigo fuente = limpio, sin secretos
.env.example en el repo (template sin valores reales)
.env en .gitignore (nunca se sube)
Cada ambiente (dev, staging, prod) tiene su propio .env
```

> **Principio**: Seguro por Defecto — los secretos NO van en el codigo.

---

## Paso 4: Helmet — Headers de Seguridad

### Que headers agrega Helmet?

| Header | Que previene |
|--------|-------------|
| `X-Content-Type-Options: nosniff` | MIME-type sniffing |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking (embeber en iframe) |
| `X-XSS-Protection: 0` | Desactiva filtro XSS del browser (inseguro) |
| `Strict-Transport-Security` | Fuerza HTTPS |
| `Content-Security-Policy` | Controla que scripts se ejecutan |
| `X-DNS-Prefetch-Control: off` | Previene DNS prefetch leaks |

**Sin Helmet**: cero headers de seguridad.
**Con Helmet**: 11+ headers en una linea de codigo.

---

## Demo: ANTES de Helmet

```bash
curl -I http://localhost:3000/api/tareas
```

```
HTTP/1.1 200 OK
X-Powered-By: Express    ← Revela tecnologia
Content-Type: application/json
                          ← Sin headers de seguridad
```

**`X-Powered-By: Express`** le dice al atacante exactamente que framework usas.

---

## Demo: DESPUES de Helmet

```javascript
// app.js
const helmet = require('helmet');
app.use(helmet());
```

```bash
curl -I http://localhost:3000/api/tareas
```

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'
Cross-Origin-Opener-Policy: same-origin
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
                          ← X-Powered-By ELIMINADO
```

**Una linea de codigo. 11 headers de seguridad.** Eso es Economia de Mecanismo.

---

## Paso 5: CORS — Control de Origen

### Sin CORS:
```
Cualquier sitio web puede llamar tu API desde el navegador.
Un sitio malicioso podria hacer requests a tu API
usando las cookies/sesion del usuario.
```

### Con CORS configurado:
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN,  // Solo tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

> **Principio**: Zero Trust — solo origenes explicitos pueden llamar la API.

---

## CORS: Errores Comunes

### Error 1: CORS abierto a todos
```javascript
// NUNCA en produccion
app.use(cors({ origin: '*' }));
```
Equivale a no tener CORS.

### Error 2: Confundir CORS con autenticacion
```
CORS previene que un NAVEGADOR haga requests no autorizados.
NO previene que alguien use curl o Postman.
CORS es una capa mas, no reemplaza auth.
```

### Error 3: Origenes en el codigo
```javascript
// Mal: hardcodeado
cors({ origin: 'http://miapp.com' })

// Bien: en variable de entorno
cors({ origin: process.env.CORS_ORIGIN })
```

---

## Paso 6: Limite de Payload

**ANTES**: `express.json()` acepta body de cualquier tamano.

```javascript
// Un body de 100MB tumba el servidor
app.use(express.json());
```

**DESPUES**: limite explicito.

```javascript
app.use(express.json({ limit: '10kb' }));
```

> Recuerdan el DoS de STRIDE en PUT? `express.json({ limit: '10kb' })` lo soluciona.

**Principio**: Seguro por Defecto — el limite existe desde el dia 1.

---

## El app.js Actualizado

```javascript
// app.js — DESPUES de Clase 4
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const tareasRouter = require('./routes/tareas');

const app = express();

// === CAPA 1: Headers de seguridad ===
app.use(helmet());

// === CAPA 2: Control de origen ===
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// === CAPA 3: Limite de payload ===
app.use(express.json({ limit: '10kb' }));

// === Rutas (aun sin auth — viene en Clase 5) ===
app.use('/api/tareas', tareasRouter);

module.exports = app;
```

---

## Comparacion: ANTES vs DESPUES

| Aspecto | Antes (Clase 0) | Despues (Clase 4) |
|---------|-----------------|-------------------|
| Headers seguridad | 0 | 11+ (Helmet) |
| X-Powered-By | Expuesto | Eliminado |
| CORS | Abierto a todo | Solo origenes permitidos |
| Payload limite | Sin limite (DoS) | 10kb max |
| Connection string | Hardcodeada | En .env |
| Secretos en codigo | Si | No (.env + .gitignore) |
| Estructura seguridad | No existe | 4 directorios creados |

---

## Que Vulnerabilidades Resolvimos Hoy?

| Vuln | Estado | Como |
|------|--------|------|
| Sin headers de seguridad | Resuelto | `helmet()` |
| X-Powered-By expuesto | Resuelto | `helmet()` lo elimina |
| Sin CORS configurado | Resuelto | `cors({ origin })` |
| Connection string hardcodeada | Resuelto | `dotenv` + `.env` |
| Payload sin limite (DoS) | Resuelto | `express.json({ limit })` |
| Sin estructura de seguridad | Resuelto | Directorios creados |

---

## Que Falta Todavia?

```
❌ Sin autenticacion         → Clase 5-6
❌ Sin autorizacion          → Clase 9-11
❌ Sin validacion de input   → Clase 13
❌ Sin audit logs            → Clase 15
❌ Sin rate limiting         → Clase 17
❌ Sin error handler seguro  → Clase 16
❌ MongoDB sin auth          → Clase 12
```

Hoy pusimos los **cimientos**. Cada clase agrega una capa mas.

---

## El Commit de Hoy

```bash
# Crear branch para clase 4
git checkout -b clase-4-zero-trust-setup

# Agregar cambios
git add src/app.js src/server.js .env.example .gitignore
git add src/middleware/ src/services/ src/security/ src/errors/

# Commit
git commit -m "feat(security): add Helmet, CORS, dotenv, payload limit - Clase 4"

# Merge a main
git checkout main && git merge clase-4-zero-trust-setup
```

> Cada clase = 1 commit. Cada commit = 1 capa de seguridad.

---

## Tarea 4

### En tu fork de la todoApp:

1. **Implementar** todo lo que vimos hoy:
   - `npm install helmet cors dotenv`
   - Crear `.env` y `.env.example`
   - Actualizar `app.js` con Helmet, CORS, y limite de payload
   - Actualizar `server.js` para usar `dotenv`
   - Crear directorios: `middleware/`, `services/`, `security/`, `errors/`

2. **Verificar** con curl:
   - `curl -I http://localhost:3000/api/tareas` debe mostrar headers de Helmet
   - `X-Powered-By` NO debe aparecer

3. **Captura de pantalla** del antes y despues de los headers

---

## Preview: Clase 5

### Authentication Gateway — Agregar Login

```javascript
// Nuevos archivos:
src/models/user.model.js     // Modelo de usuario
src/routes/auth.js           // Login + Register
src/middleware/auth.js        // Verificar JWT

// El cambio mas importante:
app.use('/api/tareas', authenticateToken, tareasRouter);
//                      ^^^^^^^^^^^^^^^^
//                      A partir de Clase 5, hay que estar logueado
```

> Se acabo el acceso anonimo. Clase 5 = primer checkpoint Zero Trust.

---

## Preguntas?

**Repositorio**: [todoApp](https://github.com/BernyCR96/todoApp)

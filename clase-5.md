---
marp: true
theme: default
paginate: true
class: lead
backgroundColor: #ffffff
---

# Patrones de Diseno Orientados a la Seguridad
## Clase 5: Authentication Gateway — Primer Login Real

Ingeniero Berny Cardona

> *"La identidad es el nuevo perimetro. Sin saber QUIEN eres, no puedo decidir QUE puedes hacer."*

---

# Parte 1: Repaso y El Problema
## Por que necesitamos autenticacion?

---

## Clase 4 — Lo que Construimos

| Capa | Que hace | Vulnerabilidad resuelta |
|------|---------|------------------------|
| Helmet | 11+ headers de seguridad | Info disclosure, clickjacking |
| CORS | Solo origenes permitidos | Cross-origin abuse |
| dotenv | Secretos fuera del codigo | Secretos en repositorio |
| Limite payload | Previene DoS por body grande | Denial of Service |

5 vulnerabilidades mitigadas. Pero la **mas critica** sigue abierta...

---

## El Problema: Acceso Anonimo

```bash
# Cualquiera puede hacer esto — sin credenciales
curl http://localhost:3000/api/tareas
# → Devuelve TODAS las tareas de TODOS los usuarios

curl -X DELETE http://localhost:3000/api/tareas/abc123
# → Elimina la tarea de otro usuario sin preguntar

curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"title":"Tarea maliciosa"}'
# → Crea tareas sin identificarse
```

**No sabemos QUIEN hace cada request.** Sin identidad, no hay seguridad.

---

## Que Vulnerabilidades Vamos a Resolver?

| # | Vulnerabilidad | OWASP | STRIDE | Solucion |
|---|---------------|-------|--------|----------|
| 1 | Sin autenticacion | A07 | **S** — Spoofing | JWT en cada request |
| 2 | Acceso anonimo a datos | A01 | **I** — Info Disclosure | Middleware que bloquea sin token |
| 3 | Passwords en texto plano | A02 | **I** — Info Disclosure | bcrypt con salt + 12 rounds |
| 4 | Info disclosure en login | A04 | **I** — Info Disclosure | Mensaje generico "Invalid credentials" |
| 5 | JWT_SECRET hardcodeado | A05 | **T** — Tampering | Variable de entorno en .env |

> 5 vulnerabilidades mas que vamos a cerrar. Llevamos 10 de las 12 originales.

---

## Conexion con las 3 Clases Anteriores

```
Clase 1 (Auditoria):  "Sin autenticacion" → Vulnerabilidad critica #1
Clase 2 (Principios): Zero Trust + Menor Privilegio → Los principios que aplica
Clase 3 (STRIDE):     Spoofing → "Alguien puede hacerse pasar por otro"
Clase 5 (HOY):        La SOLUCION → Authentication Gateway con JWT
```

Cada clase analizo el problema desde un angulo diferente.
Hoy lo **resolvemos con codigo**.

---

## Zero Trust: El Primer Checkpoint Real

```
ANTES (todoApp actual):
Request HTTP → Express → MongoDB
         (cualquiera accede a todo)

DESPUES (con Authentication Gateway):
Request HTTP
  → [Helmet]        ✅ Clase 4
  → [CORS]          ✅ Clase 4
  → [Auth JWT]      ← HOY (Clase 5)
  → [Authorize]     
  → [Validate]      
  → [Handler]
  → [Audit Log]     
  → [Error Handler] 
```

Si no se quien eres, **no pasas**. Primer checkpoint Zero Trust real.

---

# Parte 2: Autenticacion — La Teoria
## Entender antes de codificar

---

## Autenticacion vs Autorizacion

| Concepto | Pregunta | Ejemplo todoApp |
|----------|---------|-----------------|
| **Autenticacion** (AuthN) | **QUIEN** eres? | Login con email/password → JWT |
| **Autorizacion** (AuthZ) | **QUE** puedes hacer? | Solo ver TUS tareas, no las de otro |

```
Hoy: Autenticacion (Clase 5) — Saber QUIEN eres
Despues: Autorizacion — Controlar QUE puedes hacer
```

> Es como un edificio: primero muestras tu **ID en recepcion** (AuthN),
> luego verifican si tienes **acceso al piso 5** (AuthZ).

**Hoy ponemos la recepcion. Los guardias por piso vienen despues.**

---

## Los 3 Factores de Autenticacion

| Factor | Que es | Ejemplo |
|--------|--------|---------|
| **Algo que sabes** | Conocimiento | Password, PIN, pregunta secreta |
| **Algo que tienes** | Posesion | Celular (SMS/TOTP), llave USB, token fisico |
| **Algo que eres** | Biometria | Huella digital, Face ID, iris |

**MFA (Multi-Factor Authentication)**: Combinar 2+ factores.

```
Solo password        → 1 factor (debil)
Password + SMS       → 2 factores (mejor)
Password + TOTP app  → 2 factores (mas seguro que SMS)
```

> Hoy implementamos 1 factor (password). En produccion, siempre agregar MFA.

---

## Mecanismos de Autenticacion en APIs

| Mecanismo | Como funciona | Cuando usarlo |
|-----------|--------------|---------------|
| **API Key** | Clave estatica en header | Servicios M2M, APIs publicas |
| **Basic Auth** | `user:pass` en base64 cada request | Nunca en produccion (sin HTTPS) |
| **Session/Cookie** | Cookie con session ID → servidor guarda estado | Apps web tradicionales (SSR) |
| **JWT (Bearer Token)** | Token firmado → servidor NO guarda estado | **APIs REST, SPAs, mobile** |
| **OAuth 2.0** | Token delegado por proveedor (Google, GitHub) | "Login con Google" |

> Para la todoApp (API REST), usaremos **JWT**. Es el estandar para APIs stateless.

---

## Que es un JWT? (JSON Web Token)

Un JWT es un **string firmado** que contiene informacion del usuario:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.firma
```

Se divide en **3 partes** separadas por puntos:

```
HEADER.PAYLOAD.SIGNATURE
```

| Parte | Que contiene | Ejemplo |
|-------|-------------|---------|
| **Header** | Algoritmo de firma | `{"alg": "HS256", "typ": "JWT"}` |
| **Payload** | Datos del usuario | `{"userId": "123", "email": "test@test.com"}` |
| **Signature** | Firma criptografica | HMAC-SHA256(header + payload, secret) |

---

## JWT: Lo que NO es

```
❌ JWT NO esta cifrado
   → Cualquiera puede leer el payload (es solo base64)
   → NUNCA guardar datos sensibles: password, tarjeta

❌ JWT NO es una sesion
   → El servidor no lo guarda en memoria
   → Si se lo roban, funciona hasta que expire

❌ JWT NO es infalible
   → Si el JWT_SECRET es debil, se puede falsificar
   → Si no tiene expiracion, funciona para siempre

✅ JWT SI garantiza INTEGRIDAD
   → Nadie puede MODIFICAR el payload sin romper la firma
   → El servidor verifica la firma en cada request
```

> Pueden verificar esto en **jwt.io** — peguen un JWT y veran el payload decodificado.

---

## Como Funciona el Flujo Completo

```
1. REGISTRO:
   Cliente → POST /api/auth/register { email, password }
   Servidor → Hashea password con bcrypt → Guarda en BD → 201 Created

2. LOGIN:
   Cliente → POST /api/auth/login { email, password }
   Servidor → Busca usuario → Compara hash → Genera JWT → { token }

3. ACCESO A RECURSOS:
   Cliente → GET /api/tareas  [Authorization: Bearer <token>]
   Servidor → Extrae token → Verifica firma → Decodifica payload
              → Si valido: req.user = payload → Continua al handler
              → Si invalido: 401 Unauthorized

4. TOKEN EXPIRA:
   Cliente → GET /api/tareas [Authorization: Bearer <token-expirado>]
   Servidor → 401 "Token expired" → Cliente debe hacer login de nuevo
```

---

## Por que NO Guardar Passwords en Texto Plano?

### Que pasa si hackean la base de datos?

```
TEXTO PLANO (MAL):
| email           | password      |
|-----------------|---------------|
| juan@test.com   | MiPassword123 |  ← Atacante lee todos los passwords
| maria@test.com  | Secreto456    |

CON BCRYPT (BIEN):
| email           | password                                       |
|-----------------|------------------------------------------------|
| juan@test.com   | $2b$12$LJ3m4ys3Lk9vF.8tB3KO.eWzBf0Nm5w3pZ... |
| maria@test.com  | $2b$12$x8kP2mN4qR7tY1wA3bC6D.uFgHiJkLmNoPq... |
```

Incluso si roban la BD, **no pueden revertir los hashes**.

---

## Hashing con bcrypt — Como Funciona

```
Texto plano:  "MiPassword123!"
                    ↓
bcrypt.hash(password, 12)    ← 12 = rounds (costo computacional)
                    ↓
     Genera SALT aleatorio: "LJ3m4ys3Lk9vF.8t"
                    ↓
     Aplica algoritmo 2^12 veces (4096 iteraciones)
                    ↓
Hash: "$2b$12$LJ3m4ys3Lk9vF.8tB3KO.eWzBf0Nm5w3pZ..."
       ^^^  ^^  ^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^
       algo rounds   salt              hash
```

| Concepto | Que hace |
|----------|---------|
| **Salt** | Valor aleatorio unico por password — mismo password, hash diferente |
| **Rounds (12)** | Factor de costo — mas rounds = mas lento = mas resistente a brute force |
| **Una via** | No se puede revertir — solo comparar |

---

## Tabla de Tiempos: Brute Force vs Rounds

| Rounds | Tiempo por hash | Brute force 8 chars |
|--------|----------------|---------------------|
| 10 | ~10ms | ~3 años |
| 12 | ~40ms | **~50 años** |
| 14 | ~160ms | ~800 años |

> Con 12 rounds, un atacante necesita ~50 años para probar todas las combinaciones de 8 caracteres. Por eso usamos **12 como minimo**.

**Pregunta**: Y por que no usar 20 rounds?
**Respuesta**: Porque cada login tardaria ~10 segundos. Es un balance entre seguridad y experiencia de usuario.

---

## Information Disclosure en Login — Un Error Clasico

```javascript
// MAL — Le dices al atacante si el email existe
if (!user) return res.json({ error: 'Email not found' });
if (!isValid) return res.json({ error: 'Wrong password' });
```

**Ataque**: El atacante prueba miles de emails:
```
POST /login { email: "admin@empresa.com" } → "Wrong password" → EL EMAIL EXISTE
POST /login { email: "ceo@empresa.com" }   → "Email not found" → No existe
POST /login { email: "dev@empresa.com" }    → "Wrong password" → EL EMAIL EXISTE
```

Ahora tiene una lista de emails validos para phishing o credential stuffing.

```javascript
// BIEN — Mismo mensaje SIEMPRE
if (!user) return res.json({ error: 'Invalid credentials' });
if (!isValid) return res.json({ error: 'Invalid credentials' });
```

> **Principio**: Fail Secure — al fallar, no revelar informacion.

---

# Parte 3: Arquitectura del Authentication Gateway
## El diseño antes del codigo

---

## Patron: Authentication Gateway

El **Authentication Gateway** es un punto unico de entrada que verifica identidad:

```
                    ┌─────────────────────────────┐
                    │    AUTHENTICATION GATEWAY    │
                    │                              │
 POST /register ──→ │  1. Validar datos            │ ──→ Crear usuario (bcrypt)
                    │                              │
 POST /login ─────→ │  2. Verificar credenciales   │ ──→ Generar JWT
                    │                              │
 GET /tareas ─────→ │  3. Verificar JWT            │ ──→ Si valido: pasar
                    │     (middleware)              │ ──→ Si no: 401
                    └─────────────────────────────┘
```

> **Principio**: Separacion de Responsabilidades — la autenticacion es un servicio independiente, no esta mezclada con la logica de tareas.

---

## Arquitectura por Capas — Donde Va Cada Archivo

Cada carpeta tiene **una responsabilidad**. Este patron se llama **Layered Architecture**:

```
src/
├── models/          ← CAPA DE DATOS: como se guardan los datos
├── services/        ← CAPA DE LOGICA: que hace el sistema
├── routes/          ← CAPA HTTP: como llegan los requests
├── middleware/      ← CAPA DE SEGURIDAD: quien puede pasar
├── app.js           ← ORQUESTADOR: conecta todas las capas
└── .env             ← CONFIGURACION: secretos fuera del codigo
```

**Dependencias nuevas**:
```bash
npm install jsonwebtoken bcrypt uuid
```

> **Regla**: las rutas llaman a services, los services llaman a models. Nunca al reves.
---

## El Flujo en la Arquitectura

```
         ┌──────────────────────────────────────────────────┐
         │              src/app.js (ORQUESTADOR)             │
         │                                                   │
         │  app.use('/api/auth', authRouter)     ← SIN JWT   │
         │  app.use('/api/tareas',                           │
         │          authenticateToken,            ← CON JWT   │
         │          tareasRouter)                             │
         └───────────────┬──────────────────┬────────────────┘
                         │                  │
              ┌──────────┘                  └──────────┐
              ▼                                        ▼
   src/routes/auth.js                     src/middleware/auth.js
   (CAPA HTTP)                            (CAPA SEGURIDAD)
   POST /register ─┐                     Extrae Bearer token
   POST /login ────┤                     Verifica firma JWT
                   │                     req.user = { userId, email, role }
                   ▼
        src/services/authGateway.js
        (CAPA LOGICA) — funciones exportadas
        register(email, pass) → verificar + crear
        login(email, pass)    → buscar + comparar + JWT
        generateToken(user)   → jwt.sign()
                   │
                   ▼
        src/models/user.model.js
        (CAPA DATOS)
        Schema + bcrypt pre-save hook
```

---

## El Cambio Clave en app.js: UNA Linea

```javascript
// ANTES (Clase 4): Acceso anonimo — cualquiera accede
app.use('/api/tareas', tareasRouter);

// DESPUES (Clase 5): Requiere autenticacion
app.use('/api/tareas', authenticateToken, tareasRouter);
//                      ^^^^^^^^^^^^^^^^
//                      Middleware que bloquea sin token valido
```

Esa linea es el **primer checkpoint Zero Trust** real:
- Sin token → **401** "Access denied. No token provided."
- Token invalido → **401** "Invalid or expired token."
- Token valido → **Pasa** al router de tareas con `req.user` disponible

> Las rutas de auth (`/api/auth`) NO llevan el middleware — no puedes pedir token para hacer login.

---

# Parte 4: Demo en Vivo
## Solo el Modelo de Usuario — Lo mas importante

---

## Modelo de Usuario: user.model.js

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,       // No puede haber 2 usuarios con el mismo email
    lowercase: true,    // Normalizar: "Juan@Test.COM" → "juan@test.com"
    trim: true,         // Quitar espacios
  },
  password: {
    type: String,
    required: true,
    minlength: 8,       // Minimo 8 caracteres
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',    // Seguro por Defecto: nadie es admin automaticamente
  },
}, { timestamps: true });
```

---

## Pre-save Hook: Hashear Antes de Guardar

```javascript
// ANTES de guardar en BD, hashear el password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);  // 12 rounds
  next();
});
```

Esto se ejecuta **automaticamente** cada vez que se llama `user.save()`.

El password **nunca** se guarda en texto plano.

---

## Metodos de Seguridad del Modelo

```javascript
// Comparar password (para login)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// NUNCA devolver el password en respuestas JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
```

---

## Demo Rapida: Probar bcrypt en Terminal

```javascript
// Ejecutar en Node REPL: node -e "..."
const bcrypt = require('bcrypt');

// Hashear
const hash = await bcrypt.hash('MiPassword123!', 12);
console.log('Hash:', hash);
// → "$2b$12$LJ3m4ys3Lk9vF.8tB3KO.eWzBf0Nm5w3pZ..."

// Comparar — correcto
const isValid = await bcrypt.compare('MiPassword123!', hash);
console.log('Correcto:', isValid);  // → true

// Comparar — incorrecto
const isFalse = await bcrypt.compare('PasswordMalo', hash);
console.log('Incorrecto:', isFalse);  // → false
```

> El hash es **diferente cada vez** (por el salt), pero `bcrypt.compare` siempre funciona.

---

## Demo: Que Contiene un JWT?

```javascript
const jwt = require('jsonwebtoken');

// Crear un token
const token = jwt.sign(
  { userId: '123', email: 'test@test.com', role: 'user' },
  'mi-secreto-super-largo-de-32-caracteres-minimo',
  { expiresIn: '15m' }
);
console.log('Token:', token);

// Verificar (con secreto correcto)
const decoded = jwt.verify(token, 'mi-secreto-super-largo-de-32-caracteres-minimo');
console.log('Decoded:', decoded);
// → { userId: '123', email: 'test@test.com', role: 'user', iat: ..., exp: ... }

// Verificar (con secreto INCORRECTO)
jwt.verify(token, 'secreto-equivocado');
// → JsonWebTokenError: invalid signature
```

> **jwt.io** — Peguen el token ahi para ver las 3 partes decodificadas.

---

# Parte 5: Como se Ve Cuando Funciona
## Las 4 pruebas que deben lograr

---

## Prueba 1: Registrar Usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'
```

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "60d5ec49f1a2c8b1f8e4b123",
    "email": "test@test.com",
    "role": "user"
  }
}
```

> El password NO aparece. `toJSON()` lo elimina automaticamente.

---

## Prueba 2: Login — Obtener JWT

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'
```

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "email": "test@test.com", "role": "user" }
}
```

> Copiar el token. Se usa en cada request a `/api/tareas`.

---

## Prueba 3: Acceder SIN Token — 401

```bash
curl http://localhost:3000/api/tareas
```

```json
{
  "error": "Access denied. No token provided."
}
```

**El momento clave**: lo que antes devolvia todas las tareas, ahora devuelve **401**.
El acceso anonimo se acabo.

---

## Prueba 4: Acceder CON Token — 200

```bash
curl http://localhost:3000/api/tareas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

```json
[
  { "_id": "...", "title": "Mi tarea", "completed": false }
]
```

Ahora el servidor sabe **QUIEN** pidio los datos.

---

## Pruebas Extra de Seguridad

### Token inventado → 401
```bash
curl http://localhost:3000/api/tareas \
  -H "Authorization: Bearer token-falso-inventado"
# → { "error": "Invalid or expired token." }
```

### Login con password incorrecto → 401
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"PasswordMalo"}'
# → { "error": "Invalid credentials" }
```

> Mismo mensaje si el email no existe o si el password es incorrecto. **No damos pistas.**

---

# Parte 6: Analisis de Seguridad
## Que resolvemos y que falta

---

## Vulnerabilidades Resueltas

| Vulnerabilidad | Estado | Como |
|---------------|--------|------|
| Sin autenticacion (A07) | **Resuelto** | JWT en cada request |
| Acceso anonimo a datos | **Resuelto** | Middleware `authenticateToken` |
| Passwords en texto plano | **Prevenido** | bcrypt con 12 rounds + salt |
| Info disclosure en login | **Prevenido** | Mensaje generico "Invalid credentials" |
| JWT_SECRET hardcodeado | **Resuelto** | Variable de entorno en .env |

---

## Que Falta Todavia? (Honestidad)

```
✅ Sabemos QUIEN hace el request (autenticacion)
❌ No sabemos SI PUEDE hacerlo (autorizacion)
❌ Un usuario puede ver/editar tareas de OTRO
❌ No hay refresh tokens (token expira y hay que re-login)
❌ No hay validacion del email/password (inyeccion)
❌ No hay rate limiting en login (brute force)
❌ No hay logout real (el token sigue valido)
```

> La autenticacion es el **primer paso**, no la solucion completa.
> Hoy ponemos la puerta. En las proximas clases ponemos las reglas.

---

## Errores Comunes a Evitar

### Error 1: JWT_SECRET debil
```env
# MAL — un atacante puede adivinarlo
JWT_SECRET=secret123

# BIEN — largo y aleatorio
JWT_SECRET=a7f3b9c2e4d1f0a8b6c5d3e2f1a0b9c8d7e6f5a4b3c2d1
```

### Error 2: Poner authenticateToken en rutas de auth
```javascript
// MAL — no puedes pedir token para hacer login
app.use('/api/auth', authenticateToken, authRouter);

// BIEN — auth es publica, tareas es protegida
app.use('/api/auth', authRouter);
app.use('/api/tareas', authenticateToken, tareasRouter);
```

### Error 3: Guardar datos sensibles en el JWT
```javascript
// MAL — el JWT se puede decodificar
jwt.sign({ userId: '123', password: 'MiPass', creditCard: '4242...' }, secret);

// BIEN — solo datos de identidad
jwt.sign({ userId: '123', email: 'test@test.com', role: 'user' }, secret);
```

---

## El Flujo Completo Hasta Ahora

```
Request HTTP
  → [Helmet]            Headers de seguridad (Clase 4) ✅
  → [CORS]              Solo origenes permitidos (Clase 4) ✅
  → [Payload limit]     Max 10kb (Clase 4) ✅
  → [authenticateToken] Verificar JWT (Clase 5) ✅ ← NUEVO
  → [Handler]           Procesar request
  → MongoDB

Flujo de autenticacion:
  POST /register → Crear usuario (password hasheado con bcrypt)
  POST /login    → Verificar credenciales → Devolver JWT
  GET /tareas    → Verificar JWT → Si valido: datos / Si no: 401
```

---

## services/authGateway.js — Patron Service Layer

**Arquitectura**: Separamos la **logica de negocio** (Gateway) de las **rutas** (Router) y del **middleware** (Auth). Cada archivo tiene UNA responsabilidad.

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

async function register(email, password) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }
  const user = await User.create({ email, password });
  return { user };  // password se hashea en el pre-save hook
}

async function login(email, password) {
  // Mensaje IDENTICO si el email o password es incorrecto → No Information Disclosure
  const user = await User.findOne({ email });
  if (!user) { const e = new Error('Invalid credentials'); e.statusCode = 401; throw e; }

  const isValid = await user.comparePassword(password);
  if (!isValid) { const e = new Error('Invalid credentials'); e.statusCode = 401; throw e; }

  const token = generateToken(user);
  return { token, user };
}

module.exports = { generateToken, register, login };
```

---

## middleware/auth.js — El Guardian de las Rutas

Este middleware se ejecuta **ANTES** de cualquier ruta protegida. Sin token valido, no pasas.

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // 1. Extraer token del header "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Sin token → 401
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // 3. Verificar firma y expiracion
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // { userId, email, role }
    next();              // Token valido → continuar al handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authenticateToken;
```

> El `req.user` queda disponible para TODAS las rutas protegidas despues del middleware.

---

## Tarea — Implementar el Authentication Gateway

### Archivos a crear y modificar:

1. **Instalar dependencias**: `npm install jsonwebtoken bcrypt uuid`

2. **Crear 4 archivos nuevos**:
   - `src/models/user.model.js` — Modelo con bcrypt (visto en clase)
   - `src/services/authGateway.js` — Logica de register, login, generateToken
   - `src/routes/auth.js` — POST /register y POST /login
   - `src/middleware/auth.js` — Funcion `authenticateToken`

3. **Modificar 2 archivos**:
   - `src/app.js` — Conectar authRouter y authenticateToken
   - `.env` / `.env.example` — Agregar JWT_SECRET y JWT_EXPIRES_IN

---

## Tarea — Pruebas y Entrega

4. **Probar con curl** (las 4 pruebas de las slides anteriores):
   - Register → 201
   - Login → 200 + token
   - GET /tareas SIN token → 401
   - GET /tareas CON token → 200

5. **Captura de pantalla** de las 4 pruebas con curl


> Tienen el Gateway, el Middleware y el Modelo. Solo falta conectar las piezas.

---

## Preview: Clase 6

### Secure Token Management — JWT + Refresh Tokens

```
Problema actual:
  El token expira en 15 min → el usuario hace login cada 15 min?

Solucion Clase 6:
  Access Token (15 min) + Refresh Token (7 dias)
  POST /api/auth/refresh → Nuevo access token sin re-login

Nuevo servicio:
  src/services/tokenService.js ← Gestion centralizada de tokens
```

> Clase 6 resuelve la tension entre "expiracion corta" y "buena experiencia de usuario".

---

## Preguntas?

**Repositorio**: [todoApp](https://github.com/Cursos-Ing-Berny-Cardona/Seguridad-y-Arquitectura)

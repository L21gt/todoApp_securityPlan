---
marp: true
theme: default
paginate: true
class: lead
backgroundColor: #ffffff
---

# Clase 3: Threat Modeling con STRIDE
## Pensar como atacante ANTES de codificar

Ingeniero Berny Cardona

> *"Si no puedes enumerar las amenazas, no puedes defenderte de ellas."*

---

## Lo que Tenemos Hasta Ahora

En Clase 1 hicimos una **auditoria** → lista de vulnerabilidades.
En Clase 2 hicimos un **plan** → como arreglar cada una.

Pero hay un problema...

---

## El Problema: La Auditoria No Es Suficiente

La auditoria encontro **12 vulnerabilidades**.

Pero: solo encontramos lo que **ya existe**.

No responde preguntas como:
- Que pasa si agregamos un endpoint de login... que amenazas nuevas aparecen?
- Que pasa si compartimos tareas entre usuarios?
- Que atacante nos preocupa mas: un anonimo, un usuario registrado, o un admin malicioso?

> La auditoria mira el **presente**. El threat model mira el **futuro**.

---

## Que es un Threat Model

No es un documento bonito. Es un **ejercicio de pensar como atacante**.

```
1. Que estamos construyendo?     → Diagrama del sistema
2. Que puede salir mal?          → STRIDE (las 6 amenazas)
3. Que tan grave es?             → Priorizacion
4. Que hacemos al respecto?      → Mitigaciones
```

Hoy vamos a hacer los 4 pasos sobre la todoApp — **juntos, en vivo**.

---

# Paso 1: Que Estamos Construyendo
## Diagrama de Flujo de Datos (DFD)

---

## DFD de la todoApp

Son 3 componentes y los flujos entre ellos:

```
┌───────────┐    HTTP Request     ┌──────────────┐    Mongoose     ┌──────────┐
│           │  ────────────────► │              │  ────────────► │          │
│  Cliente  │                    │  Express App │                │ MongoDB  │
│  (curl /  │  ◄──────────────── │  (app.js +   │  ◄──────────── │ :27017   │
│  browser) │    HTTP Response   │   routes)    │    Results     │          │
└───────────┘                    └──────────────┘               └──────────┘
```

**Limite de confianza**: esta entre el Cliente y Express.

Todo lo que viene del cliente es **no confiable**.

---

## Dentro de Express: Que Hay Hoy

```
Request HTTP
     │
     ▼
┌─────────────────┐
│  express.json() │  ← Parsea body (sin limite de tamano)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Router          │  ← Decide que handler (sin auth)
│  /api/tareas     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Handler         │  ← Ejecuta logica (sin validacion)
│  (CRUD directo)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mongoose        │  ← Habla con MongoDB (sin auth en BD)
└─────────────────┘
```

**Cero controles de seguridad entre el request y la base de datos.**

---

# Paso 2: Que Puede Salir Mal
## STRIDE — Las 6 Amenazas

---

## STRIDE: La Unica Slide Teorica

No memoricen definiciones. Solo haganle **estas 6 preguntas** a cada componente:

| Letra | La pregunta |
|-------|------------|
| **S** — Spoofing | Alguien puede **hacerse pasar** por otro? |
| **T** — Tampering | Alguien puede **modificar datos** que no son suyos? |
| **R** — Repudiation | Alguien puede **negar** haber hecho algo? |
| **I** — Info Disclosure | Se **filtra** informacion que no deberia? |
| **D** — Denial of Service | Pueden **tumbar** el servicio? |
| **E** — Elevation of Privilege | Pueden **escalar permisos** y hacer cosas de admin? |

---

# Desafio STRIDE
## Ustedes son los atacantes. Yo muestro el codigo. Ustedes me dicen como atacarlo.

---

## Como Funciona

1. Yo muestro un **endpoint** con su codigo
2. Yo digo una **letra de STRIDE** (S, T, R, I, D, o E)
3. Ustedes me dicen:
   - **Aplica o no aplica?**
   - Si aplica: **como lo atacarian?** (el curl o la accion concreta)
   - **Que lo mitigaria?**
4. Si nadie responde... lo demuestro **en vivo**

> No hay respuestas incorrectas. Si dicen algo que no aplica, discutimos por que.

---

## Calentamiento: STRIDE en la Vida Real

Antes de la todoApp — algo que todos conocen.

**Escenario: el correo universitario (Gmail de la U)**

Yo digo la letra, ustedes me dan el ataque:

- **S** — Spoofing: como se hacen pasar por alguien?
- **T** — Tampering: como modifican algo que no es suyo?
- **R** — Repudiation: como niegan haber hecho algo?
- **I** — Info Disclosure: como filtran info privada?
- **D** — DoS: como tumban el servicio?
- **E** — Elevation: como escalan permisos?

---

## Calentamiento — Respuestas

| Amenaza | Ejemplo |
|---------|---------|
| **S** Spoofing | Enviar email haciendose pasar por el decano |
| **T** Tampering | Modificar la nota adjunta en el correo del profesor |
| **R** Repudiation | "Yo nunca envie ese correo ofensivo" |
| **I** Info Disclosure | El servidor expone la lista completa de emails del dominio |
| **D** DoS | Enviar 100,000 emails para saturar el servidor |
| **E** Elevation | Acceder al panel de admin del correo con credenciales por defecto |

---

# Ronda 1
## POST /api/tareas — Crear Tarea

---

## El Codigo

```javascript
router.post('/', async (req, res) => {
  try {
    const { title, completed } = req.body;
    const tarea = new Tarea({ title, completed });
    const nuevaTarea = await tarea.save();
    return res.status(201).json(nuevaTarea);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

Vamos letra por letra. Empezamos con la **S**.

**S — Spoofing**: alguien puede hacerse pasar por otro en este endpoint?

---

## POST — Todas las Respuestas

| Amenaza | Aplica? | Como se explota? | Que lo mitiga? |
|---------|---------|------------------|----------------|
| **S** | Si | No hay auth. `curl -X POST .../tareas -d '{"title":"spam"}'` — cualquiera crea tareas anonimamente. No se sabe quien las creo | JWT middleware |
| **T** | Si | `curl -d '{"title":"<script>alert(1)</script>", "admin":true}'` — inyecta XSS y campos extra (mass assignment) | Joi schema + whitelist de campos |
| **R** | Si | Crean 10,000 tareas spam. Sin logs, imposible rastrear quien fue | Audit log con userId + IP |
| **I** | Si | El catch expone `err.message` con internals de Mongoose (BD, modelo, tipos) | Error handler seguro |
| **D** | Si | `for i in $(seq 1 10000); do curl -X POST ... &; done` — sin rate limit, satura servidor y llena BD | Rate limiting |
| **E** | Si | Si body incluye `role:"admin"` y el modelo lo acepta → se auto-promueve | strict schema en Mongoose |

---

# Ronda 2
## GET /api/tareas — Listar Todas

---

## El Codigo

```javascript
router.get('/', async (req, res) => {
  try {
    const tareas = await Tarea.find();
    return res.json(tareas);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

**S — Spoofing**: aplica aqui?

Ahora la interesante: **I — Info Disclosure**. Que se filtra?

Y la que casi nadie ve: **D — DoS**. Como tumban el servidor con UN solo request a este endpoint?

---

## GET — Todas las Respuestas

| Amenaza | Aplica? | Como se explota? | Que lo mitiga? |
|---------|---------|------------------|----------------|
| **S** | Si | Cualquier anonimo lee todas las tareas de todos los usuarios | Auth requerido |
| **T** | Bajo | GET no modifica datos. Sin TLS, un MITM podria alterar la respuesta en transito | HTTPS |
| **R** | Si | Sin logs, no sabes quien consulto que datos ni cuando | Audit log |
| **I** | Si | `Tarea.find()` retorna TODAS las tareas de TODOS. Datos sensibles expuestos masivamente | Filtro por userId + seleccion de campos |
| **D** | Si | Si hay 1 millon de tareas, `find()` carga TODAS en memoria. **Un request** tumba el servidor | Paginacion + rate limiting |
| **E** | Bajo | Lectura no escala permisos, pero exponer datos ajenos es broken access control | RBAC |

> La **D** de este endpoint **no estaba en la auditoria** de la Clase 1. STRIDE la encontro.

---

# Ronda 3
## DELETE /api/tareas/:id — El Mas Peligroso

---

## El Codigo

```javascript
router.delete('/:id', async (req, res) => {
  try {
    const tarea = await Tarea.findByIdAndDelete(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea not found' });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

Este endpoint tiene **las 6 amenazas**. A ver si las encuentran todas.

**S**: como se hacen pasar por alguien aqui?
**T**: que datos modifican?
**I**: esta es sutil... que informacion filtra un DELETE que retorna 204 o 404?

---

## DELETE — Todas las Respuestas

| Amenaza | Aplica? | Como se explota? | Que lo mitiga? |
|---------|---------|------------------|----------------|
| **S** | Si | Cualquier anonimo borra cualquier tarea. Operacion destructiva, cero verificacion | JWT obligatorio |
| **T** | Si | Eliminar datos ajenos es tampering **irreversible**. No hay undo | Ownership check + soft delete |
| **R** | Si | Borran todas las tareas. Sin logs, cero auditoria forense | Audit log con detalle de lo eliminado |
| **I** | Si | **Enumeracion**: si retorna 204 → el ID existe. Si 404 → no existe. Pueden mapear todos los IDs validos | Retornar 404 tanto si no existe como si no es tuya |
| **D** | Si | Script que lista IDs y borra todo en segundos. Destruccion masiva | Rate limit + auth + ownership |
| **E** | Si | Sin roles, un usuario normal tiene poder de admin (borrar cualquier cosa) | RBAC: solo admin borra ajenas |

> La **I** (enumeracion de IDs) **tampoco estaba en la auditoria**. Otro hallazgo de STRIDE.

---

# Ronda 4
## PUT /api/tareas/:id — Actualizar

---

## El Codigo

```javascript
router.put('/:id', async (req, res) => {
  try {
    const { title, completed } = req.body;
    const tarea = await Tarea.findByIdAndUpdate(
      req.params.id, { title, completed }, { new: true }
    );
    if (!tarea) return res.status(404).json({ error: 'Tarea not found' });
    return res.json(tarea);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

**T — Tampering**: este tiene **triple amenaza**. Cuantas encuentran?

**D — DoS**: hay una forma de DoS que no hemos visto en otros endpoints. Cual es?

---

## PUT — Todas las Respuestas

| Amenaza | Aplica? | Como se explota? | Que lo mitiga? |
|---------|---------|------------------|----------------|
| **S** | Si | Sin auth, cualquiera modifica cualquier tarea | JWT |
| **T** | Si | **Triple**: (1) Modificar tarea ajena — IDOR. (2) Inyectar `<script>` en title — XSS. (3) Enviar campos extra como `userId` o `role` | Ownership + Joi + whitelist |
| **R** | Si | Cambian tu tarea a contenido ofensivo. Sin logs, no sabes quien fue | Audit log con before/after |
| **I** | Si | Error en ID invalido expone internals de Mongoose | Error handler |
| **D** | Si | **Body de 100MB** sin limite de payload. `express.json()` sin `limit` acepta cualquier tamano | `express.json({ limit: '10kb' })` |
| **E** | Si | Si body incluye `userId:"otro"` o `role:"admin"` → escalada | Whitelist de campos actualizables |

> La **D** por payload grande: otro hallazgo que **no estaba en la auditoria**.

---

# Ronda 5
## MongoDB — El Componente que Todos Olvidan

---

## La Conexion Directa

```
┌──────────────┐    Sin auth    ┌──────────┐
│  Express App │  ──────────►  │ MongoDB  │
│              │  ◄──────────  │  :27017  │
└──────────────┘               └──────────┘
```

No es un endpoint de la API. Es la **base de datos directamente**.

Apliquen STRIDE:
- **S**: quien puede conectarse?
- **T**: que pueden modificar?
- **D**: cual es el peor comando que pueden ejecutar?

---

## MongoDB — Demo en Vivo

```bash
# Conectarse directamente a MongoDB (sin password)
mongosh mongodb://localhost:27017/todo_app

# Leer TODA la data
db.tareas.find()

# Contar registros
db.tareas.countDocuments()

# Borrar TODO (NO lo voy a ejecutar, pero se puede)
# db.dropDatabase()
```

Las **6 amenazas STRIDE aplican**. Un atacante con acceso a la red ni siquiera necesita la API.

---

# Ronda Bonus
## Un Endpoint que AUN NO EXISTE

---

## POST /api/auth/login (futuro, Clase 5)

Este endpoint **no existe todavia**. Pero STRIDE ya nos dice que amenazas va a tener:

- **S**: brute force de passwords (probar miles de combinaciones)
- **T**: manipular el token JWT que reciben
- **R**: "yo nunca hice login a las 3am" — sin log, no se puede probar
- **I**: el error dice "usuario no encontrado" vs "password incorrecta"? → **user enumeration**
- **D**: 10,000 intentos de login por segundo → rate limit obligatorio
- **E**: pedir un token con `role: "admin"` en el body

> **Eso es threat modeling**: pensar en amenazas ANTES de que el codigo exista.

---

# Paso 3: Que Tan Grave Es
## Priorizar las Amenazas

---

## No Todas las Amenazas Son Iguales

Matriz de priorizacion:

```
              Impacto
         Bajo    │    Alto
        ─────────┼──────────
  Alta  │ Media  │ CRITICA  │
Prob.   │────────┼──────────│
  Baja  │ Baja   │  Alta    │
        ─────────┴──────────
```

Diganme: de todo lo que encontramos hoy, cual es el **Top 3 mas critico**?

Pista: probabilidad Alta = "solo necesito curl, no necesito ser hacker"

---

## Priorizacion: Resultado

| Amenaza | Probabilidad | Impacto | Prioridad |
|---------|-------------|---------|-----------|
| Spoofing (sin auth) | Alta | Alto | **Critica** |
| Tampering (IDOR + XSS) | Alta | Alto | **Critica** |
| DoS (sin rate limit + sin paginacion) | Alta | Alto | **Critica** |
| Elevation (mass assign) | Media | Alto | **Alta** |
| Info Disclosure (errores + enumeracion) | Alta | Medio | **Alta** |
| Repudiation (sin logs) | Media | Medio | **Media** |

---

# Paso 4: Que Hacemos al Respecto
## Conectar STRIDE con el Plan de Remediacion

---

## Cada Amenaza Ya Tiene Solucion

| Amenaza STRIDE | Vulnerabilidad del Plan | Clase |
|---------------|------------------------|-------|
| Spoofing | #1 Sin autenticacion | 5-6 |
| Tampering (IDOR) | #2 IDOR | 11 |
| Tampering (XSS) | #3 Acepta `<script>` | 13 |
| Repudiation | #10 Sin audit logs | 15 |
| Info Disclosure | #4 `err.message` expuesto | 16 |
| DoS | #5 Sin rate limiting | 17 |
| Elevation | #7 Mass assignment | 13 |

> La auditoria dice **que** esta roto. El plan dice **como** arreglarlo. STRIDE dice **por que un atacante lo explotaria**.

---

## Pero STRIDE Encontro Cosas Nuevas

La auditoria encontro 12 vulnerabilidades que **ya existian**.

STRIDE encontro amenazas **adicionales**:
- DoS por falta de **paginacion** en GET (1 request tumba el servidor)
- **Enumeracion de IDs** en DELETE (204 vs 404 revela que existe)
- DoS por **payload sin limite** en PUT (body de 100MB)
- Amenazas en un endpoint que **aun no existe** (login)

> STRIDE piensa en **escenarios de ataque**, no solo en configuraciones.
> Por eso se usa **antes de codificar** cada feature nuevo.

---

## Los Tres Documentos Se Conectan

```
Tarea 1: Auditoria         → Que vulnerabilidades existen?
Tarea 2: Plan Remediacion  → Como las arreglamos?
Tarea 3: Threat Model      → Por que un atacante las explotaria?
                              Que tan grave es cada una?
                              Que nos estamos perdiendo?
```

---

## Preview: Clase 4

### Zero Trust — Empezamos a Codificar

```bash
npm install helmet cors dotenv
mkdir -p src/middleware src/services src/security src/errors
```

- Primer codigo de seguridad real
- Configurar Helmet, CORS, variables de entorno
- Disenar la arquitectura de middlewares

> Se acabo el analisis. Clase 4 = primera linea de codigo seguro.

---

## Preguntas?

**Repositorio**: [todoApp](https://github.com/BernyCR96/todoApp)

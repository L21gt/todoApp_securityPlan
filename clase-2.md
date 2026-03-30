---
marp: true
theme: default
paginate: true
class: lead
backgroundColor: #ffffff
---

# Patrones de Diseño Orientados a la Seguridad
## Clase 2: Los 7 Principios de Diseño Seguro

Ingeniero Berny Cardona

> *"No se puede parchear un diseño roto. Hay que diseñarlo bien desde el inicio."*

---

## Agenda

1. Los **7 principios** de diseño seguro
2. Mapeo: vulnerabilidades → principios
3. Demo en vivo: construyendo el **Plan de Remediación**

---

# Revisión de la Tarea
## ¿Qué encontraron en la todoApp?

---

## Hallazgos: Vulnerabilidades Críticas 🔴

| # | Vulnerabilidad | Endpoint | OWASP |
|---|---------------|----------|-------|
| 1 | Sin autenticación en ningún endpoint | Todos | A07 |
| 2 | Cualquiera borra/modifica tareas ajenas | PUT, DELETE `/:id` | A01 |
| 3 | Acepta `<script>` como título (XSS) | POST, PUT | A03 |
| 4 | Errores exponen internals de Mongoose | GET `/:id` | A04 |

---

## Hallazgos: Altas y Medias 🟠🟡

| # | Vulnerabilidad | OWASP |
|---|---------------|-------|
| 5 | Sin rate limiting — DoS trivial | A04 |
| 6 | MongoDB sin autenticación | A05 |
| 7 | Mass assignment sin restricción | A04 |
| 8 | Sin CORS configurado | A05 |
| 9 | Sin headers de seguridad (Helmet) | A05 |
| 10 | Sin audit logs | A09 |
| 11 | Sin HTTPS | A02 |
| 12 | Connection string hardcodeada | A05 |

---

## ¿Por Qué Existen Todas Estas Fallas?

```javascript
// app.js — sin nada entre el request y la BD
app.use(express.json());
app.use('/api/tareas', tareasRouter);
```

```javascript
// server.js — sin auth, hardcodeado
mongoose.connect('mongodb://localhost:27017/todo_app')
```

La app **funciona perfectamente**.
Fue diseñada pensando en *que funcione*, no en *quién puede hacer qué*.

> Cada vulnerabilidad existe porque se violó al menos uno de los **7 principios de diseño seguro**.

---

# Los 7 Principios de Diseño Seguro

> Estos principios los usan Google, Microsoft y el NIST para auditar sistemas.

---

## Principio 1: Menor Privilegio

> Cada componente debe tener **exactamente** los permisos que necesita. Ni uno más.

**Analogía**: Un médico de urgencias accede al historial del paciente que atiende. No al de todos los pacientes del hospital.

**Violación en la todoApp**:
```bash
# Cualquier request anónimo puede borrar cualquier tarea
curl -X DELETE http://localhost:3000/api/tareas/<id-ajeno>
# → 204 No Content. Sin preguntar quién eres.
```

---

## Principio 1: Cómo Debería Ser

```
Anónimo   → No puede hacer nada
Usuario A → Solo CRUD en SUS tareas
Usuario B → Solo CRUD en SUS tareas
Admin     → CRUD en todas las tareas
```

El sistema debe saber **quién eres** y **qué es tuyo** antes de dejar pasar cualquier operación.

---

## Principio 2: Defensa en Profundidad

> Múltiples capas de controles independientes. Si una falla, las demás siguen protegiendo.

**Analogía**: Un banco no tiene solo la puerta con llave. Tiene guardia + cámara + alarma + caja fuerte. Si el ladrón pasa la primera capa, todavía tiene cinco más.

**Estado actual de la todoApp**:
```
Cliente → [NADA] → Express → [NADA] → MongoDB
```

**Cero capas.** El que llega a la API tiene acceso total.

---

## Principio 2: Las Capas que Faltan

```
Capa 1: Rate Limiting / WAF        → Clase 17
Capa 2: Autenticación (JWT)        → Clase 5-6
Capa 3: Autorización (ownership)   → Clase 9-11
Capa 4: Validación de input        → Clase 13
Capa 5: Sanitización de output     → Clase 13
Capa 6: Base de datos con auth     → Clase 12
Capa 7: Audit logging              → Clase 15
```

> Cada clase del curso agrega **una capa**. Hoy analizamos la ausencia de todas.

---

## Principio 3: Fail Secure

> Al fallar, el comportamiento por defecto es **denegar** y **no revelar** información interna.

```bash
curl http://localhost:3000/api/tareas/id-invalido
```

```json
{
  "error": "Cast to ObjectId failed for value \"id-invalido\"
            (type string) at path \"_id\" for model \"Tarea\""
}
```

Ese error revela: base de datos **MongoDB**, ORM **Mongoose**, nombre del modelo, tipo de dato esperado.

---

## Principio 3: La Regla de Oro

**El código que lo causa**:
```javascript
} catch (err) {
  return res.status(500).json({ error: err.message }); // ← expone todo
}
```

**La regla**:
```
Logs internos  → todo el detalle  (para el equipo)
Respuesta HTTP → mínima info      (el atacante también la lee)
```

---

## Principio 4: Separación de Responsabilidades

> Ningún componente debe tener control total sobre una operación. Las responsabilidades se distribuyen.

**Violación**: cada ruta de la todoApp hace todo sola, sin capas:

```javascript
router.delete('/:id', async (req, res) => {
  // Sin verificar quién eres       ← auth
  // Sin verificar si es tuya       ← authz
  // Sin registrar quién borró      ← audit
  const tarea = await Tarea.findByIdAndDelete(req.params.id);
  return res.status(204).send();
});
```

**4 fallas en 5 líneas.**

---

## Principio 4: Cómo Debería Verse

```
request
  → [auth middleware]   ← solo verifica identidad
  → [authz middleware]  ← solo verifica permisos
  → [validación]        ← solo verifica el input
  → [lógica]            ← solo ejecuta la operación
  → [audit]             ← solo registra lo que pasó
```

Cada capa tiene **una sola responsabilidad**. Se puede probar y cambiar de forma independiente.

---

## Principio 5: Economía de Mecanismo

> Los mecanismos de seguridad deben ser lo más simples posible. Complejidad = más superficie de ataque.

**Aplicación práctica**: no reinventar la rueda.

| En vez de... | Usar... |
|-------------|---------|
| Hash de passwords propio | `bcrypt` / `argon2` |
| Sistema de tokens propio | `jsonwebtoken` |
| Headers manuales | `Helmet` |
| Validación propia | `Joi` |

> Una librería auditada por miles de personas es más segura que 300 líneas de crypto custom.

---

## Principio 6: Zero Trust

> No confiar en ninguna entidad por defecto. Cada request se autentica y autoriza individualmente.

**Modelo antiguo (Castle & Moat)**:
```
Internet → [Firewall] → Red interna (TODO confiable ✅)
```
Si el atacante entra, tiene acceso a **todo**.

**Zero Trust**:
```
Cualquier request → ¿Token válido?  → No → 401
                  → ¿Sin expirar?   → No → 401
                  → ¿Con permiso?   → No → 403
                  → ¿Es su tarea?   → No → 404
                  → ✅ Procesado
```

---

## Principio 6: Estado de la todoApp

**Modelo actual**:
```
Cualquier request → ✅ Bienvenido, haz lo que quieras
```

Es peor que Castle & Moat. Es **campo abierto**.

Un atacante necesita pasar **todos** los checkpoints de Zero Trust.
Actualmente no necesita pasar **ninguno**.

---

## Principio 7: Seguro por Defecto

> La configuración por defecto debe ser la más restrictiva. Se abre solo lo necesario, con razón explícita.

**Violaciones en la todoApp**:
```javascript
// Sin Helmet → sin ningún header de seguridad
app.use(express.json());       // sin límite de payload

// Sin autenticación en MongoDB
mongoose.connect('mongodb://localhost:27017/todo_app')
```

**Cómo debería ser**:
```javascript
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
```

> El estado inicial es **"todo cerrado"**. Se abre con razón documentada.

---

## Los 7 Principios: Resumen

| # | Principio | Violación en todoApp |
|---|-----------|---------------------|
| 1 | Menor Privilegio | Cualquiera hace todo |
| 2 | Defensa en Profundidad | 0 capas de seguridad |
| 3 | Fail Secure | `err.message` expuesto al cliente |
| 4 | Separación de Responsabilidades | Rutas hacen todo solas |
| 5 | Keep It Simple | N/A — oportunidad al implementar |
| 6 | Zero Trust | Sin ninguna verificación |
| 7 | Seguro por Defecto | Sin Helmet, CORS, ni límites |

---

## Vulnerabilidades → Principios

| Vulnerabilidad | OWASP | Principio(s) |
|---------------|-------|--------------|
| Sin autenticación | A07 | Zero Trust + Defensa Prof. |
| IDOR / Sin ownership | A01 | Menor Privilegio + Zero Trust |
| Acepta `<script>` | A03 | Fail Secure + Sep. Responsab. |
| `err.message` expuesto | A04 | Fail Secure |
| Sin rate limiting | A04 | Defensa en Profundidad |
| MongoDB sin auth | A05 | Seguro por Defecto |
| Mass assignment | A04 | Sep. Responsab. + Menor Priv. |
| Sin CORS / Helmet | A05 | Seguro por Defecto |
| Sin audit logs | A09 | Separación de Responsabilidades |

> Una falla puede violar **varios principios** a la vez — se refuerzan mutuamente.

---

# Demo en Vivo
## Construyendo el Plan de Remediación

---

## ¿Qué es un Plan de Remediación?

Convierte la lista de vulnerabilidades en un plan de acción:

```
Vulnerabilidad encontrada
        ↓
¿Qué principio viola?
        ↓
¿Qué tan grave es?
        ↓
¿Cómo se soluciona? (específico)
        ↓
¿En qué clase se implementa?
```

---

## Estructura: PLAN-REMEDIACION.md

```markdown
# Plan de Remediación — todoApp

## Resumen ejecutivo
[Estado actual y objetivo]

## Tabla de vulnerabilidades

| # | Vulnerabilidad | Severidad | Principio | Solución | Clase |
|---|---------------|-----------|-----------|---------|-------|
| 1 | Sin auth | 🔴 Crítica | Zero Trust | JWT middleware en todas las rutas | 5 |
| 2 | IDOR | 🔴 Crítica | Menor Privilegio | `findOne({ _id, userId })` | 11 |
...
```

---

## Soluciones: Vagas vs Concretas

❌ **Vago**:
```
"Agregar validación al input"
```

✅ **Concreto**:
```
"Schema Joi en POST /api/tareas que rechace campos no definidos,
valide que `title` sea string de 3-200 caracteres, y rechace HTML.
Retornar 422 con mensajes por campo en vez de 500."
```

> La solución debe ser implementable por alguien que solo lea el documento.

---

## Tarea: Completar el Plan de Remediación

Archivo: `docs/PLAN-REMEDIACION.md` en tu fork de la todoApp.

### Requisitos:
1. Las 12 vulnerabilidades de la lista (+ las extras que hayas encontrado)
2. Para cada una: severidad justificada + principio + solución concreta + clase
3. **Sección Impacto**: para la vuln más crítica que encontraste, un párrafo con:
   - ¿Qué atacante se aprovecharía? ¿Qué daño causaría en un sistema real?
   - ¿Cómo el principio elegido lo previene estructuralmente?

---

## Preview: Clase 3

### Threat Modeling con STRIDE

¿Cómo pensar en amenazas **antes** de codificar?

| Letra | Amenaza |
|-------|---------|
| **S** | Spoofing — ¿alguien puede hacerse pasar por otro? |
| **T** | Tampering — ¿pueden modificar datos ajenos? |
| **R** | Repudiation — ¿pueden negar haber hecho algo? |
| **I** | Information Disclosure — ¿se filtra info privada? |
| **D** | Denial of Service — ¿pueden tumbar el servicio? |
| **E** | Elevation of Privilege — ¿pueden escalar permisos? |

---

## Para la Próxima Clase

### Tarea:
Completar `docs/PLAN-REMEDIACION.md` (ver slide anterior)

### Para prepararte para Clase 3:
Piensa en cuál de las 6 amenazas STRIDE aplica a cada endpoint de la todoApp.

```
POST   /api/tareas   → ¿Cuáles de S, T, R, I, D, E aplican?
GET    /api/tareas   → ¿Y aquí?
DELETE /api/tareas/:id → ¿Y aquí?
```

---

## Reflexión Final

> *"Una lista de vulnerabilidades sin un plan es solo una lista de problemas.*
> *Un plan de remediación es el inicio de la solución."*

### Al diseñar tu próxima feature, pregúntate:
- ¿Estoy aplicando **menor privilegio**?
- ¿Tengo **múltiples capas** de protección?
- ¿El sistema **falla de forma segura**?

---

## ¿Preguntas? 🤔

**Repositorio**: [todoApp](https://github.com/BernyCR96/todoApp)

**Próxima clase**: Threat Modeling con STRIDE

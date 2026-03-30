---
marp: true
theme: default
paginate: true
class: lead
backgroundColor: #ffffff
---

# Patrones de Diseño Orientados a la Seguridad
## Security by Design

Ingeniero Berny Cardona

> *"La seguridad no es una feature que se agrega al final. Es una propiedad emergente de un sistema bien diseñado."*

---

## Herramientas del Curso 🛠️

### Usaremos:
- **Node.js + Express** (API principal)
- **MongoDB + Mongoose** (base de datos)
- **Docker y Docker Compose** (infraestructura)
- **Redis** (sesiones y rate limiting)
- Burp Suite Community / OWASP ZAP
- Git con **branches por clase**

---

### Proyecto: todoApp
```
todoApp/
├── src/
│   ├── app.js          ← Express config
│   ├── server.js       ← Entry point
│   ├── models/         ← Mongoose models
│   └── routes/         ← API endpoints
├── docker-compose.yml
└── package.json
```

![bg right:40% width:400px](https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif)

---

# CLASE 1
## Security by Design: El Cambio de Mentalidad

![bg left:40% width:400px](https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif)

---

## Objetivos

Al terminar esta clase serás capaz de:
1. Explicar por qué la seguridad debe ser parte del **diseño**
2. **Auditar una API real** e identificar vulnerabilidades
3. Conocer el **OWASP Top 10 2025**
4. Analizar casos reales de brechas
5. Explotar vulnerabilidades en la **todoApp**  

[Respositorio TodoAPP](https://github.com/BernyCR96/todoApp)

---

## Caso 1: API de Banco Vulnerable 🏦

### Sistema diseñado sin seguridad:
```javascript
// API Endpoint vulnerable
GET /api/user/{id}/balance

Ejemplos:
GET /api/user/1234/balance → Mi balance ✅
GET /api/user/1235/balance → Balance de OTRO ❌
```

---

## API Banco: El Problema IDOR

### IDOR: Insecure Direct Object Reference

- No verifica **quién** hace la petición
- Confianza ciega en el parámetro `{id}`
- Falta de **autorización** en el diseño

![bg right:30% width:280px](https://media.giphy.com/media/l0HlSHz7I9NConXqM/giphy.gif)

---

## ¿Por Qué Ocurren Estas Fallas?

### Razones comunes:
1. **Presión de tiempo**: "Lo arreglamos después"
2. **Falta de conocimiento**: No conocen los patrones
3. **Asumir confianza**: "Nuestros usuarios no harían eso"
4. **Seguridad como afterthought**
5. **No hacer threat modeling**

---

## OWASP Top 10 - 2025 🔝

### Top 5 más críticas:
1. **Broken Access Control** ⚠️
2. **Cryptographic Failures**
3. **Injection**
4. **Insecure Design** 👈
5. **Security Misconfiguration**

![bg right:40% width:400px](https://media.giphy.com/media/3o7aD2d7hy9ktXNDP2/giphy.gif)

---

## OWASP Top 10 - 2025 (cont.)

### Del 6 al 10:
6. **Vulnerable Components**
7. **Authentication Failures**
8. **Data Integrity Failures**
9. **Logging/Monitoring Failures**
10. **Server-Side Request Forgery**

---

## #1 - Broken Access Control 🚨

### ¿Qué es?
Usuarios acceden a recursos que **no deberían**.

### Ejemplos:
```javascript
// Usuario normal accede a admin
DELETE /api/users/5 → ¡Elimina usuario!

// Usuario A accede a datos de B
GET /api/orders?userId=123 → userId=456
```

---

## Broken Access Control: Causas

### Causa raíz:
- ❌ No se diseñó autorización adecuada
- ❌ No verificar permisos en cada operación
- ❌ Confiar en datos del cliente

![bg right:40% width:400px](https://media.giphy.com/media/xUOwGpaKq5xjHNz8Bi/giphy.gif)

---

## #4 - Insecure Design 🏗️

### ¿Qué es?
Fallas en la **arquitectura y diseño** del sistema.

### No es un bug de código:
- Falta de threat modeling
- No aplicar principios de seguridad
- Arquitectura sin controles

---

## Insecure Design: Ejemplo

### Sistema de recuperación de contraseña:
```
1. Usuario ingresa email
2. Sistema: "¿Cuál es tu color favorito?"
3. Usuario responde correctamente
4. ¡Acceso concedido!
```

### Problema:
Respuesta fácil de adivinar → **FALLA DE DISEÑO**

---

## #3 - Injection Attacks 💉

### ¿Qué es?
Entrada del usuario se ejecuta como **código**.

### SQL Injection:
```javascript
// Código vulnerable
const query = `SELECT * FROM users
               WHERE email = '${email}'`;
```

---

## SQL Injection: El Ataque

```javascript
// Ataque
email = "' OR '1'='1"

// Query resultante:
SELECT * FROM users
WHERE email = '' OR '1'='1'
→ ¡Retorna TODOS los usuarios!
```

![bg right:40% width:400px](https://media.giphy.com/media/3knKct3fGqxhK/giphy.gif)

---

## Injection: Prevención desde Diseño

### Soluciones:
✅ Usar **prepared statements** siempre
✅ Validar y sanitizar input
✅ Principio de **menor privilegio** en BD

```javascript
// SEGURO
const query = 'SELECT * FROM users WHERE email = ?';
const user = await db.query(query, [email]);
```

---

## Demostración: Sistema Vulnerable 🔴

### Nuestra todoApp tiene CERO seguridad:

1. **Sin autenticación** - cualquiera usa la API
2. **Sin validación** - acepta cualquier input
3. **Sin rate limiting** - se puede bombardear
4. **Errores expuestos** - muestra info interna

### Herramienta: curl + Postman

![bg right:35% width:350px](https://media.giphy.com/media/RyXVu4ZW454IM/giphy.gif)

---

## Demo 1: Sin Autenticación 🔓

### Cualquiera puede crear tareas:
```bash
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"title": "Tarea anónima sin login"}'
```

### Cualquiera puede ELIMINAR tareas:
```bash
curl -X DELETE http://localhost:3000/api/tareas/<id>
```

💥 **No hay login, no hay tokens, no hay nada**

---

## Demo 2: Sin Validación de Input 💉

### La API acepta literalmente CUALQUIER cosa:
```bash
# Inyectar HTML/scripts
curl -X POST http://localhost:3000/api/tareas \
  -d '{"title": "<script>alert(document.cookie)</script>"}'

# Datos inválidos que no deberían pasar
curl -X POST http://localhost:3000/api/tareas \
  -d '{"title": "", "completed": "no-es-boolean", "admin": true}'
```

¿Qué pasa con campos extra como `admin: true`? 🤔

---

## Demo 3: Sin Rate Limiting 💣

### Se puede bombardear el servidor:
```bash
# 1000 requests simultáneos
for i in $(seq 1 1000); do
  curl -s http://localhost:3000/api/tareas > /dev/null &
done
```

### Brute force posible:
- Sin límite de intentos de login (si hubiera login)
- DoS trivial

---

## Demo 4: Errores Exponen Info Interna ⚠️

### Código actual de la todoApp:
```javascript
catch (err) {
  return res.status(500).json({ error: err.message });
  // ¡Expone mensajes internos de Mongoose/MongoDB!
}
```

### Probar:
```bash
curl http://localhost:3000/api/tareas/id-invalido
# Respuesta: error con detalles internos del servidor
```

---

## Security by Design: 7 Principios 🏛️

1. **Menor Privilegio**
2. **Defensa en Profundidad**
3. **Fallar de Forma Segura**
4. **Separación de Responsabilidades**
5. **Zero Trust**
6. **Seguro por Defecto**
7. **Mantener Simple**

> *Los veremos en detalle en la Clase 2*

---

## Principio 1: Menor Privilegio

### ❌ Mal Diseño:
```javascript
// Servicio de reportes con acceso total
const db = await connectDB({
  user: 'root',
  permissions: ['SELECT', 'INSERT',
                'UPDATE', 'DELETE', 'DROP']
});
```

---

## Principio 1: Menor Privilegio (2)

### ✅ Buen Diseño:
```javascript
// Servicio de reportes con mínimo acceso
const db = await connectDB({
  user: 'reports_readonly',
  permissions: ['SELECT'],
  tables: ['orders', 'products']
});
```

**Beneficio**: Si es comprometido, no puede destruir datos

---

## Principio 5: Zero Trust

### Modelo Tradicional (Perimetral):
```
Internet → Firewall →
  Red Interna (TODO CONFIABLE ❌)
```

### Problema:
Si un atacante entra, tiene acceso a **todo**

---

## Principio 5: Zero Trust (2)

### Zero Trust:
```
Internet → Gateway → Service A
  → ¿Autenticado? ✅
  → ¿Autorizado? ✅
  → ¿Token válido? ✅
```

**Verificar en cada punto, sin excepciones**

![bg right:30% width:280px](https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif)

---

## Práctica 1: Auditaría de la todoApp 🛠️

### La misión: (10 minutos)

1. **Clonar y ejecutar la todoApp**:

[Respositorio TodoAPP](https://github.com/BernyCR96/todoApp)

```bash
cd todoApp
npm install
docker compose up -d  # Levantar MongoDB
npm start
```

2. **Probar cada endpoint** con curl o Postman
3. **Documentar vulnerabilidades** encontradas

![bg left:30% width:280px](https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif)

---

## Práctica 1: Endpoints a Auditar

```
POST   /api/tareas          → Crear tarea
GET    /api/tareas           → Listar todas
GET    /api/tareas/:id       → Ver una tarea
PUT    /api/tareas/:id       → Actualizar
DELETE /api/tareas/:id       → Eliminar
```

### Para cada endpoint, preguntarte:
- ¿Quién puede acceder? (autenticación)
- ¿Verifica permisos? (autorización)
- ¿Valida los datos de entrada?
- ¿Qué pasa si envío datos malícious?
- ¿Qué info expone el error?

---

## Práctica 1: Template de Auditoría

### Para cada vulnerabilidad encontrada:

```markdown
## Vulnerabilidad #1: [Nombre]
- **Severidad**: Crítica / Alta / Media / Baja
- **OWASP**: A01 / A02 / A03 / ...
- **Endpoint afectado**: POST /api/tareas
- **Descripción**: ...
- **Cómo explotar**: curl -X POST ...
- **Impacto**: ...
- **Remediación propuesta**: ...
```

**Meta: encontrar mínimo 10 vulnerabilidades**

---

## Recursos Recomendados 📚

### Lectura Obligatoria:
- 📖 OWASP Top 10 2025
- 📖 OWASP Secure Design Principles

### Complementaria:
- 📖 "Threat Modeling" - Adam Shostack
- 🌐 [OWASP Secure by Design](https://owasp.org)


---

## Próxima Clase

### Clase 2: Principios de Diseño Seguro

**Prepárate para:**
- Los 7 principios en profundidad
- **Plan de remediación** para la todoApp
- Mapear cada vulnerabilidad a un principio

---

## Reflexión Final

> *"El mejor hack es el que nunca sucede*
> *porque el sistema fue diseñado correctamente*
> *desde el principio."*

### Recuerda:
- Seguridad es un **requisito**
- Diseñar es **100x más barato** que remediar
- Tú eres **responsable** de la seguridad

---

## ¿Preguntas? 🤔

![bg right:50% width:500px](https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif)

---

## ¡Nos Vemos en la Próxima Clase!

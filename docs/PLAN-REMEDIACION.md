# Plan de Remediación - todoApp

## Resumen ejecutivo

El presente Plan de Remediación tiene como objetivo establecer una hoja de ruta accionable para mitigar las vulnerabilidades descubiertas en la API REST TodoApp. Actualmente, la aplicación carece de controles de seguridad fundamentales, exponiendo tanto la base de datos como a los usuarios finales. Este plan transforma esos hallazgos en tareas de desarrollo específicas, priorizando la autenticación, la autorización y la sanitización de datos, alineándose con los 7 Principios de Diseño Seguro.

## Tabla de vulnerabilidades

| #   | Vulnerabilidad                       | Severidad | Principio                       | Solución                         | Clase    |
| --- | ------------------------------------ | --------- | ------------------------------- | -------------------------------- | -------- |
| 1   | Sin autenticación en ningún endpoint | Crítica   | Zero Trust                      | Middleware JWT global            | Clase 3  |
| 2   | IDOR - modifica/borra tareas ajenas  | Alta      | Menor Privilegio                | Validar `req.user.id`            | Clase 4  |
| 3   | Acepta `<script>` como título (XSS)  | Alta      | Defensa en Profundidad          | Sanitización con Joi             | Clase 5  |
| 4   | `err.message` expuesto al cliente    | Media     | Fail Secure                     | Middleware global de errores     | Clase 6  |
| 5   | Sin rate limiting - DoS trivial      | Media     | Defensa en Profundidad          | Implementar `express-rate-limit` | Clase 7  |
| 6   | MongoDB sin autenticación            | Alta      | Seguro por Defecto              | Habilitar Auth en BD             | Clase 8  |
| 7   | Mass assignment sin restricción      | Media     | Menor Privilegio                | Filtrar `req.body`               | Clase 5  |
| 8   | Sin CORS configurado                 | Media     | Seguro por Defecto              | Middleware CORS restrictivo      | Clase 7  |
| 9   | Sin headers de seguridad (Helmet)    | Media     | Economía de Mecanismo           | Usar paquete `helmet`            | Clase 7  |
| 10  | Sin audit logs                       | Baja      | Defensa en Profundidad          | Implementar Morgan/Winston       | Clase 9  |
| 11  | Sin HTTPS                            | Alta      | Seguro por Defecto              | Proxy reverso con TLS            | Clase 10 |
| 12  | Connection string hardcodeada        | Alta      | Separación de Responsabilidades | Usar variables `.env`            | Clase 2  |

---

## Detalle de vulnerabilidades

### Vulnerabilidad #1: Sin autenticación en ningún endpoint

- **Severidad**: Crítica
- **OWASP**: A07 Identification and Authentication Failures
- **Principio violado**: Zero Trust (¿Verifica cada request?)
- **Descripción**: La API no verifica quién realiza la petición, permitiendo acceso anónimo total.
- **Solución concreta**: Implementar estrategia de autenticación con `jsonwebtoken`. Crear un middleware `verifyToken` que extraiga el JWT del header `Authorization`, lo valide y asigne el payload a `req.user`. Aplicar este middleware a todas las rutas de `/api/tareas`.
- **Clase del curso**: Clase 3

### Vulnerabilidad #2: IDOR - modifica/borra tareas ajenas

- **Severidad**: Alta
- **OWASP**: A01 Broken Access Control
- **Principio violado**: Menor Privilegio (¿Quién puede hacer qué?)
- **Descripción**: Un usuario autenticado puede predecir el ID de otra tarea y modificarla o borrarla porque no se verifica la propiedad del recurso.
- **Solución concreta**: En los controladores de PUT y DELETE, modificar la consulta de la base de datos para requerir que el documento coincida con el `_id` de la tarea Y el `userId` extraído del token (`req.user.id`). Si no coincide, retornar HTTP 403 Forbidden.
- **Clase del curso**: Clase 4

### Vulnerabilidad #3: Acepta `<script>` como título (XSS)

- **Severidad**: Alta
- **OWASP**: A03 Injection
- **Principio violado**: Defensa en Profundidad (¿Cuántas capas de protección hay?)
- **Descripción**: Ingesta de datos maliciosos que pueden ejecutarse en el navegador de los usuarios.
- **Solución concreta**: Implementar un Schema de Joi en POST/PUT `/api/tareas` que valide que `title` sea un string alfanumérico estricto, escape caracteres HTML y rechace campos no definidos. Retornar HTTP 422 si falla.
- **Clase del curso**: Clase 5

### Vulnerabilidad #4: `err.message` expuesto al cliente

- **Severidad**: Media
- **OWASP**: A04 Insecure Design
- **Principio violado**: Fail Secure (¿Qué pasa cuando algo falla?)
- **Descripción**: Las excepciones internas revelan información de la base de datos y el stack tecnológico.
- **Solución concreta**: Crear un middleware de manejo de errores global (signature `(err, req, res, next)`) al final de `app.js` que registre el `err.message` en consola pero retorne un JSON genérico `{"error": "Internal Server Error"}` con código HTTP 500 en entornos de producción.
- **Clase del curso**: Clase 6

### Vulnerabilidad #5: Sin rate limiting - DoS trivial

- **Severidad**: Media
- **OWASP**: A04 Insecure Design
- **Principio violado**: Defensa en Profundidad
- **Descripción**: Un atacante puede agotar los recursos del servidor enviando miles de peticiones automatizadas.
- **Solución concreta**: Instalar el paquete `express-rate-limit`. Configurar un limitador global de 100 peticiones por ventana de 15 minutos por IP. Retornar HTTP 429 Too Many Requests cuando se exceda el límite.
- **Clase del curso**: Clase 7

### Vulnerabilidad #6: MongoDB sin autenticación

- **Severidad**: Alta
- **OWASP**: A05 Security Misconfiguration
- **Principio violado**: Seguro por Defecto (¿El default es restrictivo?)
- **Descripción**: La base de datos es accesible sin credenciales, exponiendo todos los datos si el puerto se expone.
- **Solución concreta**: Modificar el `docker-compose.yml` para incluir las variables de entorno `MONGO_INITDB_ROOT_USERNAME` y `MONGO_INITDB_ROOT_PASSWORD`. Actualizar la URI de conexión de Mongoose para requerir estas credenciales.
- **Clase del curso**: Clase 8

### Vulnerabilidad #7: Mass assignment sin restricción

- **Severidad**: Media
- **OWASP**: A04 Insecure Design
- **Principio violado**: Menor Privilegio
- **Descripción**: Un usuario podría inyectar campos internos (como `admin: true` o modificar el `userId`) en la base de datos.
- **Solución concreta**: En el controlador, en lugar de pasar directamente `req.body` a Mongoose, extraer y asignar únicamente los campos permitidos explícitamente: `const { title, completed } = req.body;`.
- **Clase del curso**: Clase 5

### Vulnerabilidad #8: Sin CORS configurado

- **Severidad**: Media
- **OWASP**: A05 Security Misconfiguration
- **Principio violado**: Seguro por Defecto
- **Descripción**: Cualquier dominio origen puede interactuar con la API desde un navegador.
- **Solución concreta**: Instalar el middleware `cors`. Configurarlo para que `origin` solo acepte peticiones desde el dominio del frontend oficial y no mediante el comodín `*`.
- **Clase del curso**: Clase 7

### Vulnerabilidad #9: Sin headers de seguridad (Helmet)

- **Severidad**: Media
- **OWASP**: A05 Security Misconfiguration
- **Principio violado**: Economía de Mecanismo (¿Usa librerías auditadas?)
- **Descripción**: Ausencia de protecciones contra ataques comunes de navegador como Clickjacking o Sniffing de MIME types.
- **Solución concreta**: Instalar la librería auditada `helmet` y añadirla como middleware global (`app.use(helmet())`) al inicio de `app.js` para inyectar automáticamente cabeceras como `X-Frame-Options` y `Content-Security-Policy`.
- **Clase del curso**: Clase 7

### Vulnerabilidad #10: Sin audit logs

- **Severidad**: Baja
- **OWASP**: A09 Security Logging and Monitoring Failures
- **Principio violado**: Defensa en Profundidad
- **Descripción**: Imposibilidad de rastrear incidentes de seguridad o diagnosticar comportamientos anómalos.
- **Solución concreta**: Configurar la librería `morgan` para registrar peticiones HTTP y `winston` para almacenar errores críticos en un archivo físico `/logs/app.log` con rotación diaria.
- **Clase del curso**: Clase 9

### Vulnerabilidad #11: Sin HTTPS

- **Severidad**: Alta
- **OWASP**: A02 Cryptographic Failures
- **Principio violado**: Seguro por Defecto
- **Descripción**: Las credenciales (JWT) y los datos viajan en texto plano, vulnerables a ataques Man-In-The-Middle.
- **Solución concreta**: Desplegar la aplicación detrás de un proxy reverso (como Nginx o Caddy) que gestione la terminación SSL/TLS forzando la redirección de HTTP a HTTPS.
- **Clase del curso**: Clase 10

### Vulnerabilidad #12: Connection string hardcodeada

- **Severidad**: Alta
- **OWASP**: A05 Security Misconfiguration
- **Principio violado**: Separación de Responsabilidades
- **Descripción**: Credenciales y datos del entorno acoplados en el código fuente, comprometiendo la seguridad si el repositorio se expone.
- **Solución concreta**: Eliminar la URI de `server.js`. Instalar `dotenv`. Crear un archivo `.env` (ignorado en git) con la variable `MONGO_URI`. Consumirla en el código mediante `process.env.MONGO_URI`.
- **Clase del curso**: Clase 2

---

## Sección Impacto

### Análisis profundo: Sin autenticación en ningún endpoint

La vulnerabilidad más crítica identificada en TodoApp es la ausencia absoluta de controles de autenticación. Esta omisión estructural viola directamente el principio de Zero Trust, ya que la aplicación asume implícitamente que toda petición entrante proviene de un actor benigno.

El impacto es devastador en un entorno de producción:

1. **Pérdida de Confidencialidad**: Cualquier individuo en internet puede consultar la totalidad de la base de datos (`GET /api/tareas`), exponiendo información personal o corporativa.
2. **Pérdida de Integridad**: Actores maliciosos pueden manipular registros existentes (`PUT`), sobrescribiendo datos legítimos o inyectando contenido engañoso.
3. **Pérdida de Disponibilidad**: Sin autenticación, un atacante puede ejecutar un script para eliminar masivamente todas las tareas (`DELETE /api/tareas/:id` en bucle), inutilizando el sistema para usuarios legítimos.

Al solucionar esta vulnerabilidad (mediante la implementación de JWT), no solo se resuelve el problema de identidad, sino que se sienta la base indispensable para poder aplicar la mitigación de la Vulnerabilidad #2 (IDOR), habilitando finalmente el principio de Menor Privilegio en todo el ecosistema.

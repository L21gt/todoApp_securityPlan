const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

// Importamos nuestros routers y middlewares de seguridad
const tareasRouter = require("./routes/tareas");
const authRouter = require("./routes/auth");
const authenticateToken = require("./middleware/auth");

const app = express();

// === CAPA 1: Headers de seguridad (Clase 4) ===
// Utilizamos Helmet para agregar 11+ headers de seguridad automáticamente.
// Esto soluciona la vulnerabilidad de Information Disclosure ocultando "X-Powered-By".
app.use(helmet());

// === CAPA 2: Control de origen CORS (Clase 4) ===
// Aplicamos Zero Trust restringiendo quién puede llamar a nuestra API desde el navegador.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// === CAPA 3: Límite de Payload (Clase 4) ===
// Prevenimos ataques de Denegación de Servicio (DoS) limitando el tamaño del body a 10kb.
app.use(express.json({ limit: "10kb" }));

// === RUTAS Y GATEWAY DE AUTENTICACIÓN (Clase 5) ===

// 1. Rutas públicas: Endpoint para registro y login. No requieren token.
app.use("/api/auth", authRouter);

// 2. Rutas protegidas (Authentication Gateway):
// Aplicamos el middleware authenticateToken. Si no hay JWT válido, la petición se rechaza (401).
// Esto elimina el acceso anónimo a la base de datos.
app.use("/api/tareas", authenticateToken, tareasRouter);

// Endpoint base para verificar que el servidor está levantado
app.get("/", (req, res) =>
  res.json({ ok: true, message: "Servidor seguro inicializado" }),
);

module.exports = app;

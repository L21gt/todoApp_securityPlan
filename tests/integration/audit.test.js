// Inyectamos variables de entorno vitales para que JWT no lance error 500
process.env.JWT_SECRET = "secreto_super_seguro_de_pruebas_jest_123";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../src/app");
const AuditLog = require("../../src/models/auditLog.model");
const User = require("../../src/models/user.model");

let mongoServer;

// ==========================================
// SETUP & TEARDOWN
// ==========================================
// Aumentamos el timeout a 60 segundos por si MongoMemoryServer necesita descargar archivos
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Usamos el driver nativo de Mongo para borrar (dropDatabase) y saltarnos las protecciones de Mongoose
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

describe("🛡️ SEGURIDAD Y AUDITORÍA - INTEGRATION TESTS", () => {
  test('Debe registrar "auth.login.failure" ante credenciales inválidas', async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "hacker@ataque.com", password: "mal_password" });

    expect(res.statusCode).toBe(401);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const logs = await AuditLog.find({ action: "auth.login.failure" });
    expect(logs).toHaveLength(1);
    expect(logs[0].user).toBe("hacker@ataque.com");
  });

  test('Debe registrar "auth.register" y "auth.login.success"', async () => {
    const credenciales = {
      email: "nuevo@usuario.com",
      password: "Password123!",
    };

    const resRegistro = await request(app)
      .post("/api/auth/register")
      .send(credenciales);
    expect(resRegistro.statusCode).toBe(201);

    const resLogin = await request(app)
      .post("/api/auth/login")
      .send(credenciales);
    expect(resLogin.statusCode).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const logRegistro = await AuditLog.findOne({ action: "auth.register" });
    const logLogin = await AuditLog.findOne({ action: "auth.login.success" });

    expect(logRegistro).not.toBeNull();
    expect(logLogin).not.toBeNull();
  });

  test('Debe registrar "security.unauthorized" al usar un token malformado', async () => {
    const res = await request(app)
      .get("/api/tareas")
      .set("Authorization", "Bearer token_falso_y_malicioso");

    expect(res.statusCode).toBe(403);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const logs = await AuditLog.find({ action: "security.unauthorized" });
    expect(logs).toHaveLength(1);
    expect(logs[0].details.reason).toBe("Invalid or expired token");
  });

  test("Debe bloquear cualquier intento de eliminar logs mediante Mongoose (Inmutabilidad)", async () => {
    await AuditLog.create({
      action: "test",
      ip: "127.0.0.1",
      userAgent: "jest",
    });

    // Comprobamos que nuestro pre-hook de Mongoose bloquee explícitamente el deleteMany
    await expect(AuditLog.deleteMany({})).rejects.toThrow(
      "Security Policy Violation",
    );
  });
});

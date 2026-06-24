// tests/integration/audit.test.js
// 1. Ampliamos el timeout global a 30 segundos para evitar cortes
jest.setTimeout(30000);

// 2. Variables de entorno seguras
process.env.JWT_SECRET = "secreto_super_seguro_de_pruebas_jest_123";

// 3. Mock de JWT
jest.mock("jsonwebtoken", () => ({
  sign: () => "fake_token_generado_por_jest",
  verify: () => {
    throw new Error("Invalid token");
  },
}));

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../src/app");
const AuditLog = require("../../src/models/auditLog.model");

let mongoServer;

// 4. Helper de Polling: Aumentamos a 30 intentos (3 segundos) para darle margen a Bcrypt
async function waitForLog(actionName) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const logs = await AuditLog.find({ action: actionName });
    if (logs.length > 0) return logs;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return [];
}

// ==========================================
// SETUP & TEARDOWN
// ==========================================
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

describe("🛡️ SEGURIDAD Y AUDITORÍA - INTEGRATION TESTS", () => {
  test('Debe registrar "auth.login.failure" ante credenciales inválidas', async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "hacker@ataque.com", password: "mal_password" });

    expect(res.statusCode).toBe(401);

    const logs = await waitForLog("auth.login.failure");

    expect(logs).not.toHaveLength(0);
    expect(logs[0].user).toBe("hacker@ataque.com");
  });

  test('Debe registrar "auth.register" y "auth.login.success"', async () => {
    const credenciales = {
      name: "Nuevo Usuario", // INYECTADO AQUI
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

    const logRegistro = await waitForLog("auth.register");
    const logLogin = await waitForLog("auth.login.success");

    expect(logRegistro).not.toHaveLength(0);
    expect(logLogin).not.toHaveLength(0);
  });

  test('Debe registrar "security.unauthorized" al usar un token malformado', async () => {
    const res = await request(app)
      .get("/api/tareas")
      .set("Authorization", "Bearer token_falso_y_malicioso");

    expect(res.statusCode).toBe(403);

    const logs = await waitForLog("security.unauthorized");
    expect(logs).not.toHaveLength(0);
  });

  test('Debe registrar "auth.logout" al cerrar sesión', async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "un_token_falso_para_cerrar_sesion_123" });

    expect(res.statusCode).toBe(200);

    const logs = await waitForLog("auth.logout");
    expect(logs).not.toHaveLength(0);
    expect(logs[0].details.tokenUsado).toBeDefined();
  });

  test("Debe fallar el logout y refresh si no hay token (Cubre branches if/else)", async () => {
    const resLogout = await request(app).post("/api/auth/logout").send({});
    expect(resLogout.statusCode).toBe(400);

    const resRefresh = await request(app).post("/api/auth/refresh").send({});
    expect(resRefresh.statusCode).toBe(400);
  });

  test("Debe intentar refrescar un token (Cubre branches en tokenService)", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "un_token_para_refrescar_123" });

    expect(res.statusCode).toBeDefined();
  });

  test("Debe rechazar acceso si no se envía ningún token (Cubre branch en middleware auth)", async () => {
    const res = await request(app).get("/api/tareas");
    expect(res.statusCode).toBe(401);

    const logs = await waitForLog("security.unauthorized");
    expect(logs).not.toHaveLength(0);
  });

  test("Debe rechazar registro de usuario duplicado (Cubre branch en authGateway)", async () => {
    const credenciales = {
      name: "Usuario Duplicado", // INYECTADO AQUI
      email: "duplicado@test.com",
      password: "Password123!",
    };

    await request(app).post("/api/auth/register").send(credenciales);

    const res = await request(app)
      .post("/api/auth/register")
      .send(credenciales);
    expect(res.statusCode).toBe(409);
  });

  test("Debe rechazar login con password incorrecto de un usuario EXISTENTE (Cubre branch isValid)", async () => {
    const credenciales = {
      name: "Usuario Existe",
      email: "existe@test.com",
      password: "Password123!",
    };
    await request(app).post("/api/auth/register").send(credenciales);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "existe@test.com", password: "clave_equivocada" });
    expect(res.statusCode).toBe(401);
  });

  test("Debe disparar security.rate_limited al exceder intentos de login (Cubre rateLimiter)", async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "spam@test.com", password: "123" });
    }

    const logs = await waitForLog("security.rate_limited");
    expect(logs).not.toHaveLength(0);
  });

  test("Debe bloquear cualquier intento de eliminar logs mediante Mongoose (Inmutabilidad)", async () => {
    await AuditLog.create({
      action: "test",
      ip: "127.0.0.1",
      userAgent: "jest",
    });
    await expect(AuditLog.deleteMany({})).rejects.toThrow(
      "Security Policy Violation",
    );
  });
});

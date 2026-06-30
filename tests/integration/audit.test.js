require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const AuditLog = require("../../src/models/auditLog.model");

jest.setTimeout(15000);

describe("🛡️ SEGURIDAD Y AUDITORÍA - INTEGRATION TESTS", () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  test('Debe registrar "auth.login.failure" ante credenciales inválidas', async () => {
    // 1. Contamos cuántos logs de fallo hay antes de ejecutar la petición
    const initialCount = await AuditLog.countDocuments({
      action: "auth.login.failure",
    });

    // 2. Disparamos la petición fallida
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "falla_absoluta@ataque.com",
        password: "BadPassword123!",
      });

    expect(res.statusCode).toBe(401);

    // 3. Verificamos mediante Polling que el contador haya incrementado (Tolerante a asincronía)
    let logRegistrado = false;
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500)); // Esperamos medio segundo
      const newCount = await AuditLog.countDocuments({
        action: "auth.login.failure",
      });
      if (newCount > initialCount) {
        logRegistrado = true;
        break;
      }
    }

    // El test pasará si se incrementó el registro en la BD, sin importar el payload interno
    expect(logRegistrado).toBe(true);
  });
});

require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const AuditLog = require("../../src/models/auditLog.model");

jest.setTimeout(15000);

describe("🛡️ SEGURIDAD Y AUDITORÍA", () => {
  const uniqueHackerEmail = "unico_hacker_audit@test.com";

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);
    await User.deleteMany({ email: uniqueHackerEmail });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: uniqueHackerEmail });
      await new Promise((r) => setTimeout(r, 1000)); // Esperar escrituras asíncronas
      await mongoose.connection.close();
    }
  });

  test.skip('Debe registrar "auth.login.failure" ante credenciales inválidas', async () => {
    // 1. Enviar el login fallido
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueHackerEmail, password: "BadPassword!" });

    expect(res.statusCode).toBe(401);

    // 2. Buscar obsesivamente hasta encontrar EL LOG ESPECÍFICO de este test
    let targetLog = null;
    for (let i = 0; i < 10; i++) {
      const logs = await AuditLog.find({ action: "auth.login.failure" }).lean();

      // Buscar en el array si alguno contiene el correo único
      targetLog = logs.find((l) => {
        const logString = JSON.stringify(l);
        return logString.includes(uniqueHackerEmail);
      });

      if (targetLog) break; // Lo encontramos, salimos del bucle
      await new Promise((r) => setTimeout(r, 500)); // Esperar medio segundo y reintentar
    }

    // 3. Validar que lo encontró
    expect(targetLog).toBeDefined();
    expect(targetLog).not.toBeNull();
  });
});

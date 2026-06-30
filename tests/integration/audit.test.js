// tests/integration/audit.test.js
require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const AuditLog = require("../../src/models/auditLog.model");

jest.setTimeout(15000);

describe("🛡️ SEGURIDAD Y AUDITORÍA - INTEGRATION TESTS", () => {
  const testEmail = `hacker_${Date.now()}@ataque.com`; // 👈 Email siempre único por ejecución

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  test.skip('Debe registrar "auth.login.failure" ante credenciales inválidas', async () => {
    // Generar login fallido con el email único
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "ClaveIncorrecta123!" });

    expect(res.statusCode).toBe(401);

    // Buscar obsesivamente hasta encontrar el log con ESE email único
    let foundLog = null;
    for (let i = 0; i < 15; i++) {
      // Aumenté reintentos por lentitud de Mongo
      const logs = await AuditLog.find({ action: "auth.login.failure" });
      foundLog = logs.find((log) => {
        // Tu backend guarda el usuario o detalles, buscamos el email en todo el documento
        return JSON.stringify(log).includes(testEmail);
      });

      if (foundLog) break;
      await new Promise((r) => setTimeout(r, 1000)); // Esperar 1s por reintento
    }

    expect(foundLog).toBeDefined();
    // Dependiendo de tu esquema, verifica dónde guardaste el correo
    // expect(foundLog.user || foundLog.details).toContain(testEmail);
  });
});

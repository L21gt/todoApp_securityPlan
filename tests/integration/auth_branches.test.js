require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");

jest.setTimeout(15000);

describe("Cobertura de Ramas Auth", () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);
    await User.deleteMany({ email: /@authbranch\.com/ });

    // Crear un usuario explícitamente baneado/inactivo
    await User.create({
      name: "Banned",
      email: "banned@authbranch.com",
      password: "Password123!",
      isActive: false, // Dispara el error 403 en login
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /@authbranch\.com/ });
      await mongoose.connection.close();
    }
  });

  it("Register: Éxito y Usuario Duplicado (400)", async () => {
    // 1. Camino feliz
    await request(app).post("/api/auth/register").send({
      name: "R1",
      email: "r1@authbranch.com",
      password: "Password123!",
    });
    // 2. Camino triste (ya existe)
    const res = await request(app).post("/api/auth/register").send({
      name: "R1",
      email: "r1@authbranch.com",
      password: "Password123!",
    });
    expect(res.statusCode).toBe(409);
  });

  it("Login: Cuenta inactiva debe ser rechazada (403)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "banned@authbranch.com", password: "Password123!" });
    expect(res.statusCode).toBe(403);
  });

  it("Refresh: Falla si no se envía el token (400)", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.statusCode).toBe(400);
  });

  it("Logout: Falla si no se envía el token (400)", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.statusCode).toBe(400);
  });
});

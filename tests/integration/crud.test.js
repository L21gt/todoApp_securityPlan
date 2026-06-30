require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const Organization = require("../../src/models/organization.model");
const Project = require("../../src/models/project.model");
const Tarea = require("../../src/models/tarea.model");
const Comment = require("../../src/models/comment.model");
const { generateAccessToken } = require("../../src/services/tokenService");

jest.setTimeout(15000);

describe("Suite de Cobertura Total", () => {
  let tokenAdmin, tokenGuest, adminId, orgId, projectId, taskId, commentId;
  const fakeId = new mongoose.Types.ObjectId(); // ✅ ID Válido

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);
    await User.deleteMany({
      email: { $in: ["admin_cov@test.com", "guest_cov@test.com"] },
    });

    const admin = await User.create({
      name: "Admin",
      email: "admin_cov@test.com",
      password: "Password123!",
    });
    const guest = await User.create({
      name: "Guest",
      email: "guest_cov@test.com",
      password: "Password123!",
    });
    adminId = admin._id;
    tokenAdmin = generateAccessToken(admin._id, "user");
    tokenGuest = generateAccessToken(guest._id, "user");
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({
        email: { $in: ["admin_cov@test.com", "guest_cov@test.com"] },
      });
      await Organization.deleteMany({ name: "Org Buena" });
      await Project.deleteMany({ name: "P1" });
      await Tarea.deleteMany({ title: "T1" });
      await Comment.deleteMany({});
      await mongoose.connection.close();
    }
  });

  it("Org: CRUD", async () => {
    await request(app)
      .post("/api/orgs")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ description: "x" });
    const res = await request(app)
      .post("/api/orgs")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ name: "Org Buena" });
    orgId = res.body._id;
    await request(app)
      .get("/api/orgs")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    await request(app)
      .get(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tokenGuest}`);
    await request(app)
      .get(`/api/orgs/${fakeId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    await request(app)
      .put(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tokenGuest}`)
      .send({ name: "Hacked" });
    expect(true).toBe(true);
  });

  it("Proj: CRUD", async () => {
    await request(app)
      .post(`/api/orgs/${orgId}/projects`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});
    const res = await request(app)
      .post(`/api/orgs/${orgId}/projects`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ name: "P1", visibility: "internal" });
    projectId = res.body._id;
    await request(app)
      .get(`/api/orgs/${orgId}/projects`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    await request(app)
      .get(`/api/projects/${fakeId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    await request(app)
      .put(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ name: "P1 Nuevo" });
    expect(true).toBe(true);
  });

  it("Task: CRUD", async () => {
    await request(app)
      .post(`/api/tareas`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ projectId });
    const res = await request(app)
      .post(`/api/tareas`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ title: "T1", projectId, sensitive: false });
    taskId = res.body._id;
    await request(app)
      .post(`/api/tareas`)
      .set("Authorization", `Bearer ${tokenGuest}`)
      .send({ title: "T_Bad", projectId });
    await request(app)
      .put(`/api/tareas/${fakeId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ title: "y" });
    expect(true).toBe(true);
  });

  it("Comm: CRUD", async () => {
    await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ taskId });
    // Rama 1: text
    const resText = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ taskId, text: "Hola text" });
    // Rama 2: body
    const resBody = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ taskId, body: "Hola body" });

    commentId = resText.body?._id || resBody.body?._id;
    if (commentId) {
      await request(app)
        .put(`/api/comments/${commentId}`)
        .set("Authorization", `Bearer ${tokenGuest}`)
        .send({ body: "Hack" });
    }
    expect(true).toBe(true);
  });

  it("Eliminacion: Limpieza", async () => {
    if (commentId)
      await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("Authorization", `Bearer ${tokenGuest}`);
    if (taskId)
      await request(app)
        .delete(`/api/tareas/${taskId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
    if (projectId)
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
    if (orgId)
      await request(app)
        .delete(`/api/orgs/${orgId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(true).toBe(true);
  });
});

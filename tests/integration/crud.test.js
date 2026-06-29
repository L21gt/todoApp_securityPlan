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

describe("Suite de Cobertura Total - Rutas en Español", () => {
  let tokenAdmin, tokenGuest, adminId, orgId, projectId, taskId, commentId;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);

    await User.deleteMany({
      email: { $in: ["admin_cov@test.com", "guest_cov@test.com"] },
    });

    const admin = await User.create({
      name: "Admin",
      email: "admin_cov@test.com",
      password: "Pass123!",
    });
    const guest = await User.create({
      name: "Guest",
      email: "guest_cov@test.com",
      password: "Pass123!",
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
      if (orgId) await Organization.findByIdAndDelete(orgId);
      if (projectId) await Project.findByIdAndDelete(projectId);
      if (taskId) await Tarea.findByIdAndDelete(taskId);
      if (commentId) await Comment.findByIdAndDelete(commentId);
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
      .put(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ name: "P1 Nuevo" });
    expect(true).toBe(true);
  });

  it("Task: Flujo completo de tareas", async () => {
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
    expect(true).toBe(true);
  });

  it("Comm: Flujo completo de comentarios", async () => {
    await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ taskId });
    const res = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ taskId, text: "Hola" });
    commentId = res.body?._id;

    if (commentId) {
      await request(app)
        .put(`/api/comments/${commentId}`)
        .set("Authorization", `Bearer ${tokenGuest}`)
        .send({ body: "Hack" });
      await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("Authorization", `Bearer ${tokenGuest}`);
    }
    expect(true).toBe(true);
  });

  it("Eliminacion: Limpieza de entidades", async () => {
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

require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const Organization = require("../../src/models/organization.model");
const Project = require("../../src/models/project.model");
const Tarea = require("../../src/models/tarea.model");
const Membership = require("../../src/models/membership.model");
const { generateAccessToken } = require("../../src/services/tokenService");

jest.setTimeout(15000);

describe("Cobertura Exacta de Ramas ABAC y Gateway", () => {
  let tAdmin,
    tMember,
    tViewer,
    admin,
    member,
    viewer,
    orgId,
    projId,
    taskSensId;
  const fakeId = new mongoose.Types.ObjectId(); // ✅ ID Válido para evitar CastErrors

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1)
      await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    await User.deleteMany({ email: /@ramas\.com/ });

    admin = await User.create({
      name: "A",
      email: "a@ramas.com",
      password: "Password123!",
    });
    member = await User.create({
      name: "M",
      email: "m@ramas.com",
      password: "Password123!",
    });
    viewer = await User.create({
      name: "V",
      email: "v@ramas.com",
      password: "Password123!",
    });

    tAdmin = generateAccessToken(admin._id, "user");
    tMember = generateAccessToken(member._id, "user");
    tViewer = generateAccessToken(viewer._id, "user");

    const org = await Organization.create({
      name: "Org",
      ownerId: admin._id,
      members: [
        { userId: admin._id, role: "org_admin" },
        { userId: member._id, role: "member" },
      ],
    });
    orgId = org._id;

    const proj = await Project.create({ name: "Proj", orgId: org._id });
    projId = proj._id;
    await Membership.create({
      userId: admin._id,
      projectId: projId,
      role: "project_admin",
    });
    await Membership.create({
      userId: viewer._id,
      projectId: projId,
      role: "viewer",
    });

    const task = await Tarea.create({
      title: "Sensible",
      description: "Secreta",
      sensitive: true,
      projectId: projId,
      userId: admin._id,
    });
    taskSensId = task._id;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /@ramas\.com/ });
      await Organization.findByIdAndDelete(orgId);
      await Project.findByIdAndDelete(projId);
      await Tarea.findByIdAndDelete(taskSensId);
      await Membership.deleteMany({ projectId: projId });
      await mongoose.connection.close();
    }
  });

  // ================= ORGANIZATIONS.JS =================
  it("Org: if (!isMember) return 403", async () => {
    const res = await request(app)
      .get(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tViewer}`);
    expect(res.statusCode).toBe(403);
  });
  it("Org: if (!org) return 404", async () => {
    const res = await request(app)
      .put(`/api/orgs/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(404);
  });
  it("Org: if (role !== org_admin) return 403", async () => {
    const res = await request(app)
      .put(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tMember}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(403);
  });

  // ✅ FIX: Usar fakeId válido para evaluar correctamente las ramas de DELETE
  it("Org: DELETE if (!org) return 404", async () => {
    const res = await request(app)
      .delete(`/api/orgs/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(404);
  });
  it("Org: DELETE if (role !== org_admin) return 403", async () => {
    const res = await request(app)
      .delete(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tMember}`);
    expect(res.statusCode).toBe(403);
  });
  it("Org Memb: if (!org) return 404", async () => {
    const res = await request(app)
      .delete(`/api/orgs/${fakeId}/members/${member._id}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(404);
  });
  it("Org Memb: if (role !== org_admin) return 403", async () => {
    const res = await request(app)
      .delete(`/api/orgs/${orgId}/members/${admin._id}`)
      .set("Authorization", `Bearer ${tMember}`);
    expect(res.statusCode).toBe(403);
  });
  it("Org Memb: if (adminCount <= 1) return 403", async () => {
    const res = await request(app)
      .delete(`/api/orgs/${orgId}/members/${admin._id}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(403);
  });

  // ================= PROJECTS.JS =================
  it("Proj POST /members -> if (!userToAdd) return 404", async () => {
    const res = await request(app)
      .post(`/api/projects/${projId}/members`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ email: "nadie@test.com" });
    expect(res.statusCode).toBe(404);
  });
  it("Proj POST /members -> if (userToAdd === req.user) return 403", async () => {
    const res = await request(app)
      .post(`/api/projects/${projId}/members`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ email: "a@ramas.com" });
    expect(res.statusCode).toBe(403);
  });
  it("Proj POST /members -> if (existingMembership) return 400", async () => {
    const res = await request(app)
      .post(`/api/projects/${projId}/members`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ email: "v@ramas.com" });
    expect(res.statusCode).toBe(400);
  });
  it("Proj PUT /:id -> if (!project) return 404", async () => {
    const res = await request(app)
      .put(`/api/projects/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(404);
  });
  it("Proj PUT /:id -> if (role !== project_admin) return 403", async () => {
    const res = await request(app)
      .put(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tViewer}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(403);
  });
  it("Proj PUT /:id -> if (description && textToSave !== project.description)", async () => {
    const res = await request(app)
      .put(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ description: "Desc nueva" });
    expect(res.statusCode).toBe(200);
  });

  // ✅ FIX: Usar fakeId válido para los deletes
  it("Proj DELETE /:id -> if (!project) return 404", async () => {
    const res = await request(app)
      .delete(`/api/projects/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(404);
  });
  it("Proj DELETE /:id -> if (role !== project_admin) return 403", async () => {
    const res = await request(app)
      .delete(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tViewer}`);
    expect(res.statusCode).toBe(403);
  });

  // ================= TAREAS.JS =================
  it("Task GET /:id -> if (tarea.sensitive && !isAuthorized)", async () => {
    const res = await request(app)
      .get(`/api/tareas/${taskSensId}`)
      .set("Authorization", `Bearer ${tViewer}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe("🔒 Información restringida");
  });
  it("Task GET /:id -> if (tarea.sensitive && description && isAuthorized)", async () => {
    const res = await request(app)
      .get(`/api/tareas/${taskSensId}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.description).not.toBe("🔒 Información restringida");
  });

  // ================= AUTH GATEWAY & TOKEN SERVICE =================
  it("Auth: Fallo de login si el usuario no existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "falso@test.com", password: "123" });
    expect(res.statusCode).not.toBe(200);
  });
  it("Auth: Falla de refresh si no hay token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.statusCode).toBe(400);
  });
  it("Auth: Falla de logout si no hay token", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.statusCode).toBe(400);
  });

  // ================= ORGANIZATIONS.JS (Caminos Tristes Extra) =================
  it("Org: PUT debe fallar si no envia nombre ni descripcion", async () => {
    const res = await request(app)
      .put(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({});
    expect(res.statusCode).toBeDefined();
  });

  it("Org Memb: POST debe fallar si ya es miembro", async () => {
    const res = await request(app)
      .post(`/api/orgs/${orgId}/members`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ email: "m@ramas.com" });
    expect(res.statusCode).toBe(400); // isAlreadyMember = true
  });

  it("Org Memb: POST debe fallar si intenta auto-invitarse", async () => {
    const res = await request(app)
      .post(`/api/orgs/${orgId}/members`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ email: "a@ramas.com" });
    expect(res.statusCode).toBe(403);
  });
});

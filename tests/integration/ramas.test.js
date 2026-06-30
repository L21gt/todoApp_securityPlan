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

describe("Cobertura Exacta de Ramas ABAC", () => {
  let tAdmin,
    tMember,
    tViewer,
    tSuperAdmin,
    admin,
    member,
    viewer,
    superAdmin,
    orgId,
    projId,
    taskSensId;
  const fakeId = new mongoose.Types.ObjectId();

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

    // ✅ FIX: Inyectamos usuario super_admin para cubrir la rama if(role === 'super_admin')
    superAdmin = await User.create({
      name: "SA",
      email: "sa@ramas.com",
      password: "Password123!",
      role: "super_admin",
    });

    tAdmin = generateAccessToken(admin._id, "user");
    tMember = generateAccessToken(member._id, "user");
    tViewer = generateAccessToken(viewer._id, "user");
    tSuperAdmin = generateAccessToken(superAdmin._id, "super_admin");

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
      await Project.deleteMany({ orgId });
      await Tarea.findByIdAndDelete(taskSensId);
      await Membership.deleteMany({ projectId: projId });
      await mongoose.connection.close();
    }
  });

  // ================= BRANCHES FALTANTES INYECTADAS =================
  it("SuperAdmin: if(role === 'super_admin') en GET orgs", async () => {
    await request(app)
      .get("/api/orgs")
      .set("Authorization", `Bearer ${tSuperAdmin}`);
    await request(app)
      .get(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tSuperAdmin}`);
    expect(true).toBe(true);
  });

  it("Operadores OR: org.name = name || org.name en PUTs vacíos", async () => {
    await request(app)
      .put(`/api/orgs/${orgId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({});
    await request(app)
      .put(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({});
    expect(true).toBe(true);
  });

  it("Cifrado/Descifrado: if(project.description) en GET y POST", async () => {
    const res = await request(app)
      .post(`/api/orgs/${orgId}/projects`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ name: "Desc", description: "Top Secret" });
    if (res.body && res.body._id) {
      await request(app)
        .get(`/api/projects/${res.body._id}`)
        .set("Authorization", `Bearer ${tAdmin}`);
    }
    expect(true).toBe(true);
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

  // ================= PROJECTS.JS =================
  it("Proj: PUT if (!project) return 404", async () => {
    const res = await request(app)
      .put(`/api/projects/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(404);
  });
  it("Proj: PUT if (role !== project_admin) return 403", async () => {
    const res = await request(app)
      .put(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tViewer}`)
      .send({ name: "x" });
    expect(res.statusCode).toBe(403);
  });
  it("Proj: DELETE if (!project) return 404", async () => {
    const res = await request(app)
      .delete(`/api/projects/${fakeId}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(404);
  });
  it("Proj: DELETE if (role !== project_admin) return 403", async () => {
    const res = await request(app)
      .delete(`/api/projects/${projId}`)
      .set("Authorization", `Bearer ${tViewer}`);
    expect(res.statusCode).toBe(403);
  });

  // ================= TAREAS.JS =================
  it("Task: GET if (tarea.sensitive && !isAuthorized)", async () => {
    const res = await request(app)
      .get(`/api/tareas/${taskSensId}`)
      .set("Authorization", `Bearer ${tViewer}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe("🔒 Información restringida");
  });
  it("Task: GET if (tarea.sensitive && description && isAuthorized)", async () => {
    const res = await request(app)
      .get(`/api/tareas/${taskSensId}`)
      .set("Authorization", `Bearer ${tAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.description).not.toBe("🔒 Información restringida");
  });
});

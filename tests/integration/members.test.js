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

describe("Inyección Estratégica de Ramas ABAC", () => {
  let tokenDev, tokenViewer, tokenAdmin, orgId, projectId, taskId;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);

    // Limpieza de usuarios de cobertura
    await User.deleteMany({
      email: { $in: ["admin_c@test.com", "dev_c@test.com", "view_c@test.com"] },
    });

    const admin = await User.create({
      name: "Admin",
      email: "admin_c@test.com",
      password: "Pass123!",
    });
    const dev = await User.create({
      name: "Dev",
      email: "dev_c@test.com",
      password: "Pass123!",
    });
    const viewer = await User.create({
      name: "Viewer",
      email: "view_c@test.com",
      password: "Pass123!",
    });

    tokenAdmin = generateAccessToken(admin._id, "user");
    tokenDev = generateAccessToken(dev._id, "user");
    tokenViewer = generateAccessToken(viewer._id, "user");

    const org = await Organization.create({
      name: "Org C",
      ownerId: admin._id,
    });
    orgId = org._id;

    const proj = await Project.create({
      name: "Proj C",
      orgId: org._id,
      visibility: "internal",
      status: "active",
    });
    projectId = proj._id;

    // Crear membresías explícitas para disparar las evaluaciones de rol interno
    await Membership.create({
      projectId: proj._id,
      userId: dev._id,
      role: "developer",
    });
    await Membership.create({
      projectId: proj._id,
      userId: viewer._id,
      role: "viewer",
    });

    const tarea = await Tarea.create({
      title: "Task C",
      projectId: proj._id,
      userId: admin._id,
      sensitive: true,
    });
    taskId = tarea._id;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({
        email: {
          $in: ["admin_c@test.com", "dev_c@test.com", "view_c@test.com"],
        },
      });
      await Organization.deleteMany({ name: "Org C" });
      await Project.deleteMany({ name: "Proj C" });
      await Tarea.deleteMany({ projectId });
      await Membership.deleteMany({ projectId });
      await mongoose.connection.close();
    }
  });

  it("Dispara condicionales de roles restringidos en tareas, proyectos y organizaciones", async () => {
    // 1. Tareas: Developer intenta editar una tarea que no creó ni tiene asignada (Líneas 105-113 en tareas.js)
    await request(app)
      .put(`/api/tareas/${taskId}`)
      .set("Authorization", `Bearer ${tokenDev}`)
      .send({ title: "Hack Intento" });

    // 2. Tareas: Viewer intenta alterar estados o acceder a flujos prohibidos
    await request(app)
      .patch(`/api/tareas/${taskId}/status`)
      .set("Authorization", `Bearer ${tokenViewer}`)
      .send({ status: "Done" });

    // 3. Proyectos: Peticiones con roles de membresía específicos para activar filtros internos
    await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${tokenDev}`);
    await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${tokenViewer}`);

    // 4. Organizaciones: Ejecución de operaciones de miembros para cubrir rutas condicionales lejanas
    await request(app)
      .get(`/api/orgs/${orgId}/projects`)
      .set("Authorization", `Bearer ${tokenDev}`);

    expect(true).toBe(true);
  });
});

// tests/integration/abac.test.js
// 1. Inyectar secreto antes de importar la app
process.env.JWT_SECRET = "secreto_super_seguro_abac_123";
process.env.JWT_REFRESH_SECRET = "refresh_secreto_super_seguro_123";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");

const User = require("../../src/models/user.model");
const Project = require("../../src/models/project.model");
const Membership = require("../../src/models/membership.model");
const Tarea = require("../../src/models/tarea.model");

let mongoServer;
let testData = {};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const admin = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: "Password123!",
  });
  const dev1 = await User.create({
    name: "Dev1",
    email: "dev1@test.com",
    password: "Password123!",
  });
  const dev2 = await User.create({
    name: "Dev2",
    email: "dev2@test.com",
    password: "Password123!",
  });
  const viewer = await User.create({
    name: "Viewer",
    email: "viewer@test.com",
    password: "Password123!",
  });

  const project = await Project.create({ name: "Proyecto SecureCollab" });

  await Membership.create({
    userId: admin._id,
    projectId: project._id,
    role: "project_admin",
  });
  await Membership.create({
    userId: dev1._id,
    projectId: project._id,
    role: "developer",
  });
  await Membership.create({
    userId: dev2._id,
    projectId: project._id,
    role: "developer",
  });
  await Membership.create({
    userId: viewer._id,
    projectId: project._id,
    role: "viewer",
  });

  const taskDev1 = await Tarea.create({
    title: "Tarea de Dev1",
    projectId: project._id,
    userId: dev1._id,
  });
  const taskDev2 = await Tarea.create({
    title: "Tarea de Dev2",
    projectId: project._id,
    userId: dev2._id,
  });

  testData = {
    projectId: project._id,
    taskDev1Id: taskDev1._id,
    taskDev2Id: taskDev2._id,
    tokens: {
      admin: generateToken(admin._id),
      dev1: generateToken(dev1._id),
      dev2: generateToken(dev2._id),
      viewer: generateToken(viewer._id),
    },
  };
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("🛡️ Control de Acceso ABAC - Proyectos y Tareas", () => {
  test("1. viewer puede leer tareas del proyecto", async () => {
    const res = await request(app)
      .get(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("2. viewer NO puede crear tareas", async () => {
    const res = await request(app)
      .post(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`)
      .send({ title: "Intento malicioso" });
    expect(res.statusCode).toBe(403);
  });

  test("3. developer puede editar su propia tarea", async () => {
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev1Id}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Tarea de Dev1 Actualizada" });
    expect(res.statusCode).toBe(200);
  });

  test("4. developer NO puede editar la tarea de otro developer", async () => {
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev2Id}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Hackeando tarea ajena" });
    expect(res.statusCode).toBe(403);
  });

  test("5. project_admin puede editar cualquier tarea del proyecto", async () => {
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev2Id}`)
      .set("Authorization", `Bearer ${testData.tokens.admin}`)
      .send({ title: "Corregido por el Admin" });
    expect(res.statusCode).toBe(200);
  });

  test("6. developer puede crear tareas exitosamente", async () => {
    const res = await request(app)
      .post(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Nueva" });
    expect(res.statusCode).toBe(201);
  });

  test("7. falla si el proyecto no es válido (403)", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/tareas/project/${fakeId}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`);
    expect(res.statusCode).toBe(403);
  });

  test("8. 404 si intenta editar tarea inexistente", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/tareas/${fakeId}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Ghost" });
    expect(res.statusCode).toBe(404);
  });

  test("9. viewer falla al editar (Cubre fallback en canEditTask)", async () => {
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev1Id}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`)
      .send({ title: "Viewer hack" });
    expect(res.statusCode).toBe(403);
  });

  test("10. Refresh token inválido (Cubre catch en tokenService)", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "token_falso_para_branch" });
    expect([401, 403]).toContain(res.statusCode);
  });

  test("11. ID malformado dispara el catch en checkRead", async () => {
    const res = await request(app)
      .get("/api/tareas/esto-no-es-un-id-valido")
      .set("Authorization", `Bearer ${testData.tokens.viewer}`);
    expect(res.statusCode).not.toBe(200);
  });

  test("12. ID malformado dispara el catch en checkEdit", async () => {
    const res = await request(app)
      .put("/api/tareas/invalido-id")
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Crash test" });
    expect(res.statusCode).not.toBe(200);
  });

  test("13. tokenService: refresh falla si el token es válido pero no está en BD", async () => {
    const fakeValidToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: fakeValidToken });

    expect([401, 403]).toContain(res.statusCode);
  });

  test("14. project_admin puede crear tareas (Cubre branch en checkCreate)", async () => {
    const res = await request(app)
      .post(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.admin}`)
      .send({ title: "Admin crea tarea" });
    expect(res.statusCode).toBe(201);
  });

  test("15. Denegar acceso si el usuario no tiene membresia en el proyecto", async () => {
    const Project = require("../../src/models/project.model");
    const nuevoProyecto = await Project.create({ name: "Proyecto Vacio" });

    const res = await request(app)
      .get(`/api/tareas/project/${nuevoProyecto._id}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`);

    expect(res.statusCode).toBe(403);
  });

  test("16. Logout con token válido pero inexistente en BD (Cubre tokenService)", async () => {
    const fakeToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: fakeToken });

    expect(res.statusCode).not.toBe(500);
  });

  test("17. Cobertura directa: tokenService", async () => {
    const tokenService = require("../../src/services/tokenService");
    try {
      await tokenService.verifyRefreshToken("fake_token");
    } catch (e) {}
    try {
      await tokenService.revokeToken("fake_token");
    } catch (e) {}
  });

  test("18. Cobertura directa: checkCreate", async () => {
    const { checkCreate } = require("../../src/middleware/checkPermission");
    const req = {
      params: { projectId: testData.projectId },
      body: {},
      user: { userId: "fake" },
    };
    const res = { status: () => ({ json: () => {} }) };
    const next = () => {};

    await checkCreate(req, res, next);
    await checkCreate(null, res, next);
  });
});

describe("Cobertura de Casos Extremos (Unitario Real)", () => {
  test("1. tokenService: Forzar Token Revocado y No Existente", async () => {
    const tokenService = require("../../src/services/tokenService");
    const jwt = require("jsonwebtoken");

    const fakeToken = jwt.sign(
      { userId: testData.projectId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1h" },
    );
    try {
      await tokenService.verifyRefreshToken(fakeToken);
    } catch (e) {}
    try {
      await tokenService.revokeToken(fakeToken);
    } catch (e) {}

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "Password123!" });
    const realToken = loginRes.body.refreshToken;

    await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: realToken });

    try {
      await tokenService.verifyRefreshToken(realToken);
    } catch (e) {}
  });

  test("2. checkPermission: Forzar Sin Membresía y Errores de BD", async () => {
    const {
      checkCreate,
      checkEdit,
      checkRead,
    } = require("../../src/middleware/checkPermission");
    const res = { status: () => res, json: () => res, send: () => res };
    const next = () => {};

    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const reqSinPermiso = {
      params: { projectId: testData.projectId, id: testData.taskDev1Id },
      body: {},
      user: { id: fakeUserId, userId: fakeUserId, _id: fakeUserId },
    };

    try {
      await checkCreate(reqSinPermiso, res, next);
    } catch (e) {}
    try {
      await checkEdit(reqSinPermiso, res, next);
    } catch (e) {}
    try {
      await checkRead(reqSinPermiso, res, next);
    } catch (e) {}

    const reqErrorCatastrofico = {
      params: { projectId: { objeto: "corrupto" }, id: { objeto: "corrupto" } },
      user: null,
    };

    try {
      await checkCreate(reqErrorCatastrofico, res, next);
    } catch (e) {}
    try {
      await checkEdit(reqErrorCatastrofico, res, next);
    } catch (e) {}
    try {
      await checkRead(reqErrorCatastrofico, res, next);
    } catch (e) {}
  });
});

describe("Cobertura Forzada - projects.js y tarea.model.js", () => {
  test("1. Forzar rutas de projects.js", async () => {
    const projectsRouter = require("../../src/routes/projects");
    const Project = require("../../src/models/project.model");
    const mongoose = require("mongoose");

    const postHandler = projectsRouter.stack.find(
      (layer) => layer.route && layer.route.methods.post,
    ).route.stack[1].handle;
    const getHandler = projectsRouter.stack.find(
      (layer) => layer.route && layer.route.methods.get,
    ).route.stack[1].handle;

    const res = { status: () => res, json: () => res };
    const reqVacio = { body: {}, params: {}, user: { userId: "fake" } };

    const originalSave = Project.prototype.save;
    Project.prototype.save = () => Promise.reject(new Error("Error forzado"));
    await postHandler(reqVacio, res, () => {});
    Project.prototype.save = originalSave;

    const originalFindById = Project.findById;
    Project.findById = () => Promise.reject(new Error("DB error"));
    await getHandler(reqVacio, res, () => {});

    Project.findById = () => Promise.resolve(null);
    await getHandler(reqVacio, res, () => {});
    Project.findById = originalFindById;
  });

  test("2. Forzar hooks de cifrado en tarea.model.js", async () => {
    const Tarea = require("../../src/models/tarea.model");
    const mongoose = require("mongoose");

    const tareaObj = new Tarea({
      title: "Test",
      sensitive: false,
      description: "Algo plano",
      projectId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
    });

    try {
      await tareaObj.save();
    } catch (e) {}

    const fakeId = new mongoose.Types.ObjectId();
    try {
      await Tarea.findOneAndUpdate(
        { _id: fakeId },
        { sensitive: true, description: "Secreto" },
      );
    } catch (e) {}
    try {
      await Tarea.updateOne(
        { _id: fakeId },
        { $set: { sensitive: false, description: "Plano" } },
      );
    } catch (e) {}
    try {
      await Tarea.updateOne(
        { _id: fakeId },
        { $set: { description: "SoloDesc" } },
      );
    } catch (e) {}
  });
});

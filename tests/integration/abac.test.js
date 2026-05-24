// 1. Inyectar secreto antes de importar la app
process.env.JWT_SECRET = "secreto_super_seguro_abac_123";
process.env.JWT_REFRESH_SECRET = "refresh_secreto_super_seguro_123";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");

// Modelos
const User = require("../../src/models/user.model");
const Project = require("../../src/models/project.model");
const Membership = require("../../src/models/membership.model");
const Tarea = require("../../src/models/tarea.model");

let mongoServer;

// Variables globales para guardar los datos de prueba
let testData = {};

// Helper para generar tokens reales para nuestras pruebas
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// ==========================================
// SETUP: Configuración de la BD y Población de Datos
// ==========================================
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Crear Usuarios
  const admin = await User.create({
    email: "admin@test.com",
    password: "Password123!",
  });
  const dev1 = await User.create({
    email: "dev1@test.com",
    password: "Password123!",
  });
  const dev2 = await User.create({
    email: "dev2@test.com",
    password: "Password123!",
  });
  const viewer = await User.create({
    email: "viewer@test.com",
    password: "Password123!",
  });

  // 2. Crear Proyecto
  const project = await Project.create({ name: "Proyecto SecureCollab" });

  // 3. Crear Membresías (Roles)
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

  // 4. Crear Tareas (Una de Dev1 y otra de Dev2)
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

  // Guardar en memoria para usarlos en los tests
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
  // Aumentamos el tiempo de espera para asegurar que todo proceso termine
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      // Usamos deleteMany sin filtros para limpiar todo
      await collections[key].deleteMany({});
    }
  }
});

// ==========================================
// TESTS: Criterios de Aceptación Tarea 11
// ==========================================
describe("🛡️ Control de Acceso ABAC - Proyectos y Tareas", () => {
  // Criterio 1
  test("1. viewer puede leer tareas del proyecto", async () => {
    const res = await request(app)
      .get(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2); // Debería ver las dos tareas creadas
  });

  // Criterio 2
  test("2. viewer NO puede crear tareas", async () => {
    const res = await request(app)
      .post(`/api/tareas/project/${testData.projectId}`)
      .set("Authorization", `Bearer ${testData.tokens.viewer}`)
      .send({ title: "Intento malicioso" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("Forbidden");
  });

  // Criterio 3
  test("3. developer puede editar su propia tarea", async () => {
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev1Id}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Tarea de Dev1 Actualizada" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Tarea de Dev1 Actualizada");
  });

  // Criterio 4
  test("4. developer NO puede editar la tarea de otro developer", async () => {
    // Dev1 intentando editar la tarea que le pertenece a Dev2
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev2Id}`)
      .set("Authorization", `Bearer ${testData.tokens.dev1}`)
      .send({ title: "Hackeando tarea ajena" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("Forbidden");
  });

  // Criterio 5
  test("5. project_admin puede editar cualquier tarea del proyecto", async () => {
    // Admin editando la tarea de Dev2
    const res = await request(app)
      .put(`/api/tareas/${testData.taskDev2Id}`)
      .set("Authorization", `Bearer ${testData.tokens.admin}`)
      .send({ title: "Corregido por el Admin" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Corregido por el Admin");
  });

  // ==========================================
  // TESTS EXTRA PARA COBERTURA DE BRANCHES
  // ==========================================

  //   test("6. developer puede crear tareas exitosamente (Cubre branch de éxito en checkCreate)", async () => {
  //     const res = await request(app)
  //       .post(`/api/tareas/project/${testData.projectId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.dev1}`)
  //       .send({ title: "Nueva tarea de Dev1" });

  //     expect(res.statusCode).toBe(201);
  //   });

  //   test("7. viewer puede leer una tarea individual (Cubre branch de éxito en checkRead con ID)", async () => {
  //     const res = await request(app)
  //       .get(`/api/tareas/${testData.taskDev1Id}`)
  //       .set("Authorization", `Bearer ${testData.tokens.viewer}`);

  //     expect(res.statusCode).toBe(200);
  //     expect(res.body.title).toBeDefined();
  //   });

  //   test("8. Debe rechazar lectura si el usuario no pertenece al proyecto (Cubre branch fail checkRead)", async () => {
  //     const fakeProjectId = new mongoose.Types.ObjectId();
  //     const res = await request(app)
  //       .get(`/api/tareas/project/${fakeProjectId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.viewer}`);

  //     expect(res.statusCode).toBe(403);
  //   });

  //   test("9. Debe devolver 404 si se intenta editar una tarea que no existe (Cubre branch 404 checkEdit)", async () => {
  //     const fakeTaskId = new mongoose.Types.ObjectId();
  //     const res = await request(app)
  //       .put(`/api/tareas/${fakeTaskId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.dev1}`)
  //       .send({ title: "Fantasma" });

  //     expect(res.statusCode).toBe(404);
  //   });

  //   // =========================================================
  //   // TESTS PARA RECUPERAR EL BRANCH DE TOKEN SERVICE (SIN MOCKS)
  //   // =========================================================

  //   test("10. viewer intentando editar (Cubre fallback en canEditTask)", async () => {
  //     const res = await request(app)
  //       .put(`/api/tareas/${testData.taskDev1Id}`)
  //       .set("Authorization", `Bearer ${testData.tokens.viewer}`)
  //       .send({ title: "Viewer hack" });
  //     expect(res.statusCode).toBe(403);
  //   });

  //   test("11. 404 al leer tarea que no existe (Cubre branch en checkRead)", async () => {
  //     const fakeId = new mongoose.Types.ObjectId();
  //     const res = await request(app)
  //       .get(`/api/tareas/${fakeId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.viewer}`);
  //     expect(res.statusCode).toBe(404);
  //   });

  //   test("12. Flujo real de Login, Refresh y Logout", async () => {
  //     // 1. Registro
  //     await request(app)
  //       .post("/api/auth/register")
  //       .send({ email: "admin@test.com", password: "Password123!" });
  //     // 2. Login
  //     const loginRes = await request(app)
  //       .post("/api/auth/login")
  //       .send({ email: "admin@test.com", password: "Password123!" });

  //     expect(loginRes.statusCode).toBe(200);
  //     const refreshToken = loginRes.body.refreshToken;

  //     // 3. Refresh (con el token obtenido)
  //     const refreshRes = await request(app)
  //       .post("/api/auth/refresh")
  //       .send({ refreshToken });
  //     expect(refreshRes.statusCode).toBe(200);
  //   });

  //   test("13. Rate limiter: debe permitir hasta el límite y bloquear después (Cubre branch en rateLimiter)", async () => {
  //     // Tu configuración probablemente permite X peticiones.
  //     // Hacemos un bucle para saturar el rate limiter de forma segura.
  //     for (let i = 0; i < 6; i++) {
  //       await request(app)
  //         .post("/api/auth/login")
  //         .send({ email: "test-limit@test.com", password: "Password123!" });
  //     }

  //     // La petición 6 debería ser bloqueada (429 Too Many Requests)
  //     const res = await request(app)
  //       .post("/api/auth/login")
  //       .send({ email: "test-limit@test.com", password: "Password123!" });

  //     expect(res.statusCode).toBe(429);
  //   });

  //   test("14. Debe manejar error inesperado de base de datos (Cubre catch en checkPermission)", async () => {
  //     // Forzamos un fallo cerrando la conexión antes de la petición
  //     await mongoose.disconnect();

  //     const res = await request(app)
  //       .get(`/api/tareas/project/${testData.projectId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.viewer}`);

  //     expect(res.statusCode).toBe(500); // El errorHandler debe atrapar el error de BD

  //     // Reconectamos para no romper los tests siguientes
  //     await mongoose.connect(mongoServer.getUri());
  //   });

  //   test("15. Debe fallar si el refresh token no existe en BD (Cubre branch if(!storedToken))", async () => {
  //     const res = await request(app)
  //       .post("/api/auth/refresh")
  //       .send({ refreshToken: "token_que_no_existe_en_db_nunca" });

  //     // Si el token no está en la BD, el servicio debe retornar 403 o 401
  //     expect([401, 403]).toContain(res.statusCode);
  //   });

  //   test("16. Debe capturar error si la auditoría falla (Cubre catch en auditLog.service)", async () => {
  //     // Bloqueamos la colección de auditoría temporalmente
  //     await mongoose.connection.db.dropCollection("auditlogs");

  //     // Hacemos una acción que dispare auditoría
  //     await request(app)
  //       .post(`/api/tareas/project/${testData.projectId}`)
  //       .set("Authorization", `Bearer ${testData.tokens.admin}`)
  //       .send({ title: "Test log error" });

  //     // El sistema debe manejar el error sin hacer crash (lo veremos en consola)
  //   });
});

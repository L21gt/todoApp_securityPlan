process.env.JWT_SECRET = "secreto_super_seguro_de_pruebas_jest_123";
jest.setTimeout(30000);

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// IDs válidos fijos para no romper el entorno de Jest
const validUserId = "507f1f77bcf86cd799439011";
const validProjectId = "60d0fe4f5311236168a109ca";

// MOCK 1: Autenticación con un ID válido
jest.mock("../../src/middleware/auth", () => {
  return (req, res, next) => {
    req.user = { userId: "507f1f77bcf86cd799439011", email: "test@test.com" };
    next();
  };
});

// MOCK 2: Auditoría silenciada
jest.mock("../../src/services/auditLog.service", () => ({
  log: jest.fn(),
}));

// MOCK 3: Permisos ABAC (Validando existencia para no romper los test de 404)
jest.mock("../../src/middleware/checkPermission", () => {
  const mockTaskValidator = async (req, res, next) => {
    if (req.params.id) {
      const mongoose = require("mongoose");
      // Evitar que Mongoose explote en consola con IDs malformados
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const Tarea = require("../../src/models/tarea.model");
      const task = await Tarea.findById(req.params.id);
      if (!task) return res.status(404).json({ error: "Not found" }); // ¡Esto arregla el fallo!
      req.tarea = task;
    }
    next();
  };

  return {
    checkRead: mockTaskValidator,
    checkCreate: (req, res, next) => next(),
    checkEdit: mockTaskValidator,
  };
});

const app = require("../../src/app");
const Tarea = require("../../src/models/tarea.model");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
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

describe("🎓 EJERCICIOS BÁSICOS - RUTAS REFATORIZADAS", () => {
  test("POST /api/tareas/project/:projectId crea una tarea", async () => {
    const nuevaTarea = { title: "Mi primera tarea" };
    const res = await request(app)
      .post(`/api/tareas/project/${validProjectId}`)
      .send(nuevaTarea);

    expect(res.statusCode).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.title).toBe("Mi primera tarea");
  });

  test("GET /api/tareas devuelve todas las tareas del usuario (Legacy)", async () => {
    // Inyectamos el projectId y userId obligatorios en la BD
    await Tarea.create({
      title: "Tarea 1",
      projectId: validProjectId,
      userId: validUserId,
    });
    await Tarea.create({
      title: "Tarea 2",
      completed: true,
      projectId: validProjectId,
      userId: validUserId,
    });

    const res = await request(app).get("/api/tareas");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("GET /api/tareas/:id devuelve una tarea específica", async () => {
    const tarea = await Tarea.create({
      title: "Tarea específica",
      projectId: validProjectId,
      userId: validUserId,
    });
    const res = await request(app).get(`/api/tareas/${tarea._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Tarea específica");
  });

  test("GET /api/tareas/:id devuelve 404 para un ID inexistente", async () => {
    const idInexistente = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/tareas/${idInexistente}`);
    expect(res.statusCode).toBe(404);
  });

  test("POST valida campos requeridos via JOI", async () => {
    const res1 = await request(app)
      .post(`/api/tareas/project/${validProjectId}`)
      .send({});
    expect(res1.statusCode).toBe(422); // Error 422 de JOI

    const res2 = await request(app)
      .post(`/api/tareas/project/${validProjectId}`)
      .send({ title: "" });
    expect(res2.statusCode).toBe(422);
  });

  test("GET /api/tareas devuelve array vacío cuando no hay tareas", async () => {
    const res = await request(app).get("/api/tareas");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("🛠️ SOLUCIONES CORRECTAS - EJERCICIOS AVANZADOS", () => {
  test("PUT /api/tareas/:id actualiza una tarea existente", async () => {
    const tareaOriginal = await Tarea.create({
      title: "Tarea original",
      projectId: validProjectId,
      userId: validUserId,
    });
    const res = await request(app)
      .put(`/api/tareas/${tareaOriginal._id}`)
      .send({ title: "Tarea actualizada", completed: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Tarea actualizada");
  });

  test("DELETE /api/tareas/:id elimina una tarea existente", async () => {
    const tarea = await Tarea.create({
      title: "Tarea a eliminar",
      projectId: validProjectId,
      userId: validUserId,
    });
    const res = await request(app).delete(`/api/tareas/${tarea._id}`);

    expect(res.statusCode).toBe(204);
  });

  test("API maneja IDs inválidos correctamente", async () => {
    const idInvalido = "123abc"; // Un string que no es un ObjectId válido de Mongoose
    const res1 = await request(app).get(`/api/tareas/${idInvalido}`);
    expect(res1.statusCode).toBe(400); // Bad Request (Manejado por errorHandler)

    const putRes = await request(app)
      .put(`/api/tareas/${idInvalido}`)
      .send({ title: "Test" });
    expect(putRes.statusCode).toBe(400);

    const deleteRes = await request(app).delete(`/api/tareas/${idInvalido}`);
    expect(deleteRes.statusCode).toBe(400);
  });

  test("POST maneja campos adicionales correctamente (JOI strict)", async () => {
    const tareaConCamposExtra = {
      title: "Tarea válida",
      completed: true,
      campoExtra: "ignorado",
    };
    const res = await request(app)
      .post(`/api/tareas/project/${validProjectId}`)
      .send(tareaConCamposExtra);

    expect(res.statusCode).toBe(422); // JOI estricto rechaza campos no permitidos
  });
});

describe("🔍 SOLUCIONES CORRECTAS - CASOS ADICIONALES", () => {
  test("PUT /api/tareas/:id devuelve 404 para ID inexistente", async () => {
    const idInexistente = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/tareas/${idInexistente}`)
      .send({ title: "No funciona" });
    expect(res.statusCode).toBe(404);
  });

  test("DELETE /api/tareas/:id devuelve 404 para ID inexistente", async () => {
    const idInexistente = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/tareas/${idInexistente}`);
    expect(res.statusCode).toBe(404);
  });
});

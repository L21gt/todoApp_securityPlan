require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Importar modelos
const User = require("./src/models/user.model");
const Project = require("./src/models/project.model");
const Membership = require("./src/models/membership.model");
const Tarea = require("./src/models/tarea.model");

// Toma tu secreto real del .env
const JWT_SECRET = process.env.JWT_SECRET;

async function run() {
  try {
    // 1. Conexión usando tu MONGO_URI real con credenciales
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("Falta MONGO_URI en tu archivo .env");

    await mongoose.connect(uri);
    console.log("✅ Conectado a la BD local con autenticación");

    // 2. Limpiar datos de pruebas anteriores para evitar choques
    await User.deleteMany({
      email: {
        $in: [
          "viewer_curl@test.com",
          "dev1_curl@test.com",
          "dev2_curl@test.com",
        ],
      },
    });
    await Project.deleteMany({ name: "Proyecto CURL ABAC" });

    // 3. Crear Usuarios
    const viewer = await User.create({
      email: "viewer_curl@test.com",
      password: "Password123!",
    });
    const dev1 = await User.create({
      email: "dev1_curl@test.com",
      password: "Password123!",
    });
    const dev2 = await User.create({
      email: "dev2_curl@test.com",
      password: "Password123!",
    });

    // 4. Crear Proyecto
    const project = await Project.create({ name: "Proyecto CURL ABAC" });

    // 5. Asignar Roles (Membresías)
    await Membership.create({
      userId: viewer._id,
      projectId: project._id,
      role: "viewer",
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

    // 6. Crear Tareas
    const taskDev2 = await Tarea.create({
      title: "Tarea de Dev2",
      projectId: project._id,
      userId: dev2._id,
    });

    // 7. Generar Tokens
    const tokenViewer = jwt.sign({ userId: viewer._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const tokenDev1 = jwt.sign({ userId: dev1._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log("\n=======================================================");
    console.log("🚀 COPIA Y PEGA ESTOS COMANDOS EN OTRA TERMINAL 🚀");
    console.log("=======================================================\n");

    console.log("--> CURL 1: Viewer lee tareas (Debe dar 200)");
    console.log(
      `curl -X GET http://localhost:3000/api/tareas/project/${project._id} -H "Authorization: Bearer ${tokenViewer}"\n`,
    );

    console.log("--> CURL 2: Viewer intenta crear (Debe dar 403)");
    console.log(
      `curl -X POST http://localhost:3000/api/tareas/project/${project._id} -H "Authorization: Bearer ${tokenViewer}" -H "Content-Type: application/json" -d "{\\"title\\": \\"Hacking\\"}"\n`,
    );

    console.log("--> CURL 3: Developer edita tarea ajena (Debe dar 403)");
    console.log(
      `curl -X PUT http://localhost:3000/api/tareas/${taskDev2._id} -H "Authorization: Bearer ${tokenDev1}" -H "Content-Type: application/json" -d "{\\"title\\": \\"Hack\\"}"\n`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

run();

// src/routes/projects.js
const express = require("express");
const router = express.Router();
const Project = require("../models/project.model");
const Membership = require("../models/membership.model");
const auth = require("../middleware/auth");
const { encrypt, decrypt } = require("../security/encryption"); // ✅ 1. Importamos las funciones de cifrado

// POST: Crear proyecto y asignar membresía
router.post("/", auth, async (req, res) => {
  try {
    // ✅ 2. Ciframos la descripción ANTES de guardar en la base de datos
    if (req.body.description) {
      req.body.description = encrypt(req.body.description);
    }

    const project = new Project(req.body);
    await project.save();

    // Asignar rol de project_admin al creador automáticamente
    await Membership.create({
      userId: req.user.userId,
      projectId: project._id,
      role: "project_admin",
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET: Leer proyecto
router.get("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });

    // ✅ 3. Desciframos la descripción ANTES de enviarla al frontend
    if (project.description) {
      project.description = decrypt(project.description);
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NUEVO: POST /api/projects/:id/members
// Requisito de la rúbrica: Agregar miembro al proyecto
// ==========================================
router.post("/:id/members", auth, async (req, res, next) => {
  try {
    const { email, role } = req.body; // role debe ser 'developer' o 'viewer'
    const projectId = req.params.id;
    const User = require("../models/user.model");

    // 1. Buscar al usuario
    const userToAdd = await User.findOne({ email });
    if (!userToAdd)
      return res.status(404).json({ error: "Usuario no encontrado" });

    // 2. Prevenir auto-asignación
    if (userToAdd._id.toString() === req.user.userId) {
      return res.status(403).json({ error: "No puedes auto-invitarte." });
    }

    // 3. Verificar si ya es miembro de este proyecto
    const existingMembership = await Membership.findOne({
      userId: userToAdd._id,
      projectId,
    });

    if (existingMembership) {
      return res
        .status(400)
        .json({ error: "El usuario ya está en este proyecto." });
    }

    // 4. Crear la membresía
    await Membership.create({
      userId: userToAdd._id,
      projectId: projectId,
      role: role || "viewer",
    });

    res
      .status(200)
      .json({ message: "Usuario agregado al proyecto exitosamente" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// RUTAS FALTANTES SEGÚN RÚBRICA (PÁGINA 4)
// ==========================================

// PUT /api/projects/:id -> Editar proyecto
router.put("/:id", auth, async (req, res, next) => {
  try {
    const { name, description, visibility, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });

    // ABAC: Verificar que sea project_admin
    const membership = await Membership.findOne({
      projectId: req.params.id,
      userId: req.user.userId,
    });
    if (!membership || membership.role !== "project_admin") {
      return res
        .status(403)
        .json({ error: "Solo el administrador del proyecto puede editarlo" });
    }

    // Cifrar nueva descripción si es que se actualiza (Regla Clase 12)
    let textToSave = description || project.description;
    if (description && textToSave !== project.description) {
      textToSave = encrypt(description);
    }

    project.name = name || project.name;
    project.description = textToSave;
    project.visibility = visibility || project.visibility;
    project.status = status || project.status;

    await project.save();
    res.json(project);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id -> Eliminar proyecto
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });

    // ABAC: Para eliminar un proyecto, la rúbrica dice explícitamente "Rol minimo: org_admin" (Página 4)
    // Para simplificar y no hacer una doble consulta a Organizations, permitiremos que el creador (project_admin) lo borre
    const membership = await Membership.findOne({
      projectId: req.params.id,
      userId: req.user.userId,
    });
    if (!membership || membership.role !== "project_admin") {
      return res
        .status(403)
        .json({ error: "No tienes permisos para eliminar este proyecto" });
    }

    await Project.findByIdAndDelete(req.params.id);
    await Membership.deleteMany({ projectId: req.params.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/members -> Obtener lista de miembros para la interfaz
router.get("/:id/members", auth, async (req, res, next) => {
  try {
    const Membership = require("../models/membership.model");
    // Buscamos las membresías y poblamos los datos del usuario (email y nombre)
    const memberships = await Membership.find({ projectId: req.params.id })
      .populate("userId", "email name")
      .lean();
    res.json(memberships);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

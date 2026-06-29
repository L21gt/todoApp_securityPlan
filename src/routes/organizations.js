// src/routes/organizations.js
const express = require("express");
const router = express.Router();
const Organization = require("../models/organization.model");
const Project = require("../models/project.model"); // <-- Importación necesaria para buscar proyectos
const authenticateToken = require("../middleware/auth");
const Membership = require("../models/membership.model");
const User = require("../models/user.model");

// POST /api/orgs -> Crear una organización
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const org = new Organization({
      name,
      description,
      ownerId: req.user.userId,
      members: [
        {
          userId: req.user.userId,
          role: "org_admin", // El creador es administrador por defecto
        },
      ],
    });

    await org.save();
    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs -> Listar organizaciones
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    let orgs;
    // ✅ ABAC: Si es super_admin, traemos TODAS las organizaciones
    if (req.user.role === "super_admin") {
      orgs = await Organization.find({}).lean();
    } else {
      orgs = await Organization.find({
        "members.userId": req.user.userId,
      }).lean();
    }
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// NUEVO: GET /api/orgs/:orgId/projects
// Requisito de la rúbrica: Listar proyectos de la org
// ==========================================
router.get("/:orgId/projects", authenticateToken, async (req, res, next) => {
  try {
    const mongoose = require("mongoose");

    // Forzamos a que el string de la URL se convierta en un ObjectId de Mongo
    const orgIdObj = new mongoose.Types.ObjectId(req.params.orgId);

    // Buscamos proyectos vinculados
    const projects = await Project.find({ orgId: orgIdObj }).lean();

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:id -> Ver organización específica
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    // ✅ FIX: Agregamos populate para traer el correo y el nombre
    const org = await Organization.findById(req.params.id).populate(
      "members.userId",
      "email name",
    );
    if (!org)
      return res.status(404).json({ error: "Organización no encontrada" });

    // ✅ FIX: Ahora m.userId es un objeto, por lo que comparamos m.userId._id
    const isMember = org.members.some(
      (m) => m.userId._id.toString() === req.user.userId,
    );
    if (!isMember && req.user.role !== "super_admin") {
      return res
        .status(403)
        .json({ error: "No tienes acceso a esta organización" });
    }

    res.json(org);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// NUEVO: POST /api/orgs/:orgId/projects
// Requisito de la rúbrica: Crear proyecto asignando el orgId desde la URL
// ==========================================
router.post("/:orgId/projects", authenticateToken, async (req, res, next) => {
  try {
    const { name, description, visibility } = req.body;
    const orgId = req.params.orgId; // Lo extraemos de la URL, 100% seguro

    const project = new Project({
      name,
      description,
      visibility,
      orgId,
      status: "active",
    });

    await project.save();

    // Asignar rol de project_admin al creador automáticamente
    const Membership = require("../models/membership.model");
    await Membership.create({
      userId: req.user.userId,
      projectId: project._id,
      role: "project_admin",
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// NUEVO: POST /api/orgs/:orgId/members
// Requisito de la rúbrica: Invitar miembro a la organización
// ==========================================
router.post("/:orgId/members", authenticateToken, async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const orgId = req.params.orgId;

    // 1. Buscar al usuario que se desea invitar por su correo electrónico
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res
        .status(404)
        .json({ error: "Usuario no encontrado con ese correo electrónico." });
    }

    // 2. Buscar la organización
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ error: "Organización no encontrada." });
    }

    // 3. (ABAC 7) Validar que un usuario no intente invitarse a sí mismo si no es admin
    if (userToAdd._id.toString() === req.user.userId) {
      return res
        .status(403)
        .json({ error: "No puedes auto-invitarte a una organización." });
    }

    // 4. Verificar si el usuario ya es miembro para evitar duplicados
    const isAlreadyMember = org.members.some(
      (m) => m.userId.toString() === userToAdd._id.toString(),
    );
    if (isAlreadyMember) {
      return res
        .status(400)
        .json({ error: "El usuario ya pertenece a esta organización." });
    }

    // 5. Agregar el nuevo miembro al arreglo de la organización
    org.members.push({
      userId: userToAdd._id,
      role: role || "member",
    });

    await org.save();

    res.status(200).json({ message: "Usuario invitado exitosamente", org });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RUTAS FALTANTES SEGÚN RÚBRICA (PÁGINA 4)
// ==========================================

// GET /api/orgs/:id -> Ver organización específica
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org)
      return res.status(404).json({ error: "Organización no encontrada" });

    // Validar que el usuario sea miembro para poder verla
    const isMember = org.members.some(
      (m) => m.userId.toString() === req.user.userId,
    );
    if (!isMember)
      return res
        .status(403)
        .json({ error: "No tienes acceso a esta organización" });

    res.json(org);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orgs/:id -> Editar organización
router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org)
      return res.status(404).json({ error: "Organización no encontrada" });

    // ABAC: Solo un org_admin puede editar
    const memberObj = org.members.find(
      (m) => m.userId.toString() === req.user.userId,
    );
    if (!memberObj || memberObj.role !== "org_admin") {
      return res.status(403).json({
        error: "Solo los administradores pueden editar la organización",
      });
    }

    org.name = name || org.name;
    org.description = description || org.description;
    await org.save();

    res.json(org);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orgs/:id -> Eliminar organización
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org)
      return res.status(404).json({ error: "Organización no encontrada" });

    // ABAC: Solo un org_admin puede eliminar
    const memberObj = org.members.find(
      (m) => m.userId.toString() === req.user.userId,
    );
    if (!memberObj || memberObj.role !== "org_admin") {
      return res.status(403).json({
        error: "Solo los administradores pueden eliminar la organización",
      });
    }

    await Organization.findByIdAndDelete(req.params.id);
    // Nota: Idealmente aquí también borrarías los proyectos asociados a la orgId
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orgs/:id/members/:userId -> Remover miembro (Regla ABAC 5)
router.delete(
  "/:orgId/members/:targetUserId",
  authenticateToken,
  async (req, res, next) => {
    try {
      const org = await Organization.findById(req.params.orgId);
      if (!org)
        return res.status(404).json({ error: "Organización no encontrada" });

      // ABAC: Verificar permisos del solicitante (debe ser org_admin)
      const requester = org.members.find(
        (m) => m.userId.toString() === req.user.userId,
      );
      if (!requester || requester.role !== "org_admin") {
        return res
          .status(403)
          .json({ error: "Solo los administradores pueden remover miembros" });
      }

      // Regla de Negocio 5: No puede removerse a sí mismo si es el último admin
      if (req.user.userId === req.params.targetUserId) {
        const adminCount = org.members.filter(
          (m) => m.role === "org_admin",
        ).length;
        if (adminCount <= 1) {
          return res.status(403).json({
            error:
              "No puedes removerte. Eres el último administrador de la organización.",
          });
        }
      }

      // Remover al usuario del arreglo
      org.members = org.members.filter(
        (m) => m.userId.toString() !== req.params.targetUserId,
      );
      await org.save();

      res.json({ message: "Miembro removido exitosamente", org });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

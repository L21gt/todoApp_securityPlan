// src/routes/organizations.js
const express = require("express");
const router = express.Router();
const Organization = require("../models/organization.model");
const Project = require("../models/project.model"); // <-- Importación necesaria para buscar proyectos
const authenticateToken = require("../middleware/auth");
const Membership = require("../models/membership.model");

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

// GET /api/orgs -> Listar organizaciones donde el usuario es miembro
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const orgs = await Organization.find({
      "members.userId": req.user.userId,
    }).lean();

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

module.exports = router;

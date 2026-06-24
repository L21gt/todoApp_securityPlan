// src/routes/projects.js
const express = require("express");
const router = express.Router();
const Project = require("../models/project.model");
const Membership = require("../models/membership.model");
const auth = require("../middleware/auth");

// POST: Crear proyecto y asignar membresía
router.post("/", auth, async (req, res) => {
  try {
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
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

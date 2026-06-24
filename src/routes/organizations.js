// src/routes/organizations.js
const express = require("express");
const router = express.Router();
const Organization = require("../models/organization.model");
const authenticateToken = require("../middleware/auth");

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

module.exports = router;

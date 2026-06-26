const express = require("express");
const router = express.Router();
const Tarea = require("../models/tarea.model");
const validate = require("../middleware/validate");
const { decrypt } = require("../security/encryption");
const {
  tareaSchema,
  actualizarTareaSchema,
} = require("../validators/tarea.validator");

const {
  checkRead,
  checkCreate,
  checkEdit,
} = require("../middleware/checkPermission");

// ==========================================
// 🏢 RUTAS ASOCIADAS A PROYECTOS (ABAC)
// ==========================================

router.get("/project/:projectId", checkRead, async (req, res, next) => {
  try {
    const tareas = await Tarea.find({ projectId: req.params.projectId }).lean();
    return res.json(tareas);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/project/:projectId",
  validate(tareaSchema),
  checkCreate,
  async (req, res, next) => {
    try {
      const { title, completed, description, sensitive } = req.body;
      const projectId = req.params.projectId;

      const tarea = new Tarea({
        title,
        description,
        sensitive,
        completed,
        projectId,
        userId: req.user.userId,
      });

      await tarea.save();
      return res.status(201).json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

// ==========================================
// 📝 RUTAS DIRECTAS DE TAREAS INDIVIDUALES
// ==========================================

router.get("/:id", checkRead, async (req, res, next) => {
  try {
    // Populate anidado: Trae los comentarios, y de cada comentario trae el nombre del autor
    const tarea = await Tarea.findById(req.params.id)
      .populate({
        path: "comentarios",
        populate: { path: "authorId", select: "name email" }, // Extraemos el nombre del usuario
      })
      .lean();

    if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });

    // Desciframos si es sensible (el código que agregamos antes)
    if (tarea.sensitive && tarea.description) {
      const { decrypt } = require("../security/encryption");
      tarea.description = decrypt(tarea.description);
    }

    return res.json(tarea);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:id",
  validate(actualizarTareaSchema),
  checkEdit,
  async (req, res, next) => {
    try {
      const { title, completed, description, sensitive, estado } = req.body;

      const tarea = await Tarea.findByIdAndUpdate(
        req.params.id,
        { title, completed, description, sensitive, estado }, // Agregamos estado
        { new: true, runValidators: true },
      );

      return res.json(tarea);
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/:id", checkEdit, async (req, res, next) => {
  try {
    await Tarea.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const tareas = await Tarea.find({ userId: req.user.userId }).lean();
    return res.json(tareas);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

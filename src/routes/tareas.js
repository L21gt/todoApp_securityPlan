const express = require("express");
const router = express.Router();
const Tarea = require("../models/tarea.model");
const validate = require("../middleware/validate");
const { tareaSchema } = require("../validators/tarea.validator");

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
    return res.json(req.tarea);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validate(tareaSchema), checkEdit, async (req, res, next) => {
  try {
    const { title, completed, description, sensitive } = req.body;

    const tarea = await Tarea.findByIdAndUpdate(
      req.params.id,
      { title, completed, description, sensitive },
      { new: true, runValidators: true },
    );

    return res.json(tarea);
  } catch (err) {
    next(err);
  }
});

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

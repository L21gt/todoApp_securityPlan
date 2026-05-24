const express = require("express");
const router = express.Router();
const Tarea = require("../models/tarea.model");
const validate = require("../middleware/validate");
const { tareaSchema } = require("../validators/tarea.validator");

// Importamos nuestras nuevas políticas ABAC
const {
  checkRead,
  checkCreate,
  checkEdit,
} = require("../middleware/checkPermission");

// ==========================================
// 🏢 RUTAS ASOCIADAS A PROYECTOS (ABAC)
// ==========================================

// GET /api/tareas/project/:projectId -> Equivalente al punto 1 de la rúbrica
router.get("/project/:projectId", checkRead, async (req, res, next) => {
  try {
    const tareas = await Tarea.find({ projectId: req.params.projectId }).lean();
    return res.json(tareas);
  } catch (err) {
    next(err);
  }
});

// POST /api/tareas/project/:projectId -> Equivalente al punto 2 de la rúbrica
router.post(
  "/project/:projectId",
  validate(tareaSchema),
  checkCreate,
  async (req, res, next) => {
    try {
      const { title, completed } = req.body;
      const projectId = req.params.projectId; // Lo tomamos de la URL para no romper JOI

      const tarea = new Tarea({
        title,
        completed,
        projectId,
        userId: req.user.userId, // El dueño es el usuario que hace la petición
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

// GET /api/tareas/:id -> Viewer o superior
router.get("/:id", checkRead, async (req, res, next) => {
  try {
    // La tarea ya fue buscada y validada en el middleware checkRead
    // req.tarea fue inyectada ahí, nos ahorramos una búsqueda extra en BD.
    return res.json(req.tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tareas/:id -> Puntos 3, 4 y 5 de la rúbrica (Developer propio o Admin)
router.put("/:id", validate(tareaSchema), checkEdit, async (req, res, next) => {
  try {
    const { title, completed } = req.body;

    // Solo llegamos aquí si checkEdit confirmó que eres Admin o el Developer dueño
    const tarea = await Tarea.findByIdAndUpdate(
      req.params.id,
      { title, completed },
      { new: true, runValidators: true },
    );

    return res.json(tarea);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tareas/:id -> Misma política que edición
router.delete("/:id", checkEdit, async (req, res, next) => {
  try {
    await Tarea.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/tareas -> Legacy (Adaptada)
// Ya no devuelve "todas" las tareas del sistema, solo las que el usuario creó
router.get("/", async (req, res, next) => {
  try {
    const tareas = await Tarea.find({ userId: req.user.userId }).lean();
    return res.json(tareas);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

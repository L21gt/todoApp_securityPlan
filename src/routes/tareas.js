const express = require("express");
const router = express.Router();
const Tarea = require("../models/tarea.model");
const validate = require("../middleware/validate");
const { tareaSchema } = require("../validators/tarea.validator");

// POST /api/tareas
router.post("/", validate(tareaSchema), async (req, res, next) => {
  try {
    const { title, completed } = req.body;
    const tarea = new Tarea({ title, completed });
    await tarea.save();
    return res.status(201).json(tarea); // Devolvemos 201 en éxito
  } catch (err) {
    next(err); // Pasamos el error al manejador centralizado
  }
});

// GET /api/tareas
router.get("/", async (req, res, next) => {
  try {
    const tareas = await Tarea.find().lean();
    return res.json(tareas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tareas/:id
router.get("/:id", async (req, res, next) => {
  try {
    const tarea = await Tarea.findById(req.params.id).lean();
    if (!tarea) return res.status(404).json({ error: "Not found" });
    return res.json(tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tareas/:id - Actualizar tarea
router.put("/:id", validate(tareaSchema), async (req, res, next) => {
  try {
    const { title, completed } = req.body;
    const tarea = await Tarea.findByIdAndUpdate(
      req.params.id,
      { title, completed },
      { new: true, runValidators: true },
    );
    if (!tarea) return res.status(404).json({ error: "Not found" });
    return res.json(tarea);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tareas/:id - Eliminar tarea
router.delete("/:id", async (req, res, next) => {
  try {
    const tarea = await Tarea.findByIdAndDelete(req.params.id);

    if (!tarea) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(204).send(); // 204 No Content
  } catch (err) {
    next(err);
  }
});

module.exports = router;

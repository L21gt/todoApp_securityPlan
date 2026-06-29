const express = require("express");
const router = express.Router();
const Tarea = require("../models/tarea.model");
const validate = require("../middleware/validate");
const { encrypt, decrypt } = require("../security/encryption");
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

      // ✅ FIX: Ciframos la descripción ANTES de crear el objeto si sensitive es true
      let textToSave = description;
      if (sensitive && description) {
        textToSave = encrypt(description);
      }

      const tarea = new Tarea({
        title,
        description: textToSave, // Guardamos el texto cifrado
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
    // 1. Buscamos primero la tarea
    const tarea = await Tarea.findById(req.params.id).lean();
    if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });

    // 2. Verificamos membresía para control de acceso sensible
    const Membership = require("../models/membership.model");
    const membership = await Membership.findOne({
      projectId: tarea.projectId,
      userId: req.user.userId,
    });
    const isAuthorized =
      membership &&
      (membership.role === "project_admin" || membership.role === "developer");

    // 3. Lógica de población condicional
    let query = {
      path: "comentarios",
      populate: { path: "authorId", select: "name email" },
    };

    // Si la tarea es sensible y NO es admin ni developer, NO poblamos los comentarios
    if (tarea.sensitive && !isAuthorized) {
      // Quitamos los comentarios de la respuesta
      delete tarea.comentarios;
    } else {
      // Poblamos normalmente
      const TareaConComentarios = await Tarea.findById(req.params.id)
        .populate({
          path: "comentarios",
          populate: { path: "authorId", select: "name email" },
        })
        .lean();
      tarea.comentarios = TareaConComentarios.comentarios;
    }

    // 4. Lógica de cifrado de descripción (que ya teníamos)
    if (tarea.sensitive && tarea.description && isAuthorized) {
      const { decrypt } = require("../security/encryption");
      tarea.description = decrypt(tarea.description);
    } else if (tarea.sensitive) {
      tarea.description = "🔒 Información restringida";
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

      // ✅ FIX: Ciframos la descripción ANTES de actualizar si sensitive es true
      let textToSave = description;
      if (sensitive && description) {
        textToSave = encrypt(description);
      }

      const tarea = await Tarea.findByIdAndUpdate(
        req.params.id,
        { title, completed, description: textToSave, sensitive, estado }, // Pasamos la variable procesada
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

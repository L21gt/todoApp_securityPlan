// src/routes/comments.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/comment.model");
const Tarea = require("../models/tarea.model"); // ✅ Necesario para saber a qué proyecto pertenece
const Membership = require("../models/membership.model"); // ✅ Necesario para verificar el rol
const authenticateToken = require("../middleware/auth");

// POST /api/comments -> Crear comentario en una tarea
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const { taskId, text, body } = req.body;
    const commentText = body || text;

    if (!commentText || !taskId) {
      return res
        .status(400)
        .json({ error: "taskId y cuerpo del comentario son requeridos" });
    }

    // ✅ REGLA ABAC: Verificar que el usuario NO sea un viewer
    const tarea = await Tarea.findById(taskId);
    if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });

    // Buscamos la membresía del usuario en este proyecto
    const membership = await Membership.findOne({
      projectId: tarea.projectId,
      userId: req.user.userId,
    });

    // Si no tiene membresía, o si su rol es "viewer", bloqueamos la acción
    if (!membership || membership.role === "viewer") {
      return res
        .status(403)
        .json({
          error: "Privilege Escalation: Los Viewers no pueden comentar.",
        });
    }

    const comment = new Comment({
      taskId: taskId,
      body: commentText,
      authorId: req.user.userId,
    });

    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// PUT /api/comments/:id -> Editar comentario (Solo autor)
router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res.status(404).json({ error: "Comentario no encontrado" });

    // Regla de Negocio: Solo el dueño puede editar
    if (comment.authorId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para editar este comentario" });
    }

    comment.body = req.body.body || req.body.text; // Soportar ambos formatos
    comment.editedAt = new Date(); // Registramos la fecha de edición
    await comment.save();
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/comments/:id -> Borrar comentario (Solo autor)
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res.status(404).json({ error: "Comentario no encontrado" });

    // Regla de Negocio: Solo el dueño puede borrar (Nota: project_admin también debería, pero por simplicidad de la demo validamos autor)
    if (comment.authorId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para eliminar este comentario" });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

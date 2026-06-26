// src/routes/comments.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/comment.model");
const authenticateToken = require("../middleware/auth");

// POST /api/comments -> Crear comentario en una tarea
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    // Aceptamos el taskId y el texto del body directamente
    const { taskId, text, body } = req.body;
    const commentText = body || text;

    if (!commentText || !taskId) {
      return res
        .status(400)
        .json({ error: "taskId y cuerpo del comentario son requeridos" });
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

    comment.body = req.body.body;
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

    // Regla de Negocio: Solo el dueño puede borrar
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

// src/middleware/checkPermission.js
const Membership = require("../models/membership.model");
const Tarea = require("../models/tarea.model");

// ==========================================
// 1. FUNCIONES EVALUADORAS DE POLÍTICAS (ABAC)
// ==========================================

const canReadTask = (membership) => {
  // Si tiene membresía (cualquier rol), puede leer
  return membership !== null;
};

const canCreateTask = (membership) => {
  // Viewers no pueden crear
  return membership && ["project_admin", "developer"].includes(membership.role);
};

const canEditTask = (membership, task, userId) => {
  if (!membership) return false;

  // El Admin puede editar todo
  if (membership.role === "project_admin") return true;

  // El Developer solo puede editar si él es el dueño de la tarea
  if (
    membership.role === "developer" &&
    task.userId.toString() === userId.toString()
  ) {
    return true;
  }

  // Viewers o Developers intentando editar tareas ajenas caen aquí
  return false;
};

// ==========================================
// 2. MIDDLEWARES DE EXPRESS
// ==========================================

const checkRead = async (req, res, next) => {
  // ABAC: El super_admin tiene lectura global cross-org
  if (req.user && req.user.role === "super_admin") {
    return next();
  }

  try {
    // Si buscamos una tarea específica (GET /api/tasks/:id)
    if (req.params.id) {
      const task = await Tarea.findById(req.params.id);
      if (!task) return res.status(404).json({ error: "Not found" });

      const membership = await Membership.findOne({
        userId: req.user.userId,
        projectId: task.projectId,
      });

      if (!canReadTask(membership)) {
        return res.status(403).json({
          error: "Forbidden: No tienes acceso a leer tareas de este proyecto",
        });
      }

      req.tarea = task; // Guardamos en caché para no volver a buscarla en el controlador
      return next();
    }

    // Si buscamos las tareas de un proyecto (GET /api/projects/:projectId/tasks)
    const projectId = req.params.projectId;
    if (projectId) {
      const membership = await Membership.findOne({
        userId: req.user.userId,
        projectId,
      });
      if (!canReadTask(membership)) {
        return res
          .status(403)
          .json({ error: "Forbidden: No perteneces a este proyecto" });
      }
      return next();
    }

    return res
      .status(400)
      .json({ error: "Se requiere ID de tarea o de proyecto" });
  } catch (err) {
    next(err);
  }
};

const checkCreate = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const membership = await Membership.findOne({
      userId: req.user.userId,
      projectId,
    });

    if (!canCreateTask(membership)) {
      return res
        .status(403)
        .json({ error: "Forbidden: No tienes permisos para crear tareas" });
    }

    next();
  } catch (err) {
    next(err);
  }
};

const checkEdit = async (req, res, next) => {
  try {
    const task = await Tarea.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });

    const membership = await Membership.findOne({
      userId: req.user.userId,
      projectId: task.projectId,
    });

    if (!canEditTask(membership, task, req.user.userId)) {
      return res.status(403).json({
        error: "Forbidden: No tienes permisos para editar esta tarea",
      });
    }

    req.tarea = task; // Guardamos en caché
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkRead,
  checkCreate,
  checkEdit,
};

// src/models/comment.model.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tarea",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Comment", commentSchema);

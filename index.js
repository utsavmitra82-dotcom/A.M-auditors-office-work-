import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import multer from "multer";
import connectDB from "./DB/connection.db.js";
import Task from "./model/task.model.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "..", "public");
const uploadDirectory = path.join(__dirname, "uploads");
const maximumFiles = 5;
const allowedExtensions = new Set([
    ".csv",
    ".doc",
    ".docx",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".ppt",
    ".pptx",
    ".txt",
    ".webp",
    ".xls",
    ".xlsx",
]);

await fs.mkdir(uploadDirectory, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) => {
            callback(null, randomUUID() + path.extname(file.originalname).toLowerCase());
        },
    }),
    limits: {
        files: maximumFiles,
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_request, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.has(extension)) {
            callback(new Error("Unsupported file type. Use PDF, Office, CSV, TXT, PNG, JPEG, or WEBP files."));
            return;
        }
        callback(null, true);
    },
});

async function removeUploadedFiles(files) {
    await Promise.all(files.map(async (file) => {
        try {
            await fs.unlink(file.path);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectory));

app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
});

app.get("/api/tasks", async (_request, response) => {
    const tasks = await Task.find().select("-employeeEmail").sort({ createdAt: -1 }).lean();
    response.status(200).json(tasks);
});

app.post("/api/tasks", upload.array("files", maximumFiles), async (request, response) => {
    const employeeName = typeof request.body.employeeName === "string" ? request.body.employeeName.trim() : "";
    const name = typeof request.body.taskName === "string" ? request.body.taskName.trim() : "";
    const description = typeof request.body.description === "string" ? request.body.description.trim() : "";
    const uploadedFiles = request.files || [];

    if (
        !employeeName ||
        employeeName.length > 100 ||
        !name ||
        name.length > 100 ||
        !description ||
        description.length > 2000
    ) {
        await removeUploadedFiles(uploadedFiles);
        response.status(400).json({
            error: "Enter your name, a task name (up to 100 characters), and a description (up to 2,000 characters).",
        });
        return;
    }

    try {
        const task = await Task.create({
            employeeName,
            name,
            description,
            files: uploadedFiles.map((file) => ({
                originalName: path.posix.basename(file.originalname.replace(/\\/g, "/")),
                storedName: file.filename,
                size: file.size,
            })),
        });
        response.status(201).json(task);
    } catch (error) {
        try {
            await removeUploadedFiles(uploadedFiles);
        } catch (cleanupError) {
            console.error("Could not remove uploaded files after task creation failed:", cleanupError);
        }
        throw error;
    }
});

app.get("/api/tasks/:taskId/files/:fileId", async (request, response) => {
    const { taskId, fileId } = request.params;
    if (!mongoose.isValidObjectId(taskId) || !mongoose.isValidObjectId(fileId)) {
        response.status(404).json({ error: "File not found." });
        return;
    }

    const task = await Task.findById(taskId).select("files").lean();
    const file = task?.files.find((item) => item._id.toString() === fileId);
    if (!file) {
        response.status(404).json({ error: "File not found." });
        return;
    }

    response.download(path.join(uploadDirectory, file.storedName), file.originalName, (error) => {
        if (error) {
            if (error.code === "ENOENT") {
                response.status(404).json({ error: "The stored file could not be found." });
                return;
            }
            console.error("Could not download task file:", error);
            if (!response.headersSent) {
                response.status(500).json({ error: "Could not download the file." });
            }
        }
    });
});

app.patch("/api/tasks/:taskId", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.taskId)) {
        response.status(404).json({ error: "Task not found." });
        return;
    }
    if (!request.body || typeof request.body.completed !== "boolean") {
        response.status(400).json({ error: "A boolean completed value is required." });
        return;
    }

    const task = await Task.findByIdAndUpdate(
        request.params.taskId,
        { completed: request.body.completed },
        { new: true, runValidators: true }
    ).select("-employeeEmail");
    if (!task) {
        response.status(404).json({ error: "Task not found." });
        return;
    }
    response.status(200).json(task);
});

app.delete("/api/tasks/:taskId", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.taskId)) {
        response.status(404).json({ error: "Task not found." });
        return;
    }

    const task = await Task.findByIdAndDelete(request.params.taskId);
    if (!task) {
        response.status(404).json({ error: "Task not found." });
        return;
    }

    try {
        await removeUploadedFiles(task.files.map((file) => ({
            path: path.join(uploadDirectory, file.storedName),
        })));
    } catch (error) {
        console.error("Task was deleted, but some uploaded files could not be removed:", error);
    }
    response.status(204).end();
});

app.use((_request, response) => {
    response.status(404).json({ error: "Route not found" });
});

app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
        let message = error.message;
        if (error.code === "LIMIT_FILE_SIZE") {
            message = "Each file must be 5 MB or smaller.";
        } else if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
            message = `You can attach up to ${maximumFiles} files to a task.`;
        }
        response.status(400).json({ error: message });
        return;
    }
    if (error instanceof Error && error.message.startsWith("Unsupported file type.")) {
        response.status(400).json({ error: error.message });
        return;
    }

    console.error("Request failed:", error);
    response.status(500).json({ error: "The request could not be completed." });
});

await connectDB(process.env.MONGODB_URI);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
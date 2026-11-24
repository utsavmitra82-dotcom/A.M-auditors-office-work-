import mongoose from "mongoose";

const taskFileSchema = new mongoose.Schema(
    {
        originalName: {
            type: String,
            required: true,
        },
        storedName: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
    },
    { _id: true }
);

const taskSchema = new mongoose.Schema(
    {
        employeeName: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        files: {
            type: [taskFileSchema],
            default: [],
        },
        completed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;

import mongoose from "mongoose";

const connectDB = async (dataBaseUrl) => {
    if (!dataBaseUrl) {
        throw new Error("MONGODB_URI is not configured.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(dataBaseUrl);
    console.log("Connected to MongoDB");
};

export default connectDB;
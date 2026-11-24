import bcrypt from "bcryptjs";
import User from "../model/user.model.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signInController = async (request, response) => {
    const { username, email, password } = request.body ?? {};

    if (
        typeof username !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return response.status(400).json({
            error: "Username, email, and password are required.",
        });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
        normalizedUsername.length < 3 ||
        normalizedUsername.length > 30 ||
        !emailPattern.test(normalizedEmail) ||
        password.length < 8
    ) {
        return response.status(400).json({
            error: "Provide a username (3-30 characters), a valid email, and a password of at least 8 characters.",
        });
    }

    const existingUser = await User.exists({
        $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
        return response.status(409).json({
            error: "An account with that username or email already exists.",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        const user = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
        });

        return response.status(201).json({
            message: "Account created successfully.",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return response.status(409).json({
                error: "An account with that username or email already exists.",
            });
        }

        throw error;
    }
};

export default signInController;
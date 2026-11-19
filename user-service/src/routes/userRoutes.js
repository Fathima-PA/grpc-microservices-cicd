
const express = require("express");
const router = express.Router();

const User = require("../user.model");

const {
    authenticate,
    authorizeAdmin
} = require("../middleware/authMiddleware");

// GET /users/me
// Logged-in user can view their own profile
router.get("/me", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile"
        });
    }
});

// GET /users/:id
// Only admin can view another user's profile
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user
        });

    } catch (error) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }
});

module.exports = router;

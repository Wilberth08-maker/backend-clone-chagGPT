const express = require("express");
const router = express.Router();
const { signup, login, getMe } = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/users/me", authenticateToken, getMe);

module.exports = router;

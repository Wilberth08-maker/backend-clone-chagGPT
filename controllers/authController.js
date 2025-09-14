const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const {
  findUserByEmail,
  createUser,
  findUserById,
} = require("../services/userService");

const SECRET_KEY = process.env.JWT_SECRET || "clave_super_secreta";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function signup(req, res) {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", issues: result.error.issues });
  }

  const { email, password } = result.data;

  const existingUser = await findUserByEmail(email);
  if (existingUser)
    return res.status(409).json({ error: "El correo ya está registrado" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await createUser({ email, hashedPassword });

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, {
    expiresIn: "1h",
  });
  res.status(201).json({ token });
}

async function login(req, res) {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", issues: result.error.issues });
  }

  const { email, password } = result.data;

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ error: "Credenciales inválidas" });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1h",
  });
  res.status(200).json({ token });
}

async function getMe(req, res) {
  const user = await findUserById(req.userId);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
}

module.exports = {
  signup,
  login,
  getMe,
};

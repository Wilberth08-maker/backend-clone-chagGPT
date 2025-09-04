const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const users = []; // 🧠 En memoria
const SECRET_KEY = process.env.JWT_SECRET || "clave_super_secreta";

exports.signup = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Correo y contraseña requeridos" });

  const existingUser = users.find((u) => u.email === email);
  if (existingUser)
    return res.status(409).json({ error: "El correo ya está registrado" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
  };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, {
    expiresIn: "1h",
  });
  res.status(201).json({ token });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ error: "Credenciales inválidas" });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1h",
  });
  res.status(200).json({ token });
};

exports.getMe = (req, res) => {
  res.json({
    id: req.userId,
    email: req.email,
  });
};

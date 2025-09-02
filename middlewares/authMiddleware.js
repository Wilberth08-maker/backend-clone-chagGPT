const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "clave_super_secreta";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err)
      return res.status(403).json({ error: "Token inválido o expirado" });
    req.userId = user.id;
    next();
  });
}

module.exports = authenticateToken;

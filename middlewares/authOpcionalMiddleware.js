const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "clave_super_secreta";

function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return next(); // Sigue como anónimo

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (!err) {
      req.userId = user.id;
      req.email = user.email;
    }
    next(); // Sigue, con o sin usuario
  });
}

module.exports = optionalAuth;

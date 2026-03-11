/**
 * Rutas de autenticacion
 * define los endpoints de login y logout
 */

//importar express
const express = require("express");
const router = express.Router();

// importar controladored de autenticacion
const [
  register,
  login,
  getMe,
  updateMe,
  changePassword,
] = require("../controllers/auth.controller");

//Importar middleware de autenticacion
const { verificarAuth } = require("../middleware/auth");

//Rutas publicas
router.post("/register", register);
router.post("/login", login);

//Rutas privadas
router.get("/me", verificarAuth, getMe);
router.put("/me", verificarAuth, updateMe);
router.put("/me/password", verificarAuth, changePassword);


//Exportar rutas
module.exports = router;
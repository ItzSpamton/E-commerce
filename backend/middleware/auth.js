/**
 * middleware de autenticacipm JWT
 * este archivo verifica que el usuario tenga un token valido 
 * se usa para las rutas protegidas que requieren autenticacion
*/

//importar funciones
const jwt = { verifyToken, extractToken } = require("../config/jwt");

const { extractToken } = require("../config/jwt");
//importar modelo de usuario
const Usuario = require("../models/usuario");

//middleware de autenticacion
const verificarAuth = async (req, res, next) => {
  try {
    //paso 1 extraer token del header authorization 
    const authHeader = req.header = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'no se proporciono token de autenticacion',
      });
    }

    //extrae el token quitar header
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'token de autenticacion invalido'
        });
    }

    //paso 2 verificar q el token sea valido
    let decoded; //funcion para decodificar el token
    try {
      decoded = jwt.verificarToken(token);
    } catch (error) {
        return res.status(401).json({
        success: false,
        message: error.message //token expirado o invalido
        });
    }

        // buscar el usuario en la DB
        const usuario = await Usuario.findByPk(decoded.id, { 
            attributes: { exclude: ['password'] } });//no incluir la constraseña en la respuesta
    
        if (!usuario) {
          return res.status(404).json({
            success: false,
            message: 'usuario no encontrado'
          });
        }

    //paso 4 verificar que el usuario esta activo  
        if (!usuario.activo) {
          return res.status(404).json({
            success: false,
            message: 'usuario inactivo contacte al administrador'
          });
        }

        //paso 5 agregar el usuario al objeto req para uso posterior 
        //ahota en los contrikadires oidenis accedes a req.usuario

        //continuar con el siguiente 
        next();
  } catch (error) {
    console.error('error en middleware de autenticacion', error);
    res.status(500).json({
      success: false,
      message: 'error en la verificacion de autenticacion',
      error: error.message
    });
  }
};

/**
 * middleware opcional de autenticacion 
 * similar a verificarAuth pero no retorna error si no hay token
 * es para rutras que no requieren autenticacion
 */

const verificarAuthOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        //si no hay token continuar sin usuario
        if (!authHeader) {
            req.usuario = null;
            return next();
        }

        const token = extractToken(authHeader);
        if (!token) {
            req.usuario = null;
            return next();
        }

        const decoded = jwt.verifyToken(token);
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });

        if (usuario && usuario.activo) {
            req.usuario = usuario;
        } else {
            req.usuario = null;
        }

        next();
    } catch (error) {
        //Token invalido o expirado continuar sin usuario
        req.usuario = null;
        console.error('error en middleware de autenticacion opcional', error);
        next();
    }
};

//exportar middleware
module.exports = {
    verificarAuth,
    verificarAuthOpcional
};







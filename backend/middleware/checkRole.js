/**
 * middleware para verificar roles
 * este middleware se encarga de verificar si el usuario tiene el rol necesario para acceder a una ruta determinada
 * debe usarse despues del middleware de autenticación
 */

const esAdministrador = (req, res, next) => {
  try {
    //verificar si el usuario es un administrador
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado debes iniciar sesión",
      });
    }

    //verificar si el usuario es un administrador
    if (req.usuario.rol !== "administrador") {
      return res.status(403).json({
        success: false,
        message: "acceso denegado se requieren permisos de administrador",
      });
    }

    // el usuario es un administrador
    next();
  } catch (error) {
    console.log("Error en esAdministrador", error);
    res.status(500).json({
      success: false,
      message: "Error en la verificación de permisos",
      error: error.message,
    });
  }
};

/**
 * middleware para verificar si el usuario es cliente
 * debe usarse despues del middleware de autenticación
 */

const esCliente = (req, res, next) => {
  try {
    //verificar si el usuario es un cliente
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado debes iniciar sesión",
      });
    }

    //verificar si el usuario es un cliente
    if (req.usuario.rol !== "cliente") {
      return res.status(403).json({
        success: false,
        message: "acceso denegado se requieren permisos de cliente",
      });
    }

    // el usuario es un cliente
    next();
  } catch (error) {
    console.log("Error en esCliente", error);
    res.status(500).json({
      success: false,
      message: "Error en la verificación de permisos",
      error: error.message,
    });
  }
};

/**
 * middlware flexible para verificar multiples roles
 * debe usarse despues del middleware de autenticación
 * permite verificar multiples roles validos
 * util para cuando una ruta puede ser accedida por multiples roles
 */

const tieneRol = (req, res, next) => {
  return (req, res, next) => {
    try {
      //verificar que exista req.usuario
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: "No autorizado debes iniciar sesión",
        });
      }

      //verificar que el usuario esta en la lista de roles permitidos
      if (!req.roles.includes(req.usuario.rol)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado se requiere uno de los siguientes roles: ${req.roles.join(
            ", ",
          )}
        )}`,
        });
      }

      // el usuario tiene el rol permitido
      next();
    } catch (error) {
      console.log("Error en tieneRol", error);
      res.status(500).json({
        success: false,
        message: "Error en la verificación de permisos",
        error: error.message,
      });
    }
  };
};

/**
 * middlware para verificar que el usuario accede a sus propios datos
 * debe usarse despues del middleware de autenticación
 * verifica que el usuarioId en los parametros de la ruta sea el mismo que el usuario autenticado
 * util para cuando una ruta puede ser accedida por el usuario autenticado
 */

const esPropioUsuarioOAdmin = (req, res, next) => {
  try {
    //verificar que exista req.usuario
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado debes iniciar sesión",
      });
    }

    //Verificar que los administradores puedan acceder a cualquier usuario
    if (req.usuario.rol === "administrador") {
      return next();
    }

    //obtener el usuarioId de la ruta
    const usuarioParam = req.params.usuarioId || req.params.id;

    //verificar qie eñ el usuarioId sea el mismo que el usuario autenticado
    if (parseInt(usuarioParam) !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado se requiere el mismo usuario",
      });
    }

    //El usuario accede a sus propios datos
    next();
  } catch (error) {
    console.log("Error en esPropio", error);
    res.status(500).json({
      success: false,
      message: "Error en la verificación de permisos",
      error: error.message,
    });
  }
};

/**
 * middleware para verificar que un usuario es administrador o tiene el rol de auxiliar
 * debe usarse despues del middleware de autenticación
 * permite al acceso a usuarios con rol de auxiliar o administrador
 */

const esAdminOAuxiliar = (req, res, next) => {
  try {
    //verificar si el usuario es un administrador o un auxiliar
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado debes iniciar sesión",
      });
    }

    //verificar que el rol es administrador o auxiliar
    if (!["administrador", "auxiliar"].includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado se requieren permisos de administrador o auxiliar",
      });
    }
  } catch (error) {
    console.log("Error en esAdminOAuxiliar", error);
    res.status(500).json({
      success: false,
      message: "Error en la verificación de permisos",
      error: error.message,
    });
  }
};

/**
 * middleware para verificar que un usuario es solo un administrador y no un auxiliar
 * debe usarse despues del middleware de autenticación
 * permite al acceso a usuarios con rol de administrador
 */

const soloAdministrador = (req, res, next) => {
  try {
    //verificar si el usuario es un administrador
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado debes iniciar sesión",
      });
    }

    //verificar que el rol es administrador
    if (req.usuario.rol !== "administrador") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado se requieren permisos de administrador",
      });
    }

    next();
  } catch (error) {
    console.log("Error en soloAdmin", error);
    res.status(500).json({
      success: false,
      message: "Error en la verificación de permisos",
      error: error.message,
    });
  }
};

//Exportar middlewares
module.exports = {
  esAdministrador,
  esCliente,
  tieneRol,
  esPropioUsuarioOAdmin,
  esAdminOAuxiliar,
  soloAdministrador,
};
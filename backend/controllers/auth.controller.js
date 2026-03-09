/**
 * controlador de autenticacion
 * maneja las operaciones de login y logout
 */

/**
 * Importamos modelos
 */

const Usuario = require("../models/usuario");
const { generarToken } = require("../config/jwt");

/**
 * obtener todas los usuarios
 * GET /api/usuarios
 * query params:
 * activo: trua/false (filtrar por estado)
 * @param {*} req
 * @param {*} res response express
 */

const registrar = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, direccion } =
      req.query;

    //Validacion 1: Campos obligatorios
    if (
      !nombre &&
      !apellido &&
      !email &&
      !password &&
      !telefono &&
      !direccion
    ) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un filtro para buscar usuarios",
      });
    }

    //Validacion 2: formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "El email proporcionado no es válido",
      });
    }

    //Validacion3: loongitud password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    //Validacion 4: duplicidad de email
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: `ya existe un usuario con el email ${email}`,
      });
    }

    //Respuesta exitosa
    res.json({
      success: true,
      data: {
        usuarios,
      },
    });

    /**
     * Crear usuario
     * el hook beforeCreate se encarga de encriptar la password antes de guardarla en la base de datos
     * en el rol por defecto es cliente
     * @param {object} req request express
     * @param {object} res response express
     */

    //Crear nuevo usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      telefono: telefono || null,
      direccion: direccion || null,
      rol: "cliente",
    });

    //Generar token
    const token = generarToken({
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
    });

    //respuesta exitosa
    const usuarioRespuesta = nuevoUsuario.get();
    delete usuarioRespuesta.password;
    res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      data: {
        usuario: usuarioRespuesta,
        token,
      },
    });
  } catch (error) {
    console.error("Error al registrar el usuario:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al registrar el usuario",
    });
  }
};

/**
 * Iniciar sesion
 * Autenticar un usuario con email y password
 * retorna el usuario y un token jwt si las credenciales son correctas
 * POST /api/auth/login
 * Body: { email, password }
 */

const login = async (req, res) => {
  try {
    //Extraer las credenciales del body
    const { email, password } = req.body;

    //Validacion 1: Verificar que se proporcionaron email y password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar email y password",
      });
    }

    //Validacion 2> buscar usuario por email
    //necesitamos incluir el campo password en la busqueda, normalmente no se incluye
    const usuario = await Usuario.scope("withPassword").findOne({
      where: { email },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Credenciales incorrectas",
      });
    }

    //Validacion 3: estado usuario
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: "El usuario está inactivo, conecte con el administrador",
      });
    }

    //Validacion 4: verificar password
    //comparamos la password proporcionada con la encriptada en la base de datos
    const passwordValida = await usuario.compararContraseña(password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas",
      });
    }

    //Generar token
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    //Preparar respuesta si password es correcta
    const usuarioSinPassword = usuario.toJSON();
    delete usuarioSinPassword.password;

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Sesión iniciada correctamente",
      data: {
        usuario: usuarioSinPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Error en logiN");
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

/**
 * obtener perfil de uasuario autenticado
 * requiere middleware verificarAuth
 * GET /api/auth/me
 * headers: { Authorization: Bearer <token> }
 */

const getMe = async (req, res) => {
  try {
    //El usuario ya esta en req.usuario
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ["password"] },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    //Respuesta exitosa
    res.json({
      success: true,
      data: {
        usuario,
      },
    });
  } catch (error) {
    console.error("Error en getMe", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el usuario",
      errorr: error.message,
    });
  }
};

/**
 * Actualizar perfil de usuario autenticado
 * permite al usuario actualizar su propio perfil
 * PUT /api/auth/me
 * @param {object} req request express
 * @param {object} res response express
 */

const updateMe = async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, direccion } = req.body;

    //buscar usuario
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    //actualizar campos
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (email !== undefined) usuario.email = email;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (direccion !== undefined) usuario.direccion = direccion;

    //Guardar cambios
    await usuario.save();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      data: {
        usuario: usuario.toJSON(),
      },
    });
  } catch (error) {
    console.error("Error en updateMe", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el perfil",
      error: error.message,
    });
  }
};

/**
 * cambiar password de usuario autenticado
 * permite al usuario cambiar su propio password
 * requiere su contraseña actual por seguridad
 * PUT /api/auth/me/change-password
 */

const changePassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    // validacion 1: verificar que se proporcione passwordActual y passwordNuevo
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar la contraseña actual y la nueva contraseña",
      });
    }

    // validacion 2: verificar que la contraseña nueva cumpla con los requisitos de seguridad
    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    //Valdidacion 3: buscar usuario con password incluido
    const usuario = await Usuario.scope("withPassword").findByPk(
      req.usuario.id,
    );
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    //Validacion 4: verificar que la contraseña actual sea correcta
    const passwordValida = await usuario.compararContraseña(passwordActual);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: "La contraseña actual es incorrecta",
      });
    }

    //actualizar password
    usuario.password = passwordNuevo;
    await usuario.save();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Contraseña cambiada correctamente",
    });
  } catch (error) {
    console.error("Error en changePassword", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar la contraseña",
      error: error.message,
    });
  }
};


//Exportar controladores
module.exports = {
  login,
  registrar,
  getMe,
  updateMe,
  changePassword,
}
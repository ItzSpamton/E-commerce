/**
 * controlador de usuarios ADMIN
 * solo accesible por el administrador
 * maneja las operaciones crud y activar y/o desactivar usuarios
 */

/**
 * Importamos modelos
 */
const Usuario = require("../models/usuario");
/**
 * obtener todas los usuarios
 * GET /api/usuarios
 * query params:
 * activo: trua/false (filtrar por estado)
 * @param {*} req
 * @param {*} res response express
 */

const getUsuarios = async (req, res) => {
  try {
    const { rol, activo, buscar, pagina = 1, limite = 10 } = req.query;

    //Construir filtros para la consulta
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo;
    if (buscar) {
      const { Op } = require("sequelize");
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { apellido: { [Op.iLike]: `%${buscar}%` } },
        { email: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    //paginacion

    const offset = (parseInt(pagina) - 1) * limite;

    //Obtener usuarios sin password
    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      limit: parseInt(limite),
      offset,
      order: [["createdAt", "DESC"]],
    });

    //Respuesta exitosa
    res.json({
      success: true,
      count,
      data: {
        usuarios,
        paginacion: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total: count,
          totalPaginas: Math.ceil(count / parseInt(limite)),
        },
      },
    });
  } catch (error) {
    console.error("Error en getUsuarios", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los usuarios",
      errorr: error.message,
    });
  }
};

// Obtener un usuario por ID
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    //buscar usuarios
    const usuario = await Usuario.findByPk(id, {
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
    console.error("Error en getUsuarioById", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el usuario",
      errorr: error.message,
    });
  }
};

/**
 * Crear un nuevo usuario
 * POST /api/admin/usuarios
 * Body: { nombre, apellido, email, password, rol, telefono, direccion }
 * @param {object} req request express
 * @param {object} res response express
 */

const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, direccion } =
      req.body;

    //Validacion 1: Campos obligatorios
    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: "El nombre, apellido, email, password y rol son obligatorios",
      });
    }

    //Validacion 2: validar rol
    if (!["cliente", "auxiliar", "administrador"].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: "El rol debe ser 'cliente', 'auxiliar' o 'administrador'",
      });
    }

    //Validacion 3: validar email
    const UsuarioExistente = await Usuario.findOne({ where: { email } });
    if (UsuarioExistente) {
      return res.status(400).json({
        success: false,
        message: `ya existe un usuario con el email ${email}`,
      });
    }

    //Crear nuevo usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      rol,
      telefono: telefono || null,
      direccion: direccion || null,
    });

    //Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      data: {
        usuario: nuevoUsuario,
      },
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error al crear el usuario",
        error: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al crear el usuario",
      error: error.message,
    });
  }
};

/**
 * Actualizar un usuario
 * PUT /api/admin/usuarios/:id
 * Body: { nombre, apellido, email, password, rol, telefono, direccion }
 * @param {object} req request express
 * @param {object} res response express
 */

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, password, rol, telefono, direccion } =
      req.body;

    //buscar usuarios
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }
    //Validacion 1: validacion del rol si se proporciona
    if (rol && !["cliente", "auxiliar", "administrador"].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: "El rol debe ser 'cliente', 'auxiliar' o 'administrador'",
      });
    }

    //Actualizar campos
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (email !== undefined) usuario.email = email;
    if (password !== undefined) usuario.password = password;
    if (rol !== undefined) usuario.rol = rol;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (direccion !== undefined) usuario.direccion = direccion;

    //Guardar cambios
    await usuario.save();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Usuario actualizado correctamente",
      data: {
        usuario,
      },
    });
  } catch (error) {
    console.error("Error en actualizarUsuario", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el usuario",
      error: error.message,
    });
  }
};

/**
 * Activar o desactivar una categoria
 * PUT /api/admin/categorias/:id/estado
 * Al desactivar una categoria, se desactivan tambien sus subcategorias y productos asociados
 * Al desactivar una subcategoria, se desactivan tambien sus productos asociados
 * @param {object} req request express
 * @param {object} res response express
 */

const toggleCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar categoria
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //Alternar estado
    const nuevoEstado = !categoria.activo;
    categoria.activo = nuevoEstado;

    //Gaurdar cambiamos
    await categoria.save();

    //contar cuantos registros se afectaron
    const subcategoriasAfectadas = await Subcategoria.count({
      where: {
        categoriaId: id,
      },
    });

    const productosAfectados = await Producto.count({
      where: {
        categoriaId: id,
      },
    });

    //Respuesta exitosa
    res.json({
      success: true,
      message: `Categoria ${nuevoEstado ? "activada" : "desactivada"} correctamente`,
      data: {
        categoria,
        afectados: {
          subcategoria: subcategoriasAfectadas,
          producto: productosAfectados,
        },
      },
    });
  } catch (error) {
    console.error("Error en toggleCategoria", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar el estado de la categoria",
      error: error.message,
    });
  }
};

/**
 * Eliminar una categoria
 * DELETE /api/admin/categorias/:id
 * solo permite eliminar categorias si no tiene subcategorias asociadas ni productos asociados
 * @param {object} req request express
 * @param {object} res response express
 */

const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar categoria
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //validacion: verificar que no tenga subcategorias ni productos asociados
    const subcategorias = await Subcategoria.count({
      where: {
        categoriaId: id,
      },
    });

    if (subcategorias > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoria porque tiene ${subcategorias} subcategorias asociadas, usa PATCH /api/admin/categorias/:id toggle para desactivarla en lugar de eliminarla`,
      });
    }

    // validacion : verificar que no tenga productos asociados
    const productos = await Producto.count({
      where: {
        categoriaId: id,
      },
    });

    if (productos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoria porque tiene ${productos} productos asociados, usa PATCH /api/admin/categorias/:id toggle para desactivarla en lugar de eliminarla`,
      });
    }

    //eliminar categoria
    await categoria.destroy();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Categoria eliminada correctamente",
    });
  } catch (error) {
    console.error("Error en eliminarCategoria", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar la categoria",
      error: error.message,
    });
  }
};

/**
 * obtener estadisticas  de una categoria
 * GET /api/admin/categorias/:id/estadisticas
 * total de subcategorias inactivas/activas y total de productos inactivos/activos
 * valor total de inventario
 * stock total de inventario
 * @param {object} req request express
 * @param {object} res response express
 */

const getEstadisticasCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    //Verificar que la categoria exista
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //Contar subcategorias activas e inactivas
    const subcategoriasActivas = await Subcategoria.count({
      where: {
        categoriaId: id,
        activo: true,
      },
    });

    const totalSubcategorias = await Subcategoria.count({
      where: {
        categoriaId: id,
      },
    });

    //Contar productos activos e inactivos
    const productosActivos = await Producto.count({
      where: {
        categoriaId: id,
        activo: true,
      },
    });

    const totalProductos = await Producto.count({
      where: {
        categoriaId: id,
      },
    });

    // Obtener productos para calcular estadisticas
    const productos = await Producto.findAll({
      where: {
        categoriaId: id,
      },
      attributes: ["precio", "stock"],
    });

    //calcular estadisticas de inventario
    let valorTotalInventario = 0;
    let stockTotal = 0;

    productos.forEach((producto) => {
      valorTotalInventario += parseFloat(producto.precio) * producto.stock;
      stockTotal += producto.stock;
    });

    //respuesta exitosa
    res.json({
      success: true,
      data: {
        categoria: {
          id: categoria.id,
          nombre: categoria.nombre,
          activo: categoria.activo,
        },
        estadisticas: {
          subcategorias: {
            total: totalSubcategorias,
            activas: subcategoriasActivas,
            inactivas: totalSubcategorias - subcategoriasActivas,
          },
          productos: {
            total: totalProductos,
            activos: productosActivos,
            inactivos: totalProductos - productosActivos,
          },
          inventario: {
            valorTotal: valorTotalInventario.toFixed(2), // redondear a 2 decimales
            stockTotal,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasCategoria", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadisticas de la categoria",
      error: error.message,
    });
  }
};

//Exportar controladores
module.exports = {
  getCategorias,
  getCategoriasById,
  crearCategoria,
  actualizarCategoria,
  toggleCategoria,
  eliminarCategoria,
  getEstadisticasCategoria,
};
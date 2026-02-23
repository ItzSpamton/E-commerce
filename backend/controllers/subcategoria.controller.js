/**
 * controlador de subcategorias
 * maneja las operaciones crud y activar y/o desactivar categorias
 * solo accesible por el administrador
 */

/**
 * Importamos modelos
 */
const subcategoria = require("../models/subcategoria");
const categoria = require("../models/categoria");
const producto = require("../models/producto");

/**
 * obtener todas las subcategorias
 * query params:
 * categoriaId: id de la categoria a la que pertenecen las subcategorias
 * activo: trua/false (filtrar por estado)
 * incluircategoria: true/false (incluir subcategorias)
 * incluirproductos: true/false (incluir productos)
 * @param {*} req
 * @param {*} res response express
 *
 */

const getSubcategorias = async (req, res) => {
  try {
    const { categoriaId, activo, incluirCategoria } = req.query;

    //Opciones de consulta
    const opciones = {
      order: ["nombre", "ASC"], //Ordenar por nombre de forma ascendente
      where: {},
    };

    //filtros
    const where = {};
    if (categoriaId) where.categoriaId = categoriaId;

    if (activo !== undefined) {
      where.activo = activo === "true"; //convertir a booleano
    }

    if (Object.keys(where).length > 0) {
      opciones.where = where;
    }

    //incluir categoria
    if (incluirCategoria === "true") {
      opciones.include = [
        {
          model: categoria,
          as: "categoria",
          attributes: ["id", "nombre", "activo"],
        },
      ];
    }

    //obtener subcategorias
    const subcategorias = await subcategoria.findAll(opciones);

    //Respuesta exitosa
    res.json({
      success: true,
      count: subcategorias.length,
      data: {
        subcategorias,
      },
    });
  } catch (error) {
    console.error("Error en getSubcategorias", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las subcategorias",
      error: error.message,
    });
  }
};

/**
 * obtener todas las subcategorias por id
 * GET /api/subcategorias/:id
 * @param {*} req request express
 * @param {*} res response express
 *
 */

const getSubcategoriasById = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar subcategorias y contar productos
    const subcategoria = await subcategoria.findByPk(id, {
      include: [
        {
          model: categoria,
          as: "categoria",
          attributes: ["id", "nombre", "activo"],
        },
        {
          model: producto,
          as: "productos",
          attributes: ["id"],
        },
      ],
    });

    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: "Subcategoria no encontrada",
      });
    }
    //Contador de productos
    const subcategoriaJSON = subcategoria.toJSON();
    subcategoriaJSON.totalProductos = subcategoriaJSON.productos.length;
    delete subcategoriaJSON.productos; // no enviar la lista completa de productos solo el contador

    //Respuesta exitosa
    res.json({
      success: true,
      data: {
        subcategoria: subcategoriaJSON,
      },
    });

    //incluir subcategorias si se solicita
    if (incluirSubcategorias === "true") {
      opciones.include = [
        {
          model: subcategoria,
          as: "subcategorias",
          attributes: ["id", "nombre", "descripcion", "activo"],
        },
      ];
    }
  } catch (error) {
    console.error("Error en getSubcategoriabyId", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener la subcategoria",
      error: error.message,
    });
  }
};

/**
 * Crear una nueva subcategoria
 * POST /api/admin/subcategorias
 * Body: { nombre, descripcion }
 * @param {object} req request express
 * @param {object} res response express
 */

const crearSubcategoria = async (req, res) => {
  try {
    const { nombre, descripcion, categoriaId } = req.body;

    //Validacion 1: Campos obligatorios
    if (!nombre || !categoriaId) {
      return res.status(400).json({
        success: false,
        message: "El nombre y la categoriaId es obligatorio",
      });
    }

    //Validar si la categoria existe
    const categoria = await categoria.findByPk(categoriaId);
    if (!categoria) {
      return res.status(400).json({
        success: false,
        message: "La categoria no existe",
      });
    }

    //Validacion 2: Subcategoria duplicada
    const subcategoriaExistente = await subcategoria.findOne({
      where: { nombre },
    });
    if (subcategoriaExistente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una subcategoria con el nombre "${nombre}"`,
      });
    }
    //Crear nueva subcategoria
    const nuevaSubcategoria = await subcategoria.create({
      nombre,
      descripcion: descripcion || null, // Si no se proporciona descripcion, se establece como null
      activo: true,
    });

    //Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Subcategoria creada correctamente",
      data: {
        categoria: nuevaSubcategoria,
      },
    }); // 201 Created json
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error al crear la categoria",
        error: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al crear la categoria",
      error: error.message,
    });
  }
};

/**
 * Actualizar una categoria
 * PUT /api/admin/categorias/:id
 * Body: { nombre, descripcion }
 * @param {object} req request express
 * @param {object} res response express
 */

const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    //buscar categoria
    const categoria = await categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //validacion 1: si se cambia el nombre verificar que no exista otra categoria con el mismo nombre
    if (nombre && nombre !== categoria.nombre) {
      const categoriaConMismoNombre = await categoria.findOne({
        where: { nombre },
      });
      if (categoriaConMismoNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe una categoria con el nombre "${nombre}"`,
        });
      }
    }

    //actualizar campos
    if (nombre !== undefined) categoria.nombre = nombre;
    if (descripcion !== undefined) categoria.descripcion = descripcion;
    if (activo !== undefined) categoria.activo = activo;

    //guardar cambios
    await categoria.save();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Categoria actualizada correctamente",
      data: {
        categoria,
      },
    });
  } catch (error) {
    console.error("Error en actualizarCategoria", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error al actualizar la categoria",
        errors: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al actualizar la categoria",
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
    const categoria = await categoria.findByPk(id);
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
    const subcategoriasAfectadas = await subcategoria.count({
      where: {
        categoriaId: id,
      },
    });

    const productosAfectados = await producto.count({
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
    const categoria = await categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //validacion: verificar que no tenga subcategorias ni productos asociados
    const subcategorias = await subcategoria.count({
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
    const productos = await producto.count({
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
    const categoria = await categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoria no encontrada",
      });
    }

    //Contar subcategorias activas e inactivas
    const subcategoriasActivas = await subcategoria.count({
      where: {
        categoriaId: id,
        activo: true,
      },
    });

    const totalSubcategorias = await subcategoria.count({
      where: {
        categoriaId: id,
      },
    });

    //Contar productos activos e inactivos
    const productosActivos = await producto.count({
      where: {
        categoriaId: id,
        activo: true,
      },
    });

    const totalProductos = await producto.count({
      where: {
        categoriaId: id,
      },
    });

    // Obtener productos para calcular estadisticas
    const productos = await producto.findAll({
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
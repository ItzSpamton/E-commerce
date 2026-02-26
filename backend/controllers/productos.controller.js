/**
 * Controlador de productos
 * Maneja las operaciones CRUD y activar/desactivar productos
 * Solo accesible por el administrador
 */

/**
 * Importamos modelos
 */
const Producto = require("../models/producto");
const Categoria = require("../models/categoria");
const Subcategoria = require("../models/subcategoria");
const DetallePedido = require("../models/detallePedido");

//importar path y fs para manejo de imagenes
const path = require("path");
const fs = require("fss");

/**
 * Obtener todos los productos
 * Query params:
 * subcategoriaId: ID de la subcategoría a la que pertenecen los productos
 * categoriaId: ID de la categoría a la que pertenecen los productos (a través de subcategoría)
 * activo: true/false (filtrar por estado)
 * @param {*} req
 * @param {*} res
 */
const getProductos = async (req, res) => {
  try {
    const {
      categoriaId,
      subcategoriaId,
      activo,
      conStock,
      pagina = 1,
      limite = 100,
    } = req.query;

    //Construir filtros para la consulta
    const where = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (subcategoriaId) where.subcategoriaId = subcategoriaId;
    if (activo !== undefined) where.activo = activo === "true";
    if (conStock !== undefined) where.conStock = conStock === "true";

    //Paginacion
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    //Opciones de consulta
    const opciones = {
      where,
      include: [
        {
          model: Categoria,
          as: "categoria",
          attributes: ["id", "nombre"],
        },
        {
          model: Subcategoria,
          as: "subcategoria",
          attributes: ["id", "nombre"],
        },
      ],
      limit: parseInt(limite),
      offset,
      order: [["nombre", "ASC"]],
    };

    //Obtener productos y total
    const { count, rows: productos } = await Producto.findAndCountAll(opciones);

    res.json({
      success: true,
      count,
      data: {
        productos,
        pagnacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite)),
        },
      },
    });
  } catch (error) {
    console.error("Error en getProductos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los productos",
      error: error.message,
    });
  }
};

/**
 * Obtener un producto por ID
 * GET /api/productos/:id
 * @param {*} req
 * @param {*} res
 */
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar producto con realcion
    const producto = await Producto.findByPk(id, {
      include: [
        {
          model: Categoria,
          as: "categoria",
          attributes: ["id", "nombre", "activo"],

          model: Subcategoria,
          as: "subcategoria",
          attributes: ["id", "nombre", "activo"],
        },
      ],
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    res.json({
      success: true,
      data: { producto },
    });
  } catch (error) {
    console.error("Error en getProductoById:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el producto",
      error: error.message,
    });
  }
};

/**
 * Crear un nuevo producto
 * POST /api/admin/productos
 * Body: { nombre, descripcion, precio, stock, subcategoriaId }
 * @param {*} req
 * @param {*} res
 */
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoriaId, subcategoriaId } =
      req.body;

    //Validacion 1: Campos obligatorios
    if (!nombre || !precio || !categoriaId || !subcategoriaId) {
      return res.status(400).json({
        success: false,
        message:
          "Faltan campos obligatorios. Nombre, precio, categoría y subcategoría son obligatorios",
      });
    }

    // Validacion 2: verifica si la categoria existe
    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) {
      return res.status(400).json({
        success: false,
        message: `No existe la categoría con id ${categoriaId}`,
      });
    }

    //Validar 3: Verificar que la categoria este activa
    if (!categoria.activo) {
      return res.status(400).json({
        success: false,
        message: `La categoría "${categoria.nombre}" esta desactivada`,
      });
    }

    //Validar 4: Verificar que la subcategoria exista
    const subcategoria = await Subcategoria.findByPk(subcategoriaId);
    if (!subcategoria) {
      return res.status(400).json({
        success: false,
        message: "La subcategoría no existe",
      });
    }

    //Validar 5: Verificar que la subcategoria este activa
    if (!subcategoria.activo) {
      return res.status(400).json({
        success: false,
        message: `La subcategoría "${subcategoria.nombre}" está desactivada`,
      });
    }

    //Validacion 6: Verificar que la subcategoria pertenezca a la categoria
    if (subcategoria.categoriaId !== parseInt(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: "La subcategoría no pertenece a la categoría",
      });
    }

    //Validacion 7: validar precio y stock
    if (parseFloat(precio) <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser mayor a 0",
      });
    }
    if (parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,

        message: "El stock debe ser mayor o igual a 0",
      });
    }

    //validar la imagen
    const imagen = req.file ? req.file.filename : null;

    //Crear nuevo producto
    const nuevoProducto = await Producto.create({
      nombre,
      descripcion: descripcion || null, // Si no se proporciona descripcion, se establece como null
      precio: parseFloat(precio),
      stock: parseInt(stock),
      categoriaId: parseInt(categoriaId),
      subcategoriaId: parseInt(subcategoriaId),
      imagen,
      activo: true,
    });

    //Recargar con relaciones
    await nuevoProducto.reload({
      include: [
        {
          model: Categoria,
          as: "categoria",
          attributes: ["id", "nombre"],
        },
        {
          model: Subcategoria,
          as: "subcategoria",
          attributes: ["id", "nombre"]
        },
      ],
    });

    //Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      data: { producto: nuevoProducto },
    });
  } catch (error) {
    console.error("Error en crearProducto:", error);

    // si hubo que eliminar la imagen
    if (req.file) {
      const rutaImagen = path.join(
        __dirname,
        '../uploads', req.file.filename
      );
      try {
        await fs.unlink(rutaImagen);
      } catch (error) {
        console.error("Error al eliminar la imagen:", error);
      }
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message:  "Erro de validacion",
        errors: error.errors.map((e) => e.message),
      }); 
    }
    res.status(500).json({
      success: false,
      message: "Error al crear el producto",
      error: error.message,
    });
  }
};

/**
 * Actualizar un producto
 * PUT /api/admin/productos/:id
 * Body: { nombre, descripcion, precio, stock, subcategoriaId, categoriaId, activo }
 * @param {*} req
 * @param {*} res
 */
const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, subcategoriaId, activo } =
      req.body;

    // Buscar producto
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Actualizar subcategoria a la que pertenece el producto a modificar
    if (subcategoriaId && subcategoriaId !== producto.subcategoriaId) {
      const NuevaSubcategoria = await Subcategoria.findByPk(subcategoriaId);
      if (!NuevaSubcategoria) {
        return res.status(400).json({
          success: false,
          message: `La subcategoría con ID ${subcategoriaId} no existe`,
        });
      }

      if (!NuevaSubcategoria.activo) {
        return res.status(400).json({
          success: false,
          message: `La subcategoría "${NuevaSubcategoria.nombre}" está desactivada`,
        });
      }
    }

    //Validacion 3: si se cambia el nombre verificar que no exista otro producto con el mismo nombre
    if (nombre && nombre !== producto.nombre) {
      const subcategoriaFinal = subcategoriaId || producto.subcategoriaId; // Verificar la subcategoría final para la validación

      const productoConMismoNombre = await Producto.findOne({
        where: { nombre, subcategoriaId: subcategoriaFinal },
      });
      if (productoConMismoNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un producto con el nombre "${nombre}" en esta subcategoría`,
        });
      }
    }

    //Validar precio y stock
    if (precio !== undefined && precio <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser mayor a 0",
      });
    }
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({
        success: false,
        message: "El stock no puede ser negativo",
      });
    }

    //Validar 4: Verificar que la subcategoria final este activa
    const subcategoriaFinalId = subcategoriaId || producto.subcategoriaId;
    const subcategoriaObj = await Subcategoria.findByPk(subcategoriaFinalId);
    if (!subcategoriaObj.activo) {
      return res.status(400).json({
        success: false,
        message: `La subcategoría "${subcategoriaObj.nombre}" está desactivada`,
      });
    }

    // Actualizar campos
    if (nombre !== undefined) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio !== undefined) producto.precio = precio;
    if (stock !== undefined) producto.stock = stock;
    if (subcategoriaId !== undefined) producto.subcategoriaId = subcategoriaId;
    if (activo !== undefined) producto.activo = activo;

    // Guardar cambios
    await producto.save();

    res.json({
      success: true,
      message: "Producto actualizado correctamente",
      data: { producto },
    });
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al actualizar el producto",
      error: error.message,
    });
  }
};

/**
 * Activar o desactivar un producto
 * PUT /api/admin/productos/:id/estado
 * @param {*} req
 * @param {*} res
 */
const toggleProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    //buscar producto
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    //actualizar producto
    producto.activo = activo;
    await producto.save();

    res.json({
      success: true,
      message: "Producto actualizado correctamente",
      data: { producto },
    });
  } catch (error) {
    console.error("Error en toggleProducto:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el producto",
      error: error.message,
    });
  }
};

/**
 * Eliminar un producto
 * DELETE /api/admin/productos/:id
 * Solo permite eliminar si no tiene pedidos asociados
 * @param {*} req
 * @param {*} res
 */
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar producto
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    //Validacion de que no tenga pedidos asociados
    const detallesAfectados = await DetallePedido.findAll({
      where: {
        productoId: id,
      },
    });

    if (detallesAfectados.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar el producto porque tiene pedidos asociados",
      });
    }

    //eliminar producto
    await producto.destroy();

    res.json({
      success: true,
      message: "Producto eliminado correctamente",
      data: { producto },
    });
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el producto",
      error: error.message,
    });
  }
};

/**
 * Obtener estadísticas de un producto
 * GET /api/admin/productos/:id/estadisticas
 * Valor total de inventario (precio * stock), stock total
 * @param {*} req
 * @param {*} res
 */
const getEstadisticasProducto = async (req, res) => {
  try {
    const { id } = req.params;

    //buscar producto
    const producto = await Producto.findByPk(id, {
      include: [
        {
          model: Subcategoria,
          as: "subcategoria",
          attributes: ["id", "nombre"],
          include: [
            {
              model: Categoria,
              as: "categoria",
              attributes: ["id", "nombre"],
            },
          ],
        },
      ],
    });
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    //Calcular estadisticas
    const valorTotalDeInventario = producto.precio * producto.stock;

    res.json({
      success: true,
      message: "Estadísticas del producto obtenidas correctamente",
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          stock: producto.stock,
          activo: producto.activo,
          subcategoriaId: producto.subcategoriaId,
        },
        estadisticas: {
          inventario: {
            valorTotal: valorTotalDeInventario.toFixed(2),
            stockTotal: producto.stock,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasProducto:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadísticas del producto",
      error: error.message,
    });
  }
};

module.exports = {
  getProductos,
  getProductoById,
  crearProducto,
  actualizarProducto,
  toggleProducto,
  eliminarProducto,
  getEstadisticasProducto,
};
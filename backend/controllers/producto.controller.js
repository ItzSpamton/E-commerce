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
      buscar,
      pagina = 1,
      limite = 100,
    } = req.query;

    //Construir filtros para la consulta
    const where = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (subcategoriaId) where.subcategoriaId = subcategoriaId;
    if (activo !== undefined) where.activo = activo === "true";
    if (conStock !== 'true') where.Stock = {[require ('sequelize').Op.gt]:0};

    if (buscar) {
        const { Op } = require('sequelize');
        //Op.or busca por nombre o descripcion 
        //Op.like equivale a un like en sql con comodine para buscar coincidencias parciales 
        where[Op.or] = [
            { nombre: { [Op.iLike]: `%${buscar}%` } },
            { descripcion: { [Op.iLike]: `%${buscar}%` } },
        ];
    }

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
          attributes: ["id", "nombre"],
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
      const rutaImagen = path.join(__dirname, "../uploads", req.file.filename);
      try {
        await fs.unlink(rutaImagen);
      } catch (error) {
        console.error("Error al eliminar la imagen:", error);
      }
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validacion",
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
 * Actualiza Producto
 * PUT/ api/ admin/ productos/:id
 * body: {nombre, descripcion, categoriaId, subcategoriaId, precio, stock, activo}
 * @param {Object} req request express
 * @param {Object} res response express
 */

const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoriaId, activo, stock, precio } =
      req.body;

    //buscar producto
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // validacion si se cambia la categoria y sub categoria

    if (categoriaId && categoriaId !== producto.categoriaId) {
      const categoria = await Categoria.findByPk(categoriaId);
      if (!categoria || !categoria.activo) {
        return res.status(400).json({
          success: false,
          message: `Categoria invalida o inactiva`,
        });
      }
    }

    if (subcategoriaId && subcategoriaId !== producto.subcategoriaId) {
      const subcategoria = await Subcategoria.findByPk(subcategoriaId);
      if (!subcategoria || !subcategoria.activo) {
        return res.status(400).json({
          success: false,
          message: `Subcategoria invalida o inactiva`,
        });
      }

      const catId = (await categoriaId) || producto.categoriaId;
      if (!subcategoria.categoriaId !== parseInt(catId)) {
        return res.status(400).json({
          success: false,
          message: `la subcategoria mo pertenece a la categoria seleccionada`,
        });
      }

      //validar precio y stock
      if (precio !== undefined && parseFloat(precio) < 0) {
        return res.status(400).json({
          success: false,
          message: "El precio debe ser mayor a 0",
        });
      }

      //manjar imagen
      const imagen = req.file ? req.file.filename : producto.imagen;
      if (req.file) {
        if (producto.imagen) {
          const rutaImagenAnterior = path.join(
            __dirname,
            "../uploads",
            producto.imagen,
          );
          try {
            await fs.unlink(rutaImagenAnterior);
          } catch (err) {
            console.error("Error al eliminar imagen anterior:", err);
          }
        }
        producto.imagen = req.file.filename;
      }

      if (stock !== undefined && parseInt(stock) < 0) {
        return res.status(400).json({
          success: false,
          message: "El stock no puede ser negativo",
        });
      }

      if (!nuevaSubcategoria.activo) {
        return res.status(400).json({
          success: false,
          message: `La subcategoria con id ${nuevaSubcategoria.nombre} esta inactiva`,
        });
      }
    }

    // Actualizar campos
    if (nombre !== undefined) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (categoriaId !== undefined) producto.categoriaId = parseInt(categoriaId);
    if (activo !== undefined) producto.activo = activo;
    if (stock !== undefined) producto.stock = parseInt(stock);
    if (precio !== undefined) producto.precio = parseFloat(precio);
    if (subcategoriaId !== undefined)
      producto.subcategoriaId = parseInt(subcategoriaId);
    // guardar cambios
    await producto.save();

    // respuesta exitosa
    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: {
        producto,
      },
    });
  } catch (error) {
    console.error("Error en actualizar producto:", error);
    if (req.file) {
      const rutaImagen = path.join(__dirname, "../uploads", req.file.filename);
      try {
        await fs.unlink(rutaImagen);
      } catch (err) {
        console.error("Error al eliminar imagen:", err);
      }
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validacion",
        errors: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message,
    });
  }
};

/**
 * Activar/Desactivar producto
 * PATCH/api/admin/produtos/:id/estado
 *
 *
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const toggleProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar Producto
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    producto.activo = !producto.activo;
    await producto.save();

    //Respuesta exitosa
    res.json({
      success: true,
      message: `Producto ${producto.activo ? "activado" : "desactivado"} exitosamente`,
      data: {
        producto,
      },
    });
  } catch (error) {
    console.error("Error en toggleProducto:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar estado de producto",
      error: error.message,
    });
  }
};

/**
 * Eliminar producto
 * DELETE /api/admin/productos/:id
 * Solo permite eliminar productos relacionados
 * @param {Object} req request express
 * @param {Object} res response express
 */

const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    //Buscar producto
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    //el hook beforeDestroy de producto se encarga de eliminar la imagen
    await producto.destroy();

    // Eliminar producto
    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
};

/**
 * Actualizar stock de un producto
 * PATCH /api/admin/productos/:id/stock
 * body { Cantidad, operacion: 'aumentar' | 'reducir' | 'establecer' }
 */

const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, operacion } = req.body;

    if (!cantidad || !operacion) {
      return res.status(400).json({
        success: false,
        message: "La cantidad y la operación son obligatorias",
      });
    }

    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 0) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número positivo",
      });
    }

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    let nuevoStock;
    switch (operacion) {
      case "aumentar":
        nuevoStock = producto.aumentarStock(cantidadNum);
        break;
      case "reducir":
        if (cantidadNum > producto.stock) {
          return res.status(400).json({
            success: false,
            message: `No hay suficiente stock. Stock disponible: ${producto.stock}`,
          });
        }
        nuevoStock = producto.reducirStock(cantidadNum);
        break;
      case "establecer":
        nuevoStock = cantidadNum;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Operación no válida",
        });
    }

    producto.stock = nuevoStock;
    await producto.save();

    res.json({
      success: true,
      message: `Stock ${operacion === "aumentar" ? "aumentado" : operacion === "reducir" ? "reducido" : "establecido"} exitosamente`,
      data: {
        productoId: producto.id,
        nombre: producto.nombre,
        stockAnterior:
          operacion === "establecer"
            ? null
            : operacion == "aumentar"
              ? producto.stock - cantidadNum
              : producto.stock + cantidadNum,
        stockNuevo: producto.stock,
      },
    });
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar stock",
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
  actualizarStock,
};
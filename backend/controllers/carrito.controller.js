/**
 * controlador de carrtio de compras
 * gestion de carrito
 * requiere autenticacion
 */

//importar el modelo de carrito
const Carrito = require("../models/carrito");
const Producto = require("../models/producto");
const Categoria = require("../models/categoria");
const Subcategoria = require("../models/subcategoria");

/**
 * Obtener carrito del usuario autenticado
 * GET /api/carrito
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param res
 * @returns
 */

const getCarrito = async (req, res) => {
  try {
    // obtener items del carrito con los productos asociados
    const itemsCarrito = await Carrito.findAll({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Producto,
          as: "producto",
          attributes: [
            "id",
            "nombre",
            "descripcion",
            "precio",
            "imagen",
            "activo",
          ],
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
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    //calcular el total del carrito
    let totalCarrito = 0;
    itemsCarrito.forEach((item) => {
      total += parseFloat(items.precioUnitario) * parseFloat(items.cantidad);
    });

    //Respuesta e xitosa
    res.json({
      success: true,
      data: {
        items: itemsCarrito,
        resumen: {
          totalItems: itemsCarrito.length,
          cantidadTotal: itemsCarrito.reduce(
            (sum, item) => sum + item.cantidad,
            0,
          ),
          totalCarrito: total.tofixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Error en getCarrito", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el carrito",
      error: error.message,
    });
  }
};

/**
 * Agregar producto al carrito
 * POST /api/carrito
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param {Object} res response express
 */

const agregarAlCarrito = async (req, res) => {
  try {
    const { productoId, cantidad = 1 } = req.body;
    //validacion 1: campos obligatorios
    if (!productoId) {
      return res.status(400).json({
        success: false,
        message: "El productoId es obligatorio",
      });
    }

    //Validacion 2: cantidad valida
    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 1) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número positivo",
      });
    }

    //validacion 3: producto existente y esta activo
    const producto = await Producto.findByPk(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    if (!producto.activo) {
      return res.status(400).json({
        success: false,
        message: "El producto está desactivado",
      });
    }

    //Validacion 4: verificar si ya existe en el carrito
    const itemExistente = await Carrito.findOne({
      where: {
        usuarioId: req.usuario.id,
        productoId,
      },
    });

    if (itemExistente) {
      //actualizar cantidad
      const nuevaCantidad = itemExistente.cantidad + cantidadNum;

      //validar stock disponible
      if (nuevaCantidad > producto.stock) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Dispobile; ${producto.stock} unidades disponibles, en carrito tienes ${itemExistente.cantidad} unidades.`,
        });
      }

      iteamExistente.cantidad = nuevaCantidad;
      await itemExistente.save();

      //recargar producto
      await itemExistente.reload({
        include: [
          {
            model: Producto,
            as: "producto",
            attributes: ["id", "nombre", "precio", "stock", "imagen"],
          },
        ],
      });
      return res.json({
        success: true,
        message: "Cantidad actualizada en el carrito",
        data: {
          item: itemExistente,
        },
      });
    }

    //validar stock disponible
    if (cantidadNum > producto.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Dispobile; ${producto.stock} unidades disponibles, en carrito tienes ${itemExistente.cantidad} unidades.`,
      });
    }

    // crear item en el carrito
    const nuevoItem = await Carrito.create({
      usuarioId: req.usuario.id,
      productoId,
      cantidad: cantidadNum,
      precioUnitario: producto.precio,
    });

    //recargar con producto
    await nuevoItem.reload({
      include: [
        {
          model: Producto,
          as: "producto",
          attributes: ["id", "nombre", "precio", "stock", "imagen"],
        },
      ],
    });

    //Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Producto agregado al carrito",
      data: {
        item: nuevoItem,
      },
    });
  } catch (error) {
    console.error("Error al agregarAlCarrito ", error);
    res.status(500).json({
      success: false,
      message: "Error al agregar al carrito",
      error: error.message,
    });
  }
};

/**
 * Actualizar cantidad de un item en el carrito
 * PATCH /api/carrito/:id
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param {Object} res response express
 */

const actualizarItemCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    //Validar cantidad
    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 1) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número positivo",
      });
    }

    //Buscar item del carrito
    const item = await Carrito.findOne({
      where: {
        id,
        usuarioId: req.usuario.id,
      },
      include: [
        {
          model: Producto,
          as: "producto",
          attributes: ["id", "nombre", "precio", "stock", "imagen"],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item no encontrado en el carrito",
      });
    }

    //validar stock disponible
    if (cantidadNum > item.producto.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Dispobile; ${item.producto.stock} unidades disponibles, en carrito tienes ${item.cantidad} unidades.`,
      });
    }

    //actualizar cantidad
    item.cantidad = cantidadNum;
    await item.save();

    //respuesta exitosa
    res.json({
      success: true,
      message: "Cantidad actualizada en el carrito",
      data: {
        item,
      },
    });
  } catch (error) {
    console.error("Error al actualizarItemCarrito ", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el item del carrito",
      error: error.message,
    });
  }
};

/**
 * Eliminar un item del carrito
 * DELETE /api/carrito/:id
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param {Object} res response express
 */
const eliminarItemCarrito = async (req, res) => {
  try {
    const { id } = req.params;

    //Buscar item del carrito
    const item = await Carrito.findOne({
      where: {
        id,
        usuarioId: req.usuario.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item no encontrado en el carrito",
      });
    }

    //Eliminar item
    await item.destroy();

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Item eliminado del carrito",
    });
  } catch (error) {
    console.error("Error al eliminarItemCarrito ", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el item del carrito",
      error: error.message,
    });
  }
};

/**
 * Vaciar carrito
 * DELETE /api/carrito
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param {Object} res response express
 */
const vaciarCarrito = async (req, res) => {
  try {
    //Eliminar todos los items del carrito
    const itemsEliminados = await Carrito.destroy({
      where: {
        usuarioId: req.usuario.id,
      },
    });

    //Respuesta exitosa
    res.json({
      success: true,
      message: "Carrito vaciado",
      data: {
        itemsEliminados,
      },
    });
  } catch (error) {
    console.error("Error al vaciarCarrito ", error);
    res.status(500).json({
      success: false,
      message: "Error al vaciar el carrito",
      error: error.message,
    });
  }
};

//exportaciones
module.exports = {
  getCarrito,
  agregarAlCarrito,
  actualizarItemCarrito,
  eliminarItemCarrito,
  vaciarCarrito,
};  
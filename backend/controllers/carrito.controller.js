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
              attributes: ["id", "nombre"]
            },
            {
              model: Subcategoria,
              as: "subcategoria",
              attributes: ["id", "nombre"]
            }
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
          resumen:
              {
                  totalItems: itemsCarrito.length,
                  cantidadTotal: itemsCarrito.reduce((sum, item) => sum + item.cantidad, 0),
                  totalCarrito: total.tofixed(2),
              }
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener el carrito",
    });
  }
};
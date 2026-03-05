/**
 * Controlador de pedidos
 * gestion de pedidos
 * requiere autenticacion
 */

//importar el modelo de carrito
const Pedido = require("../models/pedido");
const DetallePedido = require("../models/detallePedido");
const Carrito = require("../models/carrito");
const Usuario = require("../models/Usuario");
const Producto = require("../models/producto");
const Categoria = require("../models/categoria");
const Subcategoria = require("../models/subcategoria");

/**
 * Crear pedido desde el carrito
 * POST /api/cliente/pedidos
 * @param {Object} req request express con req.usuario del middleware de autenticacion
 * @param res
 * @returns
 */

const crearPedido = async (req, res) => {
  const { sequelize } = require("../config/database");
  const t = await sequelize.transaction();

  try {
    const {
      direccionEnvio,
      telefono,
      metodoPago = "efectivo",
      notasAdicionales,
    } = req.body;

    //Validacion 1: direccion requerida
    if (!direccionEnvio || direccionEnvio.trim() === "") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "La direccion de envio es obligatoria",
      });
    }

    //Validacion 2: telefono requerido
    if (!telefono || telefono.trim() === "") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "El telefono es obligatorio",
      });
    }

    //Validacion 3: metodo de pago requerido
    const metodosValidos = ["efectivo", "tarjeta", "transferencia"];
    if (!metodosValidos.includes(metodoPago)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `metodo de pago invalido. Los metodos validos son: ${metodosValidos.join(", ")} `,
      });
    }

    //obtener items del carrito
    const carritoItems = await Carrito.findAll({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Producto,
          as: "producto",
          attributes: ["id", "nombre", "precio", "stock", "activo"],
        },
      ],
      transaction: t,
    });

    if (carritoItems.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "El carrito esta vacio",
      });
    }

    // Verificar stock y productos activos
    const erroresValidacion = [];
    let totalPedido = 0;

    for (const item of carritoItems) {
      const producto = item.producto;

      // verificar que el producto este activo
      if (!producto.activo) {
        erroresValidacion.push(`${producto.nombre} ya no esta disponible`);
        continue;
      }

      //verificar stock suficiente
      if (item.cantidad > producto.stock) {
        erroresValidacion.push(
          `${producto.nombre}: stock insuficiente (disponible: ${producto.stock}, solicitado: ${item.cantidad})`,
        );
        continue;
      }

      //Caluclar total
      totalPedido += parseFloat(item.precioUnitario) * item.cantidad;
    }

    //Si hay errores de validacion retornar
    if (erroresValidacion.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Error en validacion de carrito",
        errores: erroresValidacion,
      });
    }

    //crear pedido
    const pedido = await Pedido.create(
      {
        usuarioId: req.usuario.id,
        total: totalPedido,
        estado: "pendiente",
        direccionEnvio,
        telefono,
        metodoPago,
        notasAdicionales,
      },
      { transaction: t },
    );

    //Crear  detalles del pedido y actualizar stock
    const detallesPedido = [];
    for (const item of carritoItems) {
      const producto = item.producto;

      //Crar detalle
      const detalle = await DetallePedido.create(
        {
          pedidoId: pedido.id,
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: parseFloat(item.precioUnitario) * item.cantidad,
        },
        { transaction: t },
      );

      detallesPedido.push(detalle);

      //reducir stock del producto
      producto.stock -= item.cantidad;
      await producto.save({ transaction: t });
    }

    //vaciar carrito
    await Carrito.destroy({
      where: { usuarioId: req.usuario.id },
      transaction: t,
    });

    //confirmar transaccion
    await t.commit();

    //cargar pedido con relaciones
    await pedido.reload({
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nombre", "email"],
        },
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            {
              model: Producto,
              as: "producto",
              attributes: ["id", "nombre", "precio", "imagen"],
            },
          ],
        },
      ],
    });

    //respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Pedido creado existosamente",
      data: {
        pedido,
      },
    });
  } catch (error) {
    //revetir transaccion en caso de error
    await t.rollback();
    console.error("Error en crearPedido", error);
    res.status(500).json({
      success: false,
      message: "Error al crear Pedido",
      error: error.message,
    });
  }
};

/**
 * Obtener pedido del cliente autenticado
 * GET/ap/cliente/pedidos
 * query:?estado=pediente&pagina=1&limite=10
 */

  const getMisPedidos = async (req, res) => {
    try {
      const { estado, pagina = 1, limite = 10 } = req.query;

      //filtros
      const where = { usuarioId: req.usuario.id };
      if (estado) where.estado = estado;

      //paginacion
      const offset = (parseInt(pagina) - 1) * parseInt(limite);

      //consultar pedidos
      const { count, rows: pedidos } = await Pedido.findAndCountAll({
        where,
        include: [
          {
            model: DetallePedido,
            as: "detalles",
            include: [
              {
                model: Producto,
                as: "producto",
                attributes: ["id", "nombre", "imagen"],
              },
            ],
          },
        ],
        limit: parseInt(limite),
        offset,
        order: [["createdAt", "DESC"]],
      });

      //respuesta exitosa
      res.status(200).json({
        success: true,
        data: {
          pedidos,
          paginacion: {
            total: count,
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            totalPaginas: Math.ceil(count / parseInt(limite)),
          },
        },
      });
    } catch (error) {
      console.error("Error en getMisPedidos", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los pedidos",
        error: error.message,
      });
    }
  };

  /**
   * Obtener un pedido especifico por id
   * GET/api/cliente/pedidos:id
   * solo puede ver sus pedidos admin todos
   */

  const getPedidoById = async (req, res) => {
    try {
      const { id } = req.params;
      //construir filtros ( cliente solo ve sus pedido admin ve todos)
      const where = { id };
      if (req.usuario.rol !== "administrador") {
        where.usuarioId = req.usuario.id;
      }

      //Buscar pedido
      const pedido = await Pedido.findOne({
        where,
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["id", "nombre", "email"],
          },
          {
            model: DetallePedido,
            as: "detalles",
            include: [
              {
                model: Producto,
                as: "producto",
                attributes: ["id", "nombre", "descripcion", "imagen"],
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
          },
        ],
      });

      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: "pedido no encontrado",
        });
      }

      //respuesta exitosa
      res.json({
        success: true,
        data: {
          pedido,
        },
      });
    } catch (error) {
      console.error("Error en getPedidoById:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el pedido",
        error: error.message,
      });
    }
  };

  /**
   * cancelar pedido
   * Put/api/cliente/pedidos/:id/cliente
   * solo se puede cancelar si el estado es pendiente
   * devuelve el stock a los productos
   */

  const cancelarPedido = async (req, res) => {
    const { sequelize } = require("../config/database");
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;

      //buscar el pedido solo los prodpios pedidos
      const pedido = await Pedido.findOne({
        where: {
          id,
          usuarioId: req.usuario.id,
        },
        include: [
          {
            model: DetallePedido,
            as: "detalles",
            include: [
              {
                model: Producto,
                as: "producto",
              },
            ],
          },
        ],
        transaction: t,
      });

      if (!pedido) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado",
        });
      }

      // solo se puede cancelar si esta en pendiente
      if (pedido.estado !== "pendiente") {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `NO se puede cancelar un pedido en estado '${pedido.estado}'`,
        });
      }

      // devolver stock de los productos
      for (const detalle of pedido.detalles) {
        const producto = detalle.producto;
        producto.stock += detalle.cantidad;
        await producto.save({ transaction: t });
      }

      //actualizar estado del pedido
      pedido.estado = "cancelado";
      await pedido.save({ transaction: t });

      await t.commit();

      //respuesta exitosa
      res.status(200).json({
        success: true,
        message: "Pedido cancelado exitosamente",
        data: {
          pedido,
        },
      });
    } catch (error) {
      await t.rollback();
      console.error("Error en cancelarPedido:", error);
      res.status(500).json({
        success: false,
        message: "Error al cancelar el pedido",
        error: error.message,
      });
    }
  };

/**
 * admin: obtenertodos los pedidos
 * GET/api/admin/pedidos
 *
 */

const getAllPedidos = async (req, res) => {
  try {
    const { estado, usuarioId, pagina = 1, limite = 20 } = req.query;

    //Filtros
    const where = {};
    if (estado) where.estado = estado;
    if (usuarioId) where.usuarioId = usuarioId;

    //Paginacion
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    //consultar pedidos
    const { count, rows: pedidos } = await Pedido.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nombre", "email"],
        },
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            {
              model: Producto,
              as: "producto",
              attributes: ["id", "nombre", "imagen"],
            },
          ],
        },
      ],
      limit: parseInt(limite),
      offset,
      order: [["createdAt", "DESC"]],
    });

    //respuesta exitosa
    res.json({
      success: true,
      data: {
        pedidos,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite)),
        },
      },
    });
  } catch (error) {
    console.error("Error en getAllPedidos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los pedidos",
      error: error.message,
    });
  }
};

/**
 * adminactualizar estado del pedido
 * PUT/api/admin/pedidos/:id/estado
 *body: { estado }
 */

const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    //validar estado
    const estadosValidos = ["pendiente", "enviado", "entregado", "cancelado"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Los estados válidos son: ${estadosValidos.join(", ")}`,
      });
    }
    //buscar pedido
    const pedido = await Pedido.findByPk(id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    //actualizar estado del pedido
    pedido.estado = estado;
    await pedido.save();

    //recargar con las relaciones
    await pedido.reload({
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nombre", "email"],
        },
      ],
    });

    //respuesta exitosa
    res.status(200).json({
      success: true,
      message: "Estado del pedido actualizado exitosamente",
      data: {
        pedido,
      },
    });
  } catch (error) {
    console.error("Error en actualizarEstadoPedido:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el estado del pedido",
      error: error.message,
    });
  }
};

/**
 * obtener estadisticas de pedidos
 * GET/api/admin/pedidos/estadisticas
 */

const getEstadisticasPedidos = async (req, res) => {
  try {
    const { Op, fn, col } = require("sequelize");

    //total de pedidos
    const totalPedidos = await Pedido.count();

    //pedidos estado
    const pedidosPorEstado = await Pedido.findAll({
      attributes: [
        "estado",
        [fn("COUNT", col("id")), "cantidad"],
        [fn("COUNT", col("total")), "totalVentas"],
      ],
      group: "estado",
    });

    //total de ventas
    const totalVentas = await Pedido.sum("total");

    //Pedidos hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pedidosHoy = await Pedido.count({
      where: {
        createdAt: { [Op.gte]: hoy },
      },
    });

    //respuesta exitosa
    res.json({
      success: true,
      data: {
        totalPedidos,
        pedidosHoy,
        ventasTotales: parseFloat(totalVentas.toFixed(2)),
        pedidosPorEstado: pedidosPorEstado.map((p) => ({
          estado: p.estado,
          cantidad: parseInt(p.getDataValue("cantidad")),
          totalVentas: parseFloat(p.getDataValue("totalVentas") || 0).toFixed(2),
        })),
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasPedidos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadisticas de los pedidos",
      error: error.message,
    });
  }
};

// exportar controladores
module.exports = {
  crearPedido,
  getMisPedidos,
  getAllPedidos,
  cancelarPedido,
  getPedidoById, 
  actualizarEstadoPedido,
  getEstadisticasPedidos,
};
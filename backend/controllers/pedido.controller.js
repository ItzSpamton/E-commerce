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
const { parse } = require("node:path");

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
        const { direccionEnvio, telefono, metodoPago = 'efectivo', notasAdicionales } = req.body;
    
        //Validacion 1: direccion requerida
        if (!direccionEnvio || direccionEnvio.trim() === '') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "La direccion de envio es obligatoria",
            });
        }

        //Validacion 2: telefono requerido
        if (!telefono || telefono.trim() === '') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "El telefono es obligatorio",
            });
        }

        //Validacion 3: metodo de pago requerido
        const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
        if (!metodosValidos.includes(metodoPago)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `metodo de pago invalido. Los metodos validos son: ${metodosValidos.join(', ')} `,
            });
        }

        //obtener items del carrito
        const carritoItems = await Carrito.findAll({
            where: { usuarioId: req.usuario.id },
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['id', 'nombre', 'precio', 'stock', 'activo'],
                },
            ],
            transaction: t,
        });

        if (itemsCarrito.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "El carrito esta vacio",
            });
        }

        
//verificar stock y productos activos
const erroresValidacion = [];
let totalPedido = 0;

for (const item of itemsCarrito) {
    const producto = item.producto;

    //verificar si el producto este activo
    if (!producto.activo) {
        erroresValidacion.push(`${producto.nombre} esta disponible`);
        continue;
    }

    //verificar stock suficiente 
    if (item.cantidad > producto.stock) {
        erroresValidacion.push(`${producto.nombre}: stock insuficiente (disponible: ${producto.stock}, solicitado: ${item.cantidad})`

        );
        continue;
    }

    //calcular total
    totalPedido += parseFloat(item.precioUnitario) * parseFloat(item.cantidad);
}

//ai hay errorer de validacion retornar
if (erroresValidacion.length > 0) {
    await t.rollback();
    return res.status(400).json({
        success: false,
        message: "Errores de validacion",
        errores: erroresValidacion,
    });
}

//crear pedido
const pedido = await Pedido.create({
    usuarioId: req.usuario.id,
    total: totalPedido,
    estado: 'pendiente',
    direccionEnvio,
    telefono,
    metodoPago,
    notasAdicionales,
}, { transaction: t});

//crear detalles del pedido y actualizar stock

const detallesPedido = [];

for (const item of itemsCarrito) {
    const producto = item.producto;

    //crear detalle
    const detalle = await DetallePedido.create({
        pedidoId: pedido.id,
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: parseFloat(item.precioUnitario) * (item.cantidad),
    }, { transaction: t });

    detallesPedido.push(detalle);

    //reducir stock del producto
    producto.stock -= item.cantidad;
    await producto.save({ transaction: t });
}

//vaciar carrito
await Carrito.destroy({
    where: { usuarioId: req.usuario.id },
    transaction: t
});

//confirmar transaccion 
await t.commit();

//cargar pedido con relaciones 
await pedido.reload({
    include: [
        {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'email'],
        },
        {
            model: DetallePedido,
            as: 'detalles',
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['id', 'nombre', 'precio', 'stock', 'activo'],
                },
            ],
        },
    ],
});

//respuesta exitosa 
res.status(201).json({
    success: true,
    message: "Pedido creado exitosamente",
    data: {
        pedido,
    }
});


} catch (error) {
    //revertit transaccion en caso de error 
    await t.rollback();
    console.error("Error al crear el pedido", error);
    res.status(500).json({
        success: false,
        message: "Error al crear el pedido",
        error: error.message,
    });
}
};


/**
 * obtener pedidos del cliente autenticado
 * get/api/cliente/pedidos
 * query: ?estado=pendiente&pagina=1&limite=10
 */

const getMisPedidos = async (req, res) => {
    try {
        const { estado, pagina = 1, limite = 10 } = req.query;

        //construir filtros para la consulta
        const where = {
            usuarioId: req.usuario.id,
        };

        if (estado) {
            where.estado = estado;
        }

        //paginacion
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        //cosultar pedidos 
        const { count, rows: pedidos } = await Pedido.findAndCountAll({
            where,
            include: [
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: ['id', 'nombre', 'imagen'],
                        }]
                    }
                ],
                limit: parseInt(limite),
                offset,
                order: [['createdAt', 'DESC']],
            });
            //respuesta exitosa
            res.json({
                success: true,
                count,
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
 * obteer un pedido especifico por ID
 * Get/aoi/cliente/ pedidos/:id
 * solo puede ver sus pedidos admin todos
 */

const getPedidoById = async (req, res) => {
    try {
        const { id } = req.params;

        //construir filtros (cliente solo ve sus pedidos, admin ve todos)
        const where = {
            id,
        };
        if (req.usuario.rol !== 'administrador') {
            where.usuarioId = req.usuario.id;
        }

        //buscar pedido
        const pedido = await Pedido.findOne({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre'],
                }
            ]
        });

/**
 * admin obtener todos los pedidos 
 * get/api/admin/pedidos
 * query ?estado=pendiente&usuarioId=1&pagina=1&limite=10
 */
const getAllPedidos = async (req, res) => {
    try {
        const { estado, usuarioId, pagina = 1, limite} = 20 = req.query;
    }
    //filtros 
    const where = {};
    if (estado) where.estado = estado;
    if (usuarioId) where.usuarioId = usuarioId;

    //paginacion
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    //consultar pedidos
    const { count, rows: pedidos } = await Pedido.findAndCountAll({
        where,
        include: [
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre'],

    ]
    }
    )};







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
        const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: `Estado invalido. Los estados validos son: ${estadosValidos.join(', ')}`,
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

        //actualizar estado
        pedido.estado = estado;
        await pedido.save();

        //respuesta exitosa
        
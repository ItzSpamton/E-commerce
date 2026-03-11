/** Rutas del cliente
 * rutas publicas y para clientes autenticados
 */

const express = require("express");
const router = express.Router();

//importar middleware de autenticacion
const { verificarAuth } = require("../middleware/auth");
const { esCliente } = require("../middleware/checkRole");

// importar controladores
const catalogoController = require("../controllers/catalogo.controller");
const carritoController = require("../controllers/carrito.controller");
const pedidoController = require("../controllers/pedido.controller");

//rutas publicas de catalogo

// get/api/catalogo/productos
router.get("/catalogo/productos", catalogoController.getProductos);

// get /api/catalogo/productos/:id
router.get("/catalogo/productos/:id", catalogoController.getProductoById);

// get /api/catalogo/categorias
router.get("/catalogo/categorias", catalogoController.getCategorias);

// get /api/catalogo//:id/subcategorias
router.get(
  "/catalogo/categorias/:id/subcategorias",
  catalogoController.getSubcategoriasPorCategoria,
);

// get /api/catalogo/destacados
router.get(
  "/catalogo/productos-destacados",
  catalogoController.getProductosDestacados,
);

//rutas de pedidos -clientes

// post/api/cliente/pedidos
router.post("/pedidos", pedidoController.crearPedido);

// get/api/cliente/pedidos
router.get("/cliente/pedidos", pedidoController.getMisPedidos);

// get/api/cliente/pedidos/:id
router.get("/pedidos/:id", pedidoController.getPedidoById);

// put/api/cliente/pedidos/:id/estado
router.put("/pedidos/:id/estado", pedidoController.actualizarEstadoPedido);

// put/api/cliente/pedidos/:id/cliente
router.put("/pedidos/:id/cliente", pedidoController.cancelarPedido);

// get/api/cliente/pedidos/estadisticas
router.get("/pedidos/estadisticas", pedidoController.getEstadisticasPedidos);

// exportar rutas
module.exports = router;
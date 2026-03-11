/**
 * Rutas de admin
 * agrupar las rutas de admin de gestion de usuarios, categorias, subcategorias y productos
 */

const express = require("express");
const router = express.Router();

//importar middleware de autenticacion
const { verificarAuth } = require("../middleware/auth");
const {
  esAdministrador,
  esAdminOAuxiliar,
  soloAdministrador,
} = require("../middleware/checkRole");

//importar configuracion de multer para subir imagenes
const { upload } = require("../config/multer");

// importar controladores
const categoriaController = require("../controllers/categoria.controller");
const subcategoriaController = require("../controllers/subcategoria.controller");
const productoController = require("../controllers/producto.controller");
const usuarioController = require("../controllers/usuario.controller");
const pedidoController = require("../controllers/pedido.controller");

//restricciones de rutas
router.use(verificarAuth, esAdminOAuxiliar);

//rutas de categoria

// get/api/admin/categorias
router.get("/categorias", categoriaController.getCategorias);

// get/api/admin/categorias/:id
router.get("/categorias/:id", categoriaController.getCategoriasById);

// get/api/admin/categorias/:id/estadisticas
router.get("/categorias/:id/estadisticas", categoriaController.getEstadisticasCategoria);

// post/api/admin/categorias
router.post("/categorias", categoriaController.crearCategoria);

// patch/api/admin/categorias/:id/toggle
router.patch("/categorias/:id/toggle", categoriaController.toggleCategoria);

// put/api/admin/categorias/:id
router.put("/categorias/:id", categoriaController.actualizarCategoria);

// delete/api/admin/categorias/:id
router.delete("/categorias/:id", soloAdministrador, categoriaController.eliminarCategoria);



//rutas de subcategoria

// get/api/admin/subcategorias
router.get("/subcategorias", subcategoriaController.getSubcategorias);

// get/api/admin/subcategorias/:id
router.get("/subcategorias/:id", subcategoriaController.getSubcategoriasById);

// get/api/admin/subcategorias/:id/estadisticas
router.get("/subcategorias/:id/estadisticas", subcategoriaController.getEstadisticasSubcategoria);

// post/api/admin/subcategorias
router.post("/subcategorias", subcategoriaController.crearSubcategoria);

// patch/api/admin/subcategorias/:id/toggle
router.patch("/subcategorias/:id/toggle", subcategoriaController.toggleSubcategoria);

// put/api/admin/subcategorias/:id
router.put("/subcategorias/:id", subcategoriaController.actualizarSubcategoria);

// delete/api/admin/subcategorias/:id
router.delete("/subcategorias/:id", soloAdministrador, subcategoriaController.eliminarSubcategoria);



//rutas de producto

// get/api/admin/productos
router.get("/productos", productoController.getProductos);

// get/api/admin/productos/:id
router.get("/productos/:id", productoController.getProductoById);

// post/api/admin/productos
router.post("/productos", upload.single("imagen"), productoController.crearProducto);

// patch/api/admin/productos/:id/toggle
router.patch("/productos/:id/toggle", productoController.toggleProducto);

// put/api/admin/productos/:id
router.put("/productos/:id", upload.single("imagen"), productoController.actualizarProducto);

// delete/api/admin/productos/:id
router.delete("/productos/:id", soloAdministrador, productoController.eliminarProducto);

// patch/api/admin/productos/:id/stock
router.patch("/productos/:id/stock", productoController.actualizarStock);



//rutas de usuario

// get/api/admin/usuarios
router.get("/usuarios", usuarioController.getUsuarios); 

// get/api/admin/usuarios/:id
router.get("/usuarios/:id", usuarioController.getUsuarioById);

// post/api/admin/usuarios
router.post("/usuarios", usuarioController.crearUsuario);

// put/api/admin/usuarios/:id
router.put("/usuarios/:id", usuarioController.actualizarUsuario);

// put/api/admin/usuarios/:id/estado
router.put("/usuarios/:id/estado", usuarioController.toggleUsuario);

// delete/api/admin/usuarios/:id
router.delete("/usuarios/:id", soloAdministrador, usuarioController.eliminarUsuario);

// get/api/admin/usuarios/:id/estadisticas
router.get("/usuarios/:id/estadisticas", usuarioController.getEstadisticasUsuarios);



//rutas de pedido

// post/api/admin/pedidos
router.post("/pedidos", pedidoController.crearPedido);

// get/api/admin/pedidos
router.get("/pedidos", pedidoController.getAllPedidos);

// get/api/cliente/pedidos
router.get("/cliente/pedidos", pedidoController.getMisPedidos);

// get/api/admin/pedidos/:id
router.get("/pedidos/:id", pedidoController.getPedidoById);

// put/api/admin/pedidos/:id/estado
router.put("/pedidos/:id/estado", pedidoController.actualizarEstadoPedido);

// put/api/admin/pedidos/:id/cliente
router.put("/pedidos/:id/cliente", pedidoController.cancelarPedido);

// get/api/admin/pedidos/estadisticas
router.get("/pedidos/estadisticas", pedidoController.getEstadisticasPedidos);

// exportar rutas
module.exports = router;
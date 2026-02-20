/**
 * Asociaciones entre modelos
 * este archivo define todas las relaciones entre los modelos de sequelize
 * debe ejecutarse despies de importar los modelos
 */

//importar todos los modelos

const usuario = require("./Usuario.js");
const categoria = require("./categoria.js");
const carrito = require("./carrito.js");
const subcategoria = require("./subcategoria.js");
const producto = require("./producto.js");
const pedido = require("./pedido.js");
const detallePedido = require("./detallePedido.js");

/**
 * definir asocioaciones
 * tipos de relaciones sequeelize
 * hasone 1 - 1
 * belongsto 1 - 1
 * hasmany 1 - N
 * belongstomany N - N
 */

/**
 * categoria - subcategoria
 * una categoria tiene muchas subcategorias
 */

categoria.hasMany(subcategoria, {
  foreignKey: "categoriaId", // campo que conecta las tablas
  as: "subcategorias", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la categoria eliminar la subcategoria
  onUpdate: "CASCADE",
});

/**
 * subcategoria - categoria
 * una subcategoria pertenece a una categoria
 */
subcategoria.belongsTo(categoria, {
  foreignKey: "categoriaId", // campo que conecta las tablas
  as: "categoria", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la subcategoria eliminar la categoria
  onUpdate: "CASCADE",
});

/**
 * categoria - producto
 * una categoria tiene muchos productos
 */

categoria.hasMany(producto, {
  foreignKey: "categoriaId", // campo que conecta las tablas
  as: "producto", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la categoria eliminar el producto
  onUpdate: "CASCADE",
});

/**
 * producto - categoria
 * un producto pertenece a una categoria
 */

producto.belongsTo(categoria, {
  foreignKey: "categoriaId", // campo que conecta las tablas
  as: "categoria", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la categoria eliminar la subcategoria
  onUpdate: "CASCADE", // si se actualiza la categoria se actualiza la subcategoria
});

/**
 * subcategoria - producto
 * una subcategoria tiene muchos productos
 */

subcategoria.hasMany(producto, {
  foreignKey: "subcategoriaId", // campo que conecta las tablas
  as: "producto", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la subcategoria eliminar el producto
  onUpdate: "CASCADE", // si se actualiza la subcategoria se actualiza el producto
});

producto.belongsTo(subcategoria, {
  foreignKey: "subcategoriaId", // campo que conecta las tablas
  as: "subcategoria", // alias para la relacion
  onDelete: "CASCADE", //si se elimina la subcategoria eliminar el producto
  onUpdate: "CASCADE", // si se actualiza la subcategoria se actualiza el producto
});

/**
 * usuario - carrito
 * un usuario tiene muchos carritos
 * un carrito pertenece a un usuario
 */
usuario.hasMany(carrito, {
  foreignKey: "usuarioId", // campo que conecta las tablas
  as: "carrito", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el usuario eliminar el carrito
  onUpdate: "CASCADE", // si se actualiza el usuario se actualiza el carrito
});

carrito.belongsTo(usuario, {
  foreignKey: "usuarioId", // campo que conecta las tablas
  as: "usuario", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el usuario eliminar el carrito
  onUpdate: "CASCADE", // si se actualiza el usuario se actualiza el carrito
});

/**
 * producto - carrito
 * un producto tiene muchos carritos
 * un carrito pertenece a un producto
 */

producto.hasMany(carrito, {
  foreignKey: "productoId", // campo que conecta las tablas
  as: "carrito", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el producto eliminar el carrito
  onUpdate: "CASCADE", // si se actualiza el producto se actualiza el carrito
});

carrito.belongsTo(producto, {
  foreignKey: "productoId", // campo que conecta las tablas
  as: "producto", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el producto eliminar el carrito
  onUpdate: "CASCADE", // si se actualiza el producto se actualiza el carrito
});

/**
 * usuario - pedido
 * un usuario tiene muchos pedidos
 * un pedido pertenece a un usuario
 */

usuario.hasMany(pedido, {
  foreignKey: "usuarioId", // campo que conecta las tablas
  as: "pedido", // alias para la relacion
  onDelete: "RESTRICT", //si se elimina el usuario no se elimina el pedido
  onUpdate: "CASCADE", // si se actualiza el usuario se actualiza el pedido
});

pedido.belongsTo(usuario, {
  foreignKey: "usuarioId", // campo que conecta las tablas
  as: "usuario", // alias para la relacion
  onDelete: "RESTRICT", //si se elimina el usuario no se elimina el pedido
  onUpdate: "CASCADE", // si se actualiza el usuario se actualiza el pedido
});

/**
 * pedido - detallePedido
 * un pedido tiene muchos detalles de pedido
 * un detalle de pedido pertenece a un pedido
 */

pedido.hasMany(detallePedido, {
  foreignKey: "pedidoId", // campo que conecta las tablas
  as: "detallePedido", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el pedido eliminar el detalle de pedido
  onUpdate: "CASCADE", // si se actualiza el pedido se actualiza el detalle de pedido
});

detallePedido.belongsTo(pedido, {
  foreignKey: "pedidoId", // campo que conecta las tablas
  as: "pedido", // alias para la relacion
  onDelete: "CASCADE", //si se elimina el pedido eliminar el detalle de pedido
  onUpdate: "CASCADE", // si se actualiza el pedido se actualiza el detalle de pedido
});

/**
 * producto - detallePedido
 * un producto tiene muchos detalles de pedido
 * un detalle de pedido pertenece a un producto
 */

producto.hasMany(detallePedido, {
  foreignKey: "productoId", // campo que conecta las tablas
  as: "detallePedido", // alias para la relacion
  onDelete: "RESTRICT", //si se elimina el producto no se elimina el detalle de pedido
  onUpdate: "CASCADE", // si se actualiza el producto se actualiza el detalle de pedido
});

detallePedido.belongsTo(producto, {
  foreignKey: "productoId", // campo que conecta las tablas
  as: "producto", // alias para la relacion
  onDelete: "RESTRICT", //si se elimina el producto no se elimina el detalle de pedido
  onUpdate: "CASCADE", // si se actualiza el producto se actualiza el detalle de pedido
});

/**
 * relaccion muchos a muchos entre pedido y producto
 * con una tabla intermedia que almacena la cantidad de cada producto en el pedido y el precio unitario al momento de realizar el pedido
 * esto permite mantener un historial preciso de los pedidos realizados por los usuarios, incluso si los productos cambian de precio o estado en el futuro
 */

pedido.belongsToMany(producto, {
  through: detallePedido, // tabla intermedia
  foreignKey: "pedidoId", // campo que conecta las tablas
  otherKey: "productoId", // campo que conecta las tablas
  as: "productos", // alias para la relacion
});

producto.belongsToMany(pedido, {
  through: detallePedido, // tabla intermedia
  foreignKey: "productoId", // campo que conecta las tablas
  otherKey: "pedidoId", // campo que conecta las tablas
  as: "pedidos", // alias para la relacion
});

/**
 * Exportar funcion de inicializacion
 * funcion para inicializar todaas las asociaciones
 * debe ejecutarse despues de importar todos los modelos
 * se llama desde server.js despues de cargar todos los modelos
 */

const initAssociations = () => {
  console.log("Asociaciones entre los modelos establecidas correctamente.");
};

// Exportar los modelos
module.exports = {
  usuario,
  categoria,
  carrito,
  subcategoria,
  producto,
  pedido,
  detallePedido,
  initAssociations,
};
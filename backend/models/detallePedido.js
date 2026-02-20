/**
 * Modelo dee detalle de pedido
 * Este modelo representa los detalles de un pedido, incluyendo la relación entre el pedido y los productos asociados a ese pedido, así como la cantidad de cada producto en el pedido y el precio unitario al momento de realizar el pedido. Este modelo es fundamental para gestionar los pedidos de los usuarios y calcular el total de cada pedido en función de los productos y cantidades asociadas.
 * El modelo de detalle de pedido se define utilizando Sequelize, una biblioteca de ORM (Object-Relational Mapping) para Node.js que facilita la interacción con bases de datos relacionales. En este modelo, se establecen las relaciones entre el pedido y los productos, así como las validaciones necesarias para garantizar la integridad de los datos y evitar problemas con productos desactivados o cantidades que excedan el stock disponible.
 * relacion muchos a muchos entre pedido y producto, con una tabla intermedia que almacena la cantidad de cada producto en el pedido y el precio unitario al momento de realizar el pedido, esto permite mantener un historial preciso de los pedidos realizados por los usuarios, incluso si los productos cambian de precio o estado en el futuro.
 */

//importar DataTypes de Sequelize para definir los tipos de datos de los campos
const { DataTypes } = require("sequelize");

//Importar la instancia de Sequelize para definir el modelo
const sequelize = require("../config/database");
const { parse } = require("node:path");
const { group } = require("node:console");

/**
 * Definir el modelo de detalle de pedido utilizando sequelize.define, este método se utiliza para definir un nuevo modelo en Sequelize, el primer argumento es el nombre del modelo (en singular), el segundo argumento es un objeto que define los campos y sus tipos de datos, y el tercer argumento es un objeto de opciones para configurar el modelo.
 * El primer argumento es el nombre del modelo (en singular), el segundo argumento es un objeto que define los campos y sus tipos de datos, y el tercer argumento es un objeto de opciones para configurar el modelo.
 * En este caso, se define un modelo llamado "DetallePedido" con los campos id (clave primaria, auto-incremental), pedidoId (clave foránea a la tabla pedidos), productoId (clave foránea a la tabla productos), cantidad (número entero, no nulo) y precioUnitario (número decimal, no nulo).
 */

const detallePedido = sequelize.define(
  "detallePedido",
  {
    //campos de la tabla detallePedido
    //Id Identificador único de detalle de pedido, es la clave primaria y se auto-incrementa
    id: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      primaryKey: true, //Clave primaria
      autoIncrement: true, //Auto-incremental
      allowNull: false, //No permite valores nulos
    },

    //PedidoId ID del pedido al que pertenece este detalle de pedido
    pedidoId: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      allowNull: false, //No permite valores nulos
      references: {
        model: "Pedidos", //Referencia a la tabla de pedidos
        key: "id", //Clave foránea en la tabla de pedidos
      },
      onUpdate: "CASCADE", //Si se actualiza el ID del pedido, se actualiza el ID del detalle de pedido
      onDelete: "CASCADE", //Si se elimina el pedido, se elimina el detalle de pedido
      validate: {
        notEmpty: {
          msg: "Debe especificar el ID del pedido del detalle de pedido", //Mensaje de error personalizado si se intenta crear un detalle de pedido sin ID de pedido
        },
      },
    },

    // ProductoID Id del producto en el detalle de pedido
    productoId: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      allowNull: false, //No permite valores nulos
      references: {
        model: "Productos", //Referencia a la tabla de productos
        key: "id", //Clave foránea en la tabla de productos
      },
      onUpdate: "CASCADE", //Si se actualiza el ID del producto, se actualiza el ID del detalle de pedido
      onDelete: "RESTRICT", //Se elimina el producto del detalle de pedido pero no se elimina el detalle de pedido, esto ayuda a mantener un historial preciso de los pedidos realizados por los usuarios, incluso si los productos cambian de precio o estado en el futuro.
      validate: {
        notEmpty: {
          msg: "Debe especificar un producto del detalle de pedido", //Mensaje de error personalizado si se intenta crear un detalle de pedido sin ID de producto
        },
      },
    },

    // Cantidad de este producto en el detalle de pedido
    cantidad: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      allowNull: false, //No permite valores nulos
      validate: {
        isInt: {
          msg: "La cantidad debe ser un número entero", //Mensaje de error personalizado si se intenta crear un detalle de pedido sin cantidad
        },
        min: {
          args: [1], //Valor mínimo de la cantidad
          msg: "La cantidad debe ser al menos 1", //Mensaje de error personalizado si se intenta crear un detalle de pedido con una cantidad menor a 1
        },
      },
    },

    /**
     * Precio unitario del producto al momento de agregarlo al detalle de pedido, este campo es importante para mantener un historial preciso de los pedidos realizados por los usuarios, incluso si los productos cambian de precio o estado en el futuro, al guardar el precio unitario en el detalle de pedido, se asegura que el total del pedido se calcule correctamente en función del precio del producto al momento de realizar el pedido, y no se vea afectado por cambios futuros en el precio del producto.
     * se guarda para mantener el precio aunque el producto cambie de precio en el futuro
     */
    precioUnitario: {
      type: DataTypes.DECIMAL(10, 2), //Tipo de dato decimal con 10 dígitos en total y 2 decimales
      allowNull: false, //No permite valores nulos
      validate: {
        isDecimal: {
          msg: "El precio unitario debe ser un número decimal", //Mensaje de error personalizado si se intenta crear un carrito sin precio unitario
        },
        min: {
          args: [0], //Valor mínimo del precio unitario
          msg: "El precio unitario debe ser mayor o igual a 0", //Mensaje de error personalizado si se intenta crear un carrito con un precio unitario negativo
        },
      },
    },

    /**
     * Subtotal calculado a partir del precio unitario y la cantidad, este campo no se almacena en la base de datos, sino que se calcula dinámicamente utilizando un método de instancia en el modelo de detalle de pedido, esto permite obtener el subtotal de cada detalle de pedido sin necesidad de almacenarlo en la base de datos, lo que ayuda a mantener la integridad de los datos y evitar problemas con cálculos incorrectos si se actualizan los precios o cantidades en el futuro.
     * El subtotal se calcula multiplicando el precio unitario por la cantidad, y se puede obtener utilizando el método de instancia calcularSubtotal() definido en el modelo de detalle de pedido.
     */
    subtotal: {
      type: DataTypes.DECIMAL(10, 2), //Tipo de dato decimal con 10 dígitos en total y 2 decimales
      allowNull: false, //No permite valores nulos
      validate: {
        isDecimal: {
          msg: "El subtotal debe ser un número decimal", //Mensaje de error personalizado si se intenta crear un detalle de pedido sin subtotal
        },
        min: {
          args: [0], //Valor mínimo del subtotal
          msg: "El subtotal no puede ser negativo", //Mensaje de error personalizado si se intenta crear un detalle de pedido con un subtotal negativo
        },
      },
    },
  },
  {
    // Opciones de modelo
    tableName: "detallePedido", //Nombre de la tabla en la base de datos
    timestamps: false, //No se crean automáticamente los campos createdAt y updatedAt
    //indices para mejorar las busquedas
    indexes: [
      {
        fields: ["pedidoId"], //Índice para buscar detalles de pedido por pedido
      },
      {
        fields: ["productoId"], //Índice para buscar detalles de pedido por producto
      },
    ],
    /**
     * Hooks acciones automaticas que se ejecutan en ciertos momentos del ciclo de vida de un modelo, en este caso se define un hook "beforeUpdate" que se ejecuta antes de actualizar un registro de categoría, este hook verifica si el campo "activo" ha cambiado a false (desactivado) y si es así, desactiva todas las subcategorías asociadas a esa categoría para mantener la integridad de los datos.
     */

    hooks: {
      /**
       * beforeCreate se ejecuta antes de crear un nuevo detalle de pedido, este hook busca el producto asociado a este detalle de pedido para verificar su estado (si está activo y si hay suficiente stock disponible) antes de permitir la creación del detalle de pedido, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que podrían estar desactivados o no tener suficiente stock para satisfacer la cantidad solicitada en el detalle de pedido.
       * Si el producto asociado a este detalle de pedido no existe, se lanza un error con un mensaje personalizado indicando que el producto no existe.
       * Si el producto asociado a este detalle de pedido está desactivado, se lanza un error con un mensaje personalizado indicando que no se puede crear un detalle de pedido para un producto desactivado.
       * Si la cantidad solicitada en el detalle de pedido excede el stock disponible del producto asociado, se lanza un error con un mensaje personalizado indicando que el stock es insuficiente y mostrando la cantidad disponible.
       * Si todas las verificaciones son exitosas, se guarda el precio unitario del producto al momento de agregarlo al detalle de pedido para mantener el precio aunque el producto cambie de precio en el futuro.
       */
      beforeCreate: (detalle) => {
        //Calcular el subtotal a partir del precio unitario * cantidad
        detalle.subtotal =
          parseFloat(detalle.precioUnitario) * detalle.cantidad;
      },
      /**
       * beforeUpdate se ejecuta antes de actualizar un registro de detalle de pedido, este hook verifica si el campo "cantidad" ha cambiado a false (desactivado) y si es así, busca el producto asociado a este detalle de pedido para verificar su estado (si está activo y si hay suficiente stock disponible) antes de permitir la actualización del detalle de pedido, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que podrían estar desactivados o no tener suficiente stock para satisfacer la cantidad solicitada en el detalle de pedido.
       * Si el producto asociado a este detalle de pedido no existe, se lanza un error con un mensaje personalizado indicando que el producto no existe.
       * Si la cantidad solicitada en el detalle de pedido excede el stock disponible del producto asociado, se lanza un error con un mensaje personalizado indicando que el stock es insuficiente y mostrando la cantidad disponible.
       * Si todas las verificaciones son exitosas, se actualiza el subtotal del detalle de pedido a partir del nuevo precio unitario y la nueva cantidad para mantener el subtotal actualizado en función de los cambios realizados en el detalle de pedido.
       */
      BeforeUpdate: (detalle) => {
        //Verificar si el campo "PrecioUnitario" ha cambiado a false (desactivado)

        if (detalle.changed("PrecioUnitario") || detalle.changed("cantidad")) {
          detalle.subtotal =
            parseFloat(detalle.precioUnitario) * detalle.cantidad;
        }
      },
    },
  },
);

//METODOS DE INSTANCIA
/**
 * Método para calcular el subtotal de un detalle de pedido, este método multiplica el precio unitario por la cantidad para obtener el subtotal de productos asociados a esta subcategoría, esto permite obtener el subtotal de cada detalle de pedido sin necesidad de almacenarlo en la base de datos, lo que ayuda a mantener la integridad de los datos y evitar problemas con cálculos incorrectos si se actualizan los precios o cantidades en el futuro.
 * @returns {number} - Subtotal calculado a partir del precio unitario y la cantidad del detalle de pedido, o un error si el precio unitario o la cantidad no son válidos.
 */
detallePedido.prototype.calcularSubtotal = function () {
  return parseFloat(this.precioUnitario) * this.cantidad;
};

/**
 * Metodo para crear detalles del pedido desde el carrito, este método toma un objeto de carrito como argumento, verifica el estado del producto asociado a ese carrito (si está activo y si hay suficiente stock disponible) y luego crea un nuevo detalle de pedido utilizando la información del carrito, esto permite crear detalles de pedido a partir de los items de carrito de un usuario, asegurando que solo se puedan crear detalles de pedido para productos que estén activos y tengan suficiente stock disponible para satisfacer la cantidad solicitada en el carrito.
 * @param {number} pedidoID - El ID del pedido al que se asociará el detalle de pedido
 * @param {Array} itemsCarrito - Un array de objetos de carrito que contienen la información de los productos agregados al carrito por el usuario, incluyendo el ID del producto, la cantidad solicitada y el precio unitario al momento de agregar el producto al carrito.
 * @returns {Promise<Array>} Un array de detalles de pedido creados a partir de los items de carrito proporcionados, o un error si alguno de los productos asociados a los items de carrito no existe, está desactivado o no tiene suficiente stock disponible para satisfacer la cantidad solicitada en el carrito.
 */
detallePedido.crearDesdeCarrito = async function (pedidoID, itemsCarrito) {
  const detalles = [];
  for (const item of itemsCarrito) {
    const detalle = await detallePedido.create({
      pedidoId: pedidoID,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    });
    detalles.push(detalle);
  }
  return detalles;
};

/**
 * Metodo para calcular el total del pedido a partir de los detalles del pedido, este método toma un array de detalles de pedido como argumento, calcula el subtotal de cada detalle de pedido utilizando el método calcularSubtotal() y luego suma todos los subtotales para obtener el total del pedido, esto permite obtener el monto total que el usuario tendría que pagar por su pedido en función de los detalles del pedido asociados a ese pedido.
 * @param {number} pedidoId - El ID del pedido para el cual se desea calcular el total del pedido
 * @returns {promise<number>} El total del pedido calculado a partir de los detalles del pedido asociados al ID del pedido proporcionado, o un error si no se encuentra ningún detalle de pedido para el ID de pedido proporcionado.
 */
detallePedido.calcularTotalPedido = async function (pedidoId) {
  const detalles = await this.findAll({ where: { pedidoId } });

  let total = 0;
  for (const detalle of detalles) {
    total += parseFloat(detalle.Subtotal()); //Suma el subtotal de cada detalle al total
  }
  return total;
};

/**
 * Metodo para obtener el ressumen de productos mas vendidos, este método consulta la base de datos para obtener un resumen de los productos más vendidos, incluyendo el ID del producto, el nombre del producto y la cantidad total vendida, esto permite obtener información valiosa sobre los productos más populares entre los usuarios y tomar decisiones informadas sobre el inventario y las estrategias de marketing.
 * @param {number} limit - El número máximo de productos más vendidos que se desea obtener en el resumen, este parámetro permite limitar la cantidad de productos que se incluyen en el resumen para enfocarse en los productos más populares.
 * @return {Promise<Array>} Un array de objetos que representan los productos más vendidos, cada objeto incluye el ID del producto, el nombre del producto y la cantidad total vendida, o un error si no se encuentra ningún detalle de pedido para calcular el resumen de productos más vendidos.
 */
((detallePedido.obtenerProductosMasVendidos = async function (limit = 10) {
  const { sequelize } = require("../config/database");
  return await this.findAll({
    attributes: [
      "productoId",
      [sequelize.fn("SUM", sequelize.col("cantidad")), "totalVendido"],
    ],
    group: ["productoId"],
    order: [[sequelize.fn("SUM", sequelize.col("cantidad")), "DESC"]],
    limit: limite ,
  });
})),


//Exportar el modelo de detallePedido para ser utilizado en otras partes de la aplicación
module.exports = detallePedido;
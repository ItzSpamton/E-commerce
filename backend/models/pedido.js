/**
 * Modelo de pedido
 * Define la estructura de la tabla "pedidos" y sus relaciones con otros modelos
 * almacena información sobre los pedidos realizados por los usuarios en la aplicación
 */

//importar DataTypes de Sequelize para definir los tipos de datos de los campos
const { DataTypes } = require("sequelize");

//Importar la instancia de Sequelize para definir el modelo
const sequelize = require("../config/database");

/**
 * Definir el modelo de pedido utilizando sequelize.define()
 * El primer argumento es el nombre del modelo (en singular), el segundo argumento es un objeto que define los campos y sus tipos de datos, y el tercer argumento es un objeto de opciones para configurar el modelo.
 * En este caso, se define un modelo llamado "Pedido" con los campos id (clave primaria, auto-incremental), usuarioId (clave foránea a la tabla usuarios) y estado (cadena de texto, no nulo).
 */

const pedido = sequelize.define(
  "pedido",
  {
    //campos de la tabla pedidos
    //Id Identificador único del pedido, es la clave primaria y se auto-incrementa
    id: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      primaryKey: true, //Clave primaria
      autoIncrement: true, //Auto-incremental
      allowNull: false, //No permite valores nulos
    },

    //UsuarioId ID del usuario que realizó el pedido
    usuarioId: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      allowNull: false, //No permite valores nulos
      references: {
        model: "Usuarios", //Referencia a la tabla de usuarios
        key: "id", //Clave foránea en la tabla de usuarios
      },
      onUpdate: "CASCADE", //Si se actualiza el ID del usuario, se actualiza el ID del pedido
      onDelete: "RESTRICT", //No se permite eliminar un usuario si tiene pedidos asociados
      validate: {
        notEmpty: {
          msg: "Debe especificar el ID del usuario del pedido", //Mensaje de error personalizado si se intenta crear un pedido sin ID de usuario
        },
      },
    },

    //Total del monto del pedido, se calcula a partir de los detalles del pedido (precio unitario * cantidad) y se guarda en la tabla de pedidos para mantener un registro del total pagado por el usuario al momento de realizar el pedido, esto permite tener un historial completo de los pedidos realizados por cada usuario y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación.
    total: {
      type: DataTypes.DECIMAL(10, 2), //Tipo de dato decimal con 10 dígitos en total y 2 decimales
      allowNull: false, //No permite valores nulos
      validate: {
        isDecimal: {
          msg: "El total debe ser un número decimal", //Mensaje de error personalizado si se intenta crear un pedido sin total
        },
        min: {
          args: [0], //Valor mínimo del total
          msg: "El total no puede ser negativo", //Mensaje de error personalizado si se intenta crear un pedido con un total negativo
        },
      },
    },

    /**
     * Estado del pedido, puede ser "pendiente", "enviado", "entregado" o "cancelado"
     * Pendiente: El pedido ha sido creado pero aún no ha sido procesado ni enviado.
     * Pagado: El pedido ha sido pagado por el cliente pero aún no ha sido procesado ni enviado.
     * Enviado: El pedido ha sido procesado y enviado al cliente, pero aún no ha sido entregado.
     * Entregado: El pedido ha sido entregado al cliente.
     * Cancelado: El pedido ha sido cancelado por el cliente o por el administrador antes de ser enviado.
     * Este campo se utiliza para mantener un registro del estado actual del pedido, lo que permite a los usuarios y administradores de la aplicación saber si un pedido está pendiente de envío, ya ha sido enviado, ha sido entregado o ha sido cancelado, esto ayuda a mejorar la experiencia del usuario y facilita la gestión de los pedidos en la aplicación.
     */
    estado: {
      type: DataTypes.ENUM(
        "pendiente",
        "pagado",
        "enviado",
        "entregado",
        "cancelado",
      ), //Tipo de dato enumerado con los posibles estados del pedido
      allowNull: false, //No permite valores nulos
      defaultValue: "pendiente", //Valor por defecto del estado del pedido
      validate: {
        isIn: {
          args: [["pendiente", "pagado", "enviado", "entregado", "cancelado"]], //Los valores permitidos para el estado del pedido
        },
      },
    },

    //Dirección de envío del pedido, se guarda para mantener un registro de la dirección a la que se envió el pedido, esto permite tener un historial completo de los pedidos realizados por cada usuario y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación.
    direccionEnvio: {
      type: DataTypes.TEXT, //Tipo de dato texto
      allowNull: false, //No permite valores nulos
      validate: {
        notEmpty: {
          msg: "Debe especificar la dirección de envío del pedido", //Mensaje de error personalizado si se intenta crear un pedido sin dirección de envío
        },
      },
    },

    //Telefono de contacto para el pedido, se guarda para mantener un registro del número de teléfono asociado al pedido, esto permite a los usuarios y administradores de la aplicación tener un medio de contacto para resolver cualquier problema o consulta relacionada con el pedido, y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación.
    telefono: {
      type: DataTypes.STRING(20), //Tipo de dato cadena de texto con un máximo de 15 caracteres
      allowNull: false, //No permite valores nulos
      validate: {
        notEmpty: {
          msg: "Debe especificar el teléfono de contacto del pedido", //Mensaje de error personalizado si se intenta crear un pedido sin teléfono de contacto
        },
      },
    },

    //Notas adicionales para el pedido (opcional), se guarda para permitir a los usuarios agregar cualquier información adicional o instrucciones especiales relacionadas con el pedido, esto ayuda a mejorar la experiencia del usuario y facilita la gestión de los pedidos en la aplicación al proporcionar un espacio para que los usuarios puedan comunicar cualquier detalle relevante sobre su pedido.
    notas: {
      type: DataTypes.TEXT, //Tipo de dato texto
      allowNull: true, //Permite valores nulos
    },

    //Fecha de pago del pedido, se guarda para mantener un registro de la fecha en que se realizó el pago del pedido, esto permite tener un historial completo de los pedidos realizados por cada usuario y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación, además de ayudar a los administradores a gestionar los pedidos y realizar un seguimiento de los pagos recibidos.
    fechaPago: {
      type: DataTypes.DATE, //Tipo de dato fecha
      allowNull: true, //Permite valores nulos, ya que un pedido puede ser creado antes de ser pagado
    },

    //Fecha de envio del pedido, se guarda para mantener un registro de la fecha en que se realizó el envío del pedido, esto permite tener un historial completo de los pedidos realizados por cada usuario y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación, además de ayudar a los administradores a gestionar los pedidos y realizar un seguimiento de los envíos realizados.
    fechaEnvio: {
      type: DataTypes.DATE, //Tipo de dato fecha
      allowNull: true, //Permite valores nulos, ya que un pedido puede ser creado antes de ser enviado
    },

    //Fecha de entrega del pedido, se guarda para mantener un registro de la fecha en que se realizó la entrega del pedido, esto permite tener un historial completo de los pedidos realizados por cada usuario y facilita la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación, además de ayudar a los administradores a gestionar los pedidos y realizar un seguimiento de los pedidos entregados.
    fechaEntrega: {
      type: DataTypes.DATE, //Tipo de dato fecha
      allowNull: true, //Permite valores nulos, ya que un pedido puede ser creado antes de ser entregado
    },
  },
  {
    // Opciones de modelo
    tableName: "pedidos", //Nombre de la tabla en la base de datos
    timestamps: true,
    //indices para mejorar las busquedas
    indexes: [
      {
        fields: ["usuarioId"], //Índice para buscar pedidos por usuario
      },

      {
        fields: ["estado"], //Índice para buscar pedidos por estado
      },

      {
        fields: ["createdAt"], //Índice para buscar pedidos por fecha
      },
    ],

    hooks: {
      /**
       * beforeCreate se ejecuta antes de crear un nuevo registro de categoría, este hook verifica si el campo "activo" está establecido en false (desactivado) y si es así, lanza un error para evitar que se creen categorías desactivadas, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que pertenecen a subcategorías desactivadas.
       * verifica que la categoria no se cree con el campo "activo" establecido en false, lo que podría causar problemas de integridad de datos si se crean subcategorías o productos asociados a una categoría que ya está desactivada.
       */
      /**beforeCreate: async (itemcarrito) => {
        const producto = require("./producto");
        //Buscar el producto asociado a este item de carrito para verificar su estado
        const prducto = await producto.findByPk(itemcarrito.productoId);

        if (!prducto) {
          throw new Error(
            "El producto asociado a este item de carrito no existe", //Mensaje de error personalizado si se intenta crear un item de carrito con un producto que no existe
          );
        }

        if (!prducto.activo) {
          throw new Error(
            "No se puede crear un item de carrito para un producto desactivado", //Mensaje de error personalizado si se intenta crear un item de carrito para un producto que está desactivado
          );
        }

        if (!producto.hayStock(itemcarrito.cantidad)) {
          throw new Error(
            `Stock insuficiente, solo hay ${prducto.stock} unidades disponibles`, //Mensaje de error personalizado si se intenta crear un item de carrito con una cantidad que excede el stock disponible del producto
          );
        }

        //Guardar el precio unitario del producto al momento de agregarlo al carrito para mantener el precio aunque el producto cambie de precio en el futuro
        itemcarrito.precioUnitario = prducto.precio;
      },

      /**
       * afterUpdate se ejecuta después de actualizar un registro de categoría, este hook verifica si el campo "activo" ha cambiado y si es así, lanza un error para evitar que se actualicen categorías a un estado inconsistente, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que pertenecen a subcategorías desactivadas.
       * verifica que la categoria no se actualice para establecer el campo "activo" en false, lo que podría causar problemas de integridad de datos si se desactivan subcategorías o productos asociados a una categoría que ya está desactivada.
        * Si se desactiva una categoría (activo cambia a false), no se desactivan automáticamente las subcategorías o productos asociados, esto se deja a discreción del administrador para evitar desactivar subcategorías o productos que podrían estar activos y listos para ser vendidos.       
       */
      AfterUpdate: async (pedido) => {
        //Si el estado del pedido cambia a "pagado", verificar que el producto asociado a cada item de carrito tenga suficiente stock disponible para satisfacer la cantidad solicitada, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que podrían no tener suficiente stock para satisfacer la cantidad solicitada en un pedido.

        if (pedido.changed("estado") && pedido.estado === "pagado") {
          pedido.fechaPago = new Date(); //Establecer la fecha de pago al momento de cambiar el estado a "pagado"
          await producto.save({ hooks: false }); //Guardar el producto sin ejecutar los hooks para evitar un bucle infinito
        }

        //si el estado del pedido cambia a "enviado", establecer la fecha de envío al momento de cambiar el estado a "enviado"
        if (
          pedido.changed("estado") &&
          pedido.estado === "enviado" &&
          !pedido.fechaEnvio
        ) {
          pedido.fechaEnvio = new Date(); //Establecer la fecha de envío al momento de cambiar el estado a "enviado"
          await producto.save({ hooks: false }); //Guardar el producto sin ejecutar los hooks para evitar un bucle infinito
        }

        //si el estado del pedido cambia a "entregado", establecer la fecha de entrega al momento de cambiar el estado a "entregado"
        if (
          pedido.changed("estado") &&
          pedido.estado === "entregado" &&
          !pedido.fechaEntrega
        ) {
          pedido.fechaEntrega = new Date(); //Establecer la fecha de entrega al momento de cambiar el estado a "entregado"
          await producto.save({ hooks: false }); //Guardar el producto sin ejecutar los hooks para evitar un bucle infinito
        }
      },

      //beforeDestroy se ejecuta antes de eliminar un registro de categoría, este hook verifica si hay subcategorías o productos asociados a esta categoría antes de permitir su eliminación, esto ayuda a mantener la integridad de los datos y evitar problemas con productos que pertenecen a subcategorías desactivadas.
      beforeDestroy: async (pedido) => {
        throw new Error(
          "No se puede eliminar un pedido, solo se puede cancelar cambiando su estado a 'cancelado'", //Mensaje de error personalizado si se intenta eliminar un pedido, ya que los pedidos no deben ser eliminados para mantener un historial completo de los pedidos realizados por cada usuario y facilitar la generación de reportes y estadísticas sobre las ventas realizadas en la aplicación.
        );
      },
    },
  },
);

//METODOS DE INSTANCIA
/**
 * Método de instancia para cambiar el estado del pedido, este método permite cambiar el estado del pedido a uno de los estados permitidos ("pendiente", "pagado", "enviado", "entregado" o "cancelado"), esto ayuda a mantener la integridad de los datos y evitar problemas con pedidos que podrían tener un estado inconsistente.
 * @param {string} nuevoEstado - El nuevo estado que se desea establecer para este pedido, debe ser uno de los estados permitidos ("pendiente", "pagado", "enviado", "entregado" o "cancelado")
 * @returns {Promise} Pedido actualizado con el nuevo estado si la actualización fue exitosa, o un error si el nuevo estado no es válido.
 */
pedido.prototype.cambiarEstado = async function (nuevoEstado) {
  const estadosValidos = [
    "pendiente",
    "pagado",
    "enviado",
    "entregado",
    "cancelado",
  ];
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error("Estado no válido");
  }
  this.estado = nuevoEstado;
  return await this.save();
};

/**
 * Metodo para verificar si el pedido piede ser cancelado, este método verifica si el estado actual del pedido es "pendiente" o "pagado", lo que indica que el pedido aún no ha sido enviado y por lo tanto puede ser cancelado, esto ayuda a mantener la integridad de los datos y evitar problemas con pedidos que podrían tener un estado inconsistente.
 * @returns {boolean} true si el pedido puede ser cancelado (estado es "pendiente" o "pagado"), o false si el pedido no puede ser cancelado (estado es "enviado", "entregado" o "cancelado").
 */
pedido.prototype.puedeSerCancelado = function () {
  return ["pendiente", "pagado"].includes(this.estado); //El pedido puede ser cancelado si su estado es "pendiente" o "pagado"
};

/**
 * Metodo para cancelar el pedido, este método cambia el estado del pedido a "cancelado" si el pedido puede ser cancelado (estado es "pendiente" o "pagado"), esto ayuda a mantener la integridad de los datos y evitar problemas con pedidos que podrían tener un estado inconsistente.
 * @returns {Promise<Pedido>} Pedido actualizado con el estado "cancelado" si la cancelación fue exitosa, o un error si el pedido no puede ser cancelado.
 */
pedido.prototype.cancelar = async function () {
  if (!this.puedeSerCancelado()) {
    throw new Error("No se puede cancelar el pedido");
  }

  //Importar modelos necesarios para cancelar el pedido
  const DetallePedido = require("./detallePedido");
  const Producto = require("./producto");

  //Obtener los detalles del pedido para devolver el stock de los productos asociados a este pedido
  const detalles = await DetallePedido.findAll({
    where: { pedidoId: this.id },
  });

  //Devolver el stock de los productos asociados a este pedido
  for (const detalle of detalles) {
    const producto = await Producto.findByPk(detalle.productoId);
    if (producto) {
      await producto.aumentarStock(detalle.cantidad); //Guardar el producto sin ejecutar los hooks para evitar un bucle infinito
      console.log(` Stock devuelto ${detalle.cantidad} X ${producto.nombre} `); //Mensaje de log para indicar que se ha aumentado el stock del producto debido a la cancelación del pedido
    }
  }

  //cambiar el estado del pedido a "cancelado"
  this.estado = "cancelado";
  return await this.save(); //Guardar el pedido con el nuevo estado "cancelado"
};

/**
 * Metodo para obtener los detalles del pedido, este método busca todos los detalles de pedido asociados al ID del pedido proporcionado, incluyendo la información del producto asociado a cada detalle de pedido, esto permite obtener una vista completa de los detalles de un pedido, incluyendo los productos que se han comprado, las cantidades y los precios unitarios.
 * @returns {Promise<Array>} Un array de detalles de pedido con la información del producto asociado a cada detalle, o un error si no se encuentra ningún detalle de pedido para el ID del pedido proporcionado.
 */
pedido.prototype.obtenerDetalles = async function () {
  const DetallePedido = require("./detallePedido");
  const Producto = require("./producto");
  return await DetallePedido.findAll({
    where: { pedidoId: this.id },
    include: [
      {
        model: Producto,
        as: "producto",
      },
    ],
  });
};

/**
 * Metodo para obtener pedidos por estado, este método busca todos los pedidos que tienen el estado especificado, esto permite obtener una lista de pedidos filtrada por su estado actual, lo que puede ser útil para los administradores de la aplicación para gestionar los pedidos y realizar un seguimiento de los pedidos en diferentes estados.
 * @param {string} estado - El estado por el cual se desea filtrar los pedidos, debe ser uno de los estados permitidos ("pendiente", "pagado", "enviado", "entregado" o "cancelado")
 * @returns {Promise<Array>} Un array de pedidos que tienen el estado especificado, o un error si el estado proporcionado no es válido.
 */
carrito.obtenerPorEstado = async function (estado) {
  const usuario = require("./Usuario");
  return await this.findAll({
    where: { estado },
    incluide: [
      {
        model: usuario,
        as: "usuario",
      },
    ],
    order: [["createdAt", "DESC"]], //Ordenar los pedidos por fecha de creación de forma descendente (del más reciente al más antiguo)});
  });
};
/**
 * Metodo para pbtener el historial de pedidos de un usuario, este método busca todos los pedidos asociados al ID del usuario proporcionado, ordenados por fecha de creación de forma descendente, esto permite obtener una lista completa de los pedidos realizados por un usuario específico, lo que puede ser útil para los usuarios para revisar su historial de compras y para los administradores de la aplicación para gestionar los pedidos y realizar un seguimiento de las compras realizadas por cada usuario.
 * @param {number} usuarioId - El ID del usuario para el cual se desea obtener el historial de pedidos
 * @returns {Promise<Array>} Un array de pedidos asociados al ID del usuario proporcionado, ordenados por fecha de creación de forma descendente, o un error si no se encuentra ningún pedido para el usuario proporcionado.
 */
pedido.obtenerHistorialPorUsuario = async function (usuarioId) {
const usuario = require("./Usuario");
  return await this.findAll({
    where: { usuarioId },
    orders: [["createdAt", "DESC"]], //Ordenar los pedidos por fecha de creación de forma descendente (del más reciente al más antiguo)
  });
};
//Exportar el modelo de pedido para ser utilizado en otras partes de la aplicación
module.exports = pedido;
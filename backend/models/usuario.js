/**
 * Modelo de categoría para la base de datos utilizando Sequelize
 * Define la estructura de la tabla "categorias" y sus relaciones con otros modelos
 * almacena información sobre las categorías de productos en la aplicación
 */

//importar DataTypes de Sequelize para definir los tipos de datos de los campos
const { DataTypes } = require("sequelize");

//Importar bcrypt para encriptar las contraseñas de los usuarios
const bcrypt = require("bcrypt");

//Importar la instancia de Sequelize para definir el modelo
const sequelize = require("../config/database");
const { argon2 } = require("node:crypto");

/**
 * Definir el modelo de categoría utilizando sequelize.define()
 * El primer argumento es el nombre del modelo (en singular), el segundo argumento es un objeto que define los campos y sus tipos de datos, y el tercer argumento es un objeto de opciones para configurar el modelo.
 * En este caso, se define un modelo llamado "Categoria" con los campos id (clave primaria, auto-incremental), nombre (cadena de texto, no nulo) y descripcion (cadena de texto).
 */

const usuario = sequelize.define(
  "Usuario",
  {
    //campos de la tabla categorias
    //Id Identificador único de la categoría, es la clave primaria y se auto-incrementa
    id: {
      type: DataTypes.INTEGER, //Tipo de dato entero
      primaryKey: true, //Clave primaria
      autoIncrement: true, //Auto-incremental
      allowNull: false, //No permite valores nulos
    },

    //Nombre de usuario, es una cadena de texto y no puede ser nulo
    nombre: {
      type: DataTypes.STRING(100), //Tipo de dato cadena de texto
      allowNull: false, //No permite valores nulos
      validate: {
        notEmpty: {
          msg: "El nombre del usuario no puede estar vacío", //Mensaje de error personalizado si se intenta crear un usuario con un nombre vacío
        },
        len: {
          args: [2, 100], //El nombre debe tener entre 3 y 100 caracteres
          msg: "El nombre del usuario debe tener entre 2 y 100 caracteres", //Mensaje de error personalizado si se intenta crear un usuario con un nombre que no cumple con la longitud requerida
        },
      },
    },

    //Email del usuario, es una cadena de texto y no puede ser nulo
    email: {
      type: DataTypes.STRING(100), //Tipo de dato cadena de texto
      allowNull: false, //No permite valores nulos
      unique: {
        msg: "Ya existe un usuario con ese email", //Mensaje de error personalizado si se intenta crear un usuario con un email que ya existe
      },
      validate: {
        notEmpty: {
          msg: "El email del usuario no puede estar vacío", //Mensaje de error personalizado si se intenta crear un usuario con un email vacío
        },
        isEmail: {
          msg: "El email del usuario debe ser válido", //Mensaje de error personalizado si se intenta crear un usuario con un email inválido
        },
      },
    },

    //contraseña del usuario, es una cadena de texto y no puede ser nulo
    contraseña: {
      type: DataTypes.STRING(255), //Tipo de dato cadena de texto para el hash de la contraseña, se recomienda un tamaño de 255 caracteres para almacenar hashes de contraseñas generados por bcrypt
      allowNull: false, //No permite valores nulos
      validate: {
        notEmpty: {
          msg: "La contraseña del usuario no puede estar vacía", //Mensaje de error personalizado si se intenta crear un usuario con una contraseña vacía
        },
        len: {
          args: [6, 255], //El nombre debe tener entre 6 y 255 caracteres
          msg: "La contraseña del usuario debe tener entre 6 y 255 caracteres", //Mensaje de error personalizado si se intenta crear un usuario con una contraseña que no cumple con la longitud requerida
        },
      },
    },

    //rol de usuario (Cliente, auxiliar o administrador), es una cadena de texto y no puede ser nulo
    rol: {
      type: DataTypes.ENUM("Cliente", "Auxiliar", "Administrador"), //Tipo de dato enumerado para el rol del usuario, solo permite los valores "Cliente", "Auxiliar" o "Administrador"
      allowNull: false, //No permite valores nulos
      defaultValue: "Cliente", //Valor por defecto es "Cliente"
      validate: {
        isIn: {
          args: [["Cliente", "Auxiliar", "Administrador"]], //El rol del usuario debe ser uno de los valores permitidos
          msg: "El rol del usuario debe ser Cliente, Auxiliar o Administrador", //Mensaje de error personalizado si se intenta crear un usuario con un rol que no es uno de los valores permitidos
        },
      },
    },

    //telefono del usuario, es opconal pero si se proporciona debe ser una cadena de texto
    telefono: {
      type: DataTypes.STRING(20), //Tipo de dato cadena de texto
      allowNull: true, //Permite valores nulos
      validate: {
        isIn: {
          args: [["", /^\+?[0-9\s\-()]+$/]], //El teléfono del usuario debe ser una cadena de texto que contenga solo números, espacios, guiones, paréntesis y opcionalmente un signo de más al inicio
          msg: "El teléfono del usuario debe ser válido", //Mensaje de error personalizado si se intenta crear un usuario con un teléfono inválido
        },
        len: {
          args: [2, 100], //El nombre debe tener entre 3 y 100 caracteres
          msg: "El teléfono del usuario debe tener entre 2 y 100 caracteres", //Mensaje de error personalizado si se intenta crear un usuario con un teléfono que no cumple con la longitud requerida
        },
      },
    },

    //dirección del usuario, es opcional pero si se proporciona debe ser una cadena de texto
    direccion: {
      type: DataTypes.TEXT, //Tipo de dato cadena de texto
      allowNull: true, //Permite valores nulos
    },
    /**
     * Activo estado del usuario, es un booleano que indica si el usuario está activo o no, por defecto es true
     * Este campo es útil para permitir a los administradores desactivar usuarios sin eliminarlos de la base de datos, lo que puede ser útil para mantener la integridad de los datos y evitar problemas con productos que pertenecen a usuarios desactivados.
     * al igual que con las subcategorías, esto permite mantener la integridad de los datos y evitar problemas con productos que pertenecen a usuarios desactivados.
     */
    activo: {
      type: DataTypes.BOOLEAN, //Tipo de dato booleano
      allowNull: false, //No permite valores nulos
      defaultValue: true, //Valor por defecto es true (activa)
    },
  },
  {
    //Opciones del modelo
    tableName: "usuarios", //Nombre de la tabla en la base de datos, se especifica para evitar que Sequelize pluralice el nombre del modelo (por defecto, Sequelize pluraliza los nombres de los modelos para crear las tablas, por ejemplo, el modelo "Usuario" se pluralizaría a "Usuarios")
    timestamps: true, //Agrega automáticamente campos createdAt y updatedAt para registrar la fecha de creación y actualización de cada registro

    /**
     *Scopes son filtros predefinidos que se pueden aplicar a las consultas para limitar los resultados de manera consistente en toda la aplicación, en este caso se define un scope "activo" que filtra los usuarios para incluir solo aquellos que tienen el campo "activo" establecido en true, esto es útil para mostrar solo los usuarios activos en la interfaz de usuario y evitar mostrar usuarios desactivados.
     */

    defaultScope: {
      /**
       * por defecto excluye el campo "contraseña" de las consultas para evitar exponer información sensible, esto es especialmente importante para proteger la seguridad de los usuarios y evitar que las contraseñas sean accesibles a través de la API o en los registros de la base de datos.
       */
      attributes: { exclude: ["contraseña"] },
    },
    scopes: {
      //scope para incluir la contraseña en las consultas, se puede utilizar en casos específicos donde se necesite acceder a la contraseña (por ejemplo, para verificar la contraseña durante el inicio de sesión), pero se debe usar con precaución para evitar exponer información sensible innecesariamente.
      withPassword: {
        attributes: {}, //No excluir ningún campo, incluye todos los campos (incluyendo la contraseña)
      },
    },

    /**
     * hooks son funciones que se ejecutan automáticamente en ciertos momentos del ciclo de vida de un modelo, como antes o después de crear, actualizar o eliminar un registro, en este caso se define un hook "afterUpdate" que se ejecuta después de actualizar un registro de usuario, si se desactiva un usuario (activo cambia a false), se desactivan todas las subcategorías asociadas a ese usuario para mantener la integridad de los datos y evitar problemas con productos que pertenecen a subcategorías desactivadas.
     * Si se activa un usuario (activo cambia a true), no se activan automáticamente las subcategorías o productos asociados, esto se deja a discreción del administrador para evitar activar subcategorías o productos que podrían no estar listos para ser activados.
     */

    hooks: {
      /**
       * beforeCreate: Hook que se ejecuta antes de crear un nuevo registro de usuario, en este caso se utiliza para encriptar la contraseña del usuario antes de guardarla en la base de datos, esto es importante para proteger la seguridad de los usuarios y evitar que las contraseñas sean almacenadas en texto plano.
       * El hook utiliza bcrypt para generar un hash de la contraseña proporcionada por el usuario, y luego reemplaza la contraseña original con el hash antes de guardar el registro en la base de datos. Esto garantiza que las contraseñas de los usuarios estén protegidas incluso si la base de datos es comprometida, ya que los hashes de las contraseñas son difíciles de revertir a sus valores originales.
       */
      beforeCreate: async (usuario) => {
        if (usuario.contraseña) {
          //generar un hash de la contraseña utilizando bcrypt con un costo de 10 saltos (puede ajustarse según las necesidades de seguridad y rendimiento)
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(usuario.contraseña, salt);
          usuario.contraseña = hash; //Reemplazar la contraseña original con el hash antes de guardar el registro en la base de datos
        }
      },

      /**
       * beforeUpdate: Hook que se ejecuta antes de actualizar un registro de usuario
       * si se desactiva un usuario (activo cambia a false), se desactivan todas las subcategorías asociadas a ese usuario para mantener la integridad de los datos y evitar problemas con productos que pertenecen a subcategorías desactivadas.
       */
      beforeUpdate: async (usuario) => {
        //Verificar si el campo "contraseña" ha cambiado y si se ha proporcionado una nueva contraseña
        if (usuario.changed("contraseña") && usuario.contraseña) {
          //generar un hash de la nueva contraseña utilizando bcrypt con un costo de 10 saltos (puede ajustarse según las necesidades de seguridad y rendimiento)
          const salt = await bcrypt.genSalt(10);
          usuario.contraseña = await bcrypt.hash(usuario.contraseña, salt); //Reemplazar la contraseña original con el hash antes de guardar el registro en la base de datos
        }
      },
    },
  },
);

//METODOS DE INSTANCIA
/**
 * Metodo para comparar una contraseña proporcionada por el usuario con el hash almacenado en la base de datos, se utiliza para verificar la contraseña durante el inicio de sesión, devuelve true si la contraseña es correcta y false si es incorrecta.
 * El método utiliza bcrypt.compare() para comparar la contraseña proporcionada por el usuario con el hash almacenado en la base de datos, lo que garantiza que las contraseñas de los usuarios estén protegidas incluso durante el proceso de autenticación.
 * @param {string} contraseñaIngresada - La contraseña proporcionada por el usuario para verificar
 * @return {promise<boolean>} - Devuelve true si la contraseña es correcta y false si es incorrecta
 */
Usuario.prototype.compararContraseña = async function (contraseñaIngresada) {
  return await bcrypt.compare(contraseñaIngresada, this.contraseña);
};
Categoria.prototype.getNumerosubcategoriasActivas = async function () {
  const subcategoria = require("./subcategoria");
  return await subcategoria.count({
    where: {
      categoriaId: this.id, //Contar solo las subcategorías asociadas a esta categoría
    },
  });
};

/**
 * metodo para obtener datos publicos del usuario, devuelve un objeto con los campos id, nombre, email, rol, telefono y direccion del usuario, este método es útil para exponer solo la información necesaria del usuario en la interfaz de usuario o en la API, evitando exponer información sensible como la contraseña.
 * @return {object} - Devuelve un objeto con los campos id, nombre, email, rol, telefono y direccion del usuario
 */

Usuario.prototype.toJSON = function () {
  const valores = Object.assign({}, this.get()); //Obtener todos los campos del usuario como un objeto
  delete valores.contraseña; //Eliminar el campo contraseña del objeto para no exponer información sensible
  return valores; //Devolver el objeto con los datos públicos del usuario
};

//Exportar el modelo de usuario para que pueda ser utilizado en otras partes de la aplicación
module.exports = Usuario;
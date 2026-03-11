/**
 * SERVIDOR PRIMCIPAL PARA EL BACKEND
 * este es el archivo principal del backend, se utiliza para configurar el servidor y exportarlo para ser utilizado en otras partes de la aplicacion
 * configura express y el servidor, exporta el servidor para ser utilizado en otras partes de la aplicacion
 */

//Importar express
const express = require("express");

// importar cors
const cors = require("cors");

// importar path
const path = require("path");

// Importar dotenv
require("dotenv").config();

//importar configuración de base de datos
const dbConfig = require("./backend/config/database");

//importar modelos y asociaciones
const { initAssociations } = require("./backend/models");

//Importar seeders
const { runSeeders } = require("./seeders/adminseeder");

//crear aplicacion express
const app = express();

//Obtener el puerto desde la variable de entorno
const PORT = process.env.PORT || 3000;

//MIDDLWARE GLOBALES
//cors permite peticiones desde el frontend
//configura los dominios que pueden hacer peticiones a la api
app.use(
  cors({
    origin: ["http://localhost:3001"], // dominios permitidos
    methods: ["GET", "POST", "PUT", "DELETE"], // metodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // cabeceras permitidas
    credentials: true, // permite cookies
  }),
);

/**
 * express.json() es un middleware que permite parsear el body de las peticiones
 * a json
 */

app.use(express.json());

/**
 * express.urlencoded() es un middleware que permite parsear el body de las peticiones
 * a urlencoded
 * las imagenes estaran disponibles en req.files
 */

app.use(express.urlencoded({ extended: true }));

/**
 * servir archivos estaticos
 * los archivos estaticos estan en la carpeta raiz
 */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//middleware para logging de peticiones
//Muestra en consola la peticion que se esta realizando
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`ok ${req.method} ${req.path}`);
    next();
  });
}

//rutas

//rutas raiz para verificar si el servidor esta funcionando
app.get("/,", (req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando",
    versiom: "1.0.0",
    timeStamp: new Date().toISOString(),
  });
});

//rutas de salud para verificar si el servidor esta funcionando
app.get("api/helth", (req, res) => {
  res.json({
    success: true,
    status: "helthy",
    database: "connected",
    timeStamp: new Date().toISOString(),
  });
});

//rutas api

//rutas de autenticacion
//incluye registro y login
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

//rutas de admin
//incluye gestion de usuarios, categorias, subcategorias y productos
const adminRoutes = require("./routes/admin.routes");
app.use("/api/admin", adminRoutes);

//rutas del cliente
//incluye catalogo y carrito
const clienteRoutes = require("./routes/cliente.routes");
app.use("/api/cliente", clienteRoutes);

//Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    path: req.path,
  });
});

//Manejo de errores globales
app.use((err, req, res, next) => {
  console.error("Error", err.message);
  //Error de multer
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  //otros errores
  return res.status(500).json({
    success: false,
    message: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

//iniciar el servidor

/**
 * funcion principal para iniciar el servidor
 * se llama desde server.js
 * prueba la conexion a la base de datos (MYSQL)
 * sincroniza los modelos con la base de datos
 * inicia el servidor express
 */

const startServer = async () => {
  try {
    //prueba la conexion a la base de datos (MYSQL)
    console.log("Intentando conectar a la base de datos...\n");
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error(
        "No se pudo conectar a la base de datos. verificar XAMPP y el archivo .env",
      );
      process.exit(1); //salir si no se pudo conectar a la base de datos
    }

    //paso 2 sicronizar los modelos con la base de datos
    console.log("Sincronizando los modelos con la base de datos...\n");

    //inicializar asociaciones entre modelos
    initAssociations();

    //sincronizar los modelos con la base de datos
    await syncDatabase();

    //en desarrollo alter puede ser true para actualizar la estructura
    //en produccion debe ser false para no perder los datos

    const alterTables = process.env.NODE_ENV === "development";
    const dbSynced = await syncDatabase(false, alterTables);

    if (!dbSynced) {
      console.error("No se pudo sincronizar la base de datos.");
      process.exit(1); //salir si no se pudo sincronizar la base de datos
    }

    //Paso 3 ejecutar seeders datos iniciales
    await runSeeders();

    //Paso 4 iniciar el servidor express
    app.listen(PORT, () => {});
    console.log("\n ______________________");
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Base de datos: ${process.env.DB_NAME}`);
    console.log(`Modo: ${process.env.NODE_ENV}`);
    console.log("Servidor listo para realizar peticiones.");
  } catch (error) {
    console.error("X Error fatal al iniciar el servidor:", error.message);
    process.exit(1); //salir si no se pudo sincronizar la base de datos
  }
};

//manejo de cierre
//captura el ctrl+c para cerrar el servidor
process.on("SIGINT", () => {
  console.log("\n\n cerrando el servidor");
  process.exit(0);
});

//capturar los errores no manejados
Process.on("unhandledRejection", (error) => {
  console.error("X Error fatal al iniciar el servidor:", err);
  process.exit(1);
});

//iniciar el servidor
startServer();

//exportar app para testing
module.exports = app;
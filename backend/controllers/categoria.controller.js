
/**
 * Controlador de categorias
 * maneja las operaciones crud y activa y desactiva categorias 
 * Solo accesible por administradores
 */

/**
 * Importamos modelos
 */

const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/subcategoria');
const Producto = require('../models/producto');
const subcategoria = require('../models/subcategoria');

/**
 * obtener todas las categorias
 * query paramas:
 * Activo ture/folse (filtrar por estado)
 * incluirsubcategorias true/false(incluir subcategorias relacionadas)
 * 
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const getCategorias = async (req, res) => {
    try {
        const { activo, IncluirSubcategorias} = requestAnimationFrame.query;

        // Opciones de consulta 
        const opciones = {
            order: [['nombre', 'ASC']] // ordenar de manera alfabetica 
        };

        // Filtrar por estado activo si es especifica
        if(activo !== undefined) {
            opciones.where = { activo: avtivo === 'true' };
        }

        // Incluir subcategorias si se solicita
        if (IncluirSubcategorias === 'true') {
            opciones.include = [{
                model: Subcategoria,
                as: 'subcategoria', //campo del alias para la relacion
                attributes: ['id', 'nombre','descripcion','activo'] // campos a incluir de la subcategoria
            }]
        }

        // Obtener  categorias
        const categorias = await Categoria.findAll(opciones);

        // Respuesta Exitosa
        res.json({
            success: true,
            count: categorias.length,
            data: {
                categorias
            }
        });

    } catch (error) {
        console.error('error al gerCategorias: ', error);
        res.status(500) .json({
            success: false,
            message: 'Error al obtener categorias',
            error: error.message
        })
    }
};

/**
 * obtener las categorias por Id
 * GET /api/categorias/:id
 * 
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const getCategoriasBy = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar categorias con subcategorias y contar prouctos
        const categoria = await Categoria.dinfByPk( id, {
            include: [
                {
                    model: Subcategoria,
                    as: 'subcategorias',
                    attributes: ['id', 'nombre','descripcio', 'activo']
                },
                {
                    model: Producto,
                    as: 'productos',
                    attributes: ['id']
                }
            ] 
        });

        if(!categoria) {
            return res.status(400).json({
                success: false,
                message: 'Categoria no encontrada'
            });        
        }

        // agregar contador de productos
        const categoriaJSON = categoria.JSON();
        categoriaJSON.totalProductos = categoriaJSON.productos.length;
        delete categoriaJSON.productos;//no enviar lalista completa solo el contador

        //Respuesta exitosa
        res.json({
            success: true,
            data:{
                categoria: categoriaJSON
            }
        });


    } catch (error) {
        console.error('error al getCategoriasById: ', error);
        res.status(500) .json({
            success: false,
            message: 'Error al obtener categorias',
            error: error.message
        })
    }
};

/**
 * Crear una categoria 
 * POST /api/admin/categorias
 * Body: { nombre, descripcion }
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const crearCategoria = async (req, res) => {
    try {
        const {nombre, descripcion} = req.body;

        //validacion 1 verificar campos requeridos
        if (!nombre) {
            return res.status(400).json({
                sucess: false,
                message: 'El nombre de la categoria es requerido'
            });
        }

        //Validacion 2 verificar que el nombre no exista
        const categoriaExistente = await Categoria.finOne({ where: {nombre}});

        if (categoriaExistente) {
            return res.status(400).json({
                success: false,
                message: `Ya existe un categoriacon el nombre "${nombre}"`
            });
        }

        //Crear Categoria
        const nuevaCategoria = await Categoria.create({
            nombre, 
            descripcion: descripcion || null, //  si no  se proporciona la descripcion se establece como null
            activo: true
        });

        // Respuesta exitosa 
        res.status(201).json({
            success: true,
            message: 'Categoria creada exitosamente',
            data: {
                categoria: nuevaCategoria
            }
        });
    } catch (error) {
        if (error. name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Error de validacion',
            errors: error.errors.map( e => e.message)
        });
    }

    res.status(500).json({
        success: false,
        message: 'Error al crear categoria',
        error: error.message
    })
}

};


/**actualizar categoria
 * put /api/admin/categorias/:id
 * body: { nombre, descripcion }
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        //buscar categoria por id
        const categoria = await Categoria.findByPk(id);

        if (!categoria) {
            return res.status(400).json({
                success: false,
                message: 'Categoria no encontrada'
            });
        }


        //validacion 1 si se cambia el nombre verificar que no exista 
        if (nombre && nombre !== categoria.nombre) {
            const categoriaConMismoNombre = await Categoria.findOne({ where: { nombre } });

            if (categoriaConMismoNombre) {
                return res.status(400).json({
                    success: false,
                    message: `Ya existe una categoria con el nombre "${nombre}"`
                });
            }
        }

        //actualizar categoria 
        if (nombre !== undefined) categoria.nombre = nombre;

        if (descripcion !== undefined) categoria.descripcion = descripcion;

        if (activo !== undefined) categoria.activo = activo;

        //guardar cambios
        await categoria.save();

        //Respuesta exitosa
        res.json({
            success: true,
            message: 'Categoria actualizada exitosamente',
            data: {
                categoria
            }
        });

    } catch (error) {{
        console.error('error en actiualizarCategoria:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validacion',
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error al actualizar categoria',
            error: error.message
        });
        }
    }
};

/**
 * actualizar/desactivar categoria
 * PATH /api/admin/categorias/:id
 * 
 * al desactivar ima categoria se desactivan todas las subcategorias relacionadas
 * al desacticar una subcategoria se desactivan todos los productos relacionados
 * @param {Object} req request Express
 * @param {Object} res response Express
 */

const toggleCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        //buscar categoria por id
        const categoria = await Categoria.findByPk(id);

        if (!categoria) {
            return res.status(400).json({
                success: false,
                message: 'Categoria no encontrada'
            });
        }

        //alternar estado activo
        const nuevoEstado = !categoria.activo;
        categoria.activo = !nuevoEstado;

        //guardar cambios
        await categoria.save();

        //contar suantos registros se afectaron 
        const registrosAfectados = await Categoria.count({ where: { categoriaId: id } });

        const productosAfectados = await Producto.count({ where: { categoriaId: id } });

        //respuesta exitosa 
        res.json({
            success: true,
            message: `Categoria ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
            data: {
                categoria,
                afectados:{
                    subcategorias:
                    subcategoriasAfectadas,
                    productos: productosAfectados
            }
         }
    });
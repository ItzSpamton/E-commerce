/**
 * middleware de verificar roles
 * este middleware verifica q el usuario tenga un rol requerido 
 * debe usarse despues de middleware de autentifacion
 */

const esAdministrador = (req, res, next) => {
    try {
        //verificar q exise req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'no se autorizado inicie sesion primero'
            });
        }

        //verificar q el rol es administrador 
        if (req.usuario.rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'acceso denegado se requiere permiso de administrador'
            });
        }

        //el usuario es administrador continuar 
        next();

    } catch (error) {
        console.error('error en middleware esAdministrador', error);
        return res.status(500).json({
            success: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};
/**
 * middleware para verificar si el usuario es cliente
 */
const esCliente = (req, res, next) => {
    try {
        //verificar q exise req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'no se autorizado inicie sesion primero'
            });
        }

        //verificar q el rol es cliente 
        if (req.usuario.rol !== 'cliente') {
            return res.status(403).json({
                success: false,
                message: 'acceso denegado se requiere permisos de cliente'
            });
        }

        //el usuario es cliente continuar 
        next();

    } catch (error) {
        console.error('error en middleware esCliente', error);
        return res.status(500).json({
            success: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};
/**
 * middleware flexible para verificar multiples roles
 * permite verificar varios roles validos 
 * util para cuando una ruta tiene varios roles  permitidos 
 */

const tieneRol = (req, res, next) => {
    return (req, res, next) => {
    try {
        //verificar q exise req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'no autorizado debe iniciar sesion primero'
            });
        }

        //verificar q el usuario esta en a lista de roles permitidos 
        if (req.rolesPermitidos.include (req.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`
            });
        }


        //el usuario tiene un rol permitido, continuar 
        next();

    } catch (error) {
        console.error('error en middleware tieneRol', error);
        return res.status(500).json({
            success: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};
};

/**
 * middleware para verificar que el usuario accede a sus propios datos 
 * verifica que el usuarioid en los parametros coinciden con el usuario autenticado
 */

const esPropioUsuarioOAdmin = (req, res, next) => {
    try {
        //verificar q exise req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'no se autorizado inicie sesion primero'
            });
        }

        //los administradores pueden acceder a datos de cualquier usuario
        if (req.usuario.rol === 'administrador') {
            return next ();
        }

        //obtener el usuarioId de los parametros de la ruta
        const usuarioIdParam = req.params.usuarioId || req.params.id;

        //verificar que el usuarioId coincide con el usuario autenticado 
        if (parseInt(usuarioIdParam) !== req.usuario) {
            return res.status(403).json({
                success: false,
                message: 'acceso denegado no puedes acceder a datos de otro usuario'
            });
        }

        //el usuario accede a sus propios datos continuar
        next();

    } catch (error) {
        console.error('error en middleware de esPropioUsuarioOAdmin', error);
        return res.status(500).json({
            success: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};
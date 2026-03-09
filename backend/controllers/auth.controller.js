    /**
     * cambiar la contraseña del usuario autenticado
     * permite al usuario camnbiar su contraseña
     * requiere su contraseña actual por seguridad
     * PUT/api/auth/chang=password
     * */

    const cambiarPassword = async (req, res) => {
        try {
        const { passwordActual, passwordNueva } = req.body;

        //validacion verificar que se proporcionaron ambas contraseñas 
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({
                succes: false,
                message: `se requiere contraseña actual y nueva`
            });
        }
        }
    };
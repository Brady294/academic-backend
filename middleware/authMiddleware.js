const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
    try {
        /*
        |--------------------------------------------------------------------------
        | Get Authorization header
        |--------------------------------------------------------------------------
        */

        const authHeader = req.headers.authorization;

        /*
        |--------------------------------------------------------------------------
        | Check Bearer token
        |--------------------------------------------------------------------------
        */

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                error: "No valid authentication token provided.",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Extract token
        |--------------------------------------------------------------------------
        */

        const token = authHeader
            .substring(7)
            .trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication token is missing.",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Verify JWT
        |--------------------------------------------------------------------------
        */

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        /*
        |--------------------------------------------------------------------------
        | Attach authenticated user
        |--------------------------------------------------------------------------
        */

        req.user = decoded;

        next();
    } catch (error) {
        console.error(
            "AUTH MIDDLEWARE ERROR:",
            error.message
        );

        /*
        |--------------------------------------------------------------------------
        | Token expired
        |--------------------------------------------------------------------------
        */

        if (
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                error: "Authentication token has expired.",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Invalid token
        |--------------------------------------------------------------------------
        */

        if (
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                success: false,
                error: "Invalid authentication token.",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Other authentication errors
        |--------------------------------------------------------------------------
        */

        return res.status(401).json({
            success: false,
            error: "Authentication failed.",
        });
    }
};
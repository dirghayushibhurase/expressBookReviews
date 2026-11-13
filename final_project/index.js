const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const customer_routes = require('./router/auth_users.js').authenticated;
const genl_routes = require('./router/general.js').general;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware for customer routes
app.use("/customer", session({
    secret: "fingerprint_customer",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// Authentication middleware protecting /customer/auth/*
app.use("/customer/auth/*", function auth(req, res, next) {
    let token = null;
    let sessionUser = null;

    // Check session authorization
    if (req.session && req.session.authorization) {
        token = req.session.authorization['accessToken'];
        sessionUser = req.session.authorization['username'];
    }
    // Check Authorization header fallback (Bearer <token> or raw token)
    else if (req.headers && (req.headers['authorization'] || req.headers['x-access-token'])) {
        const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    if (!token) {
        return res.status(403).json({ message: "User not logged in or token missing" });
    }

    // Verify JWT access token
    jwt.verify(token, "access", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "User not authenticated. Invalid or expired token." });
        }
        req.user = decoded;
        const username = sessionUser || (decoded && (decoded.data || decoded.username)) || "customer";
        if (req.session) {
            req.session.authorization = {
                accessToken: token,
                username: username
            };
        }
        next();
    });
});

const PORT = process.env.PORT || 5000;

app.use("/customer", customer_routes);
app.use("/", genl_routes);

// Generic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

module.exports = app;

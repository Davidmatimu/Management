const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const employeeRoutes = require('./employeeRoutes.ts');
const myrequestsRoutes = require('./requestsRoutes.ts');
const db = require('./db/connection.js')

const app = express();
const port = 5500;

app.use(express.json());
app.use(cors());

app.use('/register', employeeRoutes);
app.use('/myrequests', employeeRoutes);

// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and Password are Required' });
    }
    try {
        const result = await db.request()
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM users WHERE username = @username');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "No username found" });
        }

        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            const token = jwt.sign({ userId: user.id }, 'my_secret_key', { expiresIn: '1h' });
            res.json({ message: 'Login Successful', token });
        } else {
            res.status(401).json({ message: 'Invalid Password' });
        }
    } catch (err) {
        console.error("Error during login:", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Authentication Middleware using JWT
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const extractedToken = token.split(' ')[1];
        const decoded = jwt.verify(extractedToken, 'my_secret_key');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
    }
};

// Profile Endpoint
app.get('/profile', authenticate, async (req, res) => {
    const userId = req.userId;

    try {
        const result = await db.request()
            .input('id', sql.Int, userId)
            .query('SELECT * FROM users WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Error fetching user profile:", err.message);
        res.status(500).json({ message: "Error fetching details" });
    }
});

// Profile Update Endpoint
app.post('/profile/update', authenticate, async (req, res) => {
    const userId = req.userId;
    const updatedFields = req.body;

    const fields = Object.keys(updatedFields);
    const values = Object.values(updatedFields);

    if (fields.length === 0) {
        return res.status(400).json({ message: "No fields provided for update." });
    }

    const setClause = fields.map((field, index) => `${field} = @value${index}`).join(', ');

    try {
        const request = db.request();
        fields.forEach((field, index) => {
            request.input(`value${index}`, updatedFields[field]);
        });
        request.input('id', sql.Int, userId);

        const result = await request.query(`UPDATE users SET ${setClause} WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "User not found or no changes made" });
        }

        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Error updating user profile:", err.message);
        res.status(500).json({ message: "Error updating profile" });
    }
});

// Products Endpoint
app.get('/products', async (req, res) => {
    try {
        const result = await db.request().query('SELECT * FROM products');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching products:", err.message);
        res.status(500).json({ message: "Error fetching products" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

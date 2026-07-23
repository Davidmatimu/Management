const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const DB = require('./db/connection.ts')

const app = express()
const port = 5500;
app.use(express.json())
app.use(cors())

app.post('/register', async (req, res) => {

    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';

        DB.query(sql, [username, hashedPassword], (err, result) => {
            if (err) {
                console.log("Error in registration" + err);
                res.status(500).json({ message: 'Registration failed' });
            } else {
                res.json({ message: "Registration successful" });
            }
        });
    } catch (error) {
        console.error('Error in password hashing:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    DB.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Error searching for username:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await bcrypt.compare(password, result[0].password);

        if (match) {
            // Passwords match, user is authenticated
            // Generate JWT token or set up session
            // Send success response
            const token = jwt.sign({ userId: result[0].id }, 'my_secret_key', { expiresIn: '1h' })
            res.json({ message: 'Login Successful', token })

            res.status(200).json({ message: 'Login successful' });
        } else {
            // Passwords don't match, authentication failed
            // Send failure response
            res.status(401).json({ message: 'password does not match' });
        }
    });
});

//Auth middleware using JWT

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')
    console.log(token)

    if (!token) {
        return res.status(401).json({ message: "unauthorized" })
    }
    const extractedToken = token.split('')[1]
    console.log('Actual token ' + extractedToken)

    try {
        const decoded = jwt.verify(extractedToken, 'my_secret_key')
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ message: "Invalid Token" })
    }
}

app.get('/profile', authenticate, (req, res) => {
    const userId = req.userId
    const sql = "SELECT * FROM users WHERE id = ?"
    DB.query(sql, [userId], (err, result) => {
        if (err || result.length === 0) {
            res.status(500).json({ message: "Error Fetching details" })
        } else {
            res.json({ username: result[0].username })
        }
    })
})

//product 
app.get('/product', (req, res) => {
    const sql = 'SELECT * FROM product'
    DB.query(sql, (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching products' })
        }
        else{
            res.json(result)
        }
    })
})


app.listen(port, () => {
    console.log('server is running!')
})


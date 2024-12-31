const express = require('express');
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('./db/connection.js')
const employeeRoutes = require('./employeeRoutes.ts')
const myrequestsRoutes = require('./requestsRoutes.ts')

const app = express()
const port = 5500;
app.use(express.json())
app.use(cors());

app.use('/register', employeeRoutes)
app.use('/myrequests', employeeRoutes)

//Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    //Check if username and password are present
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and Password are Required' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, result) => {
        if (err || result.length === 0) {
            console.log("Error Searching for username: " + err)
            res.status(404).json({ message: "No username found" })
        } else {
            //compare hashed password
            const match = await bcrypt.compare(password, result[0].password);
            if (match) {
                //create a jwt token
                const token = jwt.sign({ userId: result[0].id }, 'my_secret_key', { expiresIn: '1h' });
                res.json({ message: 'Login Successful', token })
            } else {
                res.status(401).json({ message: 'Invalid Password' })
            }
        }
    })
});

//Authentication Middleware using JWT
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    console.log("Unextracted Token: " + token)

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const extractedToken = token.split(' ')[1];
    console.log('Actual TOken: ' + extractedToken)

    try {
        // /verift and validate our token
        const decoded = jwt.verify(extractedToken, 'my_secret_key')
        req.userId = decoded.userId;
        next();

    } catch (err) {
        res.status(401).json({ message: "Invalid Token" })
    }
}

app.get('/profile', authenticate, (req, res)=>{
    const userId = req.userId;
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result)=>{
        if (err || result.length === 0) {
            res.status(500).json({message: "Error Fetching Details"})
        }else{
            res.json(result[0]); // Send the full user object
            console.log(result[0]);
        }
    })
});

app.post('/profile/update', authenticate, (req, res) => {
    const userId = req.userId; // User ID from authentication middleware
    const updatedFields = req.body; // Fields to be updated, sent from the client
    
    // Generate SQL SET clause dynamically based on fields in the request body
    const fields = Object.keys(updatedFields);
    const values = Object.values(updatedFields);

    if (fields.length === 0) {
        return res.status(400).json({ message: "No fields provided for update." });
    }

    // Build the SET clause for the SQL UPDATE statement
    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;

    // Append userId to the values array
    values.push(userId);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating user profile:", err);
            return res.status(500).json({ message: "Error updating profile" });
        }

        // If no rows were updated, the user ID might be invalid
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found or no changes made" });
        }

        res.json({ message: "Profile updated successfully" });
        console.log("Profile updated for userId:", userId);
    });
});


app.get('/products', (req, res)=>{
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, result)=>{
        if(err){
            res.status(500).json({message: 'Error Fetching Products'})
        }else{
            res.json(result);
        }
    })
})


app.listen(port, () => {
    console.log('Server is running bro')
})
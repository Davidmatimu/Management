import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
//import { Employee } from './entity/Employee';
//import { Product } from './entity/Product';

const app = express();
const port = 5500;

app.use(express.json());
app.use(cors());

interface AuthenticatedRequest extends Request {
    userId?: number;
}

// Initialize TypeORM connection
const AppDataSource = new DataSource({
    type: "mssql",
    host: "your_db_host",
    port: 1433,
    username: "your_db_user",
    password: "your_db_password",
    database: "your_db_name",
    entities: [Employee, Product],
    synchronize: true,
    logging: false,
});

AppDataSource.initialize()
    .then(() => console.log('Database connected'))
    .catch((err) => console.error('Database connection error:', err));

// Login Endpoint
app.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ message: 'Username and Password are required' });
        return;
    }

    try {
        const employeeRepository = AppDataSource.getRepository(Employee);
        const user = await employeeRepository.findOne({ where: { username } });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            const token = jwt.sign({ userId: user.id }, 'my_secret_key', { expiresIn: '1h' });
            res.json({ message: 'Login Successful', token });
        } else {
            res.status(401).json({ message: 'Invalid password' });
        }
    } catch (err: any) {
        console.error("Error during login:", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Authentication Middleware using JWT
const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = req.header('Authorization');

    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const extractedToken = token.split(' ')[1];
        const decoded = jwt.verify(extractedToken, 'my_secret_key') as { userId: number };
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
        return;
    }
};

// Profile Endpoint
app.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        const employeeRepository = AppDataSource.getRepository(Employee);
        const user = await employeeRepository.findOne({ where: { id: req.userId } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(user);
    } catch (err: any) {
        console.error("Error fetching user profile:", err.message);
        return res.status(500).json({ message: "Error fetching details" });
    }
});

// Products Endpoint
app.get('/products', async (req: Request, res: Response) => {
    try {
        const productRepository = AppDataSource.getRepository(Product);
        const products = await productRepository.find();
        return res.json(products);
    } catch (err: any) {
        console.error("Error fetching products:", err.message);
        return res.status(500).json({ message: "Error fetching products" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

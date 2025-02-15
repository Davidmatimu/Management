import { Router, Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../db/connection'; // Ensure this is correctly set up
import { Employee } from '../entity/Employee';
import express from 'express';

// Initialize the Router
const employeeRoutesRouter = Router();

// Use middleware
employeeRoutesRouter.use(cors());
employeeRoutesRouter.use(express.json()); // Parse JSON request bodies

// Define a type for the request body
interface RegistrationRequest {
    username: string;
    password: string;
    first_Name: string;
    middle_Initial?: string;
    last_Name: string;
    date_Of_Birth: string;
    home_Address: string;
    home_Telephone?: string;
    position_Level: string;
    organization_Mailing_Address: string;
    office_Telephone: string;
    work_Email_Address: string;
    position_Title: string;
    accommodation?: string;
    accommodation_Reason?: string;
    appointment: string;
    education_Level: string;
    pay_Plan: string;
    series: string;
    grade: string;
    step: string;
}

// Registration Endpoint
employeeRoutesRouter.post('/', async (req: Request, res: Response): Promise<any> => {
    const {
        username,
        password,
        first_Name,
        middle_Initial,
        last_Name,
        date_Of_Birth,
        home_Address,
        home_Telephone,
        position_Level,
        organization_Mailing_Address,
        office_Telephone,
        work_Email_Address,
        position_Title,
        accommodation,
        accommodation_Reason,
        appointment,
        education_Level,
        pay_Plan,
        series,
        grade,
        step,
    } = req.body as RegistrationRequest;

    try {
        // Validate required fields
        if (!username || !password || !first_Name || !last_Name || !date_Of_Birth || !home_Address || !position_Level || !organization_Mailing_Address || !office_Telephone || !work_Email_Address || !position_Title || !appointment || !education_Level || !pay_Plan || !series || !grade || !step) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get the Employee repository from TypeORM
        const employeeRepository = AppDataSource.getRepository(Employee);

        // Create a new employee instance
        const newEmployee = employeeRepository.create({
            username,
            password: hashedPassword,
            first_Name,
            middle_Initial,
            last_Name,
            date_Of_Birth: new Date(date_Of_Birth), // Convert string to Date
            home_Address,
            home_Telephone,
            position_Level,
            organization_Mailing_Address,
            office_Telephone,
            work_Email_Address,
            position_Title,
            accommodation,
            accommodation_Reason,
            appointment,
            education_Level,
            pay_Plan,
            series,
            grade,
            step,
        });

        // Save the new employee to the database
        await employeeRepository.save(newEmployee);

        return res.status(201).json({ message: 'Registration successful' });
    } catch (err: any) {
        console.error('Error in registration:', err.message);
        return res.status(500).json({ message: 'Error in registration', error: err.message });
    }
});

export default employeeRoutesRouter;
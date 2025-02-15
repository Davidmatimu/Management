import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import { AppDataSource } from '../db/connection'; // Ensure this is correctly set up
import { Requests } from '../entity/Requests'; // Import the Request entity

const requestsRoutesRouter = express.Router();

// Use middleware
requestsRoutesRouter.use(cors());
requestsRoutesRouter.use(express.json()); // Parse JSON request bodies

// Requests Endpoint
requestsRoutesRouter.post('/', async (req: Request, res: Response) => {
    const {
        vendor_Name,
        vendor_Location,
        vendor_Telephone,
        vendor_Email,
        vendor_Website,
        vendor_POC,
        course_Title,
        course_Number,
        training_Start_Date,
        training_End_Date,
        training_Duty_Hours,
        training_Non_Duty_Hours,
        training_Purpose_Type,
        training_Type_Code,
        training_Sub_Type_Code,
        training_Delivery_Type_Code,
        training_Designation_Type_Code,
        training_Credit,
        training_Credit_Type_Code,
        training_Accreditation_Indicator,
        csa,
        csa_Expiration_Date,
        training_Source_Type,
        individual_Or_Group_Training,
        student_Membership_Id,
        skill_Learning_Objective,
    } = req.body;

    try {
        // Get the Request repository
        const requestRepository = AppDataSource.getRepository(Requests);

        // Create a new request instance
        const newRequest = requestRepository.create({
            vendor_Name,
            vendor_Location,
            vendor_Telephone,
            vendor_Email,
            vendor_Website,
            vendor_POC,
            course_Title,
            course_Number,
            training_Start_Date: new Date(training_Start_Date), // Convert to Date
            training_End_Date: new Date(training_End_Date), // Convert to Date
            training_Duty_Hours,
            training_Non_Duty_Hours,
            training_Purpose_Type,
            training_Type_Code,
            training_Sub_Type_Code,
            training_Delivery_Type_Code,
            training_Designation_Type_Code,
            training_Credit,
            training_Credit_Type_Code,
            training_Accreditation_Indicator,
            csa,
            csa_Expiration_Date: new Date(csa_Expiration_Date), // Convert to Date
            training_Source_Type,
            individual_Or_Group_Training,
            student_Membership_Id,
            skill_Learning_Objective,
        });

        // Save the new request to the database
        await requestRepository.save(newRequest);

        res.status(201).json({ message: 'Request created successfully', data: newRequest });
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch All Requests Endpoint
requestsRoutesRouter.get('/', async (req: Request, res: Response) => {
    try {
        // Get the Request repository
        const requestRepository = AppDataSource.getRepository(Requests);

        // Fetch all requests from the database
        const requests = await requestRepository.find();

        res.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default requestsRoutesRouter;
const express = require('express');
const employeeRoutesRouter = express.Router();
const cors = require('cors');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const db = require('./db/connection.js'); // Ensure this is configured for MSSQL

employeeRoutesRouter.use(express.json());
employeeRoutesRouter.use(cors());

// Registration Endpoint
employeeRoutesRouter.post('/', async (req, res) => {
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
        step
    } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        // SQL query
        const sqlQuery = `
            INSERT INTO Employees (
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
                step
            ) VALUES (
                @username, @password, @first_Name, @middle_Initial, @last_Name, 
                @date_Of_Birth, @home_Address, @home_Telephone, @position_Level, 
                @organization_Mailing_Address, @office_Telephone, @work_Email_Address, 
                @position_Title, @accommodation, @accommodation_Reason, @appointment, 
                @education_Level, @pay_Plan, @series, @grade, @step
            );
        `;

        // Execute the query
        const request = db.request();
        request
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, hashedPassword)
            .input('first_Name', sql.VarChar, first_Name)
            .input('middle_Initial', sql.VarChar, middle_Initial)
            .input('last_Name', sql.VarChar, last_Name)
            .input('date_Of_Birth', sql.Date, date_Of_Birth)
            .input('home_Address', sql.VarChar, home_Address)
            .input('home_Telephone', sql.VarChar, home_Telephone)
            .input('position_Level', sql.VarChar, position_Level)
            .input('organization_Mailing_Address', sql.VarChar, organization_Mailing_Address)
            .input('office_Telephone', sql.VarChar, office_Telephone)
            .input('work_Email_Address', sql.VarChar, work_Email_Address)
            .input('position_Title', sql.VarChar, position_Title)
            .input('accommodation', sql.VarChar, accommodation)
            .input('accommodation_Reason', sql.VarChar, accommodation_Reason)
            .input('appointment', sql.VarChar, appointment)
            .input('education_Level', sql.VarChar, education_Level)
            .input('pay_Plan', sql.VarChar, pay_Plan)
            .input('series', sql.VarChar, series)
            .input('grade', sql.VarChar, grade)
            .input('step', sql.VarChar, step);

        const result = await request.query(sqlQuery);

        res.json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Error in registration:', err.message);
        res.status(500).json({ message: 'Error in registration' });
    }
});

module.exports = employeeRoutesRouter;

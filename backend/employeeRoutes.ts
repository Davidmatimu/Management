const express = require('express');
const employeeRoutesRouter = express.Router()
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('./db/connection.js')

employeeRoutesRouter.use(express.json())
employeeRoutesRouter.use(cors());

//Registration Endpoint
employeeRoutesRouter.post('/', async (req, res) => {
    const { username,
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

    const hashedPassword = await bcrypt.hash(password, 10)
    console.log(hashedPassword);

    const sql = `INSERT INTO users (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [username, 
        hashedPassword,
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
        step], (err, result) => {
        if (err) {
            console.log("Error In Registration: " + err)
        } else {
            res.json({ message: "Registration successful" });
        }
    })
});

module.exports = employeeRoutesRouter
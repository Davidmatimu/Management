const requestsRoutesExpress = require('express');
const requestsRoutesrouter = requestsRoutesExpress.Router();
const requestsRoutesExpressdb = require('./db/connection.js')

requestsRoutesrouter.use(require('cors')());

// Requests Endpoint
requestsRoutesrouter.post('/', async (req, res) => {
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
        const sql = `INSERT INTO Employees (
            vendor_Name, vendor_Location, vendor_Telephone, vendor_Email, vendor_Website,
            vendor_POC, course_Title, course_Number, training_Start_Date, training_End_Date,
            training_Duty_Hours, training_Non_Duty_Hours, training_Purpose_Type, training_Type_Code,
            training_Sub_Type_Code, training_Delivery_Type_Code, training_Designation_Type_Code,
            training_Credit, training_Credit_Type_Code, training_Accreditation_Indicator, csa,
            csa_Expiration_Date, training_Source_Type, individual_Or_Group_Training,
            student_Membership_Id, skill_Learning_Objective
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(
            sql,
            [
                vendor_Name, vendor_Location, vendor_Telephone, vendor_Email, vendor_Website,
                vendor_POC, course_Title, course_Number, training_Start_Date, training_End_Date,
                training_Duty_Hours, training_Non_Duty_Hours, training_Purpose_Type, training_Type_Code,
                training_Sub_Type_Code, training_Delivery_Type_Code, training_Designation_Type_Code,
                training_Credit, training_Credit_Type_Code, training_Accreditation_Indicator, csa,
                csa_Expiration_Date, training_Source_Type, individual_Or_Group_Training,
                student_Membership_Id, skill_Learning_Objective
            ],
            (err, result) => {
                if (err) {
                    console.error("Error In Registration:", err);
                    return res.status(500).json({ error: "Error in registration" });
                }
                res.json({ message: "Registration successful", data: result });
            }
        );
    } catch (error) {
        console.error("Error In Registration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch All Products Endpoint
requestsRoutesrouter.get('/', (req, res) => {
    const sql = 'SELECT * FROM Employees'; // Adjust table name if needed
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error Fetching Employees:', err);
            return res.status(500).json({ message: 'Error Fetching Users' });
        }
        res.json(result);
    });
});

module.exports = requestsRoutesrouter;

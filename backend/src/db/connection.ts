import "reflect-metadata"
import { DataSource } from "typeorm"
//import { Employee } from "./entity/Employee"
import express from "express"
//import { EmployeeRouter } from "./routes/EmployeeData"

 export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "password",
    database: "TMS",
    synchronize: true,
    logging: false,
    //entities: [Employee],
    migrations: [],
    subscribers: [],
})

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(() => {
        // here you can start to work with your database
        console.log('Application has connected to the TMS database')
        const app = express()
        app.use(express.json())
        //app.use(express(EmployeeRouter))

        app.listen(8080, () => {
            console.log("Now running on port 8080")
        })
    })
    .catch((error) => console.log(error))
import "reflect-metadata"
import { DataSource } from "typeorm"
//import { Employee } from "../entity/Employee"
//import { Requests } from "../entity/Requests";
//import { Requests } from "../entity/Requests"
//import { EmployeeRouter } from "./routes/EmployeeData"

 export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "admin",
    database: "TMS",
    synchronize: true,
    logging: false,
    entities: [],
    migrations: ['src/migration/**/*.ts'], // Path to your migration files
    subscribers: [],
})

async function runMigrations() {
    try {
        await AppDataSource.initialize();
        console.log('Data Source has been initialized!');

        await AppDataSource.runMigrations();
        console.log('Migrations have been run!');

        await AppDataSource.destroy();
        console.log('Data Source has been destroyed!');
    } catch (error) {
        console.error('Error during migration:', error);
    }
}

runMigrations();
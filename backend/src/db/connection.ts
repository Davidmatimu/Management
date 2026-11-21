import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entity/User';
import { Vendor } from '../entity/Vendor';
import { Course } from '../entity/Course';
import { TrainingRequest } from '../entity/TrainingRequest';
import { Notification } from '../entity/Notification';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'tms',
  password: process.env.DB_PASSWORD || 'tms_password',
  database: process.env.DB_NAME || 'tms',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
  entities: [User, Vendor, Course, TrainingRequest, Notification],
  migrations: ['src/migration/**/*.ts'],
  subscribers: [],
});

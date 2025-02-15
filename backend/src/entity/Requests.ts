import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Requests {
    @PrimaryGeneratedColumn()
    id!: number; // Definite assignment assertion

    @Column()
    vendor_Name!: string; // Definite assignment assertion

    @Column()
    vendor_Location!: string;

    @Column()
    vendor_Telephone!: string;

    @Column()
    vendor_Email!: string;

    @Column()
    vendor_Website!: string;

    @Column()
    vendor_POC!: string;

    @Column()
    course_Title!: string;

    @Column()
    course_Number!: string;

    @Column()
    training_Start_Date!: Date;

    @Column()
    training_End_Date!: Date;

    @Column()
    training_Duty_Hours!: number;

    @Column()
    training_Non_Duty_Hours!: number;

    @Column()
    training_Purpose_Type!: string;

    @Column()
    training_Type_Code!: string;

    @Column()
    training_Sub_Type_Code!: string;

    @Column()
    training_Delivery_Type_Code!: string;

    @Column()
    training_Designation_Type_Code!: string;

    @Column()
    training_Credit!: number;

    @Column()
    training_Credit_Type_Code!: string;

    @Column()
    training_Accreditation_Indicator!: boolean;

    @Column()
    csa!: string;

    @Column()
    csa_Expiration_Date!: Date;

    @Column()
    training_Source_Type!: string;

    @Column()
    individual_Or_Group_Training!: string;

    @Column()
    student_Membership_Id!: string;

    @Column()
    skill_Learning_Objective!: string;
}
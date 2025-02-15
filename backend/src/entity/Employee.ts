import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('employee')
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number; // Definite assignment assertion

  @Column({ type: 'varchar', length: 100, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 100 })
  first_Name!: string;

  @Column({ type: 'varchar', length: 1, nullable: true })
  middle_Initial!: string;

  @Column({ type: 'varchar', length: 100 })
  last_Name!: string;

  @Column({ type: 'date' })
  date_Of_Birth!: Date;

  @Column({ type: 'varchar', length: 255 })
  home_Address!: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  home_Telephone!: string;

  @Column({ type: 'varchar', length: 50 })
  position_Level!: string;

  @Column({ type: 'varchar', length: 255 })
  organization_Mailing_Address!: string;

  @Column({ type: 'varchar', length: 15 })
  office_Telephone!: string;

  @Column({ type: 'varchar', length: 255 })
  work_Email_Address!: string;

  @Column({ type: 'varchar', length: 100 })
  position_Title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accommodation!: string;

  @Column({ type: 'text', nullable: true })
  accommodation_Reason!: string;

  @Column({ type: 'varchar', length: 100 })
  appointment!: string;

  @Column({ type: 'varchar', length: 50 })
  education_Level!: string;

  @Column({ type: 'varchar', length: 50 })
  pay_Plan!: string;

  @Column({ type: 'varchar', length: 50 })
  series!: string;

  @Column({ type: 'varchar', length: 10 })
  grade!: string;

  @Column({ type: 'varchar', length: 10 })
  step!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
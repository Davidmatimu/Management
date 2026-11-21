import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TrainingRequest } from './TrainingRequest';
import { Notification } from './Notification';

export type UserRole = 'employee' | 'supervisor' | 'AO' | 'HR';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  keycloakId!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar' })
  displayName!: string;

  @Column({ type: 'varchar', default: 'employee' })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  supervisorId!: string | null;

  // ─── SF-182 Section A - Trainee Information ──────────────────────────────
  // (SSN is intentionally not collected - it's "Agency Use Only" on the real
  // form and not appropriate to hold in a self-service web app.)

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'varchar', nullable: true })
  homeAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  homeTelephone!: string | null;

  /** 6a Non-supervisory, 6b Supervisory, 6c Manager, 6d Executive */
  @Column({ type: 'varchar', nullable: true })
  positionLevel!: string | null;

  @Column({ type: 'varchar', nullable: true })
  organizationMailingAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  officeTelephone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  positionTitle!: string | null;

  @Column({ type: 'boolean', default: false })
  needsAccommodation!: boolean;

  @Column({ type: 'text', nullable: true })
  accommodationDescription!: string | null;

  @Column({ type: 'varchar', nullable: true })
  appointmentType!: string | null;

  /** Education level code 1-22, see SF-182 page 4-5 */
  @Column({ type: 'varchar', nullable: true })
  educationLevel!: string | null;

  @Column({ type: 'varchar', nullable: true })
  payPlan!: string | null;

  @Column({ type: 'varchar', nullable: true })
  series!: string | null;

  @Column({ type: 'varchar', nullable: true })
  grade!: string | null;

  @Column({ type: 'varchar', nullable: true })
  step!: string | null;

  @OneToMany(() => TrainingRequest, (request) => request.employee)
  requests!: TrainingRequest[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

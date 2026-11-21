import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, UserRole } from './User';
import { Vendor } from './Vendor';
import { Course } from './Course';

export type RequestStatus =
  | 'submitted'
  | 'supervisor_pending'
  | 'AO_pending'
  | 'approved_AO'
  | 'approved_HR'
  | 'approved'
  | 'rejected'
  | 'revoked';

export type ApprovalStage = 'none' | 'supervisor' | 'AO';

/**
 * Mirrors OPM Standard Form 182 "Authorization, Agreement, and Certification
 * of Training". SSN (Section A) is intentionally omitted - see User entity.
 */
@Entity()
export class TrainingRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  requestId!: string;

  @ManyToOne(() => User, (user) => user.requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee!: User;

  @Column({ type: 'uuid' })
  employeeId!: string;

  // Nullable link back to the master catalog entry this request was created
  // from (if any) - purely for traceability/analytics. The columns below
  // are the source of truth for what was actually submitted; they don't
  // change if the linked Vendor/Course record is edited later.
  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor!: Vendor | null;

  @Column({ type: 'uuid', nullable: true })
  vendorId!: string | null;

  @ManyToOne(() => Course, (course) => course.requests, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'courseId' })
  course!: Course | null;

  @Column({ type: 'uuid', nullable: true })
  courseId!: string | null;

  // ─── Section B - Training Course Data ────────────────────────────────────
  @Column({ type: 'varchar' })
  vendorName!: string;

  @Column({ type: 'varchar', nullable: true })
  vendorLocation!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorTelephone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorEmail!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorWebsite!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorPOC!: string | null;

  @Column({ type: 'varchar' })
  courseTitle!: string;

  @Column({ type: 'varchar', nullable: true })
  courseNumber!: string | null;

  @Column({ type: 'date' })
  trainingStartDate!: string;

  @Column({ type: 'date' })
  trainingEndDate!: string;

  @Column({ type: 'float', nullable: true })
  trainingDutyHours!: number | null;

  @Column({ type: 'float', nullable: true })
  trainingNonDutyHours!: number | null;

  /** SF-182 item 7, codes 01-06 */
  @Column({ type: 'varchar' })
  trainingPurposeType!: string;

  /** SF-182 item 8, codes 01-03 */
  @Column({ type: 'varchar' })
  trainingTypeCode!: string;

  /** SF-182 item 9, depends on trainingTypeCode */
  @Column({ type: 'varchar' })
  trainingSubTypeCode!: string;

  /** SF-182 item 10, codes 1-6 */
  @Column({ type: 'varchar' })
  trainingDeliveryTypeCode!: string;

  /** SF-182 item 11, codes 01-05 */
  @Column({ type: 'varchar', nullable: true })
  trainingDesignationTypeCode!: string | null;

  @Column({ type: 'float', nullable: true })
  trainingCredit!: number | null;

  /** SF-182 item 13, codes 1-7, only meaningful when trainingCredit > 0 */
  @Column({ type: 'varchar', nullable: true })
  trainingCreditTypeCode!: string | null;

  @Column({ type: 'boolean', default: false })
  trainingAccreditationIndicator!: boolean;

  /** SF-182 item 15, agency response: Y / N / N/A */
  @Column({ type: 'varchar', default: 'N/A' })
  csaRequiredIndicator!: string;

  @Column({ type: 'date', nullable: true })
  csaExpirationDate!: string | null;

  /** SF-182 item 17, codes 1-5 */
  @Column({ type: 'varchar' })
  trainingSourceType!: string;

  @Column({ type: 'varchar', default: 'individual' })
  individualOrGroupTraining!: 'individual' | 'group';

  @Column({ type: 'varchar', nullable: true })
  studentMembershipId!: string | null;

  @Column({ type: 'text' })
  skillLearningObjective!: string;

  /** SF-182 item 21 - free text for the reviewing agency, not employee-editable */
  @Column({ type: 'text', nullable: true })
  agencyUseOnlyNotes!: string | null;

  // ─── Section C - Costs and Billing Information ───────────────────────────
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  tuitionFeesAmount!: number;

  @Column({ type: 'varchar', nullable: true })
  tuitionFeesAppropriationFund!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  booksMaterialsAmount!: number;

  @Column({ type: 'varchar', nullable: true })
  booksMaterialsAppropriationFund!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  travelAmount!: number;

  @Column({ type: 'varchar', nullable: true })
  travelAppropriationFund!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  perDiemAmount!: number;

  @Column({ type: 'varchar', nullable: true })
  perDiemAppropriationFund!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  nonGovernmentContributionCost!: number;

  @Column({ type: 'varchar', nullable: true })
  documentPurchaseOrderNumber!: string | null;

  /** Format: XX-XX-XXXX */
  @Column({ type: 'varchar', nullable: true })
  stationSymbol!: string | null;

  @Column({ type: 'text', nullable: true })
  billingInstructions!: string | null;

  // ─── Workflow ─────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', default: 'submitted' })
  status!: RequestStatus;

  @Column({ type: 'varchar', default: 'supervisor' })
  approvalStage!: ApprovalStage;

  // ─── Section D.1 - Immediate Supervisor sign-off ─────────────────────────
  @Column({ type: 'text', nullable: true })
  supervisorComments!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  supervisorSignedAt!: Date | null;

  // ─── Section E.1 - Authorizing Official sign-off ─────────────────────────
  @Column({ type: 'text', nullable: true })
  AOComments!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  AOSignedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  approvedBy!: UserRole | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  // ─── Section F - Certification of Training Completion ───────────────────
  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column({ type: 'uuid', nullable: true })
  completedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  completionNotes!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

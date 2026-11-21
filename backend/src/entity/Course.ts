import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './Vendor';
import { TrainingRequest } from './TrainingRequest';

/**
 * Master catalog of courses, each offered by one Vendor. Auto-populated as
 * employees submit SF-182 requests (see findOrCreateCourse in utils.ts) -
 * this is what powers course search and the "popular courses" list, with
 * accurate counts because it's matched by ID rather than by re-comparing
 * free-typed strings on every request.
 */
@Entity()
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.courses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor!: Vendor;

  @Column({ type: 'uuid' })
  vendorId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  courseNumber!: string | null;

  /** SF-182 item 7 */
  @Column({ type: 'varchar', nullable: true })
  trainingPurposeType!: string | null;

  /** SF-182 item 8 */
  @Column({ type: 'varchar', nullable: true })
  trainingTypeCode!: string | null;

  /** SF-182 item 9 */
  @Column({ type: 'varchar', nullable: true })
  trainingSubTypeCode!: string | null;

  /** SF-182 item 10 */
  @Column({ type: 'varchar', nullable: true })
  trainingDeliveryTypeCode!: string | null;

  /** SF-182 item 17 */
  @Column({ type: 'varchar', nullable: true })
  trainingSourceType!: string | null;

  @OneToMany(() => TrainingRequest, (request) => request.course)
  requests!: TrainingRequest[];

  @CreateDateColumn()
  createdAt!: Date;

  /** Bumped on every request submission that reuses this course - doubles as "last requested" */
  @UpdateDateColumn()
  updatedAt!: Date;
}

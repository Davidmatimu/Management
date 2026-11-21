import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Course } from './Course';

/**
 * Master list of training vendors, deduplicated by name (case-insensitive
 * match on write - see findOrCreateVendor in utils.ts). This is reference
 * data for search/autocomplete/consistent popularity counts; it is NOT the
 * source of truth for what a submitted SF-182 says. Each TrainingRequest
 * keeps its own snapshot of vendor details as they were at submission time,
 * since the form is effectively an audit record - if a vendor's phone
 * number changes later, past requests shouldn't silently change with it.
 */
@Entity()
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', nullable: true })
  telephone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', nullable: true })
  poc!: string | null;

  @OneToMany(() => Course, (course) => course.vendor)
  courses!: Course[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

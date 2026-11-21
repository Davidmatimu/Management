import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from './db/connection';
import { Notification, NotificationType } from './entity/Notification';
import { Vendor } from './entity/Vendor';
import { Course } from './entity/Course';

/**
 * Express 4 does not catch rejected promises thrown inside async route
 * handlers - an unhandled rejection there crashes the whole process
 * (Node's default unhandledRejection behavior). Wrap every async handler
 * with this so failures become a normal 500 via the error-handling
 * middleware instead of taking the server down.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Req, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

interface VendorInput {
  vendorName: string;
  vendorLocation?: string | null;
  vendorTelephone?: string | null;
  vendorEmail?: string | null;
  vendorWebsite?: string | null;
  vendorPOC?: string | null;
}

/**
 * Case-insensitive match on name to avoid "Coursera" / "coursera Inc"
 * fragmenting into separate catalog entries. Creates a new Vendor row the
 * first time a name is seen; reuses it (and refreshes contact details from
 * the latest submission) on every subsequent match.
 */
export async function findOrCreateVendor(input: VendorInput): Promise<Vendor> {
  const vendorRepository = AppDataSource.getRepository(Vendor);
  const name = input.vendorName.trim();

  let vendor = await vendorRepository
    .createQueryBuilder('vendor')
    .where('LOWER(vendor.name) = LOWER(:name)', { name })
    .getOne();

  if (!vendor) {
    vendor = vendorRepository.create({ name });
  }

  vendor.location = input.vendorLocation || vendor.location || null;
  vendor.telephone = input.vendorTelephone || vendor.telephone || null;
  vendor.email = input.vendorEmail || vendor.email || null;
  vendor.website = input.vendorWebsite || vendor.website || null;
  vendor.poc = input.vendorPOC || vendor.poc || null;

  return vendorRepository.save(vendor);
}

interface CourseInput {
  vendorId: string;
  courseTitle: string;
  courseNumber?: string | null;
  trainingPurposeType?: string | null;
  trainingTypeCode?: string | null;
  trainingSubTypeCode?: string | null;
  trainingDeliveryTypeCode?: string | null;
  trainingSourceType?: string | null;
}

/**
 * Matches by (vendor, title, course number) case-insensitively. Saving an
 * existing match still bumps updatedAt (TypeORM refreshes @UpdateDateColumn
 * on every save()), which doubles as a cheap "last requested" timestamp for
 * the catalog without a separate counter to keep in sync.
 */
export async function findOrCreateCourse(input: CourseInput): Promise<Course> {
  const courseRepository = AppDataSource.getRepository(Course);
  const title = input.courseTitle.trim();
  const courseNumber = input.courseNumber?.trim() || null;

  let course = await courseRepository
    .createQueryBuilder('course')
    .where('course.vendorId = :vendorId', { vendorId: input.vendorId })
    .andWhere('LOWER(course.title) = LOWER(:title)', { title })
    .andWhere(courseNumber ? 'LOWER(course.courseNumber) = LOWER(:courseNumber)' : 'course.courseNumber IS NULL', {
      courseNumber,
    })
    .getOne();

  if (!course) {
    course = courseRepository.create({
      vendorId: input.vendorId,
      title,
      courseNumber,
      trainingPurposeType: input.trainingPurposeType || null,
      trainingTypeCode: input.trainingTypeCode || null,
      trainingSubTypeCode: input.trainingSubTypeCode || null,
      trainingDeliveryTypeCode: input.trainingDeliveryTypeCode || null,
      trainingSourceType: input.trainingSourceType || null,
    });
  }

  return courseRepository.save(course);
}

export async function generateRequestId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await AppDataSource.getRepository('TrainingRequest').count();
  return `TR-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedRequestId?: string,
  relatedProgramId?: string,
): Promise<void> {
  const notificationRepository = AppDataSource.getRepository(Notification);
  const notification = notificationRepository.create({
    userId,
    type,
    title,
    message,
    relatedRequestId: relatedRequestId || null,
    relatedProgramId: relatedProgramId || null,
  });
  await notificationRepository.save(notification);
}

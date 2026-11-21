/**
 * Populates the database with realistic dummy data for local testing:
 * vendors, courses, fabricated employees (reporting to the real
 * bob.supervisor account), and SF-182 requests spread across every
 * workflow state (submitted, AO-pending, approved, completed, rejected).
 *
 * The fabricated employees have fake Keycloak IDs and can't log in
 * themselves - they exist purely so the real seeded accounts
 * (admin/bob.supervisor/carol.ao/dave.hr) have something realistic to look
 * at. Run with: npm run seed
 */
import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { AppDataSource } from './db/connection';
import { User } from './entity/User';
import { Vendor } from './entity/Vendor';
import { Course } from './entity/Course';
import { TrainingRequest, RequestStatus, ApprovalStage } from './entity/TrainingRequest';
import { generateRequestId } from './utils';

const VENDORS = [
  { name: 'Coursera for Business', location: 'Mountain View, CA', telephone: '650-555-0101', email: 'gov@coursera.org', website: 'https://coursera.org', poc: 'Jamie Foster' },
  { name: 'Udemy Business', location: 'San Francisco, CA', telephone: '415-555-0102', email: 'contracts@udemy.com', website: 'https://business.udemy.com', poc: 'Alex Trent' },
  { name: 'SANS Institute', location: 'North Bethesda, MD', telephone: '301-555-0103', email: 'registration@sans.org', website: 'https://sans.org', poc: 'Morgan Hale' },
  { name: 'Pluralsight', location: 'Draper, UT', telephone: '801-555-0104', email: 'gov@pluralsight.com', website: 'https://pluralsight.com', poc: 'Casey Lin' },
  { name: 'AWS Training and Certification', location: 'Seattle, WA', telephone: '206-555-0105', email: 'aws-training@amazon.com', website: 'https://aws.amazon.com/training', poc: 'Riley Zhao' },
  { name: 'Skillsoft', location: 'Nashua, NH', telephone: '603-555-0106', email: 'publicsector@skillsoft.com', website: 'https://skillsoft.com', poc: 'Drew Sampson' },
  { name: 'LinkedIn Learning', location: 'Sunnyvale, CA', telephone: '408-555-0107', email: 'learning-gov@linkedin.com', website: 'https://linkedin.com/learning', poc: 'Taylor Woods' },
  { name: 'Global Knowledge Training', location: 'Cary, NC', telephone: '919-555-0108', email: 'info@globalknowledge.com', website: 'https://globalknowledge.com', poc: 'Jordan Pace' },
  { name: 'New Horizons Computer Learning Centers', location: 'Anaheim, CA', telephone: '714-555-0109', email: 'enroll@newhorizons.com', website: 'https://newhorizons.com', poc: 'Sam Rivera' },
  { name: 'Federal Executive Institute', location: 'Charlottesville, VA', telephone: '434-555-0110', email: 'fei@opm.gov', website: 'https://feinet.opm.gov', poc: 'Pat Delgado' },
];

const COURSES = [
  { vendor: 'Coursera for Business', title: 'AWS Certified Solutions Architect – Associate', courseNumber: 'SAA-C03', purpose: '03', type: '01', subType: '08', delivery: '3', source: '3' },
  { vendor: 'Coursera for Business', title: 'Google Data Analytics Professional Certificate', courseNumber: null, purpose: '05', type: '01', subType: '08', delivery: '3', source: '3' },
  { vendor: 'Udemy Business', title: 'Advanced Excel for Data Analysis', courseNumber: null, purpose: '03', type: '01', subType: '13', delivery: '3', source: '3' },
  { vendor: 'Udemy Business', title: 'Python for Data Science and Machine Learning', courseNumber: null, purpose: '05', type: '01', subType: '08', delivery: '3', source: '3' },
  { vendor: 'SANS Institute', title: 'SEC504: Hacker Tools, Techniques, and Incident Handling', courseNumber: 'SEC504', purpose: '01', type: '01', subType: '12', delivery: '1', source: '3' },
  { vendor: 'SANS Institute', title: 'Certified Ethical Hacker (CEH)', courseNumber: 'CEH-v12', purpose: '01', type: '01', subType: '12', delivery: '4', source: '3' },
  { vendor: 'Pluralsight', title: 'Leading Effective Teams', courseNumber: null, purpose: '03', type: '02', subType: '20', delivery: '3', source: '3' },
  { vendor: 'Pluralsight', title: 'Cybersecurity Fundamentals', courseNumber: null, purpose: '01', type: '01', subType: '12', delivery: '3', source: '3' },
  { vendor: 'AWS Training and Certification', title: 'AWS Certified Cloud Practitioner', courseNumber: 'CLF-C02', purpose: '02', type: '01', subType: '08', delivery: '3', source: '3' },
  { vendor: 'AWS Training and Certification', title: 'Architecting on AWS', courseNumber: null, purpose: '02', type: '01', subType: '08', delivery: '1', source: '3' },
  { vendor: 'Skillsoft', title: 'Project Management Professional (PMP) Exam Prep', courseNumber: 'PMP-EP', purpose: '04', type: '01', subType: '09', delivery: '5', source: '3' },
  { vendor: 'Skillsoft', title: 'Conflict Resolution in the Workplace', courseNumber: null, purpose: '03', type: '03', subType: '34', delivery: '3', source: '3' },
  { vendor: 'LinkedIn Learning', title: 'Public Speaking and Communication Skills', courseNumber: null, purpose: '03', type: '03', subType: '34', delivery: '3', source: '3' },
  { vendor: 'LinkedIn Learning', title: 'Time Management Fundamentals', courseNumber: null, purpose: '03', type: '03', subType: '34', delivery: '3', source: '3' },
  { vendor: 'Global Knowledge Training', title: 'ITIL 4 Foundation Certification', courseNumber: 'ITIL4-F', purpose: '01', type: '01', subType: '08', delivery: '1', source: '3' },
  { vendor: 'Global Knowledge Training', title: 'CompTIA Security+ Certification Prep', courseNumber: 'SY0-701', purpose: '01', type: '01', subType: '12', delivery: '1', source: '3' },
  { vendor: 'New Horizons Computer Learning Centers', title: 'Microsoft Excel Advanced Formulas & Macros', courseNumber: null, purpose: '03', type: '01', subType: '13', delivery: '1', source: '3' },
  { vendor: 'New Horizons Computer Learning Centers', title: 'SQL Server Database Administration', courseNumber: null, purpose: '02', type: '01', subType: '08', delivery: '1', source: '3' },
  { vendor: 'Federal Executive Institute', title: 'Leadership for a Democratic Society', courseNumber: 'FEI-LDS', purpose: '04', type: '02', subType: '21', delivery: '4', source: '1' },
  { vendor: 'Federal Executive Institute', title: 'Federal Acquisition Certification – Contracting (FAC-C)', courseNumber: 'FAC-C', purpose: '01', type: '01', subType: '10', delivery: '4', source: '1' },
];

const EMPLOYEES = [
  { first: 'Marcus', last: 'Reed', title: 'IT Specialist', level: 'non-supervisory', edu: '13', pay: 'GS', series: '2210', grade: '11', step: '4', complete: true },
  { first: 'Priya', last: 'Nair', title: 'Contract Specialist', level: 'non-supervisory', edu: '17', pay: 'GS', series: '1102', grade: '12', step: '3', complete: true },
  { first: 'Diego', last: 'Alvarez', title: 'Program Analyst', level: 'non-supervisory', edu: '13', pay: 'GS', series: '0343', grade: '09', step: '5', complete: true },
  { first: 'Emily', last: 'Chen', title: 'HR Specialist', level: 'non-supervisory', edu: '13', pay: 'GS', series: '0201', grade: '11', step: '2', complete: true },
  { first: 'Jordan', last: 'Blake', title: 'Budget Analyst', level: 'non-supervisory', edu: '17', pay: 'GS', series: '0560', grade: '12', step: '6', complete: true },
  { first: 'Sara', last: 'Osei', title: 'Cybersecurity Analyst', level: 'non-supervisory', edu: '13', pay: 'GS', series: '2210', grade: '12', step: '1', complete: false },
  { first: 'Nate', last: 'Whitfield', title: 'Logistics Manager', level: 'supervisory', edu: '17', pay: 'GS', series: '2001', grade: '13', step: '4', complete: true },
  { first: 'Lena', last: 'Kowalski', title: 'Training Coordinator', level: 'non-supervisory', edu: '13', pay: 'GS', series: '1701', grade: '09', step: '7', complete: false },
  { first: 'Omar', last: 'Farouk', title: 'Engineer', level: 'non-supervisory', edu: '21', pay: 'GS', series: '0801', grade: '12', step: '5', complete: true },
  { first: 'Grace', last: 'Kim', title: 'Administrative Officer', level: 'non-supervisory', edu: '13', pay: 'GS', series: '0341', grade: '11', step: '8', complete: true },
];

const OBJECTIVES = [
  'Build hands-on skills directly applicable to current project responsibilities.',
  'Close a documented skills gap identified in the most recent performance review.',
  'Prepare for an upcoming certification required for the position.',
  'Support the office’s modernization initiative this fiscal year.',
  'Develop bench strength ahead of an anticipated staffing transition.',
  'Maintain continuing education credits required to keep current certification active.',
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database');

  const userRepo = AppDataSource.getRepository(User);
  const vendorRepo = AppDataSource.getRepository(Vendor);
  const courseRepo = AppDataSource.getRepository(Course);
  const requestRepo = AppDataSource.getRepository(TrainingRequest);

  const supervisor = await userRepo.findOne({ where: { email: 'bob.supervisor@tms.local' } });
  if (!supervisor) {
    console.error('❌ bob.supervisor has not logged in yet - log in as bob.supervisor at least once (so their account syncs into the database), then re-run the seed.');
    process.exit(1);
  }

  // ─── Vendors ────────────────────────────────────────────────────────────
  const vendorByName = new Map<string, Vendor>();
  for (const v of VENDORS) {
    let vendor = await vendorRepo.findOne({ where: { name: v.name } });
    if (!vendor) {
      vendor = await vendorRepo.save(vendorRepo.create(v));
    }
    vendorByName.set(v.name, vendor);
  }
  console.log(`✅ ${vendorByName.size} vendors ready`);

  // ─── Courses ────────────────────────────────────────────────────────────
  const courses: Course[] = [];
  for (const c of COURSES) {
    const vendor = vendorByName.get(c.vendor)!;
    let course = await courseRepo.findOne({ where: { vendorId: vendor.id, title: c.title } });
    if (!course) {
      course = await courseRepo.save(courseRepo.create({
        vendorId: vendor.id,
        title: c.title,
        courseNumber: c.courseNumber,
        trainingPurposeType: c.purpose,
        trainingTypeCode: c.type,
        trainingSubTypeCode: c.subType,
        trainingDeliveryTypeCode: c.delivery,
        trainingSourceType: c.source,
      }));
    }
    courses.push(course);
  }
  console.log(`✅ ${courses.length} courses ready`);

  // ─── Fabricated employees ───────────────────────────────────────────────
  const employees: User[] = [];
  for (const e of EMPLOYEES) {
    const email = `${e.first.toLowerCase()}.${e.last.toLowerCase()}@tms.local`;
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      user = userRepo.create({
        keycloakId: `seed-${randomUUID()}`,
        email,
        firstName: e.first,
        lastName: e.last,
        displayName: `${e.first} ${e.last}`,
        role: 'employee',
        supervisorId: supervisor.id,
        positionTitle: e.complete ? e.title : null,
        positionLevel: e.complete ? e.level : null,
        appointmentType: e.complete ? 'Career' : null,
        educationLevel: e.complete ? e.edu : null,
        payPlan: e.complete ? e.pay : null,
        series: e.complete ? e.series : null,
        grade: e.complete ? e.grade : null,
        step: e.complete ? e.step : null,
      });
      user = await userRepo.save(user);
    }
    employees.push(user);
  }
  console.log(`✅ ${employees.length} fabricated employees ready (report to bob.supervisor)`);

  // ─── Training requests across every workflow state ─────────────────────
  type Spec = { status: RequestStatus; stage: ApprovalStage; completed?: boolean; rejectedBy?: 'supervisor' | 'AO' };
  const specs: Spec[] = [
    ...Array(8).fill({ status: 'submitted', stage: 'supervisor' }),
    ...Array(6).fill({ status: 'AO_pending', stage: 'AO' }),
    ...Array(5).fill({ status: 'approved', stage: 'none', completed: false }),
    ...Array(5).fill({ status: 'approved', stage: 'none', completed: true }),
    ...Array(2).fill({ status: 'rejected', stage: 'none', rejectedBy: 'supervisor' }),
    ...Array(2).fill({ status: 'rejected', stage: 'none', rejectedBy: 'AO' }),
  ];

  let created = 0;
  const completableEmployees = employees.filter((e) => e.positionTitle);

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const employee = pick(completableEmployees, i);
    const course = pick(courses, i * 3 + Math.floor(i / 4)); // uneven spread so some courses end up more "popular"
    const vendor = vendorByName.get(COURSES.find((c) => c.title === course.title)!.vendor)!;

    const startOffset = 10 + (i % 10) * 7;
    const trainingStartDate = daysFromNow(startOffset);
    const trainingEndDate = daysFromNow(startOffset + 2 + (i % 3));

    const requestData: Partial<TrainingRequest> = {
      requestId: await generateRequestId(),
      employeeId: employee.id,
      vendorId: vendor.id,
      courseId: course.id,
      vendorName: vendor.name,
      vendorLocation: vendor.location,
      vendorTelephone: vendor.telephone,
      vendorEmail: vendor.email,
      vendorWebsite: vendor.website,
      vendorPOC: vendor.poc,
      courseTitle: course.title,
      courseNumber: course.courseNumber,
      trainingStartDate,
      trainingEndDate,
      trainingDutyHours: 16 + (i % 4) * 8,
      trainingNonDutyHours: 0,
      trainingPurposeType: course.trainingPurposeType!,
      trainingTypeCode: course.trainingTypeCode!,
      trainingSubTypeCode: course.trainingSubTypeCode!,
      trainingDeliveryTypeCode: course.trainingDeliveryTypeCode!,
      trainingSourceType: course.trainingSourceType!,
      trainingDesignationTypeCode: '05',
      individualOrGroupTraining: 'individual',
      skillLearningObjective: pick(OBJECTIVES, i),
      tuitionFeesAmount: 400 + (i % 6) * 250,
      booksMaterialsAmount: i % 3 === 0 ? 75 : 0,
      travelAmount: i % 4 === 0 ? 350 : 0,
      perDiemAmount: i % 4 === 0 ? 200 : 0,
      status: spec.status,
      approvalStage: spec.stage,
    };

    if (spec.status === 'AO_pending' || spec.status === 'approved') {
      requestData.supervisorComments = 'Approved - directly supports current duties.';
      requestData.supervisorSignedAt = new Date();
    }
    if (spec.status === 'approved') {
      requestData.AOComments = 'Approved for FY26 training plan.';
      requestData.AOSignedAt = new Date();
      requestData.approvedBy = 'AO';
      requestData.approvedAt = new Date();
    }
    if (spec.completed) {
      requestData.completed = true;
      requestData.completedAt = new Date();
      requestData.completionNotes = 'Employee provided certificate of completion.';
    }
    if (spec.status === 'rejected') {
      requestData.rejectedBy = spec.rejectedBy;
      requestData.rejectedAt = new Date();
      requestData.rejectionReason = spec.rejectedBy === 'supervisor'
        ? 'Not aligned with current position requirements this fiscal year.'
        : 'Budget constraints - resubmit next quarter.';
      if (spec.rejectedBy === 'supervisor') {
        requestData.supervisorComments = requestData.rejectionReason;
        requestData.supervisorSignedAt = new Date();
      } else {
        requestData.supervisorComments = 'Approved - directly supports current duties.';
        requestData.supervisorSignedAt = new Date();
        requestData.AOComments = requestData.rejectionReason;
        requestData.AOSignedAt = new Date();
      }
    }

    await requestRepo.save(requestRepo.create(requestData));
    created++;
  }

  console.log(`✅ ${created} SF-182 requests created across submitted / AO-pending / approved / completed / rejected`);
  console.log('\nDone. Log in to explore:');
  console.log('  admin / admin           -> employee (has its own real submitted request too)');
  console.log('  bob.supervisor / Passw0rd! -> sees the 8 requests awaiting supervisor sign-off');
  console.log('  carol.ao / Passw0rd!       -> sees the 6 requests awaiting AO sign-off + 5 approved awaiting completion certification');
  console.log('  dave.hr / Passw0rd!        -> sees everything on the HR dashboard');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

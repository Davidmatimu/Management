/**
 * Training Management System - Express Backend Server
 *
 * Auth: Keycloak (bearer-only resource server). The frontend SPA logs in
 * against Keycloak directly and sends the resulting access token as a
 * Bearer header; this server only ever validates that token, it never
 * handles credentials itself.
 *
 * Keycloak Configuration:
 *   Server: http://localhost:8080
 *   Realm: tms-realm
 *   Client: tms-backend (bearer-only)
 */

import 'dotenv/config';
import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import KeycloakConnect from 'keycloak-connect';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppDataSource } from './db/connection';
import { User } from './entity/User';
import { Vendor } from './entity/Vendor';
import { Course } from './entity/Course';
import { TrainingRequest, ApprovalStage } from './entity/TrainingRequest';
import { Notification } from './entity/Notification';
import { KeycloakRequest } from './types';
import { syncUser, requireRoles } from './middleware/syncUser';
import { generateRequestId, createNotification, asyncHandler, findOrCreateVendor, findOrCreateCourse } from './utils';
import { emailService } from './emailService';
import { draftSkillLearningObjective, suggestTrainingCodes, AnthropicNotConfiguredError } from './anthropicService';

// Built from env vars (not a checked-in JSON file) so the client secret can
// come from a proper secret store (K8s Secret / AWS Secrets Manager) in
// production instead of being baked into a Docker image.
const keycloakConfig = {
  'auth-server-url': process.env.KEYCLOAK_URL || 'http://localhost:8080',
  'ssl-required': process.env.NODE_ENV === 'production' ? 'external' : 'none',
  realm: process.env.KEYCLOAK_REALM || 'tms-realm',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'tms-backend',
  secret: process.env.KEYCLOAK_CLIENT_SECRET || 'tms-client-secret-change-in-production',
  'confidential-port': 0,
  'bearer-only': true,
};

const app = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Session + Keycloak Middleware (required by keycloak-connect) ─────────
const memoryStore = new session.MemoryStore();

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'tms-secret-key-change-in-production-use-random-string',
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
    name: 'TMS_SESSION',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  }),
);

const keycloak = new KeycloakConnect({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());

const protect = keycloak.protect.bind(keycloak);

// ─── Health Check (Public) ─────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Training Management System API',
    version: '1.0.0',
    keycloak: {
      url: keycloakConfig['auth-server-url'],
      realm: keycloakConfig.realm,
      client: keycloakConfig.resource,
    },
  });
});

// ─── Current User ───────────────────────────────────────────────────────────
app.get('/api/user/me', protect(), syncUser, (req: KeycloakRequest, res: Response): void => {
  res.json({ success: true, data: req.dbUser });
});

/**
 * Update SF-182 Section A trainee profile fields. Identity fields
 * (name/email/role) come from Keycloak and can't be edited here.
 */
const DATE_FIELDS = new Set(['dateOfBirth']);

app.patch('/api/user/me', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const fields: (keyof User)[] = [
    'dateOfBirth', 'homeAddress', 'homeTelephone', 'positionLevel',
    'organizationMailingAddress', 'officeTelephone', 'positionTitle',
    'needsAccommodation', 'accommodationDescription', 'appointmentType',
    'educationLevel', 'payPlan', 'series', 'grade', 'step',
  ];

  const userRepository = AppDataSource.getRepository(User);
  const user = req.dbUser!;
  for (const field of fields) {
    if (field in req.body) {
      // Postgres rejects "" for a date column - an empty date <input> sends "", which means "not set"
      const value = DATE_FIELDS.has(field) && req.body[field] === '' ? null : req.body[field];
      (user as any)[field] = value;
    }
  }
  await userRepository.save(user);

  res.json({ success: true, data: user });
}));

// ─── Course Catalog (Vendor + Course master data) ───────────────────────────
/**
 * Every course on file, most-requested first, joined with its vendor.
 * Vendor/Course rows are auto-created (and matched case-insensitively) as
 * employees submit SF-182 requests - see findOrCreateVendor/findOrCreateCourse
 * in utils.ts - so this stays accurate without any manual curation.
 * Public (no auth) - only aggregate course/vendor info, no employee PII.
 */
app.get('/api/course-catalog', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const courses = await AppDataSource.getRepository(Course)
    .createQueryBuilder('course')
    .leftJoinAndSelect('course.vendor', 'vendor')
    .loadRelationCountAndMap('course.requestCount', 'course.requests')
    .getMany();

  const data = courses
    .map((c: any) => ({
      courseId: c.id,
      vendorId: c.vendorId,
      courseTitle: c.title,
      courseNumber: c.courseNumber,
      trainingPurposeType: c.trainingPurposeType,
      trainingTypeCode: c.trainingTypeCode,
      trainingSubTypeCode: c.trainingSubTypeCode,
      trainingDeliveryTypeCode: c.trainingDeliveryTypeCode,
      trainingSourceType: c.trainingSourceType,
      lastRequestedAt: c.updatedAt,
      requestCount: c.requestCount,
      vendorName: c.vendor.name,
      vendorLocation: c.vendor.location,
      vendorTelephone: c.vendor.telephone,
      vendorEmail: c.vendor.email,
      vendorWebsite: c.vendor.website,
      vendorPOC: c.vendor.poc,
    }))
    .sort((a, b) => b.requestCount - a.requestCount);

  res.json({ success: true, data });
}));

// ─── Training Requests ───────────────────────────────────────────────────────
app.get('/api/requests', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const requestRepository = AppDataSource.getRepository(TrainingRequest);
  const user = req.dbUser!;

  let requests: TrainingRequest[];
  if (user.role === 'supervisor') {
    requests = await requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .where('employee.supervisorId = :supervisorId', { supervisorId: user.id })
      .orderBy('request.createdAt', 'DESC')
      .getMany();
  } else if (user.role === 'AO' || user.role === 'HR') {
    requests = await requestRepository.find({
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  } else {
    requests = await requestRepository.find({
      where: { employeeId: user.id },
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  res.json({ success: true, data: requests });
}));

// SF-182 Section A fields that must be on file before a request can be submitted
const REQUIRED_PROFILE_FIELDS: (keyof User)[] = [
  'positionTitle', 'positionLevel', 'appointmentType', 'educationLevel', 'payPlan', 'series', 'grade', 'step',
];

// SF-182 Section B fields required to submit a request
const REQUIRED_REQUEST_FIELDS = [
  'vendorName', 'courseTitle', 'trainingStartDate', 'trainingEndDate',
  'trainingPurposeType', 'trainingTypeCode', 'trainingSubTypeCode',
  'trainingDeliveryTypeCode', 'trainingSourceType', 'skillLearningObjective',
];

app.post('/api/requests', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const employee = req.dbUser!;

  const missingProfileFields = REQUIRED_PROFILE_FIELDS.filter((f) => !employee[f]);
  if (missingProfileFields.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Complete your trainee profile before submitting a training request (Profile page)',
      missingFields: missingProfileFields,
    });
    return;
  }

  const missingRequestFields = REQUIRED_REQUEST_FIELDS.filter((f) => !req.body[f]);
  if (missingRequestFields.length > 0) {
    res.status(400).json({ success: false, error: 'Missing required fields', missingFields: missingRequestFields });
    return;
  }

  const vendor = await findOrCreateVendor({
    vendorName: req.body.vendorName,
    vendorLocation: req.body.vendorLocation,
    vendorTelephone: req.body.vendorTelephone,
    vendorEmail: req.body.vendorEmail,
    vendorWebsite: req.body.vendorWebsite,
    vendorPOC: req.body.vendorPOC,
  });
  const course = await findOrCreateCourse({
    vendorId: vendor.id,
    courseTitle: req.body.courseTitle,
    courseNumber: req.body.courseNumber,
    trainingPurposeType: req.body.trainingPurposeType,
    trainingTypeCode: req.body.trainingTypeCode,
    trainingSubTypeCode: req.body.trainingSubTypeCode,
    trainingDeliveryTypeCode: req.body.trainingDeliveryTypeCode,
    trainingSourceType: req.body.trainingSourceType,
  });

  const requestRepository = AppDataSource.getRepository(TrainingRequest);
  const trainingRequest = requestRepository.create({
    requestId: await generateRequestId(),
    employeeId: employee.id,
    vendorId: vendor.id,
    courseId: course.id,
    vendorName: req.body.vendorName,
    vendorLocation: req.body.vendorLocation || null,
    vendorTelephone: req.body.vendorTelephone || null,
    vendorEmail: req.body.vendorEmail || null,
    vendorWebsite: req.body.vendorWebsite || null,
    vendorPOC: req.body.vendorPOC || null,
    courseTitle: req.body.courseTitle,
    courseNumber: req.body.courseNumber || null,
    trainingStartDate: req.body.trainingStartDate,
    trainingEndDate: req.body.trainingEndDate,
    trainingDutyHours: req.body.trainingDutyHours ?? null,
    trainingNonDutyHours: req.body.trainingNonDutyHours ?? null,
    trainingPurposeType: req.body.trainingPurposeType,
    trainingTypeCode: req.body.trainingTypeCode,
    trainingSubTypeCode: req.body.trainingSubTypeCode,
    trainingDeliveryTypeCode: req.body.trainingDeliveryTypeCode,
    trainingDesignationTypeCode: req.body.trainingDesignationTypeCode || null,
    trainingCredit: req.body.trainingCredit ?? null,
    trainingCreditTypeCode: req.body.trainingCredit ? req.body.trainingCreditTypeCode || null : null,
    trainingAccreditationIndicator: !!req.body.trainingAccreditationIndicator,
    csaRequiredIndicator: req.body.csaRequiredIndicator || 'N/A',
    csaExpirationDate: req.body.csaExpirationDate || null,
    trainingSourceType: req.body.trainingSourceType,
    individualOrGroupTraining: req.body.individualOrGroupTraining || 'individual',
    studentMembershipId: req.body.studentMembershipId || null,
    skillLearningObjective: req.body.skillLearningObjective,
    tuitionFeesAmount: req.body.tuitionFeesAmount || 0,
    tuitionFeesAppropriationFund: req.body.tuitionFeesAppropriationFund || null,
    booksMaterialsAmount: req.body.booksMaterialsAmount || 0,
    booksMaterialsAppropriationFund: req.body.booksMaterialsAppropriationFund || null,
    travelAmount: req.body.travelAmount || 0,
    travelAppropriationFund: req.body.travelAppropriationFund || null,
    perDiemAmount: req.body.perDiemAmount || 0,
    perDiemAppropriationFund: req.body.perDiemAppropriationFund || null,
    nonGovernmentContributionCost: req.body.nonGovernmentContributionCost || 0,
    documentPurchaseOrderNumber: req.body.documentPurchaseOrderNumber || null,
    stationSymbol: req.body.stationSymbol || null,
    billingInstructions: req.body.billingInstructions || null,
    status: 'submitted',
    approvalStage: 'supervisor',
  });
  await requestRepository.save(trainingRequest);

  if (employee.supervisorId) {
    const supervisor = await AppDataSource.getRepository(User).findOne({ where: { id: employee.supervisorId } });
    if (supervisor) {
      await createNotification(
        supervisor.id,
        'approval_required',
        'New training request awaiting your approval',
        `${employee.displayName} requested "${trainingRequest.courseTitle}"`,
        trainingRequest.id,
      );
      emailService
        .sendRequestSubmitted(supervisor.email, supervisor.displayName, trainingRequest.courseTitle, trainingRequest.skillLearningObjective)
        .catch((err) => console.warn('⚠️ Could not send request-submitted email:', err.message));
    }
  }

  res.status(201).json({ success: true, message: 'Training request submitted successfully (SF-182)', data: trainingRequest });
}));

// ─── AI Assist (Claude API - optional, requires ANTHROPIC_API_KEY) ─────────
// Both endpoints only ever return a *suggestion*; the employee reviews and
// edits it in the form before anything is submitted.

app.post('/api/requests/draft-objective', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  if (!req.body.courseTitle) {
    res.status(400).json({ success: false, error: 'courseTitle is required' });
    return;
  }
  try {
    const employee = req.dbUser!;
    const draft = await draftSkillLearningObjective({
      courseTitle: req.body.courseTitle,
      vendorName: req.body.vendorName || undefined,
      positionTitle: employee.positionTitle || undefined,
      notes: req.body.notes || undefined,
    });
    res.json({ success: true, data: { draft } });
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      res.status(503).json({ success: false, error: 'AI assist is not available on this server' });
      return;
    }
    throw err;
  }
}));

app.post('/api/requests/suggest-codes', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  if (!req.body.courseTitle) {
    res.status(400).json({ success: false, error: 'courseTitle is required' });
    return;
  }
  try {
    const suggestion = await suggestTrainingCodes({
      courseTitle: req.body.courseTitle,
      vendorName: req.body.vendorName || undefined,
      deliveryDescription: req.body.deliveryDescription || undefined,
    });
    res.json({ success: true, data: suggestion });
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      res.status(503).json({ success: false, error: 'AI assist is not available on this server' });
      return;
    }
    throw err;
  }
}));

app.get('/api/requests/:id', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const trainingRequest = await AppDataSource.getRepository(TrainingRequest).findOne({
    where: { id: req.params.id },
    relations: ['employee'],
  });

  if (!trainingRequest) {
    res.status(404).json({ success: false, error: 'Request not found' });
    return;
  }

  const user = req.dbUser!;
  const canView =
    user.role === 'HR' ||
    user.role === 'AO' ||
    trainingRequest.employeeId === user.id ||
    trainingRequest.employee.supervisorId === user.id;

  if (!canView) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  res.json({ success: true, data: trainingRequest });
}));

app.patch(
  '/api/requests/:id/status',
  protect(),
  syncUser,
  requireRoles('supervisor', 'AO'),
  asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
    const { action, comments, rejectionReason } = req.body as {
      action: 'approve' | 'reject';
      comments?: string;
      rejectionReason?: string;
    };

    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ success: false, error: "action must be 'approve' or 'reject'" });
      return;
    }

    const requestRepository = AppDataSource.getRepository(TrainingRequest);
    const trainingRequest = await requestRepository.findOne({
      where: { id: req.params.id },
      relations: ['employee'],
    });

    if (!trainingRequest) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    const actor = req.dbUser!;
    const stage: ApprovalStage = trainingRequest.approvalStage;

    if ((actor.role === 'supervisor' && stage !== 'supervisor') || (actor.role === 'AO' && stage !== 'AO')) {
      res.status(403).json({ success: false, error: `This request is not awaiting ${actor.role} review` });
      return;
    }

    if (action === 'reject') {
      trainingRequest.status = 'rejected';
      trainingRequest.approvalStage = 'none';
      trainingRequest.rejectedBy = actor.role;
      trainingRequest.rejectedAt = new Date();
      trainingRequest.rejectionReason = rejectionReason || comments || null;
      if (actor.role === 'supervisor') trainingRequest.supervisorSignedAt = new Date();
      else trainingRequest.AOSignedAt = new Date();
    } else if (actor.role === 'supervisor') {
      trainingRequest.status = 'AO_pending';
      trainingRequest.approvalStage = 'AO';
      trainingRequest.supervisorComments = comments || null;
      trainingRequest.supervisorSignedAt = new Date();
    } else {
      trainingRequest.status = 'approved';
      trainingRequest.approvalStage = 'none';
      trainingRequest.AOComments = comments || null;
      trainingRequest.AOSignedAt = new Date();
      trainingRequest.approvedBy = 'AO';
      trainingRequest.approvedAt = new Date();
    }

    await requestRepository.save(trainingRequest);

    const isFinal = action === 'reject' || trainingRequest.status === 'approved';
    if (isFinal) {
      await createNotification(
        trainingRequest.employeeId,
        action === 'reject' ? 'request_rejected' : 'request_approved',
        action === 'reject' ? 'Training request rejected' : 'Training request approved',
        `Your request for "${trainingRequest.courseTitle}" was ${action === 'reject' ? 'rejected' : 'approved'}.`,
        trainingRequest.id,
      );
      const sendFn = action === 'reject' ? emailService.sendRequestRejected : emailService.sendRequestApproved;
      sendFn
        .call(emailService, trainingRequest.employee.email, trainingRequest.employee.displayName, trainingRequest.courseTitle, actor.displayName, comments)
        .catch((err: Error) => console.warn('⚠️ Could not send status email:', err.message));
    }

    res.json({ success: true, message: `Request ${action}d`, data: trainingRequest });
  }),
);

/**
 * SF-182 Section F - Certification of Training Completion and Evaluation.
 * Available once a request has cleared final approval.
 */
app.patch(
  '/api/requests/:id/complete',
  protect(),
  syncUser,
  requireRoles('AO', 'HR'),
  asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
    const requestRepository = AppDataSource.getRepository(TrainingRequest);
    const trainingRequest = await requestRepository.findOne({ where: { id: req.params.id }, relations: ['employee'] });

    if (!trainingRequest) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }
    if (trainingRequest.status !== 'approved') {
      res.status(400).json({ success: false, error: 'Only approved requests can be certified as complete' });
      return;
    }

    trainingRequest.completed = true;
    trainingRequest.completedByUserId = req.dbUser!.id;
    trainingRequest.completedAt = new Date();
    trainingRequest.completionNotes = req.body.completionNotes || null;
    await requestRepository.save(trainingRequest);

    await createNotification(
      trainingRequest.employeeId,
      'system',
      'Training completion certified',
      `Your completion of "${trainingRequest.courseTitle}" has been certified.`,
      trainingRequest.id,
    );

    res.json({ success: true, message: 'Training completion certified', data: trainingRequest });
  }),
);

// ─── Notifications ───────────────────────────────────────────────────────────
app.get('/api/notifications', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const notifications = await AppDataSource.getRepository(Notification).find({
    where: { userId: req.dbUser!.id },
    order: { createdAt: 'DESC' },
    take: 50,
  });
  res.json({ success: true, data: notifications });
}));

app.patch('/api/notifications/:id/read', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const notificationRepository = AppDataSource.getRepository(Notification);
  const notification = await notificationRepository.findOne({ where: { id: req.params.id, userId: req.dbUser!.id } });
  if (!notification) {
    res.status(404).json({ success: false, error: 'Notification not found' });
    return;
  }
  notification.read = true;
  await notificationRepository.save(notification);
  res.json({ success: true, data: notification });
}));

// ─── Users (HR administration) ──────────────────────────────────────────────
app.get('/api/users', protect(), syncUser, requireRoles('HR'), asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const users = await AppDataSource.getRepository(User).find({ order: { displayName: 'ASC' } });
  res.json({ success: true, data: users });
}));

app.patch(
  '/api/users/:id/supervisor',
  protect(),
  syncUser,
  requireRoles('HR'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { supervisorId } = req.body as { supervisorId: string | null };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    user.supervisorId = supervisorId || null;
    await userRepository.save(user);
    res.json({ success: true, data: user });
  }),
);

// ─── Role Dashboards ─────────────────────────────────────────────────────────
app.get('/api/supervisor/pending-requests', protect(), syncUser, requireRoles('supervisor'), asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const requests = await AppDataSource.getRepository(TrainingRequest)
    .createQueryBuilder('request')
    .leftJoinAndSelect('request.employee', 'employee')
    .where('employee.supervisorId = :supervisorId', { supervisorId: req.dbUser!.id })
    .andWhere('request.approvalStage = :stage', { stage: 'supervisor' })
    .orderBy('request.createdAt', 'ASC')
    .getMany();
  res.json({ success: true, data: requests });
}));

app.get('/api/ao/pending-requests', protect(), syncUser, requireRoles('AO'), asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const requests = await AppDataSource.getRepository(TrainingRequest).find({
    where: { approvalStage: 'AO' },
    relations: ['employee'],
    order: { createdAt: 'ASC' },
  });
  res.json({ success: true, data: requests });
}));

app.get('/api/hr/dashboard', protect(), syncUser, requireRoles('HR'), asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const requestRepository = AppDataSource.getRepository(TrainingRequest);

  const [totalVendors, totalCourses, requests] = await Promise.all([
    AppDataSource.getRepository(Vendor).count(),
    AppDataSource.getRepository(Course).count(),
    requestRepository.find({ relations: ['employee'], order: { createdAt: 'DESC' } }),
  ]);

  const pendingApprovals = requests.filter((r) => r.approvalStage !== 'none').length;

  res.json({
    success: true,
    data: {
      totalVendors,
      totalCourses,
      totalRequests: requests.length,
      pendingApprovals,
      requests,
    },
  });
}));

app.get('/api/employee/dashboard', protect(), syncUser, asyncHandler(async (req: KeycloakRequest, res: Response): Promise<void> => {
  const myRequests = await AppDataSource.getRepository(TrainingRequest).find({
    where: { employeeId: req.dbUser!.id },
    order: { createdAt: 'DESC' },
  });

  res.json({
    success: true,
    data: {
      profile: req.dbUser,
      myRequests,
    },
  });
}));

// ─── API Not Found Fallback ───────────────────────────────────────────────
app.use('/api', (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connection established');
    app.listen(PORT, (): void => {
      console.log('✅ Training Management System API running');
      console.log(`   📡 URL: http://localhost:${PORT}`);
      console.log('🔐 Keycloak Configuration:');
      console.log(`   Server: ${keycloakConfig['auth-server-url']}`);
      console.log(`   Realm:  ${keycloakConfig.realm}`);
      console.log(`   Client: ${keycloakConfig.resource}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database connection:', err);
    process.exit(1);
  });

export default app;

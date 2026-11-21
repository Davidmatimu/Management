// ─── Database Models / Interfaces ─────────────────────────────────────────────

export type UserRole = 'employee' | 'supervisor' | 'AO' | 'HR';
export type RequestStatus = 'draft' | 'submitted' | 'supervisor_pending' | 'AO_pending' | 'approved_AO' | 'approved_HR' | 'approved' | 'rejected' | 'revoked';
export type ApprovalStage = 'none' | 'supervisor' | 'AO' | 'HR';

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  supervisorId?: string;
  department?: string;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Training Program ─────────────────────────────────────────────────────────
export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  registeredParticipants: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Training Request ─────────────────────────────────────────────────────────
export interface TrainingRequest {
  id: string;
  requestId: string; // e.g., TR-2026-0001
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  supervisorId: string;
  supervisorName: string;
  programId: string;
  programTitle: string;
  requestedDate: Date;
  justification: string;
  status: RequestStatus;
  approvalStage: ApprovalStage;
  supervisorComments?: string;
  AOComments?: string;
  HRComments?: string;
  approvedBy?: UserRole;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  userType: UserRole;
  type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'request_revoked' | 'program_created' | 'approval_required' | 'system';
  title: string;
  message: string;
  relatedRequestId?: string;
  relatedProgramId?: string;
  read: boolean;
  createdAt: Date;
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── DTO Types ────────────────────────────────────────────────────────────────
export interface CreateTrainingRequestDto {
  programId: string;
  justification: string;
}

export interface UpdateRequestStatusDto {
  status: RequestStatus;
  comments?: string;
  rejectionReason?: string;
}

export interface CreateTrainingProgramDto {
  title: string;
  description: string;
  category: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface TokenValidation {
  valid: boolean;
  user?: User;
  error?: string;
}
/**
 * Reference code tables from OPM Standard Form 182 (Revised March 2020).
 * Mirrors frontend/src/sf182Options.js (only the subset the AI-assist
 * endpoints need) - kept in sync manually since the two apps don't share a
 * package. Used to (a) ground the model's classification prompt in the real
 * option set and (b) validate/clamp whatever it returns before it reaches
 * the client, so a hallucinated code never lands in a training request.
 */

export const TRAINING_PURPOSE_TYPES = [
  { code: '01', label: 'Program/Mission' },
  { code: '02', label: 'New Work Assignment' },
  { code: '03', label: 'Improve/Maintain Present Performance' },
  { code: '04', label: 'Future Staffing Needs' },
  { code: '05', label: 'Develop Unavailable Skills' },
  { code: '06', label: 'Retention' },
];

export const TRAINING_TYPE_CODES = [
  { code: '01', label: 'Training Program Area' },
  { code: '02', label: 'Developmental Training Area' },
  { code: '03', label: 'Basic Training Area' },
];

export const TRAINING_SUB_TYPE_CODES: Record<string, { code: string; label: string }[]> = {
  '01': [
    { code: '01', label: 'Legal' },
    { code: '02', label: 'Medical and Health' },
    { code: '03', label: 'Scientific' },
    { code: '04', label: 'Engineering or Architecture' },
    { code: '05', label: 'Human Resources' },
    { code: '06', label: 'Budget/Finance Business Administration' },
    { code: '07', label: 'Planning and Analysis' },
    { code: '08', label: 'Information Technology' },
    { code: '09', label: 'Project Management' },
    { code: '10', label: 'Acquisition' },
    { code: '11', label: 'Logistic Specialty' },
    { code: '12', label: 'Security' },
    { code: '13', label: 'Administration' },
    { code: '14', label: 'Trade and Craft' },
    { code: '15', label: 'Foreign Affairs' },
  ],
  '02': [
    { code: '20', label: 'Supervisory Program/First-Line Supervisors' },
    { code: '21', label: 'Management Program' },
    { code: '22', label: 'Leadership/Manager/Pre-supervisory Development' },
    { code: '23', label: 'SES Candidate Development' },
    { code: '24', label: 'Executive Development' },
    { code: '25', label: 'Mentoring Program' },
    { code: '26', label: 'Coaching Program' },
  ],
  '03': [
    { code: '30', label: 'Employee Orientation' },
    { code: '31', label: 'Adult Basic Education' },
    { code: '32', label: 'Federally Mandated Training' },
    { code: '33', label: 'Work-life' },
    { code: '34', label: 'Professional Skills' },
    { code: '35', label: 'Agency Required Training' },
  ],
};

export const TRAINING_DELIVERY_TYPE_CODES = [
  { code: '1', label: 'Traditional Classroom (no technology)' },
  { code: '2', label: 'On the Job' },
  { code: '3', label: 'Technology Based' },
  { code: '4', label: 'Conference/Workshop' },
  { code: '5', label: 'Blended' },
  { code: '6', label: 'Correspondence' },
];

export const TRAINING_SOURCE_TYPE_CODES = [
  { code: '1', label: 'Government Internal' },
  { code: '2', label: 'Government External' },
  { code: '3', label: 'Non-government' },
  { code: '4', label: 'Government: State/Local' },
  { code: '5', label: 'Foreign Governments and Organizations' },
];

const codesOf = (list: { code: string; label: string }[]) => list.map((o) => o.code);

/** Returns the code if it's valid for the given table, otherwise null. */
export function validateCode(list: { code: string; label: string }[], code: unknown): string | null {
  return typeof code === 'string' && codesOf(list).includes(code) ? code : null;
}

/** Sub-type codes are keyed by the chosen parent type code (01/02/03). */
export function validateSubTypeCode(typeCode: string, code: unknown): string | null {
  const list = TRAINING_SUB_TYPE_CODES[typeCode];
  return list ? validateCode(list, code) : null;
}

/**
 * Reference code tables from OPM Standard Form 182 (Revised March 2020),
 * "Authorization, Agreement, and Certification of Training".
 */

export const POSITION_LEVELS = [
  { code: 'non-supervisory', label: 'Non-supervisory' },
  { code: 'supervisory', label: 'Supervisory' },
  { code: 'manager', label: 'Manager' },
  { code: 'executive', label: 'Executive' },
];

export const EDUCATION_LEVELS = [
  { code: '1', label: 'No formal education / some elementary school - did not complete' },
  { code: '2', label: 'Elementary school completed - no high school' },
  { code: '3', label: 'Some high school - did not graduate' },
  { code: '4', label: 'High school graduate or certificate equivalency' },
  { code: '5', label: 'Terminal occupational program - did not complete' },
  { code: '6', label: 'Terminal occupational program - certificate/diploma' },
  { code: '7', label: 'Some college - less than one year' },
  { code: '8', label: 'One year of college' },
  { code: '9', label: 'Two years of college' },
  { code: '10', label: 'Associate Degree' },
  { code: '11', label: 'Three years of college' },
  { code: '12', label: 'Four years of college - no degree' },
  { code: '13', label: "Bachelor's Degree" },
  { code: '14', label: "Post-Bachelor's" },
  { code: '15', label: 'First professional' },
  { code: '16', label: 'Post-first professional' },
  { code: '17', label: "Master's degree" },
  { code: '18', label: "Post-Master's" },
  { code: '19', label: 'Sixth-year degree' },
  { code: '20', label: 'Post-sixth year' },
  { code: '21', label: 'Doctorate degree' },
  { code: '22', label: 'Post-Doctorate' },
];

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

export const TRAINING_SUB_TYPE_CODES = {
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

export const TRAINING_DESIGNATION_TYPE_CODES = [
  { code: '01', label: 'Undergraduate Credit' },
  { code: '02', label: 'Graduate Credit' },
  { code: '03', label: 'Continuing Education Credit' },
  { code: '04', label: 'Post Graduate Credit' },
  { code: '05', label: 'N/A' },
];

export const TRAINING_CREDIT_TYPE_CODES = [
  { code: '1', label: 'Semester Hours' },
  { code: '2', label: 'Quarter Hours' },
  { code: '3', label: 'Continuing Education Unit' },
  { code: '4', label: 'Professional Development Unit' },
  { code: '5', label: 'Continuing Professional Education' },
  { code: '6', label: 'Continuous Learning Points' },
  { code: '7', label: 'Other' },
];

export const TRAINING_SOURCE_TYPE_CODES = [
  { code: '1', label: 'Government Internal' },
  { code: '2', label: 'Government External' },
  { code: '3', label: 'Non-government' },
  { code: '4', label: 'Government: State/Local' },
  { code: '5', label: 'Foreign Governments and Organizations' },
];

export const CSA_REQUIRED_OPTIONS = [
  { code: 'Y', label: 'Yes' },
  { code: 'N', label: 'No' },
  { code: 'N/A', label: 'N/A' },
];

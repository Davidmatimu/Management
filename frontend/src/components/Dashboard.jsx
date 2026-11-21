import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import apiClient from '../api/client';
import {
  TRAINING_PURPOSE_TYPES, TRAINING_TYPE_CODES, TRAINING_SUB_TYPE_CODES,
  TRAINING_DELIVERY_TYPE_CODES, TRAINING_DESIGNATION_TYPE_CODES,
  TRAINING_CREDIT_TYPE_CODES, TRAINING_SOURCE_TYPE_CODES, CSA_REQUIRED_OPTIONS,
} from '../sf182Options';

const emptyRequestForm = {
  vendorName: '', vendorLocation: '', vendorTelephone: '', vendorEmail: '', vendorWebsite: '', vendorPOC: '',
  courseTitle: '', courseNumber: '', trainingStartDate: '', trainingEndDate: '',
  trainingDutyHours: '', trainingNonDutyHours: '',
  trainingPurposeType: '', trainingTypeCode: '', trainingSubTypeCode: '', trainingDeliveryTypeCode: '',
  trainingDesignationTypeCode: '', trainingCredit: '', trainingCreditTypeCode: '',
  trainingAccreditationIndicator: false, csaRequiredIndicator: 'N/A', csaExpirationDate: '',
  trainingSourceType: '', individualOrGroupTraining: 'individual', studentMembershipId: '', skillLearningObjective: '',
  tuitionFeesAmount: '', tuitionFeesAppropriationFund: '', booksMaterialsAmount: '', booksMaterialsAppropriationFund: '',
  travelAmount: '', travelAppropriationFund: '', perDiemAmount: '', perDiemAppropriationFund: '',
  nonGovernmentContributionCost: '', documentPurchaseOrderNumber: '', stationSymbol: '', billingInstructions: '',
};

const STATUS_BADGES = {
  submitted: { label: 'Submitted', tone: 'badge-pending' },
  AO_pending: { label: 'Awaiting AO', tone: 'badge-pending' },
  approved: { label: 'Approved', tone: 'badge-approved' },
  rejected: { label: 'Rejected', tone: 'badge-rejected' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_BADGES[status] || { label: status, tone: 'badge-neutral' };
  return <span className={`badge ${cfg.tone}`}>{cfg.label}</span>;
};

const EmptyState = ({ icon, children }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <p>{children}</p>
  </div>
);

const RequestDetail = ({ r }) => (
  <div className="request-detail">
    <p><strong>Vendor:</strong> {r.vendorName} {r.vendorLocation && `(${r.vendorLocation})`}</p>
    <p><strong>Course:</strong> {r.courseTitle} {r.courseNumber && `[${r.courseNumber}]`}</p>
    <p><strong>Dates:</strong> {r.trainingStartDate} → {r.trainingEndDate}</p>
    <p><strong>Skill/Learning Objective:</strong> {r.skillLearningObjective}</p>
    <p><strong>Costs:</strong> Tuition ${r.tuitionFeesAmount} · Books ${r.booksMaterialsAmount} · Travel ${r.travelAmount} · Per Diem ${r.perDiemAmount}</p>
  </div>
);

const EmployeeDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(emptyRequestForm);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState({ objective: false, codes: false });
  const [codesRationale, setCodesRationale] = useState('');

  const load = useCallback(() => {
    apiClient.get('/api/employee/dashboard').then((res) => setData(res.data.data));
    apiClient.get('/api/course-catalog').then((res) => setCatalog(res.data.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const applyCatalogEntry = useCallback((entry) => {
    setForm((f) => ({
      ...f,
      vendorName: entry.vendorName || '',
      vendorLocation: entry.vendorLocation || '',
      vendorTelephone: entry.vendorTelephone || '',
      vendorEmail: entry.vendorEmail || '',
      vendorWebsite: entry.vendorWebsite || '',
      vendorPOC: entry.vendorPOC || '',
      courseTitle: entry.courseTitle || '',
      courseNumber: entry.courseNumber || '',
      trainingPurposeType: entry.trainingPurposeType || '',
      trainingTypeCode: entry.trainingTypeCode || '',
      trainingSubTypeCode: entry.trainingSubTypeCode || '',
      trainingDeliveryTypeCode: entry.trainingDeliveryTypeCode || '',
      trainingSourceType: entry.trainingSourceType || '',
    }));
    setShowForm(true);
  }, []);

  // Arriving from the Course Search page with a course picked - prefill and open the form
  useEffect(() => {
    if (location.state?.prefillCourse) {
      applyCatalogEntry(location.state.prefillCourse);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate, applyCatalogEntry]);

  const aiAssistError = (err) =>
    setMessage(err.response?.status === 503 ? 'AI assist is not configured on this server' : 'AI assist request failed - try again');

  const draftObjective = async () => {
    if (!form.courseTitle) { setMessage('Enter a course title first, then draft the objective'); return; }
    setAiLoading((s) => ({ ...s, objective: true }));
    try {
      const res = await apiClient.post('/api/requests/draft-objective', {
        courseTitle: form.courseTitle,
        vendorName: form.vendorName,
        // Reuse whatever's already typed as the employee's own notes/reasoning,
        // so this works both as "draft from scratch" and "polish my notes".
        notes: form.skillLearningObjective,
      });
      update('skillLearningObjective', res.data.data.draft);
    } catch (err) {
      aiAssistError(err);
    } finally {
      setAiLoading((s) => ({ ...s, objective: false }));
    }
  };

  const suggestCodes = async () => {
    if (!form.courseTitle) { setMessage('Enter a course title first, then suggest codes'); return; }
    setAiLoading((s) => ({ ...s, codes: true }));
    setCodesRationale('');
    try {
      const res = await apiClient.post('/api/requests/suggest-codes', {
        courseTitle: form.courseTitle,
        vendorName: form.vendorName,
      });
      const s = res.data.data;
      setForm((f) => ({
        ...f,
        trainingPurposeType: s.trainingPurposeType || f.trainingPurposeType,
        trainingTypeCode: s.trainingTypeCode || f.trainingTypeCode,
        trainingSubTypeCode: s.trainingSubTypeCode || f.trainingSubTypeCode,
        trainingDeliveryTypeCode: s.trainingDeliveryTypeCode || f.trainingDeliveryTypeCode,
        trainingSourceType: s.trainingSourceType || f.trainingSourceType,
      }));
      setCodesRationale(s.rationale || 'Suggested - please review each code before submitting.');
    } catch (err) {
      aiAssistError(err);
    } finally {
      setAiLoading((s) => ({ ...s, codes: false }));
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/requests', form);
      setMessage('SF-182 training request submitted!');
      setForm(emptyRequestForm);
      setShowForm(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      setMessage(data?.missingFields ? `Missing: ${data.missingFields.join(', ')}` : (data?.error || 'Failed to submit request'));
    }
  };

  if (!data) return <p>Loading dashboard...</p>;

  const subTypes = TRAINING_SUB_TYPE_CODES[form.trainingTypeCode] || [];

  return (
    <div>
      <div className="section-heading">
        <h3>SF-182 Training Requests</h3>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Request (SF-182)</button>}
      </div>
      {message && <p>{message}</p>}

      {catalog.length > 0 && (
        <>
          <div className="section-heading"><h3>Popular Courses</h3></div>
          <p className="section-subtext">Courses previously requested by employees — pick one to prefill the form below.</p>
          <table>
            <thead><tr><th>Course</th><th>Vendor</th><th>Times Requested</th><th></th></tr></thead>
            <tbody>
              {catalog.slice(0, 5).map((c) => (
                <tr key={`${c.vendorName}|${c.courseTitle}|${c.courseNumber || ''}`}>
                  <td>{c.courseTitle} {c.courseNumber && `[${c.courseNumber}]`}</td>
                  <td>{c.vendorName}</td>
                  <td><span className="badge badge-neutral">{c.requestCount}×</span></td>
                  <td><button className="btn-secondary" onClick={() => applyCatalogEntry(c)}>Use this course</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showForm && (
        <form onSubmit={submitRequest} className="sf182-form">
          <h4>Section B - Training Course Data</h4>
          <label>Vendor Name*<input value={form.vendorName} onChange={(e) => update('vendorName', e.target.value)} required /></label>
          <label>Vendor Location<input value={form.vendorLocation} onChange={(e) => update('vendorLocation', e.target.value)} /></label>
          <label>Vendor Telephone<input value={form.vendorTelephone} onChange={(e) => update('vendorTelephone', e.target.value)} /></label>
          <label>Vendor Email<input value={form.vendorEmail} onChange={(e) => update('vendorEmail', e.target.value)} /></label>
          <label>Vendor Website<input value={form.vendorWebsite} onChange={(e) => update('vendorWebsite', e.target.value)} /></label>
          <label>Vendor POC<input value={form.vendorPOC} onChange={(e) => update('vendorPOC', e.target.value)} /></label>

          <label>Course Title*<input value={form.courseTitle} onChange={(e) => update('courseTitle', e.target.value)} required /></label>
          <label>Course Number<input value={form.courseNumber} onChange={(e) => update('courseNumber', e.target.value)} /></label>
          <label>Training Start Date*<input type="date" value={form.trainingStartDate} onChange={(e) => update('trainingStartDate', e.target.value)} required /></label>
          <label>Training End Date*<input type="date" value={form.trainingEndDate} onChange={(e) => update('trainingEndDate', e.target.value)} required /></label>
          <label>Training Duty Hours<input type="number" value={form.trainingDutyHours} onChange={(e) => update('trainingDutyHours', e.target.value)} /></label>
          <label>Training Non-Duty Hours<input type="number" value={form.trainingNonDutyHours} onChange={(e) => update('trainingNonDutyHours', e.target.value)} /></label>

          <div className="ai-assist-row">
            <button type="button" className="btn-secondary" onClick={suggestCodes} disabled={aiLoading.codes}>
              {aiLoading.codes ? 'Suggesting codes…' : '✨ Suggest codes with AI'}
            </button>
            {codesRationale && <p className="ai-assist-note">{codesRationale}</p>}
          </div>
          <label>Training Purpose Type*
            <select value={form.trainingPurposeType} onChange={(e) => update('trainingPurposeType', e.target.value)} required>
              <option value="">Select...</option>
              {TRAINING_PURPOSE_TYPES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Training Type Code*
            <select value={form.trainingTypeCode} onChange={(e) => { update('trainingTypeCode', e.target.value); update('trainingSubTypeCode', ''); }} required>
              <option value="">Select...</option>
              {TRAINING_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Training Sub Type Code*
            <select value={form.trainingSubTypeCode} onChange={(e) => update('trainingSubTypeCode', e.target.value)} required disabled={!form.trainingTypeCode}>
              <option value="">Select...</option>
              {subTypes.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Training Delivery Type Code*
            <select value={form.trainingDeliveryTypeCode} onChange={(e) => update('trainingDeliveryTypeCode', e.target.value)} required>
              <option value="">Select...</option>
              {TRAINING_DELIVERY_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Training Designation Type Code
            <select value={form.trainingDesignationTypeCode} onChange={(e) => update('trainingDesignationTypeCode', e.target.value)}>
              <option value="">Select...</option>
              {TRAINING_DESIGNATION_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Training Credit<input type="number" value={form.trainingCredit} onChange={(e) => update('trainingCredit', e.target.value)} /></label>
          {form.trainingCredit ? (
            <label>Training Credit Type Code
              <select value={form.trainingCreditTypeCode} onChange={(e) => update('trainingCreditTypeCode', e.target.value)}>
                <option value="">Select...</option>
                {TRAINING_CREDIT_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
              </select>
            </label>
          ) : null}
          <label className="checkbox-label">
            <input type="checkbox" checked={form.trainingAccreditationIndicator} onChange={(e) => update('trainingAccreditationIndicator', e.target.checked)} />
            Training Accreditation Indicator
          </label>
          <label>Continued Service Agreement Required
            <select value={form.csaRequiredIndicator} onChange={(e) => update('csaRequiredIndicator', e.target.value)}>
              {CSA_REQUIRED_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </label>
          {form.csaRequiredIndicator === 'Y' && (
            <label>CSA Expiration Date<input type="date" value={form.csaExpirationDate} onChange={(e) => update('csaExpirationDate', e.target.value)} /></label>
          )}
          <label>Training Source Type*
            <select value={form.trainingSourceType} onChange={(e) => update('trainingSourceType', e.target.value)} required>
              <option value="">Select...</option>
              {TRAINING_SOURCE_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
            </select>
          </label>
          <label>Individual or Group Training
            <select value={form.individualOrGroupTraining} onChange={(e) => update('individualOrGroupTraining', e.target.value)}>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </label>
          <label>Student/Membership ID<input value={form.studentMembershipId} onChange={(e) => update('studentMembershipId', e.target.value)} /></label>
          <label className="full-width">Skill/Learning Objective*
            <textarea value={form.skillLearningObjective} onChange={(e) => update('skillLearningObjective', e.target.value)} required />
          </label>
          <div className="ai-assist-row">
            <button type="button" className="btn-secondary" onClick={draftObjective} disabled={aiLoading.objective}>
              {aiLoading.objective
                ? 'Drafting…'
                : (form.skillLearningObjective ? '✨ Improve with AI' : '✨ Draft with AI')}
            </button>
            <p className="ai-assist-note">Uses the course title, vendor, and anything you've already typed above. Always review before submitting.</p>
          </div>

          <h4>Section C - Costs and Billing</h4>
          <label>Tuition & Fees ($)<input type="number" step="0.01" value={form.tuitionFeesAmount} onChange={(e) => update('tuitionFeesAmount', e.target.value)} /></label>
          <label>Tuition Fund Cite<input value={form.tuitionFeesAppropriationFund} onChange={(e) => update('tuitionFeesAppropriationFund', e.target.value)} /></label>
          <label>Books & Materials ($)<input type="number" step="0.01" value={form.booksMaterialsAmount} onChange={(e) => update('booksMaterialsAmount', e.target.value)} /></label>
          <label>Books Fund Cite<input value={form.booksMaterialsAppropriationFund} onChange={(e) => update('booksMaterialsAppropriationFund', e.target.value)} /></label>
          <label>Travel ($)<input type="number" step="0.01" value={form.travelAmount} onChange={(e) => update('travelAmount', e.target.value)} /></label>
          <label>Travel Fund Cite<input value={form.travelAppropriationFund} onChange={(e) => update('travelAppropriationFund', e.target.value)} /></label>
          <label>Per Diem ($)<input type="number" step="0.01" value={form.perDiemAmount} onChange={(e) => update('perDiemAmount', e.target.value)} /></label>
          <label>Per Diem Fund Cite<input value={form.perDiemAppropriationFund} onChange={(e) => update('perDiemAppropriationFund', e.target.value)} /></label>
          <label>Non-Government Contribution ($)<input type="number" step="0.01" value={form.nonGovernmentContributionCost} onChange={(e) => update('nonGovernmentContributionCost', e.target.value)} /></label>
          <label>Document/PO/Requisition #<input value={form.documentPurchaseOrderNumber} onChange={(e) => update('documentPurchaseOrderNumber', e.target.value)} /></label>
          <label>8-Digit Station Symbol<input placeholder="12-34-5678" value={form.stationSymbol} onChange={(e) => update('stationSymbol', e.target.value)} /></label>
          <label className="full-width">Billing Instructions<textarea value={form.billingInstructions} onChange={(e) => update('billingInstructions', e.target.value)} /></label>

          <div className="full-width">
            <button type="submit" className="btn-primary">Submit SF-182</button>{' '}
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="section-heading"><h3>My Requests</h3></div>
      {data.myRequests.length === 0 ? (
        <EmptyState icon="📄">You haven't submitted any training requests yet.</EmptyState>
      ) : (
        <table>
          <thead><tr><th>Request ID</th><th>Course</th><th>Status</th><th>Stage</th><th>Submitted</th></tr></thead>
          <tbody>
            {data.myRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.requestId}</td>
                <td>{r.courseTitle}</td>
                <td><StatusBadge status={r.status} /> {r.completed && <span className="badge badge-info">Completed</span>}</td>
                <td>{r.approvalStage === 'none' ? '—' : r.approvalStage}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ApprovalQueue = ({ endpoint, role }) => {
  const [requests, setRequests] = useState([]);
  const [comments, setComments] = useState({});

  const load = useCallback(() => {
    apiClient.get(endpoint).then((res) => setRequests(res.data.data));
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    try {
      await apiClient.patch(`/api/requests/${id}/status`, { action, comments: comments[id] || '' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div>
      <div className="section-heading"><h3>Pending {role} Approvals (SF-182)</h3></div>
      {requests.length === 0 ? (
        <EmptyState icon="✅">No pending requests — you're all caught up.</EmptyState>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="request-card">
            <div className="request-card-header">
              <p><strong>{r.employee?.displayName}</strong> ({r.requestId}) requested training</p>
              <StatusBadge status={r.status} />
            </div>
            <RequestDetail r={r} />
            <textarea
              placeholder="Comments (optional)"
              value={comments[r.id] || ''}
              onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })}
            />
            <div className="request-card-actions">
              <button className="btn-primary" onClick={() => act(r.id, 'approve')}>Approve (Sign as {role})</button>
              <button className="btn-danger" onClick={() => act(r.id, 'reject')}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const AoDashboard = () => {
  const [approved, setApproved] = useState([]);
  const [notes, setNotes] = useState({});

  const loadApproved = useCallback(() => {
    apiClient.get('/api/requests').then((res) => {
      setApproved(res.data.data.filter((r) => r.status === 'approved' && !r.completed));
    });
  }, []);

  useEffect(() => { loadApproved(); }, [loadApproved]);

  const certify = async (id) => {
    try {
      await apiClient.patch(`/api/requests/${id}/complete`, { completionNotes: notes[id] || '' });
      loadApproved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to certify completion');
    }
  };

  return (
    <div>
      <ApprovalQueue endpoint="/api/ao/pending-requests" role="AO" />
      <div className="section-heading"><h3>Section F - Certify Training Completion</h3></div>
      {approved.length === 0 ? (
        <EmptyState icon="🎓">No approved requests awaiting completion certification.</EmptyState>
      ) : (
        approved.map((r) => (
          <div key={r.id} className="request-card">
            <p><strong>{r.employee?.displayName}</strong> ({r.requestId}) - {r.courseTitle}</p>
            <textarea placeholder="Completion notes (optional)" value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <button className="btn-primary" onClick={() => certify(r.id)}>Certify Completion</button>
          </div>
        ))
      )}
    </div>
  );
};

const HrDashboard = () => {
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    apiClient.get('/api/hr/dashboard').then((res) => setData(res.data.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <p>Loading dashboard...</p>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-tile-value">{data.totalRequests}</div>
          <div className="stat-tile-label">SF-182 requests</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{data.pendingApprovals}</div>
          <div className="stat-tile-label">Pending approvals</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{data.totalCourses}</div>
          <div className="stat-tile-label">Courses on file</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{data.totalVendors}</div>
          <div className="stat-tile-label">Vendors on file</div>
        </div>
      </div>

      <div className="section-heading"><h3>All SF-182 Requests</h3></div>
      {data.requests.length === 0 ? (
        <EmptyState icon="📄">No training requests have been submitted yet.</EmptyState>
      ) : (
        <table>
          <thead><tr><th>Request ID</th><th>Employee</th><th>Course</th><th>Status</th><th>Completed</th></tr></thead>
          <tbody>
            {data.requests.map((r) => (
              <tr key={r.id}>
                <td>{r.requestId}</td>
                <td>{r.employee?.displayName}</td>
                <td>{r.courseTitle}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.completed ? <span className="badge badge-info">Yes</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { keycloak, initialized } = useKeycloak();
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      apiClient.get('/api/user/me').then((res) => setMe(res.data.data));
    }
  }, [initialized, keycloak.authenticated]);

  if (!initialized) return <p>Loading...</p>;
  if (!keycloak.authenticated) return <p>Please log in to view your dashboard.</p>;
  if (!me) return <p>Loading dashboard...</p>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Welcome, {me.displayName}</h2>
        <span className="badge badge-neutral">{me.role}</span>
      </div>
      {me.role === 'employee' && <EmployeeDashboard />}
      {me.role === 'supervisor' && <ApprovalQueue endpoint="/api/supervisor/pending-requests" role="Supervisor" />}
      {me.role === 'AO' && <AoDashboard />}
      {me.role === 'HR' && <HrDashboard />}
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import apiClient from '../../api/client';
import { POSITION_LEVELS, EDUCATION_LEVELS } from '../../sf182Options';

const emptyForm = {
  dateOfBirth: '', homeAddress: '', homeTelephone: '', positionLevel: '',
  organizationMailingAddress: '', officeTelephone: '', positionTitle: '',
  needsAccommodation: false, accommodationDescription: '', appointmentType: '',
  educationLevel: '', payPlan: '', series: '', grade: '', step: '',
};

const Profile = () => {
  const { keycloak, initialized } = useKeycloak();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    apiClient
      .get('/api/user/me')
      .then((res) => {
        const data = res.data.data;
        setProfile(data);
        setForm({
          dateOfBirth: data.dateOfBirth || '',
          homeAddress: data.homeAddress || '',
          homeTelephone: data.homeTelephone || '',
          positionLevel: data.positionLevel || '',
          organizationMailingAddress: data.organizationMailingAddress || '',
          officeTelephone: data.officeTelephone || '',
          positionTitle: data.positionTitle || '',
          needsAccommodation: !!data.needsAccommodation,
          accommodationDescription: data.accommodationDescription || '',
          appointmentType: data.appointmentType || '',
          educationLevel: data.educationLevel || '',
          payPlan: data.payPlan || '',
          series: data.series || '',
          grade: data.grade || '',
          step: data.step || '',
        });
      })
      .catch((err) => {
        console.error('Error fetching profile:', err);
        setError('Could not load your profile.');
      });
  }, [initialized, keycloak.authenticated]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    try {
      const res = await apiClient.patch('/api/user/me', form);
      setProfile(res.data.data);
      setIsEditing(false);
      setMessage('Trainee profile updated.');
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage('Error saving profile. Please try again.');
    }
  };

  if (!initialized) return <p>Loading...</p>;
  if (!keycloak.authenticated) return <p>Please log in to view your profile.</p>;

  const REQUIRED_FIELDS = ['positionTitle', 'positionLevel', 'appointmentType', 'educationLevel', 'payPlan', 'series', 'grade', 'step'];
  const isComplete = profile && REQUIRED_FIELDS.every((f) => profile[f]);

  return (
    <div className="profile-container">
      <div className="dashboard-header">
        <h2>Trainee Profile</h2>
        {profile && (
          <span className={`badge ${isComplete ? 'badge-approved' : 'badge-pending'}`}>
            {isComplete ? 'Profile complete' : 'Profile incomplete'}
          </span>
        )}
      </div>
      <p className="section-subtext">SF-182 Section A — kept on file so it's reused on every training request you submit.</p>
      {error && <p className="profile-error">{error}</p>}
      {message && <p>{message}</p>}
      {!profile && !error && <p>Loading profile...</p>}

      {profile && (
        <div className="profile-card">
          <div className="profile-summary">
            <div className="profile-detail-item"><span className="profile-detail-label">Name</span><span>{profile.displayName}</span></div>
            <div className="profile-detail-item"><span className="profile-detail-label">Work Email</span><span>{profile.email}</span></div>
            <div className="profile-detail-item"><span className="profile-detail-label">Role</span><span>{profile.role}</span></div>
          </div>

          <form className="sf182-form" onSubmit={(e) => e.preventDefault()}>
            <label>Date of Birth
              <input type="date" disabled={!isEditing} value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
            </label>
            <label>Home Address (Optional)
              <input disabled={!isEditing} value={form.homeAddress} onChange={(e) => update('homeAddress', e.target.value)} />
            </label>
            <label>Home Telephone (Optional)
              <input disabled={!isEditing} value={form.homeTelephone} onChange={(e) => update('homeTelephone', e.target.value)} />
            </label>
            <label>Position Level
              <select disabled={!isEditing} value={form.positionLevel} onChange={(e) => update('positionLevel', e.target.value)}>
                <option value="">Select...</option>
                {POSITION_LEVELS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </label>
            <label>Organization Mailing Address
              <input disabled={!isEditing} value={form.organizationMailingAddress} onChange={(e) => update('organizationMailingAddress', e.target.value)} />
            </label>
            <label>Office Telephone
              <input disabled={!isEditing} value={form.officeTelephone} onChange={(e) => update('officeTelephone', e.target.value)} />
            </label>
            <label>Position Title
              <input disabled={!isEditing} value={form.positionTitle} onChange={(e) => update('positionTitle', e.target.value)} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" disabled={!isEditing} checked={form.needsAccommodation} onChange={(e) => update('needsAccommodation', e.target.checked)} />
              Requires special accommodation
            </label>
            {form.needsAccommodation && (
              <label>Accommodation Details
                <textarea disabled={!isEditing} value={form.accommodationDescription} onChange={(e) => update('accommodationDescription', e.target.value)} />
              </label>
            )}
            <label>Type of Appointment
              <input disabled={!isEditing} value={form.appointmentType} onChange={(e) => update('appointmentType', e.target.value)} placeholder="e.g. Career, Term, Temporary" />
            </label>
            <label>Education Level
              <select disabled={!isEditing} value={form.educationLevel} onChange={(e) => update('educationLevel', e.target.value)}>
                <option value="">Select...</option>
                {EDUCATION_LEVELS.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
              </select>
            </label>
            <label>Pay Plan
              <input disabled={!isEditing} value={form.payPlan} onChange={(e) => update('payPlan', e.target.value)} placeholder="e.g. GS" />
            </label>
            <label>Series
              <input disabled={!isEditing} value={form.series} onChange={(e) => update('series', e.target.value)} placeholder="e.g. 2210" />
            </label>
            <label>Grade
              <input disabled={!isEditing} value={form.grade} onChange={(e) => update('grade', e.target.value)} />
            </label>
            <label>Step
              <input disabled={!isEditing} value={form.step} onChange={(e) => update('step', e.target.value)} />
            </label>
          </form>

          {!isEditing ? (
            <button className="btn-primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
          ) : (
            <>
              <button className="btn-primary" onClick={handleSave}>Save</button>{' '}
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;

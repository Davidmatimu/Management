import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import apiClient from '../api/client';
import { TRAINING_TYPE_CODES, TRAINING_DELIVERY_TYPE_CODES } from '../sf182Options';

const labelFor = (list, code) => list.find((o) => o.code === code)?.label || code;

const CourseSearch = () => {
  const { keycloak, initialized } = useKeycloak();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [me, setMe] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    apiClient.get('/api/course-catalog').then((res) => setCatalog(res.data.data));
  }, []);

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      apiClient.get('/api/user/me').then((res) => setMe(res.data.data));
    }
  }, [initialized, keycloak.authenticated]);

  const results = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    let list = catalog.filter((c) => {
      const matchesSearch = !q || c.courseTitle.toLowerCase().includes(q) || c.vendorName.toLowerCase().includes(q);
      const matchesCategory = !category || c.trainingTypeCode === category;
      return matchesSearch && matchesCategory;
    });
    if (sort === 'recent') {
      list = [...list].sort((a, b) => new Date(b.lastRequestedAt) - new Date(a.lastRequestedAt));
    }
    return list;
  }, [catalog, search, category, sort]);

  const requestCourse = (course) => {
    if (!keycloak.authenticated) {
      keycloak.login({ redirectUri: window.location.origin + '/dashboard' });
      return;
    }
    navigate('/dashboard', { state: { prefillCourse: course } });
  };

  return (
    <div className="page">
      <div className="dashboard-header">
        <h2>Browse Courses</h2>
      </div>
      <p className="section-subtext">Courses employees have previously requested via SF-182, ranked by popularity.</p>

      <div className="course-search-toolbar">
        <input
          type="text"
          placeholder="Search by course title or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {TRAINING_TYPE_CODES.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recently Requested</option>
        </select>
      </div>

      {catalog === null && <p>Loading courses...</p>}

      {catalog !== null && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>
            {catalog.length === 0
              ? 'No courses have been requested yet. Once employees start submitting SF-182s, they’ll show up here.'
              : 'No courses match your search.'}
          </p>
        </div>
      )}

      <div className="course-grid">
        {results.map((c) => (
          <div key={`${c.vendorName}|${c.courseTitle}|${c.courseNumber || ''}`} className="course-card">
            <div className="course-card-title">{c.courseTitle}{c.courseNumber && ` [${c.courseNumber}]`}</div>
            <div className="course-card-vendor">{c.vendorName}{c.vendorLocation && ` · ${c.vendorLocation}`}</div>
            <div className="course-card-tags">
              <span className="badge badge-neutral">{labelFor(TRAINING_TYPE_CODES, c.trainingTypeCode)}</span>
              <span className="badge badge-info">{labelFor(TRAINING_DELIVERY_TYPE_CODES, c.trainingDeliveryTypeCode)}</span>
            </div>
            <div className="course-card-footer">
              <span className="badge badge-approved">{c.requestCount}× requested</span>
              {(!me || me.role === 'employee') && (
                <button className="btn-primary" onClick={() => requestCourse(c)}>
                  {keycloak.authenticated ? 'Request this training' : 'Log in to request'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSearch;

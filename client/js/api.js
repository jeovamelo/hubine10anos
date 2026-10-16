// Hubine 10 Anos - API Client
const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('hubine_admin_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('hubine_admin_token', token);
    } else {
      localStorage.removeItem('hubine_admin_token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('hubine_admin_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('hubine_admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hubine_admin_user');
    }
  },

  getBasePath() {
    return window.location.pathname.startsWith('/dezanos') ? '/dezanos' : '';
  },

  async request(endpoint, options = {}) {
    const basePath = this.getBasePath();
    const finalEndpoint = (endpoint.startsWith('/') && !endpoint.startsWith(basePath + '/'))
      ? basePath + endpoint
      : endpoint;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body !== 'string' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const res = await fetch(finalEndpoint, config);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = new Error(data.error || data.message || 'Erro na requisição');
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Public Endpoints
  getEventInfo() {
    return this.request('/api/public/event-info');
  },

  getSchedule() {
    return this.request('/api/public/schedule');
  },

  getPublicSpeakers() {
    return this.request('/api/public/speakers');
  },

  checkEmail(email) {
    return this.request('/api/public/check-email', {
      method: 'POST',
      body: { email }
    });
  },

  resendAccess(email) {
    return this.request('/api/public/resend-access', {
      method: 'POST',
      body: { email }
    });
  },

  registerGuest(payload) {
    return this.request('/api/public/register', {
      method: 'POST',
      body: payload
    });
  },

  getRegistration(token) {
    return this.request('/api/public/registration/' + token);
  },

  updateRegistration(token, payload) {
    return this.request('/api/public/registration/' + token, {
      method: 'PUT',
      body: payload
    });
  },

  cancelRegistration(token) {
    return this.request('/api/public/registration/' + token + '/cancel', {
      method: 'POST'
    });
  },

  // Speaker Invite Endpoints
  getSpeakerInvite(token) {
    return this.request('/api/speakers/invite/' + token);
  },

  submitSpeakerInvite(token, payload) {
    return this.request('/api/speakers/invite/' + token + '/submit', {
      method: 'POST',
      body: payload
    });
  },

  // Checkin Endpoints
  scanCheckin(code) {
    return this.request('/api/checkin/scan', {
      method: 'POST',
      body: { code }
    });
  },

  undoCheckin(registrationNumber) {
    return this.request('/api/checkin/undo', {
      method: 'POST',
      body: { registrationNumber }
    });
  },

  // Admin Endpoints
  adminLogin(email, password) {
    return this.request('/api/admin/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  getAdminOverview() {
    return this.request('/api/admin/overview');
  },

  getAdminRegistrations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('/api/admin/registrations' + (query ? '?' + query : ''));
  },

  updateAdminRegistration(id, payload) {
    return this.request('/api/admin/registrations/' + id, {
      method: 'PUT',
      body: payload
    });
  },

  resendAdminTicket(id) {
    return this.request('/api/admin/registrations/' + id + '/resend', {
      method: 'POST'
    });
  },

  promoteAdminWaitlist(id) {
    return this.request('/api/admin/registrations/' + id + '/promote', {
      method: 'POST'
    });
  },

  cancelAdminRegistration(id) {
    return this.request('/api/admin/registrations/' + id + '/cancel', {
      method: 'POST'
    });
  },

  createInvitedGuest(payload) {
    return this.request('/api/admin/guests', {
      method: 'POST',
      body: payload
    });
  },

  sendGuestInvite(id, channel) {
    return this.request('/api/admin/guests/' + id + '/send-invite', {
      method: 'POST',
      body: { channel }
    });
  },

  getAdminSpeakers() {
    return this.request('/api/admin/speakers');
  },

  createSpeakerInvite(payload) {
    return this.request('/api/admin/speakers/invite', {
      method: 'POST',
      body: payload
    });
  },

  reviewSpeaker(id, payload) {
    return this.request('/api/admin/speakers/' + id + '/review', {
      method: 'PUT',
      body: payload
    });
  },

  deleteSpeaker(id) {
    return this.request('/api/admin/speakers/' + id, {
      method: 'DELETE'
    });
  },

  getAdminSchedule() {
    return this.request('/api/admin/schedule');
  },

  updateAdminSchedule(items) {
    return this.request('/api/admin/schedule', {
      method: 'PUT',
      body: items
    });
  },

  getAdminSettings() {
    return this.request('/api/admin/settings');
  },

  updateAdminSettings(settings) {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: settings
    });
  },

  getAdminUsers() {
    return this.request('/api/admin/users');
  },

  createAdminUser(payload) {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: payload
    });
  },

  deleteAdminUser(id) {
    return this.request('/api/admin/users/' + id, {
      method: 'DELETE'
    });
  },

  getAdminAuditLogs() {
    return this.request('/api/admin/audit-logs');
  },

  getAdminOutbox() {
    return this.request('/api/admin/outbox');
  },

  clearAdminOutbox() {
    return this.request('/api/admin/outbox', {
      method: 'DELETE'
    });
  }
};

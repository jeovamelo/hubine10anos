function sanitizePhotoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const isHttp = /^https?:\/\/[^\s"'<>]+$/i.test(trimmed);
  const isSafeData = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
  if ((isHttp || isSafeData) && !/(javascript|vbscript|<script|alert|onload|onerror)/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

// Restricted Administration Dashboard Logic
let currentAdminTab = 'overview';
let cachedRegistrations = [];

function notify(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}

function initAdminPage() {
  const token = API.getToken();
  const user = API.getUser();

  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');

  if (!token || !user) {
    if (loginView) loginView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
    setupAdminLogin();
  } else {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    setupAdminDashboard(user);
  }
}

function setupAdminLogin() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  // Check if server allows demo login
  API.getEventInfo().then(info => {
    const demoBox = document.getElementById('admin-demo-mode-box');
    if (demoBox) {
      if (info && info.allowDemoLogin === false) {
        demoBox.style.display = 'none';
      } else {
        demoBox.style.display = 'block';
      }
    }
  }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-login-email').value.trim();
    const pass = document.getElementById('admin-login-password').value;
    const alertBox = document.getElementById('admin-login-alert');

    if (alertBox) alertBox.style.display = 'none';

    try {
      const res = await API.adminLogin(email, pass);
      API.setToken(res.token);
      API.setUser(res.user);
      initAdminPage();
    } catch (err) {
      if (alertBox) {
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = err.message || 'Credenciais inválidas.';
        alertBox.style.display = 'flex';
      }
    }
  });

  // Demo mode profile dropdown selector
  const profileSelect = document.getElementById('admin-demo-profile-select');
  if (profileSelect) {
    profileSelect.addEventListener('change', () => {
      const role = profileSelect.value;
      const emailInput = document.getElementById('admin-login-email');
      const passInput = document.getElementById('admin-login-password');
      if (!emailInput || !passInput) return;

      if (role === 'admin') {
        emailInput.value = 'admin@hubine10anos.bnb.gov.br';
        passInput.value = 'HubineAdmin2026!';
      } else if (role === 'org') {
        emailInput.value = 'organizacao@hubine10anos.bnb.gov.br';
        passInput.value = 'HubineOrg2026!';
      } else if (role === 'cred') {
        emailInput.value = 'credenciamento@hubine10anos.bnb.gov.br';
        passInput.value = 'Checkin2026!';
      } else {
        emailInput.value = '';
        passInput.value = '';
      }
    });
  }

  // Quick preset login helper buttons for demonstration
  const presetBtns = document.querySelectorAll('[data-login-preset]');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-login-preset');
      const emailInput = document.getElementById('admin-login-email');
      const passInput = document.getElementById('admin-login-password');
      if (profileSelect) profileSelect.value = role;

      if (role === 'admin') {
        emailInput.value = 'admin@hubine10anos.bnb.gov.br';
        passInput.value = 'HubineAdmin2026!';
      } else if (role === 'org') {
        emailInput.value = 'organizacao@hubine10anos.bnb.gov.br';
        passInput.value = 'HubineOrg2026!';
      } else if (role === 'cred') {
        emailInput.value = 'credenciamento@hubine10anos.bnb.gov.br';
        passInput.value = 'Checkin2026!';
      }
    });
  });
}

let currentGuestCommId = null;

function setupAdminDashboard(user) {
  // Update user badge in header
  const nameEl = document.getElementById('admin-user-display-name');
  const roleEl = document.getElementById('admin-user-display-role');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) {
    roleEl.textContent = user.role.toUpperCase();
    roleEl.className = 'badge ' + (user.role === 'administrador' ? 'badge-primary' : 'badge-info');
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.setToken(null);
      API.setUser(null);
      initAdminPage();
    });
  }

  // Hide admin-only tabs if user is not administrador
  const adminOnlyTabs = document.querySelectorAll('.admin-only-tab');
  adminOnlyTabs.forEach(tab => {
    if (user.role !== 'administrador') {
      tab.style.display = 'none';
    } else {
      tab.style.display = 'inline-block';
    }
  });

  // Hide org-only actions if user is credenciamento
  const orgOnlyActions = document.querySelectorAll('.org-only-action');
  orgOnlyActions.forEach(el => {
    if (user.role === 'credenciamento') {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });

  // Tab switching across sidebar and tab buttons
  const tabBtns = document.querySelectorAll('.admin-nav-item, .admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      if (targetTab === 'checkin') {
        window.location.hash = '#credenciamento';
        return;
      }
      switchAdminTab(targetTab);

      tabBtns.forEach(b => {
        if (b.getAttribute('data-tab') === targetTab) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('admin-mobile-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.onclick = () => sidebar.classList.toggle('open');
  }

  // Setup Add Guest Modal (Buttons from header and dedicated tab)
  const openGuestBtns = document.querySelectorAll('#btn-open-guest-modal, #btn-open-guest-modal-tab');
  const guestModal = document.getElementById('invited-guest-modal');
  const guestForm = document.getElementById('invited-guest-form');
  const guestAlert = document.getElementById('invited-guest-alert');

  openGuestBtns.forEach(btn => {
    btn.onclick = () => {
      if (guestForm) guestForm.reset();
      if (guestAlert) guestAlert.style.display = 'none';
      if (guestModal) guestModal.classList.add('active');
    };
  });

  if (guestForm) {
    guestForm.onsubmit = async (e) => {
      e.preventDefault();
      if (guestAlert) guestAlert.style.display = 'none';

      const payload = {
        name: document.getElementById('guest-name').value.trim(),
        institution: document.getElementById('guest-institution').value.trim(),
        profile: document.getElementById('guest-profile').value,
        email: document.getElementById('guest-email').value.trim(),
        whatsapp: document.getElementById('guest-whatsapp').value.trim(),
        badgeName: document.getElementById('guest-badge-name').value.trim(),
        role: document.getElementById('guest-role').value.trim(),
        cityUf: document.getElementById('guest-city').value.trim(),
        accessibility: document.getElementById('guest-accessibility').value.trim(),
        internalNotes: document.getElementById('guest-notes').value.trim()
      };

      try {
        const res = await API.createInvitedGuest(payload);
        if (guestModal) guestModal.classList.remove('active');
        notify('Convidado institucional cadastrado com status PENDENTE!', 'success');
        if (currentAdminTab === 'guests') {
          await loadAdminGuests();
        } else {
          await loadAdminRegistrations();
        }
        await loadAdminOverview();

        if (res.guest && res.guest.id) {
          window.openGuestCommModal(res.guest.id);
        }
      } catch (err) {
        if (guestAlert) {
          guestAlert.className = 'alert alert-danger';
          guestAlert.textContent = err.message || 'Erro ao cadastrar participante convidado.';
          guestAlert.style.display = 'block';
        }
      }
    };
  }

  // Setup Guest Communication Handlers
  setupGuestCommHandlers();

  // Setup Global Modal Close Handlers (X button, data-close-modal, backdrop click, Escape key)
  setupGlobalModalCloseHandlers();

  // Load initial tab
  switchAdminTab('overview');
}

function setupGuestCommHandlers() {
  const emailBtn = document.getElementById('btn-trigger-guest-email');
  const waBtn = document.getElementById('btn-trigger-guest-whatsapp');
  const copyBtn = document.getElementById('btn-copy-preview-text');
  const commAlert = document.getElementById('guest-comm-alert');

  if (emailBtn) {
    emailBtn.onclick = async () => {
      if (!currentGuestCommId) return;
      try {
        emailBtn.disabled = true;
        emailBtn.textContent = 'Enviando...';
        const res = await API.sendGuestInvite(currentGuestCommId, 'EMAIL');
        if (commAlert) {
          commAlert.className = 'alert alert-success';
          commAlert.textContent = res.message || 'Convite enviado por e-mail com sucesso!';
          commAlert.style.display = 'block';
        }
        await loadAdminRegistrations();
        const badgeEl = document.getElementById('comm-guest-status-badge');
        if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-success">Enviado por E-mail</span>`;
      } catch (err) {
        if (commAlert) {
          commAlert.className = 'alert alert-danger';
          commAlert.textContent = err.message || 'Erro ao enviar convite por e-mail.';
          commAlert.style.display = 'block';
        }
      } finally {
        emailBtn.disabled = false;
        emailBtn.textContent = 'Enviar por E-mail';
      }
    };
  }

  if (waBtn) {
    waBtn.onclick = async () => {
      if (!currentGuestCommId) return;
      try {
        waBtn.disabled = true;
        const res = await API.sendGuestInvite(currentGuestCommId, 'WHATSAPP');
        if (res.whatsappMessage) {
          navigator.clipboard.writeText(res.whatsappMessage).catch(() => {});
        }
        if (commAlert) {
          commAlert.className = 'alert alert-success';
          commAlert.textContent = 'Mensagem copiada para a área de transferência e aberta no WhatsApp!';
          commAlert.style.display = 'block';
        }
        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
        await loadAdminRegistrations();
        const badgeEl = document.getElementById('comm-guest-status-badge');
        if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-info">Enviado por WhatsApp</span>`;
      } catch (err) {
        if (commAlert) {
          commAlert.className = 'alert alert-danger';
          commAlert.textContent = err.message || 'Erro ao preparar mensagem de WhatsApp.';
          commAlert.style.display = 'block';
        }
      } finally {
        waBtn.disabled = false;
      }
    };
  }

  if (copyBtn) {
    copyBtn.onclick = () => {
      const textarea = document.getElementById('guest-whatsapp-preview');
      if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          copyBtn.textContent = '✓ Copiado!';
          setTimeout(() => { copyBtn.textContent = '📋 Copiar Texto'; }, 2000);
        }).catch(() => {
          notify('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.', 'warning');
        });
      }
    };
  }
}

function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  const sections = document.querySelectorAll('.admin-tab-content');
  sections.forEach(sec => sec.style.display = 'none');

  const activeSec = document.getElementById('tab-content-' + tabName);
  if (activeSec) activeSec.style.display = 'block';

  if (tabName === 'overview') loadAdminOverview();
  if (tabName === 'registrations') loadAdminRegistrations();
  if (tabName === 'guests') loadAdminGuests();
  if (tabName === 'speakers') loadAdminSpeakers();
  if (tabName === 'schedule') loadAdminSchedule();
  if (tabName === 'settings') loadAdminSettings();
  if (tabName === 'users') loadAdminUsers();
  if (tabName === 'outbox') loadAdminOutbox();
  if (tabName === 'audit') loadAdminAuditLogs();
}

// 1. Overview Tab
async function loadAdminOverview() {
  try {
    const data = await API.getAdminOverview();

    // 6 Sympla-style KPI Summary Cards
    const confirmedEl = document.getElementById('kpi-confirmed-val');
    if (confirmedEl) confirmedEl.textContent = data.confirmed ?? 0;

    const presentEl = document.getElementById('kpi-present-val');
    if (presentEl) presentEl.textContent = data.present ?? 0;

    const waitlistEl = document.getElementById('kpi-waitlist-val');
    if (waitlistEl) waitlistEl.textContent = data.waitlist ?? 0;

    const cancelledEl = document.getElementById('kpi-cancelled-val');
    if (cancelledEl) cancelledEl.textContent = data.cancelled ?? 0;

    const guestsEl = document.getElementById('kpi-guests-val');
    if (guestsEl) guestsEl.textContent = data.invitedGuests ?? 0;

    const remainingEl = document.getElementById('kpi-remaining-val');
    if (remainingEl) {
      remainingEl.textContent = data.remainingSlots !== undefined ? data.remainingSlots : Math.max(0, (data.capacity || 250) - (data.confirmed || 0));
    }

    const occBar = document.getElementById('admin-occupancy-progress-bar');
    if (occBar) {
      occBar.style.width = Math.min(100, (data.occupancyPercent || 0)) + '%';
    }

    // Legacy fields if present
    const totalEl = document.getElementById('kpi-total-val');
    if (totalEl) totalEl.textContent = data.total;
    const occEl = document.getElementById('kpi-occupancy-val');
    if (occEl) occEl.textContent = (data.occupancyPercent || 0) + '%';
    const attEl = document.getElementById('kpi-attendance-val');
    if (attEl) attEl.textContent = (data.attendancePercent || 0) + '%';

    // Breakdown profiles
    const profileContainer = document.getElementById('admin-profile-breakdown');
    if (profileContainer && data.profileBreakdown) {
      profileContainer.innerHTML = Object.entries(data.profileBreakdown).map(([k, v]) => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle);">
          <span>${escapeHtml(k)}</span>
          <strong>${v} participantes</strong>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar overview:', err);
  }
}

// Global Modal Close Handlers (Guarantees every popup/modal closes on X, close button, backdrop click, or ESC)
let globalModalHandlersSet = false;
function setupGlobalModalCloseHandlers() {
  if (globalModalHandlersSet) return;
  globalModalHandlersSet = true;

  document.addEventListener('click', (e) => {
    // 1. Close button clicked (.modal-close or [data-close-modal])
    const closeBtn = e.target.closest('.modal-close, [data-close-modal]');
    if (closeBtn) {
      const modal = closeBtn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('active');
      }
      return;
    }

    // 2. Clicked on the backdrop itself (.modal-overlay)
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  // 3. Escape key closes any active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      activeModals.forEach(m => m.classList.remove('active'));
    }
  });
}

// Interactive Status Change
window.changeRegistrationStatus = async function(id, newStatus) {
  try {
    const res = await API.updateRegistrationStatus(id, newStatus);
    notify(`Status atualizado para "${newStatus}" com sucesso!`, 'success');

    // Update in cached lists
    const target = (cachedRegistrations || []).find(x => x.id === id) || (cachedGuests || []).find(x => x.id === id);
    if (target) {
      target.status = newStatus;
    }

    // Refresh overview KPIs
    await loadAdminOverview();

    // Re-apply filters on current tab
    if (currentAdminTab === 'guests' && typeof applyGuestFiltersFunc === 'function') {
      applyGuestFiltersFunc();
    } else if (typeof applyRegistrationFiltersFunc === 'function') {
      applyRegistrationFiltersFunc();
    }
  } catch (err) {
    notify('Erro ao alterar status: ' + err.message, 'error');
    if (currentAdminTab === 'guests') loadAdminGuests();
    else loadAdminRegistrations();
  }
};

// Reusable Table Row Renderer
function renderRegistrationRow(r, isGuestTab) {
  const isCancelled = r.status === 'CANCELADO' || r.status === 'DESISTIU' || r.status === 'NAO_VEM';
  const rowStyle = isCancelled ? 'background-color: #fff1f2; opacity: 0.9;' : '';
  const nameDisplay = isCancelled
    ? `<span style="text-decoration: line-through; color: #991b1b;">${escapeHtml(r.name)}</span>`
    : `<strong>${escapeHtml(r.name)}</strong>`;

  const statusVal = (r.status || 'CONFIRMADO').toUpperCase();

  return `
    <tr style="${rowStyle}">
      <!-- Coluna 1: Nº Inscrição (Obrigatória na primeira coluna) -->
      <td style="font-weight: 700; color: var(--primary); white-space: nowrap;">
        ${escapeHtml(r.registrationNumber)}
      </td>

      <!-- Coluna 2: Participante -->
      <td>
        <div style="font-size: 0.95rem; color: var(--text-main);">${nameDisplay}</div>
        ${r.badgeName && r.badgeName !== r.name ? `<div class="text-muted" style="font-size: 0.78rem;">Crachá: ${escapeHtml(r.badgeName)}</div>` : ''}
        ${r.accessibility ? `<span title="Recurso de acessibilidade solicitado" style="margin-left:4px;">♿</span>` : ''}
      </td>

      <!-- Coluna 3: Contato (Substitui onde antes aparecia Origem) -->
      <td>
        <div style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(r.email)}</div>
        <div class="text-muted" style="font-size: 0.8rem; margin-top: 2px;">📱 ${escapeHtml(r.whatsapp || r.phone || 'Não informado')}</div>
      </td>

      <!-- Coluna 4: Instituição / Perfil -->
      <td>
        <div style="font-weight: 600; font-size: 0.88rem;">${escapeHtml(r.institution || '—')}</div>
        <span class="badge badge-secondary" style="font-size: 0.75rem; margin-top: 2px;">${escapeHtml(r.profile || 'Participante')}</span>
        ${r.role ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">${escapeHtml(r.role)}</div>` : ''}
      </td>

      <!-- Coluna 5: Status (Botão / Menu Interativo de Alteração) -->
      <td>
        <select class="status-badge-select status-val-${statusVal.toLowerCase()}" onchange="changeRegistrationStatus('${r.id}', this.value)" title="Alterar status do participante">
          <option value="CONFIRMADO" ${statusVal === 'CONFIRMADO' ? 'selected' : ''}>● Confirmado</option>
          <option value="PENDENTE" ${statusVal === 'PENDENTE' ? 'selected' : ''}>⏳ Pendente</option>
          <option value="DESISTIU" ${statusVal === 'DESISTIU' ? 'selected' : ''}>↩ Desistiu</option>
          <option value="NAO_VEM" ${statusVal === 'NAO_VEM' ? 'selected' : ''}>🚫 Não vem</option>
          <option value="CANCELADO" ${statusVal === 'CANCELADO' ? 'selected' : ''}>✕ Cancelado</option>
          ${statusVal === 'PRESENTE' ? `<option value="PRESENTE" selected>✓ Presente</option>` : ''}
          ${statusVal === 'LISTA_ESPERA' ? `<option value="LISTA_ESPERA" selected>⏳ Lista de Espera</option>` : ''}
        </select>
      </td>

      <!-- Coluna 6: Ações (Botões alinhados lado a lado) -->
      <td style="text-align: right;">
        <div class="table-actions-group">
          <button class="btn btn-sm btn-secondary" onclick="viewRegistrationDetail('${r.id}')" title="Ver detalhes completos">
            🔍 Detalhes
          </button>
          ${r.origin === 'ORGANIZATION_INVITE' ? `
            <button class="btn btn-sm btn-info" onclick="openGuestCommModal('${r.id}')" title="Enviar / Reenviar Convite (E-mail / WhatsApp)">
              💬 Convite
            </button>
          ` : ''}
          ${statusVal === 'LISTA_ESPERA' ? `
            <button class="btn btn-sm btn-primary" onclick="promoteRegistration('${r.id}')" title="Promover da Lista de Espera">
              Promover
            </button>
          ` : ''}
          ${statusVal !== 'CANCELADO' && statusVal !== 'DESISTIU' && statusVal !== 'NAO_VEM' ? `
            <button class="btn btn-sm btn-secondary" onclick="resendRegistrationTicket('${r.id}')" title="Reenviar Comprovante">
              📧
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="cancelRegistrationAdmin('${r.id}')" title="Cancelar Inscrição">
              ✕
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

// 2. Registrations Tab (Participantes que se inscreveram via Web)
let applyRegistrationFiltersFunc = null;

async function loadAdminRegistrations() {
  const container = document.getElementById('admin-registrations-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem;"><div class="spinner"></div></td></tr>';

  try {
    const list = await API.getAdminRegistrations({ origin: 'PUBLIC_REGISTRATION', status: 'ALL' });
    cachedRegistrations = list || [];
    setupRegistrationsFilters();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="6" class="text-danger" style="text-align:center; padding: 2rem;">Erro ao carregar participantes: ' + escapeHtml(err.message) + '</td></tr>';
  }
}

function setupRegistrationsFilters() {
  const searchInput = document.getElementById('reg-filter-search');
  const statusFilter = document.getElementById('reg-filter-status');
  const profileFilter = document.getElementById('reg-filter-profile');
  const countEl = document.getElementById('registrations-count-badge');
  const container = document.getElementById('admin-registrations-tbody');

  function applyFilter() {
    let filtered = [...cachedRegistrations];
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const qDigits = q.replace(/\D/g, '');
    const st = statusFilter ? statusFilter.value : 'CONFIRMADO';
    const pf = profileFilter ? profileFilter.value : 'ALL';

    if (q) {
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.institution && r.institution.toLowerCase().includes(q)) ||
        (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q)) ||
        (r.badgeName && r.badgeName.toLowerCase().includes(q)) ||
        (r.whatsapp && r.whatsapp.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (qDigits.length >= 3 && r.whatsapp && r.whatsapp.replace(/\D/g, '').includes(qDigits)) ||
        (qDigits.length >= 3 && r.phone && r.phone.replace(/\D/g, '').includes(qDigits))
      );
    }

    if (st && st !== 'ALL') {
      filtered = filtered.filter(r => r.status === st);
    }

    if (pf && pf !== 'ALL') {
      filtered = filtered.filter(r => r.profile === pf);
    }

    if (countEl) countEl.textContent = filtered.length + ' participante(s)';

    if (!container) return;
    if (filtered.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem;" class="text-muted">Nenhum participante encontrado para os filtros selecionados.</td></tr>';
      return;
    }

    container.innerHTML = filtered.map(r => renderRegistrationRow(r, false)).join('');
  }

  applyRegistrationFiltersFunc = applyFilter;

  if (searchInput) searchInput.oninput = applyFilter;
  if (statusFilter) statusFilter.onchange = applyFilter;
  if (profileFilter) profileFilter.onchange = applyFilter;

  const filterBtn = document.getElementById('btn-reg-filter');
  if (filterBtn) filterBtn.onclick = applyFilter;

  const resetBtn = document.getElementById('btn-reg-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'CONFIRMADO';
      if (profileFilter) profileFilter.value = 'ALL';
      applyFilter();
    };
  }

  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.onclick = () => {
      window.location.href = API.getBasePath() + '/api/admin/export/csv?origin=PUBLIC_REGISTRATION&token=' + API.getToken();
    };
  }

  applyFilter();
}

// 2.1. Dedicated Convidados Inscritos Tab (Convidados da Organização)
let cachedGuests = [];
let applyGuestFiltersFunc = null;

async function loadAdminGuests() {
  const container = document.getElementById('admin-guests-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem;"><div class="spinner"></div></td></tr>';

  try {
    const list = await API.getAdminRegistrations({ origin: 'ORGANIZATION_INVITE', status: 'ALL' });
    cachedGuests = list || [];
    setupGuestFilters();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="6" class="text-danger" style="text-align:center; padding: 2rem;">Erro ao carregar convidados: ' + escapeHtml(err.message) + '</td></tr>';
  }
}

function setupGuestFilters() {
  const searchInput = document.getElementById('guest-filter-search');
  const statusFilter = document.getElementById('guest-filter-status');
  const profileFilter = document.getElementById('guest-filter-profile');
  const countEl = document.getElementById('guests-count-badge');
  const container = document.getElementById('admin-guests-tbody');

  function applyFilter() {
    let filtered = [...cachedGuests];
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const qDigits = q.replace(/\D/g, '');
    const st = statusFilter ? statusFilter.value : 'ALL';
    const pf = profileFilter ? profileFilter.value : 'ALL';

    if (q) {
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.institution && r.institution.toLowerCase().includes(q)) ||
        (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q)) ||
        (r.badgeName && r.badgeName.toLowerCase().includes(q)) ||
        (r.whatsapp && r.whatsapp.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (qDigits.length >= 3 && r.whatsapp && r.whatsapp.replace(/\D/g, '').includes(qDigits)) ||
        (qDigits.length >= 3 && r.phone && r.phone.replace(/\D/g, '').includes(qDigits))
      );
    }

    if (st && st !== 'ALL') {
      filtered = filtered.filter(r => r.status === st);
    }

    if (pf && pf !== 'ALL') {
      filtered = filtered.filter(r => r.profile === pf);
    }

    if (countEl) countEl.textContent = filtered.length + ' convidado(s)';

    if (!container) return;
    if (filtered.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem;" class="text-muted">Nenhum convidado encontrado para os filtros selecionados.</td></tr>';
      return;
    }

    container.innerHTML = filtered.map(r => renderRegistrationRow(r, true)).join('');
  }

  applyGuestFiltersFunc = applyFilter;

  if (searchInput) searchInput.oninput = applyFilter;
  if (statusFilter) statusFilter.onchange = applyFilter;
  if (profileFilter) profileFilter.onchange = applyFilter;

  const filterBtn = document.getElementById('btn-guest-filter');
  if (filterBtn) filterBtn.onclick = applyFilter;

  const resetBtn = document.getElementById('btn-guest-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'ALL';
      if (profileFilter) profileFilter.value = 'ALL';
      applyFilter();
    };
  }

  const exportBtn = document.getElementById('btn-export-guest-csv');
  if (exportBtn) {
    exportBtn.onclick = () => {
      window.location.href = API.getBasePath() + '/api/admin/export/csv?origin=ORGANIZATION_INVITE&token=' + API.getToken();
    };
  }

  applyFilter();
}

// Action helpers
window.openGuestCommModal = function(id) {
  const r = (cachedRegistrations || []).find(item => item.id === id) || (cachedGuests || []).find(item => item.id === id);
  if (!r) return;

  currentGuestCommId = id;
  const modal = document.getElementById('guest-comm-modal');
  const alertEl = document.getElementById('guest-comm-alert');
  if (alertEl) alertEl.style.display = 'none';

  document.getElementById('comm-guest-name').textContent = r.name;
  document.getElementById('comm-guest-number').textContent = r.registrationNumber;
  document.getElementById('comm-guest-inst').textContent = r.institution;
  document.getElementById('comm-guest-email').textContent = r.email;
  document.getElementById('comm-guest-phone').textContent = r.whatsapp || r.phone || 'Não informado';

  const badgeEl = document.getElementById('comm-guest-status-badge');
  if (badgeEl) {
    if (r.invitationStatus === 'ENVIADO_EMAIL') {
      badgeEl.innerHTML = `<span class="badge badge-success">Enviado por E-mail</span>`;
    } else if (r.invitationStatus === 'ENVIADO_WHATSAPP') {
      badgeEl.innerHTML = `<span class="badge badge-info">Enviado por WhatsApp</span>`;
    } else {
      badgeEl.innerHTML = `<span class="badge badge-warning">Convite Pendente</span>`;
    }
  }

  // Pre-generate WhatsApp message for preview
  const appUrl = window.location.origin + API.getBasePath();
  const ticketUrl = `${appUrl}/#comprovante/${r.token}`;
  const manageUrl = `${appUrl}/#gerenciar/${r.token}`;

  const previewText = `Hubine 10 Anos — Convite Especial da Organização 🎉\n\n` +
    `Olá, ${r.name}!\n\n` +
    `Você foi convidado(a) especial pela organização para participar do evento comemorativo Hubine 10 Anos (Hub de Inovação do Banco do Nordeste).\n\n` +
    `📌 Dados do Evento:\n` +
    `- Evento: Hubine 10 Anos — Conectando inovação, pessoas e desenvolvimento regional\n` +
    `- Data: 4 de novembro de 2026\n` +
    `- Local: Auditório Celso Furtado — Campus Banco do Nordeste (Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza — CE)\n` +
    `- Credenciamento: A partir das 13h\n` +
    `- Nº de Inscrição: ${r.registrationNumber}\n\n` +
    `📋 Orientações de Credenciamento:\n` +
    `Ao chegar ao auditório, dirija-se à recepção e informe o número da sua inscrição ou seu nome para a retirada do seu crachá oficial.\n\n` +
    `✅ Confirmar Presença, Atualizar Dados ou Cancelar Participação:\n` +
    `${manageUrl}\n\n` +
    `Esperamos por você!\n` +
    `Banco do Nordeste do Brasil — Hubine`;

  const previewTextarea = document.getElementById('guest-whatsapp-preview');
  if (previewTextarea) previewTextarea.value = previewText;

  modal.classList.add('active');
};

window.viewRegistrationDetail = function(id) {
  const r = (cachedRegistrations || []).find(item => item.id === id) || (cachedGuests || []).find(item => item.id === id);
  if (!r) return;

  const modal = document.getElementById('reg-detail-modal');
  const body = document.getElementById('reg-detail-modal-body');
  if (!modal || !body) return;

  const isGuest = r.origin === 'ORGANIZATION_INVITE';

  body.innerHTML = `
    <div style="line-height: 1.8;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Número de Inscrição</span>
          <h3 style="margin: 0; color: var(--primary); font-size: 1.35rem;">${escapeHtml(r.registrationNumber)}</h3>
        </div>
        <div>
          ${isGuest
            ? '<span class="badge" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;">Convidado pela organização</span>'
            : '<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0;">Inscrição pública</span>'
          }
        </div>
      </div>

      <p><strong>Nome Completo:</strong> ${escapeHtml(r.name)}</p>
      <p><strong>Nome no Crachá:</strong> ${escapeHtml(r.badgeName || r.name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(r.email)}</p>
      <p><strong>WhatsApp / Telefone:</strong> ${escapeHtml(r.whatsapp || r.phone || 'Não informado')}</p>
      <p><strong>Instituição / Empresa:</strong> ${escapeHtml(r.institution)}</p>
      <p><strong>Perfil:</strong> ${escapeHtml(r.profile)}</p>
      <p><strong>Cargo / Função:</strong> ${escapeHtml(r.role || 'Não informado')}</p>
      <p><strong>Cidade e UF:</strong> ${escapeHtml(r.cityUf || 'Não informado')}</p>
      <p><strong>Status da Inscrição:</strong> <span class="badge ${r.status === 'CONFIRMADO' ? 'badge-success' : (r.status === 'CANCELADO' ? 'badge-danger' : 'badge-warning')}">${escapeHtml(r.status)}</span></p>
      
      ${isGuest ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #1e293b;">Dados do Convite Organizacional</h4>
          <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem;"><strong>Convidado por:</strong> ${escapeHtml(r.invitedBy || 'Organização')}</p>
          <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem;"><strong>Data do Convite:</strong> ${r.invitedAt ? new Date(r.invitedAt).toLocaleString('pt-BR') : 'Não registrado'}</p>
          <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem;"><strong>Status da Comunicação:</strong> ${escapeHtml(r.invitationStatus || 'PENDENTE')}</p>
          ${r.invitationSentAt ? `<p style="margin: 0; font-size: 0.85rem;"><strong>Enviado em:</strong> ${new Date(r.invitationSentAt).toLocaleString('pt-BR')} via ${escapeHtml(r.invitationChannel || 'E-mail')}</p>` : ''}
          ${r.internalNotes ? `<p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;"><strong>Notas Internas:</strong> ${escapeHtml(r.internalNotes)}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin: 1rem 0;">
        <strong style="color: var(--primary);">Recurso de Acessibilidade Solicitado (Confidencial):</strong>
        <p style="margin: 0.25rem 0 0 0; color: ${r.accessibility ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${escapeHtml(r.accessibility || 'Nenhum recurso solicitado.')}
        </p>
      </div>

      <p><strong>Data de Cadastro:</strong> ${new Date(r.createdAt).toLocaleString('pt-BR')}</p>
      ${r.checkinAt ? `<p style="color: #0284c7;"><strong>✓ Credenciado em:</strong> ${new Date(r.checkinAt).toLocaleString('pt-BR')} por ${escapeHtml(r.checkinOperator || 'Operador')}</p>` : ''}
    </div>
  `;

  modal.classList.add('active');
};

window.promoteRegistration = async function(id) {
  if (!confirm('Deseja promover este participante da lista de espera para CONFIRMADO? Um e-mail com o comprovante será enviado automaticamente.')) return;
  try {
    const res = await API.promoteAdminWaitlist(id);
    notify(res.message || 'Participante promovido com sucesso!', 'success');
    loadAdminRegistrations();
    loadAdminOverview();
  } catch (err) {
    notify('Erro: ' + err.message, 'error');
  }
};

window.resendRegistrationTicket = async function(id) {
  try {
    const res = await API.resendAdminTicket(id);
    notify(res.message || 'Comprovante reenviado com sucesso!', 'success');
  } catch (err) {
    notify('Erro: ' + err.message, 'error');
  }
};

window.cancelRegistrationAdmin = async function(id) {
  if (!confirm('Tem certeza que deseja cancelar esta inscrição? Caso ela seja confirmada, uma vaga será aberta.')) return;
  try {
    const res = await API.cancelAdminRegistration(id);
    notify(res.message || 'Inscrição cancelada com sucesso.', 'success');
    loadAdminRegistrations();
    loadAdminOverview();
  } catch (err) {
    notify('Erro: ' + err.message, 'error');
  }
};

// 3. Speakers Tab - Gestão Direta de Palestrantes pela Organização
function getSpeakerInitials(name) {
  if (!name) return 'PL';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

let adminSpeakersCache = [];

async function loadAdminSpeakers() {
  const container = document.getElementById('admin-speakers-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2.5rem;"><div class="spinner"></div></td></tr>';

  try {
    const list = await API.getAdminSpeakers();
    adminSpeakersCache = list || [];

    if (!list || list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 3rem 1rem;" class="text-muted">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎤</div>
            <p style="font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem;">Nenhum palestrante cadastrado ainda</p>
            <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Cadastre diretamente os palestrantes e painelistas para exibição imediata no site oficial.</p>
            <button class="btn btn-primary btn-sm" onclick="openNewSpeakerModal()">+ Cadastrar Primeiro Palestrante</button>
          </td>
        </tr>
      `;
      setupSpeakerFormEvents();
      return;
    }

    container.innerHTML = list.map(s => {
      const initials = getSpeakerInitials(s.name);
      const safePhoto = sanitizePhotoUrl(s.photoUrl);
      const avatarHtml = safePhoto
        ? `<div class="speaker-avatar-wrap">
             <img src="${escapeHtml(safePhoto)}" class="speaker-avatar-img" alt="${escapeHtml(s.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="speaker-avatar-initials" style="display: none;">${escapeHtml(initials)}</div>
           </div>`
        : `<div class="speaker-avatar-wrap"><div class="speaker-avatar-initials">${escapeHtml(initials)}</div></div>`;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              ${avatarHtml}
              <div>
                <strong style="color: var(--text-main); font-size: 0.95rem; display: block;">${escapeHtml(s.name)}</strong>
                ${s.contact ? `<span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.contact)}</span>` : ''}
              </div>
            </div>
          </td>
          <td><strong>${escapeHtml(s.institution || '—')}</strong></td>
          <td><span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(s.role || '—')}</span></td>
          <td>${s.email ? `<span style="font-size: 0.85rem;">${escapeHtml(s.email)}</span>` : '<span class="text-muted">—</span>'}</td>
          <td><span style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(s.talkTitle || '—')}</span></td>
          <td>
            <span class="badge badge-success" style="display: inline-flex; align-items: center; gap: 4px;">
              <span>●</span> Publicado
            </span>
          </td>
          <td style="text-align: right;">
            <div class="speaker-actions-group">
              <button class="btn btn-sm btn-secondary" onclick="viewSpeakerDetails('${s.id}')" title="Ver Detalhes do Palestrante">
                👁️ Detalhes
              </button>
              <button class="btn btn-sm btn-primary" onclick="editSpeakerModal('${s.id}')" title="Editar Informações">
                ✏️ Editar
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteSpeakerPrompt('${s.id}')" title="Remover Palestrante">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    setupSpeakerFormEvents();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 2rem;">Erro ao carregar palestrantes: ' + escapeHtml(err.message) + '</td></tr>';
  }
}

let speakerFormEventsBound = false;

function setupSpeakerFormEvents() {
  const btnNew = document.getElementById('btn-new-speaker') || document.getElementById('btn-new-speaker-invite');
  if (btnNew) {
    btnNew.onclick = () => openNewSpeakerModal();
  }

  if (speakerFormEventsBound) return;
  speakerFormEventsBound = true;

  const photoFileInput = document.getElementById('spk-photo-file');
  const photoUrlInput = document.getElementById('spk-photo-url');
  const photoHiddenVal = document.getElementById('spk-photo-val');
  const photoPreviewImg = document.getElementById('spk-photo-preview-img');
  const photoPlaceholder = document.getElementById('spk-photo-placeholder');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');

  function updatePhotoPreview(src) {
    if (src && src.trim()) {
      if (photoPreviewImg) {
        photoPreviewImg.src = src;
        photoPreviewImg.style.display = 'block';
      }
      if (photoPlaceholder) photoPlaceholder.style.display = 'none';
      if (photoHiddenVal) photoHiddenVal.value = src;
      if (btnRemovePhoto) btnRemovePhoto.style.display = 'inline-block';
    } else {
      if (photoPreviewImg) {
        photoPreviewImg.src = '';
        photoPreviewImg.style.display = 'none';
      }
      if (photoPlaceholder) photoPlaceholder.style.display = 'block';
      if (photoHiddenVal) photoHiddenVal.value = '';
      if (photoFileInput) photoFileInput.value = '';
      if (photoUrlInput) photoUrlInput.value = '';
      if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';
    }
  }

  if (photoFileInput) {
    photoFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        notify('Selecione um arquivo de imagem válido (PNG, JPG, WebP).', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        notify('A imagem selecionada é muito grande (máximo 5MB).', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result;
        updatePhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    };
  }

  if (photoUrlInput) {
    photoUrlInput.oninput = (e) => {
      const url = e.target.value.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        updatePhotoPreview(url);
      } else if (!url) {
        if (!photoFileInput || !photoFileInput.files || !photoFileInput.files.length) {
          updatePhotoPreview('');
        }
      }
    };
  }

  if (btnRemovePhoto) {
    btnRemovePhoto.onclick = () => {
      updatePhotoPreview('');
    };
  }

  const form = document.getElementById('speaker-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const id = document.getElementById('spk-form-id').value;
      const name = document.getElementById('spk-form-name').value.trim();
      const email = document.getElementById('spk-form-email').value.trim();
      const institution = document.getElementById('spk-form-institution').value.trim();
      const role = document.getElementById('spk-form-role').value.trim();
      const talkTitle = document.getElementById('spk-form-talk').value.trim();
      const talkSummary = document.getElementById('spk-form-summary').value.trim();
      const bio = document.getElementById('spk-form-bio').value.trim();
      const avNeeds = document.getElementById('spk-form-av').value.trim();
      const photoUrl = (photoHiddenVal ? photoHiddenVal.value.trim() : '') || (photoUrlInput ? photoUrlInput.value.trim() : '');

      if (!name) {
        notify('O nome do palestrante é obrigatório.', 'error');
        document.getElementById('spk-form-name').focus();
        return;
      }

      if (!institution) {
        notify('A instituição ou empresa é obrigatória.', 'error');
        document.getElementById('spk-form-institution').focus();
        return;
      }

      const payload = {
        name,
        email,
        institution,
        role,
        talkTitle,
        talkSummary,
        bio,
        photoUrl,
        avNeeds
      };

      const submitBtn = document.getElementById('btn-save-speaker-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Salvando...';
      }

      try {
        if (id) {
          await API.updateSpeaker(id, payload);
          notify('Dados do palestrante atualizados com sucesso!', 'success');
        } else {
          await API.createSpeaker(payload);
          notify('Palestrante cadastrado e publicado na programação oficial!', 'success');
        }

        const modal = document.getElementById('speaker-form-modal');
        if (modal) modal.classList.remove('active');

        loadAdminSpeakers();
      } catch (err) {
        notify('Erro ao salvar palestrante: ' + err.message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Salvar e Publicar';
        }
      }
    };
  }
}

window.openNewSpeakerModal = function() {
  const modal = document.getElementById('speaker-form-modal');
  if (!modal) return;

  document.getElementById('speaker-form-modal-title').textContent = 'Cadastrar Novo Palestrante / Painelista';
  document.getElementById('spk-form-id').value = '';
  document.getElementById('spk-form-name').value = '';
  document.getElementById('spk-form-email').value = '';
  document.getElementById('spk-form-institution').value = '';
  document.getElementById('spk-form-role').value = '';
  document.getElementById('spk-form-talk').value = '';
  document.getElementById('spk-form-summary').value = '';
  document.getElementById('spk-form-bio').value = '';
  document.getElementById('spk-form-av').value = '';

  const photoFileInput = document.getElementById('spk-photo-file');
  if (photoFileInput) photoFileInput.value = '';
  const photoUrlInput = document.getElementById('spk-photo-url');
  if (photoUrlInput) photoUrlInput.value = '';
  const photoHiddenVal = document.getElementById('spk-photo-val');
  if (photoHiddenVal) photoHiddenVal.value = '';
  const photoPreviewImg = document.getElementById('spk-photo-preview-img');
  if (photoPreviewImg) {
    photoPreviewImg.src = '';
    photoPreviewImg.style.display = 'none';
  }
  const photoPlaceholder = document.getElementById('spk-photo-placeholder');
  if (photoPlaceholder) photoPlaceholder.style.display = 'block';
  const btnRemovePhoto = document.getElementById('btn-remove-photo');
  if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';

  const submitBtn = document.getElementById('btn-save-speaker-submit');
  if (submitBtn) submitBtn.innerHTML = 'Salvar e Publicar';

  modal.classList.add('active');
  setTimeout(() => {
    const nameInput = document.getElementById('spk-form-name');
    if (nameInput) nameInput.focus();
  }, 100);
};

window.editSpeakerModal = function(id) {
  const spk = adminSpeakersCache.find(s => s.id === id);
  if (!spk) {
    notify('Palestrante não localizado.', 'error');
    return;
  }

  // Close detail modal if open
  const detailModal = document.getElementById('speaker-detail-modal');
  if (detailModal) detailModal.classList.remove('active');

  const modal = document.getElementById('speaker-form-modal');
  if (!modal) return;

  document.getElementById('speaker-form-modal-title').textContent = 'Editar Dados do Palestrante';
  document.getElementById('spk-form-id').value = spk.id || '';
  document.getElementById('spk-form-name').value = spk.name || '';
  document.getElementById('spk-form-email').value = spk.email || '';
  document.getElementById('spk-form-institution').value = spk.institution || '';
  document.getElementById('spk-form-role').value = spk.role || '';
  document.getElementById('spk-form-talk').value = spk.talkTitle || '';
  document.getElementById('spk-form-summary').value = spk.talkSummary || '';
  document.getElementById('spk-form-bio').value = spk.bio || '';
  document.getElementById('spk-form-av').value = spk.avNeeds || '';

  const photoFileInput = document.getElementById('spk-photo-file');
  if (photoFileInput) photoFileInput.value = '';
  const photoUrlInput = document.getElementById('spk-photo-url');
  const photoHiddenVal = document.getElementById('spk-photo-val');
  const photoPreviewImg = document.getElementById('spk-photo-preview-img');
  const photoPlaceholder = document.getElementById('spk-photo-placeholder');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');

  if (spk.photoUrl) {
    if (photoHiddenVal) photoHiddenVal.value = spk.photoUrl;
    if (photoUrlInput) photoUrlInput.value = spk.photoUrl.startsWith('http') ? spk.photoUrl : '';
    if (photoPreviewImg) {
      photoPreviewImg.src = spk.photoUrl;
      photoPreviewImg.style.display = 'block';
    }
    if (photoPlaceholder) photoPlaceholder.style.display = 'none';
    if (btnRemovePhoto) btnRemovePhoto.style.display = 'inline-block';
  } else {
    if (photoHiddenVal) photoHiddenVal.value = '';
    if (photoUrlInput) photoUrlInput.value = '';
    if (photoPreviewImg) {
      photoPreviewImg.src = '';
      photoPreviewImg.style.display = 'none';
    }
    if (photoPlaceholder) photoPlaceholder.style.display = 'block';
    if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';
  }

  const submitBtn = document.getElementById('btn-save-speaker-submit');
  if (submitBtn) submitBtn.innerHTML = 'Salvar Alterações';

  modal.classList.add('active');
};

window.viewSpeakerDetails = function(id) {
  const spk = adminSpeakersCache.find(s => s.id === id);
  if (!spk) {
    notify('Palestrante não localizado.', 'error');
    return;
  }

  const modal = document.getElementById('speaker-detail-modal');
  const body = document.getElementById('speaker-detail-modal-body');
  if (!modal || !body) return;

  const initials = getSpeakerInitials(spk.name);
  const avatarHtml = spk.photoUrl
    ? `<img src="${escapeHtml(spk.photoUrl)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-subtle); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`
    : `<div style="width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--bnb-red), var(--bnb-wine)); color: #fff; font-size: 1.6rem; font-weight: 700; border: 3px solid var(--border-subtle); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${escapeHtml(initials)}</div>`;

  body.innerHTML = `
    <div style="line-height: 1.6;">
      <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-subtle);">
        ${avatarHtml}
        <div style="flex: 1;">
          <h3 style="margin: 0 0 0.25rem 0; color: var(--primary); font-size: 1.25rem;">${escapeHtml(spk.name)}</h3>
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(spk.role || 'Convidado Especial')}</div>
          <div style="color: var(--bnb-red); font-size: 0.85rem; font-weight: 600;">${escapeHtml(spk.institution || '—')}</div>
          <div style="margin-top: 0.5rem;">
            <span class="badge badge-success" style="font-size: 0.75rem;">● Publicado na Programação Oficial</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; display: block;">E-mail</span>
          <span style="font-size: 0.9rem;">${spk.email ? escapeHtml(spk.email) : '<span class="text-muted">Não informado</span>'}</span>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; display: block;">Data de Cadastro</span>
          <span style="font-size: 0.9rem;">${spk.createdAt ? new Date(spk.createdAt).toLocaleDateString('pt-BR') : 'Oficial'}</span>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem;">Título da Participação</span>
        <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); background: #fdfdfd; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          ${escapeHtml(spk.talkTitle || 'Participação oficial')}
        </div>
      </div>

      ${spk.talkSummary ? `
        <div style="margin-bottom: 1.25rem;">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem;">Resumo / Sinopse</span>
          <p style="font-size: 0.9rem; color: var(--text-body); margin: 0; background: #fdfdfd; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            ${escapeHtml(spk.talkSummary)}
          </p>
        </div>
      ` : ''}

      <div style="margin-bottom: 1.25rem;">
        <span style="font-size: 0.75rem; color: var(--bnb-red); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem;">Minibio / Biografia Institucional</span>
        <div style="font-size: 0.9rem; color: var(--text-body); background: rgba(184, 51, 42, 0.03); padding: 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--bnb-red);">
          ${escapeHtml(spk.bio || 'Biografia em processo de atualização institucional.')}
        </div>
      </div>

      <div style="margin-bottom: 0.5rem;">
        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem;">Necessidades Audiovisuais (AV)</span>
        <div style="font-size: 0.85rem; color: var(--text-body);">
          ${escapeHtml(spk.avNeeds || 'Nenhum recurso especial registrado.')}
        </div>
      </div>
    </div>
  `;

  const editBtn = document.getElementById('btn-detail-edit-speaker');
  if (editBtn) {
    editBtn.onclick = () => editSpeakerModal(spk.id);
  }

  modal.classList.add('active');
};

window.deleteSpeakerPrompt = async function(id) {
  const spk = adminSpeakersCache.find(s => s.id === id);
  const name = spk ? spk.name : 'este palestrante';

  if (!confirm(`Deseja realmente remover ${name}? Esta ação removerá o palestrante da programação pública oficial do evento.`)) {
    return;
  }

  try {
    await API.deleteSpeaker(id);
    notify('Palestrante removido com sucesso.', 'success');
    loadAdminSpeakers();
  } catch (e) {
    notify('Erro ao remover palestrante: ' + e.message, 'error');
  }
};

// Aliases for backward compatibility
window.setupNewSpeakerInviteBtn = setupSpeakerFormEvents;
window.reviewSpeakerModal = function(id) {
  viewSpeakerDetails(id);
};
window.copySpeakerLink = function() {
  notify('Os palestrantes são gerenciados diretamente pelo painel interno.', 'info');
};

// 4. Schedule Editor Tab
async function loadAdminSchedule() {
  const container = document.getElementById('admin-schedule-list');
  if (!container) return;

  try {
    const items = await API.getAdminSchedule();
    container.innerHTML = items.map((it, idx) => `
      <div class="card" style="margin-bottom: 1rem; padding: 1.25rem;" data-schedule-idx="${idx}">
        <div style="display: grid; grid-template-columns: 100px 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
          <input type="text" class="form-input sch-item-time" value="${escapeHtml(it.time)}" placeholder="13:00">
          <input type="text" class="form-input sch-item-title" value="${escapeHtml(it.title)}" placeholder="Título da Sessão">
          <input type="text" class="form-input sch-item-speaker" value="${escapeHtml(it.speaker)}" placeholder="Palestrante / Participante">
        </div>
        <textarea class="form-textarea sch-item-desc" rows="2" placeholder="Descrição ou detalhes">${escapeHtml(it.description || '')}</textarea>
      </div>
    `).join('');

    const saveBtn = document.getElementById('btn-save-schedule');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const cards = container.querySelectorAll('[data-schedule-idx]');
        const updated = Array.from(cards).map((c, i) => ({
          id: 'sch_' + (i + 1),
          time: c.querySelector('.sch-item-time').value.trim(),
          title: c.querySelector('.sch-item-title').value.trim(),
          speaker: c.querySelector('.sch-item-speaker').value.trim(),
          description: c.querySelector('.sch-item-desc').value.trim()
        }));

        try {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Salvando...';
          await API.updateAdminSchedule(updated);
          notify('Grade de programação atualizada com sucesso!', 'success');
        } catch (e) {
          notify('Erro ao salvar: ' + e.message, 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Salvar Alterações na Programação';
        }
      };
    }
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Erro ao carregar programação: ' + err.message + '</p>';
  }
}

// 5. Settings Tab (Admin only)
async function loadAdminSettings() {
  try {
    const s = await API.getAdminSettings();

    document.getElementById('set-capacity').value = s.capacity;
    document.getElementById('set-registrations-open').checked = s.registrationsOpen;
    document.getElementById('set-contact-email').value = s.contactEmail || '';
    document.getElementById('set-location-address').value = s.locationAddress || '';
    document.getElementById('set-location-map').value = s.locationMapUrl || '';

    if (s.privacyNotice) {
      document.getElementById('set-privacy-controller').value = s.privacyNotice.controller || '';
      document.getElementById('set-privacy-purpose').value = s.privacyNotice.purpose || '';
      document.getElementById('set-privacy-legal').value = s.privacyNotice.legalBasis || '';
      document.getElementById('set-privacy-retention').value = s.privacyNotice.retentionPeriod || '';
      document.getElementById('set-privacy-dpo').value = s.privacyNotice.dpoContact || '';
    }

    const form = document.getElementById('admin-settings-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          capacity: document.getElementById('set-capacity').value,
          registrationsOpen: document.getElementById('set-registrations-open').checked,
          contactEmail: document.getElementById('set-contact-email').value.trim(),
          locationAddress: document.getElementById('set-location-address').value.trim(),
          locationMapUrl: document.getElementById('set-location-map').value.trim(),
          privacyNotice: {
            controller: document.getElementById('set-privacy-controller').value.trim(),
            purpose: document.getElementById('set-privacy-purpose').value.trim(),
            legalBasis: document.getElementById('set-privacy-legal').value.trim(),
            retentionPeriod: document.getElementById('set-privacy-retention').value.trim(),
            dpoContact: document.getElementById('set-privacy-dpo').value.trim()
          }
        };

        try {
          await API.updateAdminSettings(payload);
          notify('Configurações do evento atualizadas com sucesso!', 'success');
        } catch (err) {
          notify('Erro ao salvar: ' + err.message, 'error');
        }
      };
    }
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

// 6. Users Tab (Admin only)
async function loadAdminUsers() {
  const container = document.getElementById('admin-users-tbody');
  if (!container) return;

  try {
    const users = await API.getAdminUsers();
    container.innerHTML = users.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-primary">${escapeHtml(u.role)}</span></td>
        <td>${u.active ? '✅ Ativo' : 'Inativo'}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteUserPrompt('${u.id}')">Excluir</button>
        </td>
      </tr>
    `).join('');

    const newBtn = document.getElementById('btn-new-user');
    const modal = document.getElementById('admin-user-modal');
    if (newBtn && modal) {
      newBtn.onclick = () => modal.classList.add('active');
    }

    const form = document.getElementById('admin-user-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('user-new-name').value.trim(),
          email: document.getElementById('user-new-email').value.trim(),
          password: document.getElementById('user-new-pass').value,
          role: document.getElementById('user-new-role').value
        };

        try {
          await API.createAdminUser(payload);
          modal.classList.remove('active');
          notify('Usuário criado com sucesso!', 'success');
          loadAdminUsers();
        } catch (err) {
          notify('Erro ao criar usuário: ' + err.message, 'error');
        }
      };
    }
  } catch (err) {
    container.innerHTML = '<tr><td colspan="5" class="text-danger">Erro: ' + err.message + '</td></tr>';
  }
}

window.deleteUserPrompt = async function(id) {
  if (!confirm('Deseja excluir este usuário do painel?')) return;
  try {
    await API.deleteAdminUser(id);
    loadAdminUsers();
  } catch (err) {
    notify('Erro: ' + err.message, 'error');
  }
};

// 7. Demo Outbox Mailbox Tab
async function loadAdminOutbox() {
  const container = document.getElementById('admin-outbox-list');
  if (!container) return;

  container.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

  try {
    const res = await API.getAdminOutbox();
    const emails = res.emails || [];

    if (emails.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem;">
          <p class="text-muted" style="margin: 0;">Nenhum e-mail registrado na caixa de demonstração ainda. Conforme inscrições forem realizadas, os e-mails aparecerão aqui para teste e validação.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = emails.map(m => `
      <div class="email-item-card">
        <div style="flex-grow: 1;">
          <div class="email-item-subject">${escapeHtml(m.subject)}</div>
          <div class="email-item-to">Para: <strong>${escapeHtml(m.to)}</strong> • ${new Date(m.timestamp).toLocaleTimeString('pt-BR')} (${new Date(m.timestamp).toLocaleDateString('pt-BR')})</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="viewEmailModal('${m.id}')">Visualizar E-mail</button>
      </div>
    `).join('');

    const clearBtn = document.getElementById('btn-clear-outbox');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (!confirm('Limpar histórico da caixa de e-mails?')) return;
        await API.clearAdminOutbox();
        loadAdminOutbox();
      };
    }
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Erro: ' + err.message + '</p>';
  }
}

window.viewEmailModal = async function(id) {
  try {
    const res = await API.getAdminOutbox();
    const email = (res.emails || []).find(m => m.id === id);
    if (!email) return;

    const modal = document.getElementById('email-view-modal');
    const header = document.getElementById('email-modal-header-info');
    const iframe = document.getElementById('email-modal-iframe');
    if (!modal || !header || !iframe) return;

    header.innerHTML = `
      <p style="margin: 0;"><strong>Para:</strong> ${escapeHtml(email.to)}</p>
      <p style="margin: 0;"><strong>Assunto:</strong> ${escapeHtml(email.subject)}</p>
      <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);"><strong>Data:</strong> ${new Date(email.timestamp).toLocaleString('pt-BR')}</p>
    `;

    iframe.srcdoc = email.html;
    modal.classList.add('active');
  } catch (err) {
    notify('Erro ao exibir e-mail: ' + err.message, 'error');
  }
};

// 8. Audit Logs Tab
async function loadAdminAuditLogs() {
  const container = document.getElementById('admin-audit-tbody');
  if (!container) return;

  try {
    const logs = await API.getAdminAuditLogs();
    container.innerHTML = logs.map(l => `
      <tr>
        <td style="white-space: nowrap; font-size: 0.8rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleString('pt-BR')}</td>
        <td><strong>${escapeHtml(l.action)}</strong></td>
        <td>${escapeHtml(l.details)}</td>
        <td>${escapeHtml(l.user || 'Sistema')}</td>
      </tr>
    `).join('');
  } catch (err) {
    container.innerHTML = '<tr><td colspan="4" class="text-danger">Erro: ' + err.message + '</td></tr>';
  }
}

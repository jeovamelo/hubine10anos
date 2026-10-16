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

      if (targetTab === 'guests') {
        switchAdminTab('registrations');
        const originFilter = document.getElementById('reg-filter-origin');
        if (originFilter) {
          originFilter.value = 'ORGANIZATION_INVITE';
          originFilter.dispatchEvent(new Event('change'));
        }
      } else if (targetTab === 'checkin') {
        window.location.hash = '#credenciamento';
        return;
      } else {
        switchAdminTab(targetTab);
      }

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

  // Setup Add Guest Modal
  const openGuestBtn = document.getElementById('btn-open-guest-modal');
  const guestModal = document.getElementById('invited-guest-modal');
  const guestForm = document.getElementById('invited-guest-form');
  const guestAlert = document.getElementById('invited-guest-alert');

  if (openGuestBtn && guestModal) {
    openGuestBtn.onclick = () => {
      if (guestForm) guestForm.reset();
      if (guestAlert) guestAlert.style.display = 'none';
      guestModal.classList.add('active');
    };
  }

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
        guestModal.classList.remove('active');
        await loadAdminRegistrations();
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

// 2. Registrations Tab
async function loadAdminRegistrations() {
  const container = document.getElementById('admin-registrations-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;"><div class="spinner"></div></td></tr>';

  try {
    const list = await API.getAdminRegistrations();
    cachedRegistrations = list;
    renderRegistrationsTable(list);
    setupRegistrationsFilters();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="7" class="text-danger" style="text-align:center;">Erro ao carregar participantes: ' + err.message + '</td></tr>';
  }
}

function renderRegistrationsTable(list) {
  const container = document.getElementById('admin-registrations-tbody');
  const countEl = document.getElementById('registrations-count-badge');
  if (countEl) countEl.textContent = list.length + ' participante(s)';
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;" class="text-muted">Nenhum participante encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  container.innerHTML = list.map(r => {
    let statusBadge = '';
    if (r.status === 'CONFIRMADO') statusBadge = '<span class="badge badge-success">Confirmado</span>';
    else if (r.status === 'PRESENTE') statusBadge = '<span class="badge badge-info">Presente</span>';
    else if (r.status === 'LISTA_ESPERA') statusBadge = `<span class="badge badge-warning">Lista Espera #${r.waitlistPosition || '1'}</span>`;
    else if (r.status === 'CANCELADO') statusBadge = '<span class="badge badge-danger">Cancelado</span>';

    // Origin badge
    const isGuest = r.origin === 'ORGANIZATION_INVITE';
    const originBadge = isGuest
      ? '<span class="badge" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe; font-size:0.75rem;">Convidado pela organização</span>'
      : '<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; font-size:0.75rem;">Inscrição pública</span>';

    // Cancelled styling
    const isCancelled = r.status === 'CANCELADO';
    const rowStyle = isCancelled
      ? 'background-color: #fff1f2; opacity: 0.88;'
      : '';
    const nameDisplay = isCancelled
      ? `<span style="text-decoration: line-through; color: #991b1b;">${escapeHtml(r.name)}</span>`
      : `<strong>${escapeHtml(r.name)}</strong>`;

    return `
      <tr style="${rowStyle}">
        <td style="font-weight: 700; color: var(--primary);">${escapeHtml(r.registrationNumber)}</td>
        <td>
          ${nameDisplay}
          ${r.badgeName && r.badgeName !== r.name ? `<br><small class="text-muted">Crachá: ${escapeHtml(r.badgeName)}</small>` : ''}
          ${r.accessibility ? `<span title="Recurso de acessibilidade solicitado (confidencial)" style="margin-left:4px;">♿</span>` : ''}
        </td>
        <td>${originBadge}</td>
        <td style="font-size: 0.85rem;">
          <div>${escapeHtml(r.email)}</div>
          <div class="text-muted" style="margin-top:2px;">📱 ${escapeHtml(r.whatsapp || r.phone || 'Não informado')}</div>
        </td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(r.institution)}</div>
          <span class="badge badge-secondary" style="font-size:0.75rem; margin-top:2px;">${escapeHtml(r.profile)}</span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-sm btn-secondary" onclick="viewRegistrationDetail('${r.id}')" title="Ver detalhes completos">🔍</button>
            ${isGuest ? `
              <button class="btn btn-sm btn-info" onclick="openGuestCommModal('${r.id}')" title="Comunicação do Convidado (E-mail / WhatsApp)">💬 Convite</button>
            ` : ''}
            ${r.status === 'LISTA_ESPERA' ? `
              <button class="btn btn-sm btn-primary" onclick="promoteRegistration('${r.id}')" title="Promover para Confirmado">Promover</button>
            ` : ''}
            ${!isCancelled ? `
              <button class="btn btn-sm btn-secondary" onclick="resendRegistrationTicket('${r.id}')" title="Reenviar Comprovante">📧</button>
              <button class="btn btn-sm btn-outline-danger" onclick="cancelRegistrationAdmin('${r.id}')" title="Cancelar Inscrição">✕</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupRegistrationsFilters() {
  const searchInput = document.getElementById('reg-filter-search');
  const statusFilter = document.getElementById('reg-filter-status');
  const originFilter = document.getElementById('reg-filter-origin');
  const profileFilter = document.getElementById('reg-filter-profile');

  // Default filter value is CONFIRMADO
  if (statusFilter && !statusFilter.value) {
    statusFilter.value = 'CONFIRMADO';
  }

  function applyFilter() {
    let filtered = [...cachedRegistrations];
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const qDigits = q.replace(/\D/g, '');
    const st = statusFilter ? statusFilter.value : 'CONFIRMADO';
    const og = originFilter ? originFilter.value : 'ALL';
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

    if (og && og !== 'ALL') {
      filtered = filtered.filter(r => r.origin === og);
    }

    if (pf && pf !== 'ALL') {
      filtered = filtered.filter(r => r.profile === pf);
    }

    renderRegistrationsTable(filtered);
  }

  if (searchInput) searchInput.oninput = applyFilter;
  if (statusFilter) statusFilter.onchange = applyFilter;
  if (originFilter) originFilter.onchange = applyFilter;
  if (profileFilter) profileFilter.onchange = applyFilter;

  // Sympla-style action buttons
  const filterBtn = document.getElementById('btn-reg-filter');
  if (filterBtn) {
    filterBtn.onclick = applyFilter;
  }

  const resetBtn = document.getElementById('btn-reg-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'CONFIRMADO';
      if (originFilter) originFilter.value = 'ALL';
      if (profileFilter) profileFilter.value = 'ALL';
      applyFilter();
    };
  }

  // Apply default filter (CONFIRMADO)
  applyFilter();

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.onclick = () => {
      window.location.href = API.getBasePath() + '/api/admin/export/csv?token=' + API.getToken();
    };
  }
}

// Action helpers
window.openGuestCommModal = function(id) {
  const r = cachedRegistrations.find(item => item.id === id);
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

  const previewText = `*Hubine 10 Anos — Convite Especial da Organização* 🎉\n\n` +
    `Olá, *${r.name}*!\n\n` +
    `Você foi convidado(a) especial pela organização para participar do evento comemorativo *Hubine 10 Anos* (Hub de Inovação do Banco do Nordeste).\n\n` +
    `📌 *Dados do Evento:*\n` +
    `• *Evento:* Hubine 10 Anos — Conectando inovação, pessoas e desenvolvimento regional\n` +
    `• *Data:* 4 de novembro de 2026\n` +
    `• *Local:* Auditório Celso Furtado — Campus Banco do Nordeste (Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza — CE)\n` +
    `• *Credenciamento:* A partir das 13h\n` +
    `• *Nº de Inscrição:* *${r.registrationNumber}*\n\n` +
    `📋 *Orientações de Credenciamento:*\n` +
    `Ao chegar ao auditório, dirija-se à recepção e apresente seu QR Code ou informe o número da sua inscrição (*${r.registrationNumber}*) para a retirada do seu crachá oficial.\n\n` +
    `🎟️ *Acesse seu Comprovante Oficial com QR Code:*\n${ticketUrl}\n\n` +
    `✏️ *Atualizar dados do crachá ou cancelar sua participação:*\n${manageUrl}\n\n` +
    `Esperamos por você!\n` +
    `_Banco do Nordeste do Brasil — Hubine_`;

  const previewTextarea = document.getElementById('guest-whatsapp-preview');
  if (previewTextarea) previewTextarea.value = previewText;

  modal.classList.add('active');
};

window.viewRegistrationDetail = function(id) {
  const r = cachedRegistrations.find(item => item.id === id);
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

// 3. Speakers Tab
async function loadAdminSpeakers() {
  const container = document.getElementById('admin-speakers-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;"><div class="spinner"></div></td></tr>';

  try {
    const list = await API.getAdminSpeakers();
    if (list.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;" class="text-muted">Nenhum palestrante cadastrado. Clique em "Novo Convite" para convidar.</td></tr>';
      return;
    }

    container.innerHTML = list.map(s => {
      let statusBadge = '';
      if (s.status === 'APROVADO') statusBadge = '<span class="badge badge-success">Aprovado e Publicado</span>';
      else if (s.status === 'AGUARDANDO_REVISAO') statusBadge = '<span class="badge badge-warning">Aguardando Revisão</span>';
      else statusBadge = '<span class="badge badge-info">Convite Pendente</span>';

      const inviteUrl = window.location.origin + API.getBasePath() + '/#palestrante/convite/' + s.inviteToken;

      return `
        <tr>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(s.institution || '—')}</td>
          <td>${escapeHtml(s.talkTitle || '—')}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="copySpeakerLink('${inviteUrl}')" title="Copiar Link Seguro">🔗 Copiar Link</button>
            ${s.status === 'AGUARDANDO_REVISAO' ? `
              <button class="btn btn-sm btn-primary" onclick="reviewSpeakerModal('${s.id}')">Revisar</button>
            ` : s.status === 'APROVADO' ? `
              <button class="btn btn-sm btn-secondary" onclick="reviewSpeakerModal('${s.id}')">Ver Dados</button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSpeakerPrompt('${s.id}')">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    setupNewSpeakerInviteBtn();
  } catch (err) {
    container.innerHTML = '<tr><td colspan="6" class="text-danger">Erro: ' + err.message + '</td></tr>';
  }
}

function setupNewSpeakerInviteBtn() {
  const btn = document.getElementById('btn-new-speaker-invite');
  const modal = document.getElementById('speaker-invite-modal');
  if (!btn || !modal) return;

  btn.onclick = () => modal.classList.add('active');

  const form = document.getElementById('speaker-invite-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('invite-spk-name').value.trim(),
        email: document.getElementById('invite-spk-email').value.trim(),
        institution: document.getElementById('invite-spk-institution').value.trim(),
        talkTitle: document.getElementById('invite-spk-talk').value.trim()
      };

      try {
        const res = await API.createSpeakerInvite(payload);
        modal.classList.remove('active');
        prompt('Convite criado com sucesso! Copie o link individual seguro para enviar ao palestrante:', res.inviteUrl);
        loadAdminSpeakers();
      } catch (err) {
        notify('Erro ao gerar convite: ' + err.message, 'error');
      }
    };
  }
}

window.copySpeakerLink = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    notify('Link copiado para a área de transferência!', 'success');
  }).catch(() => {
    prompt('Copie o link seguro do palestrante:', url);
  });
};

window.reviewSpeakerModal = async function(id) {
  try {
    const list = await API.getAdminSpeakers();
    const spk = list.find(s => s.id === id);
    if (!spk) return;

    const modal = document.getElementById('speaker-review-modal');
    const body = document.getElementById('speaker-review-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
      <div style="line-height: 1.6;">
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem;">
          ${spk.photoUrl ? `<img src="${spk.photoUrl}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">` : ''}
          <div>
            <h3 style="margin: 0; color: var(--primary);">${escapeHtml(spk.name)}</h3>
            <div style="color: var(--text-muted);">${escapeHtml(spk.role)} • ${escapeHtml(spk.institution)}</div>
          </div>
        </div>
        <p><strong>Título da Participação:</strong> ${escapeHtml(spk.talkTitle || 'Não informado')}</p>
        <p><strong>Resumo:</strong> ${escapeHtml(spk.talkSummary || 'Não informado')}</p>
        <p><strong>Biografia:</strong> ${escapeHtml(spk.bio || 'Não informada')}</p>
        <p><strong>Necessidades AV:</strong> ${escapeHtml(spk.avNeeds || 'Nenhuma')}</p>
        <p><strong>Contato para Alinhamento:</strong> ${escapeHtml(spk.contact || 'Não informado')}</p>
        <p><strong>Autorização de Publicação (LGPD):</strong> ${spk.authorizedPublishing ? '✅ Autorizado pelo palestrante' : '❌ Não autorizado'}</p>
      </div>
    `;

    const approveBtn = document.getElementById('btn-approve-speaker');
    if (approveBtn) {
      approveBtn.onclick = async () => {
        try {
          await API.reviewSpeaker(spk.id, { action: 'APPROVE' });
          modal.classList.remove('active');
          notify('Palestrante aprovado com sucesso! Já está visível na página pública.', 'success');
          loadAdminSpeakers();
        } catch (e) {
          notify('Erro: ' + e.message, 'error');
        }
      };
    }

    modal.classList.add('active');
  } catch (err) {
    notify('Erro ao carregar dados: ' + err.message, 'error');
  }
};

window.deleteSpeakerPrompt = async function(id) {
  if (!confirm('Deseja realmente remover este palestrante?')) return;
  try {
    await API.deleteSpeaker(id);
    loadAdminSpeakers();
  } catch (e) {
    notify('Erro: ' + e.message, 'error');
  }
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

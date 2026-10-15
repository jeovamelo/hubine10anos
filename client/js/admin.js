// Restricted Administration Dashboard Logic
let currentAdminTab = 'overview';
let cachedRegistrations = [];

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

  // Quick preset login helper buttons for demonstration
  const presetBtns = document.querySelectorAll('[data-login-preset]');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-login-preset');
      const emailInput = document.getElementById('admin-login-email');
      const passInput = document.getElementById('admin-login-password');
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

  // Tab switching
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      switchAdminTab(targetTab);
    });
  });

  // Load initial tab
  switchAdminTab('overview');
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

    document.getElementById('kpi-total-val').textContent = data.total;
    document.getElementById('kpi-confirmed-val').textContent = data.confirmed;
    document.getElementById('kpi-present-val').textContent = data.present;
    document.getElementById('kpi-waitlist-val').textContent = data.waitlist;
    document.getElementById('kpi-cancelled-val').textContent = data.cancelled;
    document.getElementById('kpi-occupancy-val').textContent = data.occupancyPercent + '%';
    document.getElementById('kpi-attendance-val').textContent = data.attendancePercent + '%';

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
  if (countEl) countEl.textContent = list.length + ' registro(s)';
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;" class="text-muted">Nenhum participante encontrado.</td></tr>';
    return;
  }

  container.innerHTML = list.map(r => {
    let statusBadge = '';
    if (r.status === 'CONFIRMADO') statusBadge = '<span class="badge badge-success">Confirmado</span>';
    else if (r.status === 'PRESENTE') statusBadge = '<span class="badge badge-info">Presente</span>';
    else if (r.status === 'LISTA_ESPERA') statusBadge = `<span class="badge badge-warning">Lista Espera #${r.waitlistPosition || '1'}</span>`;
    else if (r.status === 'CANCELADO') statusBadge = '<span class="badge badge-danger">Cancelado</span>';

    return `
      <tr>
        <td style="font-weight: 700; color: var(--primary);">${escapeHtml(r.registrationNumber)}</td>
        <td>
          <strong>${escapeHtml(r.name)}</strong>
          ${r.badgeName && r.badgeName !== r.name ? `<br><small class="text-muted">Crachá: ${escapeHtml(r.badgeName)}</small>` : ''}
          ${r.accessibility ? `<span title="Recurso de acessibilidade solicitado" style="margin-left:4px;">♿</span>` : ''}
        </td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.institution)}</td>
        <td><span class="badge badge-secondary">${escapeHtml(r.profile)}</span></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewRegistrationDetail('${r.id}')" title="Ver detalhes">🔍</button>
          ${r.status === 'LISTA_ESPERA' ? `
            <button class="btn btn-sm btn-primary" onclick="promoteRegistration('${r.id}')" title="Promover para Confirmado">Promover</button>
          ` : ''}
          ${r.status !== 'CANCELADO' ? `
            <button class="btn btn-sm btn-secondary" onclick="resendRegistrationTicket('${r.id}')" title="Reenviar Comprovante">📧</button>
            <button class="btn btn-sm btn-outline-danger" onclick="cancelRegistrationAdmin('${r.id}')" title="Cancelar Inscrição">✕</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function setupRegistrationsFilters() {
  const searchInput = document.getElementById('reg-filter-search');
  const statusFilter = document.getElementById('reg-filter-status');
  const profileFilter = document.getElementById('reg-filter-profile');

  function applyFilter() {
    let filtered = [...cachedRegistrations];
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const st = statusFilter ? statusFilter.value : '';
    const pf = profileFilter ? profileFilter.value : '';

    if (q) {
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.institution && r.institution.toLowerCase().includes(q)) ||
        (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q))
      );
    }
    if (st) filtered = filtered.filter(r => r.status === st);
    if (pf) filtered = filtered.filter(r => r.profile === pf);

    renderRegistrationsTable(filtered);
  }

  if (searchInput) searchInput.oninput = applyFilter;
  if (statusFilter) statusFilter.onchange = applyFilter;
  if (profileFilter) profileFilter.onchange = applyFilter;

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.onclick = () => {
      window.location.href = API.getBasePath() + '/api/admin/export/csv?token=' + API.getToken();
    };
  }
}

// Action helpers
window.viewRegistrationDetail = function(id) {
  const r = cachedRegistrations.find(item => item.id === id);
  if (!r) return;

  const modal = document.getElementById('reg-detail-modal');
  const body = document.getElementById('reg-detail-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="line-height: 1.8;">
      <p><strong>Número:</strong> ${escapeHtml(r.registrationNumber)}</p>
      <p><strong>Nome Completo:</strong> ${escapeHtml(r.name)}</p>
      <p><strong>Nome no Crachá:</strong> ${escapeHtml(r.badgeName || r.name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(r.email)}</p>
      <p><strong>Instituição / Empresa:</strong> ${escapeHtml(r.institution)}</p>
      <p><strong>Perfil:</strong> ${escapeHtml(r.profile)}</p>
      <p><strong>Cargo / Função:</strong> ${escapeHtml(r.role || 'Não informado')}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(r.phone || 'Não informado')}</p>
      <p><strong>Cidade e UF:</strong> ${escapeHtml(r.cityUf || 'Não informado')}</p>
      <p><strong>Status:</strong> ${escapeHtml(r.status)}</p>
      
      <div style="background-color: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin: 1rem 0;">
        <strong style="color: var(--primary);">Recurso de Acessibilidade Solicitado (Confidencial):</strong>
        <p style="margin: 0.25rem 0 0 0; color: ${r.accessibility ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${escapeHtml(r.accessibility || 'Nenhum recurso solicitado.')}
        </p>
      </div>

      <p><strong>Opt-in Comunicação Futura:</strong> ${r.futureEventsOptIn ? 'Sim' : 'Não'}</p>
      <p><strong>Data de Inscrição:</strong> ${new Date(r.createdAt).toLocaleString('pt-BR')}</p>
      ${r.checkinAt ? `<p><strong>Credenciado em:</strong> ${new Date(r.checkinAt).toLocaleString('pt-BR')} por ${escapeHtml(r.checkinOperator || 'Operador')}</p>` : ''}
    </div>
  `;

  modal.classList.add('active');
};

window.promoteRegistration = async function(id) {
  if (!confirm('Deseja promover este participante da lista de espera para CONFIRMADO? Um e-mail com o comprovante será enviado automaticamente.')) return;
  try {
    const res = await API.promoteAdminWaitlist(id);
    alert(res.message);
    loadAdminRegistrations();
    loadAdminOverview();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.resendRegistrationTicket = async function(id) {
  try {
    const res = await API.resendAdminTicket(id);
    alert(res.message);
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.cancelRegistrationAdmin = async function(id) {
  if (!confirm('Tem certeza que deseja cancelar esta inscrição? Caso ela seja confirmada, uma vaga será aberta.')) return;
  try {
    const res = await API.cancelAdminRegistration(id);
    alert(res.message);
    loadAdminRegistrations();
    loadAdminOverview();
  } catch (err) {
    alert('Erro: ' + err.message);
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
        alert('Erro ao gerar convite: ' + err.message);
      }
    };
  }
}

window.copySpeakerLink = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copiado para a área de transferência!\n\n' + url);
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
          alert('Palestrante aprovado com sucesso! Já está visível na página pública.');
          loadAdminSpeakers();
        } catch (e) {
          alert('Erro: ' + e.message);
        }
      };
    }

    modal.classList.add('active');
  } catch (err) {
    alert('Erro ao carregar dados: ' + err.message);
  }
};

window.deleteSpeakerPrompt = async function(id) {
  if (!confirm('Deseja realmente remover este palestrante?')) return;
  try {
    await API.deleteSpeaker(id);
    loadAdminSpeakers();
  } catch (e) {
    alert('Erro: ' + e.message);
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
          alert('Grade de programação atualizada com sucesso!');
        } catch (e) {
          alert('Erro ao salvar: ' + e.message);
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
          alert('Configurações do evento atualizadas com sucesso!');
        } catch (err) {
          alert('Erro ao salvar: ' + err.message);
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
          alert('Usuário criado com sucesso!');
          loadAdminUsers();
        } catch (err) {
          alert('Erro ao criar usuário: ' + err.message);
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
    alert('Erro: ' + err.message);
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
    alert('Erro ao exibir e-mail: ' + err.message);
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

// Global Toast Notification Helper
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const safeType = type === 'danger' ? 'error' : type;
  toast.className = `toast toast-${safeType}`;
  
  let icon = 'ℹ️';
  if (safeType === 'success') icon = '✅';
  else if (safeType === 'error') icon = '❌';
  else if (safeType === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <div class="toast-content">
      <span>${icon}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close" aria-label="Fechar notificação">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  };

  if (closeBtn) closeBtn.addEventListener('click', removeToast);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}
window.showToast = showToast;

// Public Event Landing Page Logic
let currentEventInfo = null;

async function initPublicPage() {
  try {
    loadEventInfo();
    loadSchedule();
    loadPublicSpeakers();
    setupRegistrationForm();
    setupFaqAccordion();
    setupPrivacyModal();
  } catch (err) {
    console.error('Erro ao inicializar página pública:', err);
  }
}

async function loadEventInfo() {
  try {
    const data = await API.getEventInfo();
    currentEventInfo = data;

    // Update demo mode notification banner
    const demoBar = document.getElementById('demo-mode-banner');
    if (demoBar) {
      if (data.isDemoMode) {
        demoBar.style.display = 'flex';
      } else {
        demoBar.style.display = 'none';
      }
    }

    // Capacity & Waitlist Badge in Hero and Form
    const capacityBadge = document.getElementById('hero-capacity-badge');
    const formCapacityAlert = document.getElementById('form-capacity-alert');

    if (data.isWaitlistActive) {
      if (capacityBadge) {
        capacityBadge.className = 'badge badge-warning';
        capacityBadge.innerHTML = '⚠️ Capacidade Inicial Atingida • Lista de Espera Aberta';
      }
      if (formCapacityAlert) {
        formCapacityAlert.className = 'alert alert-warning';
        formCapacityAlert.style.display = 'flex';
        formCapacityAlert.innerHTML = '<strong>Aviso de Capacidade:</strong> As vagas com confirmação imediata para o auditório foram preenchidas. Novas inscrições serão registradas na <strong>Lista de Espera</strong> e notificadas automaticamente havendo desistências ou liberação de vagas.';
      }
      const submitBtn = document.getElementById('reg-submit-btn');
      if (submitBtn) {
        submitBtn.innerHTML = 'Inscrever-se na Lista de Espera';
      }
    } else {
      if (capacityBadge) {
        capacityBadge.className = 'badge badge-success';
        capacityBadge.innerHTML = `✅ Inscrições Abertas • ${data.remainingSpots} vagas restantes`;
      }
      if (formCapacityAlert) {
        formCapacityAlert.style.display = 'none';
      }
      const submitBtn = document.getElementById('reg-submit-btn');
      if (submitBtn) {
        submitBtn.innerHTML = 'Confirmar minha participação';
      }
    }

    // Update address and map link
    const locAddressEl = document.getElementById('location-address-text');
    if (locAddressEl && data.locationAddress) {
      locAddressEl.textContent = data.locationAddress;
    }
    const locMapBtn = document.getElementById('location-map-btn');
    if (locMapBtn && data.locationMapUrl) {
      locMapBtn.href = data.locationMapUrl;
    }

    // Update Privacy Notice text if configured
    if (data.privacyNotice) {
      const pController = document.getElementById('privacy-modal-controller');
      const pPurpose = document.getElementById('privacy-modal-purpose');
      const pLegal = document.getElementById('privacy-modal-legal');
      const pRetention = document.getElementById('privacy-modal-retention');
      const pContact = document.getElementById('privacy-modal-contact');
      if (pController) pController.textContent = data.privacyNotice.controller;
      if (pPurpose) pPurpose.textContent = data.privacyNotice.purpose;
      if (pLegal) pLegal.textContent = data.privacyNotice.legalBasis;
      if (pRetention) pRetention.textContent = data.privacyNotice.retentionPeriod;
      if (pContact) pContact.textContent = data.privacyNotice.dpoContact;
    }
  } catch (err) {
    console.warn('Não foi possível carregar dados do evento:', err);
  }
}

async function loadSchedule() {
  const container = document.getElementById('schedule-timeline-container');
  if (!container) return;

  try {
    const list = await API.getSchedule();
    if (!list || list.length === 0) {
      container.innerHTML = '<p class="text-muted">A programação detalhada está sendo finalizada pela comissão organizadora.</p>';
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="timeline-item">
        <div class="timeline-time-col">
          <div class="timeline-time">${escapeHtml(item.time)}</div>
        </div>
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="timeline-title">${escapeHtml(item.title)}</div>
          ${item.speaker ? `<div class="timeline-speaker">${escapeHtml(item.speaker)}${item.institution ? ' • ' + escapeHtml(item.institution) : ''}</div>` : ''}
          ${item.description ? `<div class="timeline-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted">Erro ao carregar programação.</p>';
  }
}

async function loadPublicSpeakers() {
  const container = document.getElementById('speakers-grid-container');
  if (!container) return;

  try {
    const speakers = await API.getPublicSpeakers();
    if (!speakers || speakers.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <p class="text-muted" style="margin: 0;">Os palestrantes confirmados serão apresentados após revisão e autorização das informações de divulgação.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = speakers.map(spk => {
      const initials = spk.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      return `
        <div class="speaker-card">
          <div class="speaker-avatar-wrap">
            ${spk.photoUrl ? `
              <img src="${spk.photoUrl}" alt="${escapeHtml(spk.name)}" class="speaker-avatar-img">
            ` : `
              <span class="speaker-avatar-initials">${initials}</span>
            `}
          </div>
          <h3 class="speaker-name">${escapeHtml(spk.name)}</h3>
          <div class="speaker-role">${escapeHtml(spk.role)}</div>
          <div class="speaker-institution">${escapeHtml(spk.institution)}</div>
          
          ${spk.talkTitle ? `
            <div class="speaker-talk-box">
              <div style="font-size: 0.725rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); font-weight: 700; margin-bottom: 2px;">Participação Prevista</div>
              <div class="speaker-talk-title">${escapeHtml(spk.talkTitle)}</div>
            </div>
          ` : ''}

          ${spk.bio ? `<p class="speaker-bio">${escapeHtml(spk.bio)}</p>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted">Erro ao carregar palestrantes.</p>';
  }
}

function setupRegistrationForm() {
  const form = document.getElementById('guest-registration-form');
  if (!form) return;

  const emailInput = document.getElementById('reg-email');
  const alertContainer = document.getElementById('reg-form-alert');
  const submitBtn = document.getElementById('reg-submit-btn');

  // Phone input formatting mask
  const phoneInput = document.getElementById('reg-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 6) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
      } else if (v.length > 2) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      } else {
        e.target.value = v;
      }
    });
  }

  // Duplicate email check on blur
  if (emailInput) {
    emailInput.addEventListener('blur', async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes('@')) return;

      try {
        const res = await API.checkEmail(email);
        if (res.registered) {
          showDuplicateNotice(email);
        }
      } catch (err) {
        // silent
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (alertContainer) {
      alertContainer.style.display = 'none';
      alertContainer.innerHTML = '';
    }

    const payload = {
      name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      institution: document.getElementById('reg-institution').value.trim(),
      profile: document.getElementById('reg-profile').value,
      badgeName: document.getElementById('reg-badge-name').value.trim(),
      role: document.getElementById('reg-role').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      cityUf: document.getElementById('reg-city').value.trim(),
      accessibility: document.getElementById('reg-accessibility').value.trim(),
      futureEventsOptIn: document.getElementById('reg-optin').checked,
      privacyAccepted: document.getElementById('reg-privacy-check').checked
    };

    if (!payload.name || !payload.email || !payload.institution || !payload.profile) {
      showAlert(alertContainer, 'danger', 'Por favor, preencha todos os campos obrigatórios assinalados com (*).');
      return;
    }

    if (!payload.privacyAccepted) {
      showAlert(alertContainer, 'danger', 'É necessário manifestar ciência sobre o aviso de privacidade para prosseguir.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Processando inscrição...';

      const res = await API.registerGuest(payload);

      // Successfully registered -> navigate to ticket voucher view!
      window.location.hash = '#comprovante/' + res.token;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = currentEventInfo && currentEventInfo.isWaitlistActive
        ? 'Inscrever-se na Lista de Espera'
        : 'Confirmar minha participação';

      if (err.data && err.data.error === 'DUPLICATE_EMAIL') {
        showDuplicateNotice(payload.email);
      } else {
        showAlert(alertContainer, 'danger', err.message || 'Ocorreu um erro ao enviar sua inscrição. Verifique os dados e tente novamente.');
      }
    }
  });
}

function showDuplicateNotice(email) {
  const modal = document.getElementById('duplicate-email-modal');
  const targetEmailEl = document.getElementById('duplicate-modal-email');
  if (targetEmailEl) targetEmailEl.textContent = email;
  if (modal) modal.classList.add('active');
}

function setupFaqAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');

      // Close other open accordion items
      document.querySelectorAll('.accordion-item.open').forEach(openItem => {
        if (openItem !== item) openItem.classList.remove('open');
      });

      if (isOpen) {
        item.classList.remove('open');
      } else {
        item.classList.add('open');
      }
    });
  });
}

function setupPrivacyModal() {
  const openLinks = document.querySelectorAll('[data-open-privacy-modal]');
  const modal = document.getElementById('privacy-policy-modal');
  const closeBtns = modal ? modal.querySelectorAll('.modal-close, [data-close-modal]') : [];

  openLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.classList.add('active');
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  });

  // Duplicate email modal handlers
  const dupModal = document.getElementById('duplicate-email-modal');
  if (dupModal) {
    const dupClose = dupModal.querySelectorAll('.modal-close, [data-close-modal]');
    dupClose.forEach(b => b.addEventListener('click', () => dupModal.classList.remove('active')));

    const resendBtn = document.getElementById('btn-resend-duplicate-access');
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        const email = document.getElementById('reg-email').value.trim();
        if (!email) return;

        resendBtn.disabled = true;
        resendBtn.textContent = 'Enviando link...';
        try {
          const res = await API.resendAccess(email);
          dupModal.classList.remove('active');
          showToast(res.message, 'success');
        } catch (e) {
          showToast('Erro ao reenviar: ' + e.message, 'error');
        } finally {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Reenviar Comprovante por E-mail';
        }
      });
    }
  }
}

function showAlert(container, type, message) {
  if (!container) return;
  container.className = 'alert alert-' + type;
  container.innerHTML = message;
  container.style.display = 'flex';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

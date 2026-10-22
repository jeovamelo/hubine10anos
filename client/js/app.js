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

// Universal Modal & Popup Close System (Guarantees 100% reliable closing across the entire site)
function setupUniversalModalCloseHandlers() {
  if (window._universalModalHandlersInstalled) return;
  window._universalModalHandlersInstalled = true;

  window.closeModal = function(modalOrId) {
    const el = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!el) return;
    el.classList.remove('active');
    el.style.display = '';
    if (el.id === 'hubine-slide-modal' && typeof window.closeSlideDeck === 'function') {
      try { window.closeSlideDeck(); } catch (e) {}
    }
    const alert = el.querySelector('.alert');
    if (alert) {
      alert.style.display = 'none';
      alert.innerHTML = '';
    }
  };

  window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay.active, .slide-deck-modal.active').forEach(m => {
      window.closeModal(m);
    });
  };

  // Delegated click on document in capture phase
  document.addEventListener('click', (e) => {
    // A. Explicit close triggers
    const closeBtn = e.target.closest('.modal-close, [data-close-modal], .slide-deck-close, button[aria-label="Fechar"], button[aria-label="Fechar modal"]');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const modal = closeBtn.closest('.modal-overlay, .slide-deck-modal, [role="dialog"]');
      if (modal) {
        window.closeModal(modal);
      } else {
        window.closeAllModals();
      }
      return;
    }

    // B. Footer button with text 'Fechar' or 'Cancelar'
    const footerBtn = e.target.closest('.modal-footer button, .modal-card .btn-secondary');
    if (footerBtn && (!footerBtn.hasAttribute('type') || footerBtn.type === 'button')) {
      const txt = footerBtn.textContent.trim().toLowerCase();
      if (txt === 'fechar' || txt === 'cancelar' || txt === 'entendi' || txt === '✕ fechar slides') {
        e.preventDefault();
        e.stopPropagation();
        const modal = footerBtn.closest('.modal-overlay, .slide-deck-modal, [role="dialog"]');
        if (modal) {
          window.closeModal(modal);
        }
        return;
      }
    }

    // C. Backdrop click (clicking on overlay directly)
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('slide-deck-modal')) {
      e.preventDefault();
      window.closeModal(e.target);
    }
  }, true);

  // Keyboard Escape listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const activeModals = document.querySelectorAll('.modal-overlay.active, .slide-deck-modal.active');
      if (activeModals.length > 0) {
        e.preventDefault();
        activeModals.forEach(m => window.closeModal(m));
      }
    }
  });
}
setupUniversalModalCloseHandlers();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUniversalModalCloseHandlers);
}

// Public Event Landing Page Logic
let currentEventInfo = null;
let publicPageInitialized = false;

async function initPublicPage() {
  try {
    loadEventInfo();
    loadSchedule();
    loadPublicSpeakers();
    if (!publicPageInitialized) {
      publicPageInitialized = true;
      setupRegistrationForm();
      setupFaqAccordion();
      setupPrivacyModal();
      setupCalendarModal();
    }
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
      const safePhoto = sanitizePhotoUrl(spk.photoUrl);
      return `
        <div class="speaker-card">
          <div class="speaker-avatar-wrap">
            ${safePhoto ? `
              <img src="${escapeHtml(safePhoto)}" alt="${escapeHtml(spk.name)}" class="speaker-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <span class="speaker-avatar-initials" style="display: none;">${initials}</span>
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
      accessibility: document.getElementById('reg-accessibility') ? document.getElementById('reg-accessibility').value.trim() : '',
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
  const accordion = document.querySelector('.accordion');
  if (!accordion) return;
  if (accordion.dataset.faqInitialized === 'true') return;
  accordion.dataset.faqInitialized = 'true';

  accordion.addEventListener('click', (e) => {
    const header = e.target.closest('.accordion-header');
    if (!header) return;
    e.preventDefault();

    const item = header.closest('.accordion-item');
    if (!item) return;

    const isOpen = item.classList.contains('open');

    // Close other open accordion items
    accordion.querySelectorAll('.accordion-item.open').forEach(openItem => {
      if (openItem !== item) {
        openItem.classList.remove('open');
        const content = openItem.querySelector('.accordion-content');
        if (content) content.style.display = 'none';
      }
    });

    if (isOpen) {
      item.classList.remove('open');
      const content = item.querySelector('.accordion-content');
      if (content) content.style.display = 'none';
    } else {
      item.classList.add('open');
      const content = item.querySelector('.accordion-content');
      if (content) content.style.display = 'block';
    }
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

function setupCalendarModal() {
  const dateCard = document.getElementById('hero-card-date');
  const modal = document.getElementById('calendar-modal');
  if (!dateCard || !modal) return;

  if (dateCard.dataset.calendarInitialized === 'true') return;
  dateCard.dataset.calendarInitialized = 'true';

  const openModal = () => {
    modal.classList.add('active');
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  dateCard.addEventListener('click', openModal);
  dateCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  });

  const closeBtns = modal.querySelectorAll('.modal-close, [data-close-modal]');
  closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Calendar Event Details
  const eventDetails = {
    title: 'Hubine 10 Anos (2016–2026)',
    location: 'Auditório Celso Furtado, Campus Banco do Nordeste, Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza - CE',
    description: 'Celebração dos 10 anos do Hub de Inovação do Banco do Nordeste (2016–2026).\n\nConectando inovação, pessoas e desenvolvimento regional.\n\nData: 4 de novembro de 2026 (a partir das 13h)\nLocal: Auditório Celso Furtado, Campus Banco do Nordeste, Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza - CE\nMais informações: https://eventos.hubine.org/dezanos'
  };

  // Google Calendar URL (04/11/2026 13:00 to 18:00 BRT UTC-3 -> 16:00 to 21:00 UTC)
  const gcalBtn = document.getElementById('btn-google-calendar');
  if (gcalBtn) {
    const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
      encodeURIComponent(eventDetails.title) +
      '&dates=20261104T160000Z/20261104T210000Z&ctz=America/Fortaleza&details=' +
      encodeURIComponent(eventDetails.description) +
      '&location=' + encodeURIComponent(eventDetails.location);
    gcalBtn.href = gcalUrl;
  }

  // Outlook Calendar URL (Web / Live / Office 365)
  const outlookBtn = document.getElementById('btn-outlook-calendar');
  if (outlookBtn) {
    const outlookUrl = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=' +
      encodeURIComponent(eventDetails.title) +
      '&startdt=2026-11-04T13:00:00-03:00&enddt=2026-11-04T18:00:00-03:00&location=' +
      encodeURIComponent(eventDetails.location) +
      '&body=' + encodeURIComponent(eventDetails.description);
    outlookBtn.href = outlookUrl;
  }

  // ICS File Generation & Download
  const icsBtn = document.getElementById('btn-download-ics');
  if (icsBtn) {
    icsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Banco do Nordeste//Hubine 10 Anos//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:hubine-10anos-20261104@bnb.gov.br',
        'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'DTSTART:20261104T160000Z',
        'DTEND:20261104T210000Z',
        'SUMMARY:Hubine 10 Anos (2016–2026)',
        'DESCRIPTION:Celebração dos 10 anos do Hubine Banco do Nordeste (2016–2026).\n\nConectando inovação\, pessoas e desenvolvimento regional.\nLocal: Auditório Celso Furtado\, Campus Banco do Nordeste\, Av. Dr. Silas Munguba\, 5700 - Passaré\, Fortaleza - CE',
        'LOCATION:Auditório Celso Furtado\, Campus Banco do Nordeste\, Av. Dr. Silas Munguba\, 5700 - Passaré\, Fortaleza - CE',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'hubine-10-anos.ics';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    });
  }
}

// Credenciamento Mobile Check-in Logic
let html5QrScanner = null;
let lastCheckinRegNumber = null;
let isScanningActive = false;

// Web Audio API Synthesizer for pleasant chimes
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  },
  playWarning() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime); // A4
      osc.frequency.setValueAtTime(330, this.ctx.currentTime + 0.15); // E4
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
};

function initCredenciamentoPage() {
  const user = API.getUser();
  if (!user || !API.getToken()) {
    // Must authenticate first
    window.location.hash = '#admin';
    return;
  }

  const operatorEl = document.getElementById('cred-operator-name');
  if (operatorEl) operatorEl.textContent = user.name + ' (' + user.role + ')';

  setupCredenciamentoEvents();
}

function setupCredenciamentoEvents() {
  const manualForm = document.getElementById('cred-manual-form');
  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('cred-manual-input').value.trim();
      if (code) {
        processCheckinCode(code);
      }
    });
  }

  const toggleCamBtn = document.getElementById('btn-toggle-camera');
  if (toggleCamBtn) {
    toggleCamBtn.addEventListener('click', toggleCameraScanner);
  }

  const undoBtn = document.getElementById('btn-undo-checkin');
  if (undoBtn) {
    undoBtn.addEventListener('click', async () => {
      if (!lastCheckinRegNumber) return;
      if (!confirm('Desfazer check-in para ' + lastCheckinRegNumber + '?')) return;

      try {
        await API.undoCheckin(lastCheckinRegNumber);
        alert('Check-in desfeito com sucesso.');
        document.getElementById('cred-result-area').innerHTML = '';
        lastCheckinRegNumber = null;
        undoBtn.style.display = 'none';
      } catch (err) {
        alert('Erro ao desfazer: ' + err.message);
      }
    });
  }
}

async function processCheckinCode(code) {
  const resultArea = document.getElementById('cred-result-area');
  const undoBtn = document.getElementById('btn-undo-checkin');
  if (!resultArea) return;

  resultArea.innerHTML = '<div class="spinner" style="margin: 1.5rem auto;"></div>';

  try {
    const res = await API.scanCheckin(code);
    SoundFX.playSuccess();

    lastCheckinRegNumber = res.attendee.registrationNumber;
    if (undoBtn) undoBtn.style.display = 'inline-flex';

    // Time formatted
    const dateObj = new Date(res.checkinTime);
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza' });

    resultArea.innerHTML = `
      <div class="checkin-result-card checkin-result-success">
        <div style="font-size: 3rem; margin-bottom: 0.25rem;">✅</div>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Credenciamento Confirmado!</h2>
        <div style="font-size: 1.25rem; font-weight: 800; color: #065F46; margin-bottom: 0.25rem;">
          ${escapeHtml(res.attendee.name)}
        </div>
        ${res.attendee.badgeName && res.attendee.badgeName !== res.attendee.name ? `
          <div style="font-size: 0.95rem; font-weight: 600; color: #047857; margin-bottom: 0.5rem;">
            Nome no Crachá: "${escapeHtml(res.attendee.badgeName)}"
          </div>
        ` : ''}
        <div style="font-size: 0.95rem; color: #064E3B; margin-bottom: 0.75rem;">
          ${escapeHtml(res.attendee.institution)} • <strong>${escapeHtml(res.attendee.profile)}</strong>
        </div>

        ${res.attendee.accessibility ? `
          <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 0.75rem; text-align: left;">
            ♿ <strong>Atenção de Acessibilidade:</strong> ${escapeHtml(res.attendee.accessibility)}
          </div>
        ` : ''}

        <div style="font-size: 0.8rem; color: #047857;">
          Inscrição: <strong>${res.attendee.registrationNumber}</strong> | Horário: ${timeStr} | Operador: ${res.operator}
        </div>
      </div>
    `;

    // Clear input
    const input = document.getElementById('cred-manual-input');
    if (input) input.value = '';

  } catch (err) {
    SoundFX.playWarning();

    if (undoBtn) undoBtn.style.display = 'none';

    if (err.data && err.data.status === 'ALREADY_CHECKED_IN') {
      const dateObj = new Date(err.data.checkinTime);
      const timeStr = dateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza' });

      resultArea.innerHTML = `
        <div class="checkin-result-card checkin-result-warning">
          <div style="font-size: 3rem; margin-bottom: 0.25rem;">⚠️</div>
          <h2 style="font-size: 1.4rem; margin-bottom: 0.5rem;">Check-in Já Realizado!</h2>
          <div style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;">
            ${escapeHtml(err.data.attendee.name)} (${err.data.attendee.registrationNumber})
          </div>
          <p style="margin-bottom: 0.5rem; font-size: 0.9rem;">
            Este participante já realizou o credenciamento às <strong>${timeStr}</strong> com o operador <strong>${escapeHtml(err.data.operator)}</strong>.
          </p>
        </div>
      `;
    } else if (err.data && (err.data.status === 'CANCELLED' || err.data.status === 'WAITLIST')) {
      resultArea.innerHTML = `
        <div class="checkin-result-card checkin-result-danger">
          <div style="font-size: 3rem; margin-bottom: 0.25rem;">🛑</div>
          <h2 style="font-size: 1.4rem; margin-bottom: 0.5rem;">${err.data.message}</h2>
          ${err.data.attendee ? `
            <div style="font-size: 1.1rem; font-weight: 700;">${escapeHtml(err.data.attendee.name)}</div>
            <div style="font-size: 0.9rem;">${escapeHtml(err.data.attendee.institution)} (${err.data.attendee.registrationNumber})</div>
          ` : ''}
        </div>
      `;
    } else {
      resultArea.innerHTML = `
        <div class="checkin-result-card checkin-result-danger">
          <div style="font-size: 3rem; margin-bottom: 0.25rem;">❌</div>
          <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Inscrição Não Encontrada</h2>
          <p style="margin: 0; font-size: 0.9rem;">${err.message || 'Código não reconhecido no sistema.'}</p>
        </div>
      `;
    }
  }
}

function toggleCameraScanner() {
  const btn = document.getElementById('btn-toggle-camera');
  const readerEl = document.getElementById('qr-scanner-viewport');

  if (isScanningActive) {
    stopCameraScanner();
    if (btn) btn.textContent = '📷 Abrir Câmera do Celular';
    if (readerEl) readerEl.style.display = 'none';
  } else {
    startCameraScanner();
    if (btn) btn.textContent = '⏹️ Desativar Câmera';
    if (readerEl) readerEl.style.display = 'block';
  }
}

function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    alert('Biblioteca de leitura de QR Code não carregada.');
    return;
  }

  isScanningActive = true;
  html5QrScanner = new Html5Qrcode("qr-scanner-viewport");

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrScanner.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      // Pause scanner briefly to prevent multiple readings
      html5QrScanner.pause();
      processCheckinCode(decodedText);
      setTimeout(() => {
        try {
          if (html5QrScanner && isScanningActive) html5QrScanner.resume();
        } catch (e) {}
      }, 2500);
    },
    (errorMessage) => {
      // parse error, ignore
    }
  ).catch(err => {
    console.error('Erro ao iniciar câmera:', err);
    alert('Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso no seu navegador.');
    stopCameraScanner();
  });
}

function stopCameraScanner() {
  isScanningActive = false;
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(() => {
      html5QrScanner = null;
    });
  }
}

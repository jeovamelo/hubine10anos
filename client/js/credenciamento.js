// Credenciamento de Participantes - Hubine 10 Anos
let lastCheckinRegNumber = null;
let searchDebounceTimeout = null;

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
    window.location.hash = '#admin';
    return;
  }

  const operatorEl = document.getElementById('cred-operator-name');
  if (operatorEl) operatorEl.textContent = user.name + ' (' + user.role + ')';

  setupCredenciamentoEvents();
}

function setupCredenciamentoEvents() {
  const manualForm = document.getElementById('cred-manual-form');
  const manualInput = document.getElementById('cred-manual-input');

  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = manualInput ? manualInput.value.trim() : '';
      if (code) {
        hideLiveMatches();
        processCheckinCode(code);
      }
    });
  }

  if (manualInput) {
    manualInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      clearTimeout(searchDebounceTimeout);
      if (val.length >= 3) {
        searchDebounceTimeout = setTimeout(() => {
          fetchLiveSuggestions(val);
        }, 250);
      } else {
        hideLiveMatches();
      }
    });
  }

  const undoBtn = document.getElementById('btn-undo-checkin');
  if (undoBtn) {
    undoBtn.addEventListener('click', async () => {
      if (!lastCheckinRegNumber) return;
      if (!confirm('Desfazer credenciamento para a inscrição ' + lastCheckinRegNumber + '?')) return;

      try {
        await API.undoCheckin(lastCheckinRegNumber);
        alert('Credenciamento desfeito com sucesso.');
        document.getElementById('cred-result-area').innerHTML = '';
        lastCheckinRegNumber = null;
        undoBtn.style.display = 'none';
        if (manualInput) {
          manualInput.value = '';
          manualInput.focus();
        }
      } catch (err) {
        alert('Erro ao desfazer: ' + err.message);
      }
    });
  }
}

async function fetchLiveSuggestions(query) {
  const matchesContainer = document.getElementById('cred-live-matches');
  if (!matchesContainer) return;

  try {
    const res = await API.request('/api/checkin/search?q=' + encodeURIComponent(query));
    if (res && res.matches && res.matches.length > 0) {
      matchesContainer.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 0.5rem;">
            Sugestões Encontradas (Clique para Credenciar):
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${res.matches.map(m => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e1; gap: 0.5rem;">
                <div>
                  <strong style="color: #0f172a;">${escapeHtml(m.name)}</strong>
                  <span style="font-size: 0.8rem; color: #64748b; margin-left: 0.5rem;">(${escapeHtml(m.registrationNumber)})</span>
                  <div style="font-size: 0.75rem; color: #475569;">${escapeHtml(m.institution)} • <em>${escapeHtml(m.status)}</em></div>
                </div>
                <button type="button" class="btn btn-sm ${m.status === 'PRESENTE' ? 'btn-secondary' : 'btn-success'}" onclick="confirmSuggestionCheckin('${escapeHtml(m.registrationNumber)}')" style="white-space: nowrap;">
                  ${m.status === 'PRESENTE' ? '✓ Já Presente' : 'Credenciar'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      matchesContainer.style.display = 'block';
    } else {
      hideLiveMatches();
    }
  } catch (e) {
    hideLiveMatches();
  }
}

function hideLiveMatches() {
  const matchesContainer = document.getElementById('cred-live-matches');
  if (matchesContainer) {
    matchesContainer.innerHTML = '';
    matchesContainer.style.display = 'none';
  }
}

window.confirmSuggestionCheckin = function(regNumber) {
  hideLiveMatches();
  const input = document.getElementById('cred-manual-input');
  if (input) input.value = regNumber;
  processCheckinCode(regNumber);
};

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

    const dateObj = new Date(res.checkinTime);
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza' });

    resultArea.innerHTML = `
      <div class="checkin-result-card checkin-result-success" style="border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
        <div style="font-size: 3rem; margin-bottom: 0.25rem;">✅</div>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Credenciamento Confirmado!</h2>
        <div style="font-size: 1.35rem; font-weight: 800; color: #065F46; margin-bottom: 0.25rem;">
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

        <div style="font-size: 0.85rem; color: #047857; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(6,95,70,0.3);">
          Inscrição: <strong>${res.attendee.registrationNumber}</strong> | Horário: ${timeStr} | Operador: ${res.operator}
        </div>
      </div>
    `;

    const input = document.getElementById('cred-manual-input');
    if (input) {
      input.value = '';
      input.focus();
    }

  } catch (err) {
    SoundFX.playWarning();

    if (undoBtn) undoBtn.style.display = 'none';

    if (err.data && err.data.status === 'MULTIPLE_MATCHES') {
      resultArea.innerHTML = `
        <div class="checkin-result-card checkin-result-warning">
          <div style="font-size: 2.5rem; margin-bottom: 0.25rem;">👥</div>
          <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Múltiplos Participantes Encontrados</h2>
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">${escapeHtml(err.data.message)}</p>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; text-align: left;">
            ${(err.data.matches || []).map(m => `
              <div style="background: #ffffff; padding: 0.75rem; border-radius: 6px; border: 1px solid #d97706; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.registrationNumber)})
                  <div style="font-size: 0.8rem; color: #78350f;">${escapeHtml(m.institution)} | Status: ${escapeHtml(m.status)}</div>
                </div>
                <button type="button" class="btn btn-sm btn-primary" onclick="confirmSuggestionCheckin('${escapeHtml(m.registrationNumber)}')">
                  Credenciar
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (err.data && err.data.status === 'ALREADY_CHECKED_IN') {
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
          <p style="margin: 0; font-size: 0.9rem;">${err.message || 'Código ou nome não localizado no sistema. Verifique a grafia ou o número.'}</p>
        </div>
      `;
    }
  }
}

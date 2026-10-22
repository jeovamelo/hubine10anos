// Ticket Voucher & Self-Service Management
let currentTicketToken = null;
let currentTicketData = null;

async function initComprovantePage(token) {
  currentTicketToken = token;
  const container = document.getElementById('comprovante-content-area');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 1rem;">
      <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
      <p class="text-muted">Carregando seu comprovante de inscrição...</p>
    </div>
  `;

  try {
    const reg = await API.getRegistration(token);
    currentTicketData = reg;
    renderTicket(reg);
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 3rem auto; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <h2 style="margin-bottom: 0.5rem;">Inscrição não encontrada</h2>
        <p class="text-muted" style="margin-bottom: 1.5rem;">O comprovante solicitado não foi localizado ou o link é inválido.</p>
        <a href="#inicio" class="btn btn-primary">Voltar para a Página Inicial</a>
      </div>
    `;
  }
}

function renderTicket(reg) {
  const container = document.getElementById('comprovante-content-area');
  if (!container) return;

  const isConfirmed = reg.status === 'CONFIRMADO';
  const isPresent = reg.status === 'PRESENTE';
  const isWaitlist = reg.status === 'LISTA_ESPERA';
  const isCancelled = reg.status === 'CANCELADO';
  const isPending = reg.status === 'PENDENTE';

  let statusBadgeHtml = '';
  if (isPresent) {
    statusBadgeHtml = '<span class="badge badge-info" style="font-size: 0.9rem; padding: 0.4rem 1rem;">🎉 Credenciamento Concluído (Presente)</span>';
  } else if (isConfirmed) {
    statusBadgeHtml = '<span class="badge badge-success" style="font-size: 0.9rem; padding: 0.4rem 1rem;">✅ Inscrição Confirmada</span>';
  } else if (isPending) {
    statusBadgeHtml = '<span class="badge badge-warning" style="font-size: 0.9rem; padding: 0.4rem 1rem; background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;">⏳ Convite Pendente de Confirmação</span>';
  } else if (isWaitlist) {
    statusBadgeHtml = `<span class="badge badge-warning" style="font-size: 0.9rem; padding: 0.4rem 1rem;">⏳ Lista de Espera • Posição #${reg.waitlistPosition || '1'}</span>`;
  } else if (isCancelled) {
    statusBadgeHtml = '<span class="badge badge-danger" style="font-size: 0.9rem; padding: 0.4rem 1rem;">❌ Inscrição Cancelada</span>';
  }

  // Google Calendar URL
  // Event: 04/11/2026, 13:00 to 18:00 (Fortaleza, UTC-3)
  const gcalTitle = encodeURIComponent('Hubine 10 Anos — Conectando inovação, pessoas e desenvolvimento regional');
  const gcalDetails = encodeURIComponent(`Inscrição oficial: ${reg.registrationNumber}\nAuditório Celso Furtado\nCredenciamento a partir das 13h.`);
  const gcalLoc = encodeURIComponent(`${reg.locationName}, ${reg.locationAddress}`);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=20261104T160000Z/20261104T210000Z&details=${gcalDetails}&location=${gcalLoc}`;

  container.innerHTML = `
    <div class="ticket-wrapper">
      <div class="ticket-card">
        <div class="ticket-header">
          <div class="ticket-brand-badge">Banco do Nordeste • Hubine</div>
          <h1 class="ticket-event-name">Hubine 10 Anos</h1>
          <p class="ticket-theme">Conectando inovação, pessoas e desenvolvimento regional</p>
          <div class="ticket-status-pill-wrap">${statusBadgeHtml}</div>
        </div>

        <div class="ticket-body">
          ${isPending ? `
            <div style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.75rem; text-align: center;">
              <div style="font-size: 1.15rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem;">
                👋 Olá, ${escapeHtml(reg.name)}! Seu convite institucional foi reservado.
              </div>
              <p style="color: #78350f; font-size: 0.95rem; margin-bottom: 1.25rem;">
                Para garantir seu assento confirmado no Auditório Celso Furtado e habilitar seu credenciamento oficial, confirme sua participação:
              </p>
              <button id="btn-confirm-guest-attendance" class="btn btn-success btn-lg" onclick="handleConfirmGuestAttendance()" style="background-color: #059669; border-color: #059669; font-weight: 700; padding: 0.75rem 2rem; font-size: 1.05rem; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
                ✅ Confirmar Minha Presença no Evento
              </button>
            </div>
          ` : ''}
          ${!isCancelled ? `
            <div class="ticket-qr-container">
              <img src="${reg.qrCodeDataUrl}" alt="QR Code de Credenciamento" class="ticket-qr-img">
              <div class="ticket-reg-number">${escapeHtml(reg.registrationNumber)}</div>
              <p class="ticket-qr-hint">Apresente este código no credenciamento ao chegar ao evento.</p>
            </div>
          ` : `
            <div class="alert alert-danger" style="margin-bottom: 2rem;">
              Esta inscrição foi voluntariamente cancelada e não confere mais acesso ao evento.
            </div>
          `}

          <div class="ticket-info-grid">
            <div>
              <div class="ticket-field-label">Participante</div>
              <div class="ticket-field-value">${escapeHtml(reg.name)}</div>
            </div>
            <div>
              <div class="ticket-field-label">Nome para Crachá</div>
              <div class="ticket-field-value">${escapeHtml(reg.badgeName || reg.name)}</div>
            </div>
            <div>
              <div class="ticket-field-label">Instituição / Empresa</div>
              <div class="ticket-field-value">${escapeHtml(reg.institution)}</div>
            </div>
            <div>
              <div class="ticket-field-label">Perfil</div>
              <div class="ticket-field-value">${escapeHtml(reg.profile)}</div>
            </div>
            <div>
              <div class="ticket-field-label">Data e Horário</div>
              <div class="ticket-field-value">04/11/2026 • Início às 13h</div>
            </div>
            <div>
              <div class="ticket-field-label">Local</div>
              <div class="ticket-field-value">${escapeHtml(reg.locationName)}</div>
            </div>
          </div>

          <div class="ticket-actions">
            ${!isCancelled ? `
              <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-block">
                📅 Adicionar ao Google Agenda
              </a>
              <a href="${API.getBasePath()}/api/public/calendar/${reg.token}" download class="btn btn-secondary btn-block">
                💾 Baixar Arquivo de Calendário (.ICS)
              </a>
              <button onclick="window.print()" class="btn btn-secondary btn-block">
                🖨️ Imprimir / Salvar PDF
              </button>
              <button onclick="openSelfServiceModal()" class="btn btn-primary btn-block">
                ✏️ Atualizar Dados ou Cancelar Inscrição
              </button>
            ` : ''}
            <a href="#inicio" class="btn btn-outline-light btn-block" style="color: var(--text-muted); border-color: var(--border-subtle); margin-top: 0.5rem;">
              ← Voltar à Página do Evento
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function openSelfServiceModal() {
  if (!currentTicketData) return;
  const reg = currentTicketData;

  const modal = document.getElementById('self-service-modal');
  if (!modal) return;

  document.getElementById('self-badge-name').value = reg.badgeName || reg.name;
  document.getElementById('self-role').value = reg.role || '';
  document.getElementById('self-phone').value = reg.phone || '';
  document.getElementById('self-city').value = reg.cityUf || '';
  document.getElementById('self-accessibility').value = reg.accessibility || '';

  modal.classList.add('active');
}

function setupSelfServiceHandlers() {
  const modal = document.getElementById('self-service-modal');
  if (!modal) return;

  const closeBtns = modal.querySelectorAll('.modal-close, [data-close-modal]');
  closeBtns.forEach(b => b.addEventListener('click', () => modal.classList.remove('active')));

  const saveBtn = document.getElementById('self-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';

      try {
        const payload = {
          badgeName: document.getElementById('self-badge-name').value.trim(),
          role: document.getElementById('self-role').value.trim(),
          phone: document.getElementById('self-phone').value.trim(),
          cityUf: document.getElementById('self-city').value.trim(),
          accessibility: document.getElementById('self-accessibility').value.trim()
        };

        const res = await API.updateRegistration(currentTicketToken, payload);
        modal.classList.remove('active');
        alert('Dados atualizados com sucesso!');
        initComprovantePage(currentTicketToken);
      } catch (err) {
        alert('Erro ao atualizar dados: ' + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
      }
    });
  }

  const cancelBtn = document.getElementById('self-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const confirmFirst = confirm('Tem certeza que deseja cancelar sua inscrição?\n\nSua vaga será imediatamente liberada para a lista de espera e este comprovante será invalidado.');
      if (!confirmFirst) return;

      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Cancelando...';

      try {
        await API.cancelRegistration(currentTicketToken);
        modal.classList.remove('active');
        alert('Sua inscrição foi cancelada com sucesso. Agradecemos por avisar com antecedência.');
        initComprovantePage(currentTicketToken);
      } catch (err) {
        alert('Erro ao cancelar: ' + err.message);
      } finally {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Cancelar Minha Inscrição';
      }
    });
  }
}

window.handleConfirmGuestAttendance = async function() {
  if (!currentTicketToken) return;
  const btn = document.getElementById('btn-confirm-guest-attendance');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Confirmando presença...';
  }
  try {
    const res = await API.confirmRegistration(currentTicketToken);
    alert(res.message || 'Presença confirmada com sucesso! Sua vaga no auditório está garantida.');
    await initComprovantePage(currentTicketToken);
  } catch (err) {
    alert('Não foi possível confirmar: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ Confirmar Minha Presença no Evento';
    }
  }
};

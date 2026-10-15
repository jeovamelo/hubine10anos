// Speaker Private Onboarding Logic
let currentSpeakerToken = null;

async function initPalestrantePage(token) {
  currentSpeakerToken = token;
  const container = document.getElementById('palestrante-content-area');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 1rem;">
      <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
      <p class="text-muted">Carregando convite exclusivo de palestrante...</p>
    </div>
  `;

  try {
    const spk = await API.getSpeakerInvite(token);
    renderSpeakerForm(spk);
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 3rem auto; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
        <h2 style="margin-bottom: 0.5rem;">Convite não localizado</h2>
        <p class="text-muted" style="margin-bottom: 1.5rem;">Este link de palestrante é inválido ou já foi revogado pela organização.</p>
        <a href="#inicio" class="btn btn-primary">Voltar à Página Inicial</a>
      </div>
    `;
  }
}

function renderSpeakerForm(spk) {
  const container = document.getElementById('palestrante-content-area');
  if (!container) return;

  const isApproved = spk.status === 'APROVADO';
  const isAwaitingReview = spk.status === 'AGUARDANDO_REVISAO';

  container.innerHTML = `
    <div style="max-width: 780px; margin: 2rem auto; padding: 0 1rem;">
      <div class="card">
        <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
          <div class="badge badge-primary" style="margin-bottom: 0.5rem;">Acesso Exclusivo por Convite</div>
          <h1 style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;">Cadastro de Palestrante / Painelista</h1>
          <p class="text-muted" style="margin: 0;">Hubine 10 Anos • 4 de novembro de 2026 • Auditório Celso Furtado</p>
        </div>

        ${isApproved ? `
          <div class="alert alert-success">
            <strong>Status: APROVADO!</strong> Seus dados já foram revisados pela comissão organizadora e estão publicados na programação oficial do evento.
          </div>
        ` : isAwaitingReview ? `
          <div class="alert alert-info">
            <strong>Status: Em Revisão.</strong> Seus dados foram enviados e estão sendo avaliados pela comissão organizadora. Caso necessite realizar alterações, envie o formulário novamente abaixo.
          </div>
        ` : `
          <div class="alert alert-warning">
            Por favor, preencha as informações para alinhamento com a produção do evento e divulgação institucional. Nada será publicado sem sua autorização e revisão prévia da organização.
          </div>
        `}

        <form id="speaker-onboarding-form">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="spk-name">Nome Profissional para Divulgação <span class="required-mark">*</span></label>
              <input type="text" id="spk-name" class="form-input" value="${escapeHtml(spk.name || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="spk-role">Cargo ou Função <span class="required-mark">*</span></label>
              <input type="text" id="spk-role" class="form-input" value="${escapeHtml(spk.role || '')}" placeholder="Ex: Diretor de Inovação" required>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="spk-institution">Instituição ou Empresa <span class="required-mark">*</span></label>
              <input type="text" id="spk-institution" class="form-input" value="${escapeHtml(spk.institution || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="spk-contact">Telefone / WhatsApp para Alinhamento</label>
              <input type="text" id="spk-contact" class="form-input" value="${escapeHtml(spk.contact || '')}" placeholder="(DDD) 99999-9999">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="spk-talk-title">Título da Participação ou Palestra <span class="required-mark">*</span></label>
            <input type="text" id="spk-talk-title" class="form-input" value="${escapeHtml(spk.talkTitle || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="spk-talk-summary">Resumo da Participação (Sinopse)</label>
            <textarea id="spk-talk-summary" class="form-textarea" rows="3" placeholder="Breve resumo dos tópicos abordados...">${escapeHtml(spk.talkSummary || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="spk-bio">Biografia Curta (Minicurrículo)</label>
            <textarea id="spk-bio" class="form-textarea" rows="4" placeholder="Até 4 linhas destacando sua trajetória...">${escapeHtml(spk.bio || '')}</textarea>
            <span class="form-hint">Texto utilizado para apresentação pelo mestre de cerimônias e no material oficial.</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="spk-photo-input">Foto Profissional (Opcional - máx. 2MB)</label>
            <input type="file" id="spk-photo-input" class="form-input" accept="image/jpeg,image/png,image/webp">
            <div id="spk-photo-preview-wrap" style="margin-top: 10px; ${spk.photoUrl ? '' : 'display:none;'}">
              <img id="spk-photo-preview" src="${spk.photoUrl || ''}" alt="Preview" style="width: 100px; height: 100px; object-fit: cover; border-radius: var(--radius-md); border: 2px solid var(--border-subtle);">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="spk-av">Necessidades de Recursos Audiovisuais (AV)</label>
            <textarea id="spk-av" class="form-textarea" rows="2" placeholder="Ex: Microfone auricular, passador de slides, áudio do notebook, formato 16:9...">${escapeHtml(spk.avNeeds || '')}</textarea>
          </div>

          <div class="privacy-box" style="margin: 1.5rem 0;">
            <h4 style="margin-top: 0;">Autorização Específica de Publicação (LGPD)</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Em conformidade com a LGPD, o uso de imagem e dados biográficos para divulgação pública requer autorização destacada do titular.
            </p>
            <label class="form-checkbox-label">
              <input type="checkbox" id="spk-consent-check" ${spk.authorizedPublishing ? 'checked' : ''} required>
              <span><strong>Autorizo expressamente</strong> a comissão organizadora do Hubine 10 Anos a publicar meu nome profissional, cargo, instituição, foto e biografia na programação oficial e peças de divulgação do evento.</span>
            </label>
          </div>

          <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
            <a href="#inicio" class="btn btn-secondary">Cancelar</a>
            <button type="submit" id="spk-submit-btn" class="btn btn-primary btn-lg">
              Enviar Dados para Revisão da Organização
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupSpeakerFormEvents(spk);
}

function setupSpeakerFormEvents(spk) {
  let photoBase64 = spk.photoUrl || '';

  const photoInput = document.getElementById('spk-photo-input');
  const photoPreview = document.getElementById('spk-photo-preview');
  const photoWrap = document.getElementById('spk-photo-preview-wrap');

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        alert('A foto selecionada ultrapassa 2MB. Por favor escolha uma imagem menor.');
        photoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        photoBase64 = ev.target.result;
        photoPreview.src = photoBase64;
        photoWrap.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  const form = document.getElementById('speaker-onboarding-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = document.getElementById('spk-submit-btn');
      const authorized = document.getElementById('spk-consent-check').checked;

      if (!authorized) {
        alert('É necessária a autorização de publicação para prosseguir.');
        return;
      }

      const payload = {
        professionalName: document.getElementById('spk-name').value.trim(),
        role: document.getElementById('spk-role').value.trim(),
        institution: document.getElementById('spk-institution').value.trim(),
        talkTitle: document.getElementById('spk-talk-title').value.trim(),
        talkSummary: document.getElementById('spk-talk-summary').value.trim(),
        bio: document.getElementById('spk-bio').value.trim(),
        contact: document.getElementById('spk-contact').value.trim(),
        avNeeds: document.getElementById('spk-av').value.trim(),
        photoUrl: photoBase64,
        authorizedPublishing: true
      };

      try {
        btn.disabled = true;
        btn.textContent = 'Enviando dados...';

        const res = await API.submitSpeakerInvite(currentSpeakerToken, payload);
        alert(res.message);
        initPalestrantePage(currentSpeakerToken);
      } catch (err) {
        alert('Erro ao enviar dados: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Dados para Revisão da Organização';
      }
    });
  }
}

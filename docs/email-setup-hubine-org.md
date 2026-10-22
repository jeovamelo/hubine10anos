# Especificação e Procedimento de Implantação de E-mail: eventos@hubine.org

Este documento descreve os requisitos técnicos, registros DNS, diretrizes de segurança e procedimentos operacionais necessários para ativar e conectar o endereço oficial **eventos@hubine.org** à aplicação Hubine 10 Anos.

> [!IMPORTANT]
> **Status Atual:** A aplicação foi adaptada com o remetente oficial `Hubine Eventos <eventos@hubine.org>`, autenticação TLS e tratamento de falhas estrito. A criação física da caixa e a publicação de registros no domínio `hubine.org` dependem de credenciais de acesso ao DNS autoritativo e ao servidor de correio do domínio.

---

## 1. Registros DNS Necessários

Para garantir alta entregabilidade, conformidade com políticas anti-spam e evitar que os comunicados caiam na caixa de spam (especialmente em provedores como Gmail, Outlook e corporativos), configure os seguintes registros na zona de DNS de `hubine.org`:

### 1.1 Registro MX (Mail Exchange)
| Tipo | Host / Nome | Valor / Destino | Prioridade | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **MX** | `@` (ou `hubine.org.`) | `mail.hubine.org.` | `10` | 3600 |

### 1.2 Registro A do Servidor de Correio
| Tipo | Host / Nome | Valor / Destino | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `mail.hubine.org.` | `<IP_DO_SERVIDOR_MAIL>` | 3600 |

### 1.3 Registro SPF (Sender Policy Framework)
> [!WARNING]
> Nunca crie mais de um registro SPF do tipo TXT para o mesmo domínio. Caso `hubine.org` já possua um registro SPF, inclua o IP ou mecanismo `include:` mantendo um único registro.

| Tipo | Host / Nome | Valor TXT | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` | `v=spf1 mx ip4:<IP_DO_SERVIDOR_MAIL> -all` | 3600 |

### 1.4 Registro DKIM (DomainKeys Identified Mail)
Gere um par de chaves RSA de 2048 bits no servidor de e-mail (seletor `hubine2026` ou `default`):
| Tipo | Host / Nome | Valor TXT | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `hubine2026._domainkey.hubine.org.` | `v=DKIM1; k=rsa; p=<CHAVE_PUBLICA_BASE64>` | 3600 |

### 1.5 Registro DMARC
Inicie com política de monitoramento permissiva (`p=none`) e, após verificar os relatórios diários de autenticação, migre para `p=quarantine` ou `p=reject`:
| Tipo | Host / Nome | Valor TXT | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `_dmarc.hubine.org.` | `v=DMARC1; p=none; rua=mailto:relatorios-dmarc@hubine.org; sp=none; aspf=r; adkim=r` | 3600 |

### 1.6 Reverse DNS (PTR)
- Solicite ao provedor do bloco IP (ISP/Data Center) a configuração do registro reverso (PTR):
  - **IP:** `<IP_DO_SERVIDOR_MAIL>` -> **Host:** `mail.hubine.org`
  - A identidade informada no banner SMTP (EHLO/HELO) deve corresponder exatamente a `mail.hubine.org`.

---

## 2. Configuração do Servidor de Correio (Postfix / Exim / Mailcow)

1. **Portas e Protocolos:**
   - **Porta 25:** Tráfego MTA-to-MTA com STARTTLS obrigatório.
   - **Porta 587 (Submission):** Envio autenticado pela aplicação com STARTTLS.
   - **Porta 465 (SMTPS):** Envio com TLS implícito.
   - **Porta 993 (IMAPS):** Acesso à caixa por clientes autorizados.
2. **Políticas de Envio e Segurança:**
   - Bloqueio total de Relay Aberto (`smtpd_relay_restrictions = permit_sasl_authenticated, reject_unauth_destination`).
   - Autenticação SASL obrigatória em conexões de clientes.
   - Criptografia TLS moderna (TLS 1.2 e TLS 1.3; cifras fracas desabilitadas).
   - Certificado Let's Encrypt ou TLS corporativo válido para `mail.hubine.org`.

---

## 3. Criação da Caixa Postal `eventos@hubine.org`

1. Criar o usuário `eventos@hubine.org` com cota inicial adequada (ex: 10GB).
2. Gerar senha criptográfica forte exclusiva (mínimo 24 caracteres aleatórios).
3. Configurar alias institucional (ex: redirecionamento de cópia de segurança para os coordenadores do evento, se aplicável).

---

## 4. Conexão na Aplicação Hubine 10 Anos

No arquivo `.env` do ambiente de produção (gerenciado de forma segura):

```env
# Configurações de Envio SMTP - eventos@hubine.org
SMTP_HOST=mail.hubine.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=eventos@hubine.org
SMTP_PASS=<SENHA_FORTE_CONFIGURADA>
SMTP_FROM="Hubine Eventos <eventos@hubine.org>"
SMTP_REPLY_TO="eventos@hubine.org"
SMTP_REJECT_UNAUTHORIZED=true
```

### Validação de Conectividade:
A aplicação expõe internamente a função `emailService.verifyConnection()`, que realiza o handshake SMTP com o servidor e valida credenciais e TLS na inicialização.

---

## 5. Checklist de Validação Operacional (Go-Live)

- [ ] MX apontando para `mail.hubine.org`.
- [ ] SPF validado sem erros de sintaxe (ferramenta `dig txt hubine.org` ou MXToolbox).
- [ ] Assinatura DKIM ativa e verificável nos cabeçalhos de mensagens de teste (`DKIM-Signature`).
- [ ] DMARC publicado e monitorado.
- [ ] PTR (Reverse DNS) resolvendo para `mail.hubine.org`.
- [ ] Relay aberto verificado e fechado.
- [ ] Envio e recebimento de teste com contas autorizadas (Gmail, Outlook corporativo).
- [ ] Ausência de alertas de "Spam" ou "Não verificado" no cliente de e-mail do destinatário.

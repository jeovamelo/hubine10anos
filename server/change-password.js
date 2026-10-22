#!/usr/bin/env node
// server/change-password.js
// Utilitário CLI para troca segura e rotação de senha de usuários

const db = require('./db');
const { hashPassword } = require('./auth');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Uso: node server/change-password.js <email> <nova_senha>');
    process.exit(1);
  }

  const [email, newPassword] = args;

  if (newPassword.length < 8) {
    console.error('❌ Erro: A nova senha deve possuir no mínimo 8 caracteres.');
    process.exit(1);
  }

  // Inicializa banco de dados
  await db.initPostgres();

  const user = db.getUserByEmail(email);
  if (!user) {
    console.error(`❌ Erro: Usuário com e-mail "${email}" não foi encontrado.`);
    process.exit(1);
  }

  const updated = await db.updateUser(user.id, {
    passwordHash: hashPassword(newPassword)
  });

  await db.addAuditLog({
    action: 'SENHA_ALTERADA_CLI',
    details: `Senha do usuário ${user.name} (${user.email}) alterada via linha de comando.`,
    user: 'Console Administrativo (CLI)'
  });

  console.log(`✅ Sucesso: A senha do usuário "${user.name}" (${user.email}) foi atualizada com sucesso.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro inesperado:', err.message);
  process.exit(1);
});

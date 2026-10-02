'use strict';

// Somente apresentação: nunca use o resultado para persistência ou autenticação.
function maskEmail(value) {
  if (typeof value !== 'string') return '***';
  const email = value.trim();
  if (email.length > 120 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return '***';
  const [local, domain] = email.split('@');
  // Sempre oculta ao menos um caractere, inclusive em nomes muito curtos.
  const visible = Array.from(local).slice(0, Math.min(2, Array.from(local).length - 1)).join('');
  return `${visible}***@${domain}`;
}

module.exports = { maskEmail };

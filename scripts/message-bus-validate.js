#!/usr/bin/env node
// scripts/message-bus-validate.js
// Valida estructura de docs/messages/{open,archived}/.
// Uso: node scripts/message-bus-validate.js [--strict]
//
// Comprueba:
//   - Frontmatter válido (from, to, created, subject obligatorios)
//   - in_reply_to apunta a archivo existente
//   - closes apunta a archivos existentes
//   - Threads con state=closed están realmente en archived/
//   - No hay archivos en archived/ con state ≠ closed
//
// Exit 0: sin anomalías
// Exit 1: anomalías detectadas (--strict) o frontmatter inválido (siempre)

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MSG_OPEN = join(ROOT, 'docs', 'messages', 'open');
const MSG_ARCH = join(ROOT, 'docs', 'messages', 'archived');

const STRICT = process.argv.includes('--strict');

function parseFrontmatter(content, filepath) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { error: 'no frontmatter block found' };
  }
  const yaml = match[1];
  const data = {};
  // Parser YAML mínimo (suficiente para nuestro schema plano)
  let currentKey = null;
  for (const line of yaml.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      currentKey = m[1];
      let value = m[2].trim();
      // Lista [a, b] o ["a", "b"]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else if (value === '' || value === '[]') {
        value = [];
      }
      data[currentKey] = value;
    } else if (line.match(/^\s+-\s/) && Array.isArray(data[currentKey])) {
      data[currentKey].push(line.replace(/^\s+-\s*/, '').trim());
    }
  }
  return { data };
}

function listMessages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({
      filename: f,
      path: join(dir, f),
      location: basename(dir), // 'open' | 'archived'
    }));
}

function main() {
  const anomalies = [];
  const errors = [];

  const openMsgs = listMessages(MSG_OPEN);
  const archMsgs = listMessages(MSG_ARCH);
  const allMsgs = [...openMsgs, ...archMsgs];

  // Index por nombre de archivo
  const byName = new Map();
  for (const msg of allMsgs) {
    byName.set(msg.filename, msg);
  }

  // Parse frontmatter de cada uno
  for (const msg of allMsgs) {
    const content = readFileSync(msg.path, 'utf8');
    const parsed = parseFrontmatter(content, msg.path);
    if (parsed.error) {
      errors.push(`❌ ${msg.location}/${msg.filename}: ${parsed.error}`);
      continue;
    }
    msg.frontmatter = parsed.data;

    // Required fields
    for (const required of ['from', 'to', 'created', 'subject']) {
      if (!msg.frontmatter[required]) {
        errors.push(
          `❌ ${msg.location}/${msg.filename}: falta campo '${required}' en frontmatter`,
        );
      }
    }
  }

  // Validar in_reply_to y closes
  for (const msg of allMsgs) {
    if (!msg.frontmatter) continue;

    const irt = msg.frontmatter.in_reply_to;
    if (irt && typeof irt === 'string' && irt.trim()) {
      const target = irt.trim();
      if (!byName.has(target)) {
        anomalies.push(
          `⚠️  ${msg.location}/${msg.filename}: in_reply_to apunta a archivo inexistente: ${target}`,
        );
      }
    }

    const closes = Array.isArray(msg.frontmatter.closes)
      ? msg.frontmatter.closes
      : [];
    for (const c of closes) {
      if (!c) continue;
      if (!byName.has(c)) {
        anomalies.push(
          `⚠️  ${msg.location}/${msg.filename}: closes apunta a archivo inexistente: ${c}`,
        );
      }
    }
  }

  // Derivar threads y validar ubicación
  // Thread root = mensaje sin in_reply_to. Cadena = todos los msgs que apuntan al root (directa o transitivamente).
  const roots = allMsgs.filter(
    (m) => m.frontmatter && !m.frontmatter.in_reply_to,
  );

  for (const root of roots) {
    const thread = [root];
    let changed = true;
    while (changed) {
      changed = false;
      for (const msg of allMsgs) {
        if (thread.includes(msg) || !msg.frontmatter) continue;
        const irt = (msg.frontmatter.in_reply_to || '').trim();
        if (irt && thread.some((t) => t.filename === irt)) {
          thread.push(msg);
          changed = true;
        }
      }
    }

    const last = thread[thread.length - 1];
    const closes = Array.isArray(last.frontmatter.closes)
      ? last.frontmatter.closes
      : [];
    const isClosed = closes.length > 0;

    // Si está closed, todos los archivos del thread deben estar en archived/
    if (isClosed) {
      for (const m of thread) {
        if (m.location !== 'archived') {
          anomalies.push(
            `⚠️  Thread cerrado pero ${m.filename} sigue en open/ (debe estar en archived/)`,
          );
        }
      }
    } else {
      // Si NO está closed, no debería haber archivos en archived/
      for (const m of thread) {
        if (m.location === 'archived') {
          anomalies.push(
            `⚠️  ${m.filename} está en archived/ pero el thread sigue abierto (state: ${thread.length > 1 ? 'replied' : 'open'})`,
          );
        }
      }
    }
  }

  // Reporte
  if (errors.length === 0 && anomalies.length === 0) {
    console.log('✓ docs/messages/ estructura OK. Sin anomalías.');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.error('Errores (siempre fallan):');
    errors.forEach((e) => console.error('  ' + e));
  }
  if (anomalies.length > 0) {
    console.error('\nAnomalías:');
    anomalies.forEach((a) => console.error('  ' + a));
  }

  // Errores siempre exit 1; anomalías solo en --strict
  if (errors.length > 0 || (STRICT && anomalies.length > 0)) {
    console.error(`\nFAIL — ${errors.length} errors, ${anomalies.length} anomalías`);
    process.exit(1);
  }

  console.warn(`\nWARN — ${anomalies.length} anomalías (no en --strict, no falla)`);
  process.exit(0);
}

main();

#!/usr/bin/env node
// .claude/apply-agent-identity.js <backend|frontend|infra>
//
// Configura `git config user.email` LOCAL al repo para el agente actual.
// Esto permite que `git log --author=backend-agent` filtre commits por agente,
// y que el footer `Authored-Agent: <X>` sea consistente.
//
// El humano sigue siendo el author OFICIAL si tiene git config --global user.email
// distinto; pero para sesiones de agente puro, esta config local lo identifica.
//
// Uso típico (en cada inicio de sesión del agente):
//   node .claude/apply-agent-identity.js backend

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG = join(__dirname, 'agents-config.json');

const agent = process.argv[2];

if (!agent) {
  console.error('Uso: node .claude/apply-agent-identity.js <backend|frontend|infra>');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
const agentInfo = cfg.agents[agent];

if (!agentInfo) {
  console.error(`Agente desconocido: ${agent}`);
  console.error(`Agentes disponibles: ${Object.keys(cfg.agents).join(', ')}`);
  process.exit(1);
}

try {
  execSync(`git config user.email "${agentInfo.email}"`, { stdio: 'pipe' });
  execSync(`git config user.name "${agentInfo.name}"`, { stdio: 'pipe' });
  console.log(`✓ Identidad git local configurada para ${agent}:`);
  console.log(`    user.email = ${agentInfo.email}`);
  console.log(`    user.name  = ${agentInfo.name}`);
  console.log(`\nLos commits llevarán este author. Recuerda incluir trailer:`);
  console.log(`    ${agentInfo.trailer}`);
} catch (err) {
  console.error('Error configurando git:', err.message);
  process.exit(1);
}

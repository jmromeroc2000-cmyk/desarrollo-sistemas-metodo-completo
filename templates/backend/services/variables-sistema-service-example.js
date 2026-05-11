// templates/backend/services/variables-sistema-service-example.js
// Copy a: Dev/src/modules/variables-sistema/service.js (adaptar)
//
// EJEMPLO de service portable v3.0 que reemplaza el patrón v2.0 PG-only:
//   v2.0: SET LOCAL app.audit_motivo → trigger BD inserta historia
//   v3.0: service inserta historia explícitamente, sin GUCs
//
// El comportamiento es idéntico para el caller (PUT /variables-sistema/:clave
// con body {valor, motivo}). El cambio es interno: portable a 6 DBMS.

import { withTransaction } from '../../db/transaction.js';
import { genUuid, now } from '../../db/adapter.js';        // ← db-adapter v3
import * as q from './queries.js';

function appError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Edita el valor de una variable.
 *
 * Cambios vs v2.0:
 *   - NO usa SET LOCAL ni current_setting (PG-only) — eso era trigger-driven.
 *   - El service hace el INSERT en variables_historia ANTES del UPDATE.
 *   - Motivo y ip_origen son columnas regulares en el INSERT.
 *   - Funciona idénticamente en los 6 DBMS soportados.
 *
 * @param {object} args
 * @param {string} args.clave
 * @param {string} args.valor
 * @param {string} [args.motivo]
 * @param {string} args.modificadoPor   - UUID del usuario que cambia
 * @param {string} [args.ipOrigen]      - IP del request (de req.ip)
 * @param {string[]} args.rolesUsuario
 */
export async function updateVariable({ clave, valor, motivo, modificadoPor, ipOrigen, rolesUsuario }) {
  if (valor === undefined || valor === null) {
    throw appError(400, 'El campo `valor` es requerido');
  }
  const valorStr = String(valor);
  if (valorStr.length > 500) {
    throw appError(400, 'El valor excede 500 caracteres');
  }

  const variable = await q.findVariableFullByClave(clave);
  if (!variable) throw appError(404, `Variable '${clave}' no existe`);

  // Autorización dinámica por roles_modificacion (CSV)
  const rolesMod = (variable.roles_modificacion || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const userRoles = rolesUsuario || [];
  if (!rolesMod.some((r) => userRoles.includes(r))) {
    throw appError(403, `No autorizado para modificar '${clave}'`);
  }

  validarValorPorTipo(variable, valorStr);

  // Idempotencia: valor idéntico = no-op
  if (variable.valor === valorStr) {
    return { data: variable, sin_cambio: true, requiere_reinicio: variable.requiere_reinicio === 1 };
  }

  // ── Service inserta historia + actualiza variable en MISMA transacción ──
  // Portable: funciona en los 6 DBMS sin depender de triggers ni GUCs.
  const timestampUTC = now();           // app-side timestamp (ms precision)

  await withTransaction(async (c) => {
    // 1) INSERT historia con motivo + ip_origen como columnas regulares
    await q.insertHistoriaVariable(c, {
      clave,
      modificadoEn:   timestampUTC,
      valorAnterior:  variable.valor,
      valorNuevo:     valorStr,
      modificadoPor,
      motivo:         motivo ?? null,
      ipOrigen:       ipOrigen ?? null,
    });

    // 2) UPDATE variables_sistema
    await q.updateVariable(c, {
      clave,
      valor:          valorStr,
      modificadoEn:   timestampUTC,
      modificadoPor,
    });
  });

  const actualizada = await q.findVariableFullByClave(clave);
  return {
    data: maskearSiNoPuedeLeer(actualizada, userRoles),
    sin_cambio: false,
    requiere_reinicio: actualizada.requiere_reinicio === 1,
  };
}

// ── Validación, masking (sin cambios respecto a v2.0) ──

function validarValorPorTipo(variable, valorStr) {
  // ... ver implementación de v2.0; sin cambios relevantes a portabilidad
}

function maskearSiNoPuedeLeer(v, userRoles) {
  // ... idem
  return v;
}

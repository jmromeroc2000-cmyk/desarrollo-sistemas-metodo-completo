// templates/db-adapters/spanner/adapter.js
import { BaseAdapter } from '../_interface.js';

export class SpannerAdapter extends BaseAdapter {
  dbms = 'spanner';
  supportsTriggers = false;     // ← Spanner NO soporta triggers BD

  quote(ident) {
    return `\`${ident.replace(/`/g, '\\`')}\``;
  }

  upsertSql({ table, insertColumns }) {
    // Spanner: INSERT OR UPDATE (Google Cloud Spanner extension a SQL)
    // Solo funciona si la(s) conflict column(s) son la PK.
    const cols = insertColumns.map((c) => this.quote(c)).join(', ');
    const params = insertColumns.map((_, i) => `@p${i + 1}`).join(', ');
    return `INSERT OR UPDATE INTO ${this.quote(table)} (${cols}) VALUES (${params})`;
  }

  async bypassTriggers(_client, fn) {
    // No-op: Spanner no soporta triggers. La protección de metadata vive
    // EXCLUSIVAMENTE en la Capa 1 (middleware protectMetadata).
    return await fn();
  }

  async applyTriggers(_client) {
    // No-op: Spanner no soporta triggers. Si el sistema usa Spanner,
    // la protección de metadata vive solo en Capa 1.
    return;
  }

  _triggersPath() {
    return null; // Sin triggers.sql en Spanner
  }

  createPool(config) {
    const { Spanner } = require('@google-cloud/spanner');
    const spanner = new Spanner({ projectId: config.projectId });
    const instance = spanner.instance(config.instance);
    const database = instance.database(config.database, {
      max: config.max ?? 10,
    });
    // Spanner client expone una API distinta — el migration runner debe
    // detectar adapter.dbms === 'spanner' y usar database.runTransactionAsync()
    // en vez de client.query() típico de SQL clients.
    return database;
  }
}

export default new SpannerAdapter();

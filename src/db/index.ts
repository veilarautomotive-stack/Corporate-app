import Database from 'better-sqlite3';
import { schema } from './schema';

const db = new Database('retail_integrity.db');
db.pragma('journal_mode = WAL');

// Execute schema
db.exec(schema);

// Initialize global finance if not exists (handled in schema, but double check)
const initGlobal = db.prepare("INSERT OR IGNORE INTO global_finance (id, global_capital, profit_pool, cash_on_hand, cash_in_bank) VALUES ('global', 0, 0, 0, 0)");
initGlobal.run();

export default db;


export const schema = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  capital_balance INTEGER DEFAULT 0, -- Stored in cents
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  cost_price INTEGER NOT NULL, -- Cents
  selling_price INTEGER NOT NULL, -- Cents
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  total_revenue INTEGER NOT NULL, -- Cents
  total_cost INTEGER NOT NULL, -- Cents
  total_profit INTEGER NOT NULL, -- Cents
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reversed BOOLEAN DEFAULT 0
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL, -- Cents (unit price at time of sale)
  cost INTEGER NOT NULL, -- Cents (unit cost at time of sale)
  profit INTEGER NOT NULL, -- Cents (total profit for this line item)
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL, -- Cents
  type TEXT NOT NULL, -- e.g., 'rent', 'salary', 'utilities'
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reversed BOOLEAN DEFAULT 0
);

-- Global Finance (Single Row)
CREATE TABLE IF NOT EXISTS global_finance (
  id TEXT PRIMARY KEY,
  global_capital INTEGER DEFAULT 0, -- Cents
  profit_pool INTEGER DEFAULT 0, -- Cents
  cash_on_hand INTEGER DEFAULT 0, -- Cents
  cash_in_bank INTEGER DEFAULT 0, -- Cents
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ledger
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL, -- 'sale', 'expense', 'restock', 'distribution', 'reversal'
  debit INTEGER DEFAULT 0, -- Cents
  credit INTEGER DEFAULT 0, -- Cents
  description TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Profit Distribution
CREATE TABLE IF NOT EXISTS profit_distribution (
  id TEXT PRIMARY KEY,
  partner_a_percent REAL NOT NULL,
  partner_b_percent REAL NOT NULL,
  reinvest_percent REAL NOT NULL,
  distributed_amount INTEGER NOT NULL, -- Cents
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'viewer')),
  theme_preference TEXT DEFAULT 'light',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initialize Global Finance if not exists
INSERT OR IGNORE INTO global_finance (id, global_capital, profit_pool, cash_on_hand, cash_in_bank)
VALUES ('global', 0, 0, 0, 0);

-- VIEWS --

-- Dashboard Summary
CREATE VIEW IF NOT EXISTS view_dashboard_summary AS
SELECT
  (SELECT global_capital FROM global_finance WHERE id = 'global') as total_capital,
  (SELECT profit_pool FROM global_finance WHERE id = 'global') as total_profit,
  (SELECT cash_on_hand + cash_in_bank FROM global_finance WHERE id = 'global') as total_cash,
  (SELECT COALESCE(SUM(total_revenue), 0) FROM sales WHERE created_at >= date('now', 'start of day') AND reversed = 0) as today_revenue,
  (SELECT COALESCE(SUM(total_profit), 0) FROM sales WHERE created_at >= date('now', 'start of day') AND reversed = 0) as today_profit;

-- Category Performance
CREATE VIEW IF NOT EXISTS view_category_performance AS
SELECT
  c.id,
  c.name,
  c.capital_balance,
  COUNT(i.id) as item_count,
  COALESCE(SUM(i.current_stock * i.cost_price), 0) as stock_value
FROM categories c
LEFT JOIN inventory i ON c.id = i.category_id
GROUP BY c.id;

-- Inventory Status
CREATE VIEW IF NOT EXISTS view_inventory_status AS
SELECT
  i.id,
  i.sku,
  i.item_name,
  c.name as category_name,
  i.cost_price,
  i.selling_price,
  i.current_stock,
  i.minimum_stock,
  (i.current_stock * i.cost_price) as total_value,
  CASE WHEN i.current_stock <= i.minimum_stock THEN 1 ELSE 0 END as is_low_stock
FROM inventory i
JOIN categories c ON i.category_id = c.id;

-- Low Stock Alerts
CREATE VIEW IF NOT EXISTS view_low_stock_alerts AS
SELECT * FROM view_inventory_status WHERE is_low_stock = 1;

-- Profit Trend (Last 30 Days)
CREATE VIEW IF NOT EXISTS view_profit_trend AS
SELECT
  date(created_at) as date,
  SUM(total_profit) as daily_profit,
  SUM(total_revenue) as daily_revenue
FROM sales
WHERE created_at >= date('now', '-30 days') AND reversed = 0
GROUP BY date(created_at)
ORDER BY date(created_at);

-- Capital Integrity (Audit View)
CREATE VIEW IF NOT EXISTS view_capital_integrity AS
SELECT
  (SELECT global_capital FROM global_finance WHERE id = 'global') as recorded_capital,
  (SELECT COALESCE(SUM(capital_balance), 0) FROM categories) as allocated_capital,
  (SELECT COALESCE(SUM(current_stock * cost_price), 0) FROM inventory) as inventory_value,
  ((SELECT global_capital FROM global_finance WHERE id = 'global') - (SELECT COALESCE(SUM(capital_balance), 0) FROM categories)) as unallocated_capital;

-- Survival Runway (Simplified: Cash / Avg Daily Expense)
-- Note: This is an estimation view
CREATE VIEW IF NOT EXISTS view_survival_runway AS
SELECT
  (SELECT cash_on_hand + cash_in_bank FROM global_finance WHERE id = 'global') as total_cash,
  (SELECT COALESCE(AVG(amount), 0) FROM expenses WHERE created_at >= date('now', '-30 days') AND reversed = 0) as avg_daily_expense;

-- Expenses View
CREATE VIEW IF NOT EXISTS view_expenses AS
SELECT * FROM expenses ORDER BY created_at DESC LIMIT 50;
`;

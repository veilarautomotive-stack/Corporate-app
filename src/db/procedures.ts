import db from './index';
import { v4 as uuidv4 } from 'uuid';

// Helper to convert dollars to cents
const toCents = (amount: number) => Math.round(amount * 100);

// Helper to check if enough funds
const checkFunds = (amount: number, balance: number) => {
  if (balance < amount) throw new Error('Insufficient funds');
};

// 1. Process Sale
export const processSale = db.transaction((items: { sku: string; quantity: number }[]) => {
  const saleId = uuidv4();
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  for (const item of items) {
    const inv = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(item.sku) as any;
    if (!inv) throw new Error(`Item not found: ${item.sku}`);
    if (inv.current_stock < item.quantity) throw new Error(`Insufficient stock for ${item.sku}`);

    const quantity = item.quantity;
    const price = inv.selling_price; // In cents
    const cost = inv.cost_price; // In cents
    const revenue = price * quantity;
    const itemCost = cost * quantity;
    const profit = revenue - itemCost;

    // Update Inventory
    db.prepare('UPDATE inventory SET current_stock = current_stock - ? WHERE id = ?').run(quantity, inv.id);

    // Insert Sale Item
    db.prepare(`
      INSERT INTO sale_items (id, sale_id, inventory_id, quantity, price, cost, profit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), saleId, inv.id, quantity, price, cost, profit);

    totalRevenue += revenue;
    totalCost += itemCost;
    totalProfit += profit;
  }

  // Insert Sale
  db.prepare(`
    INSERT INTO sales (id, total_revenue, total_cost, total_profit)
    VALUES (?, ?, ?, ?)
  `).run(saleId, totalRevenue, totalCost, totalProfit);

  // Update Global Finance (Add to Profit Pool and Cash on Hand)
  // Revenue goes to Cash on Hand. Profit is tracked in Profit Pool.
  // Wait, where does the Cost go?
  // Revenue = Cost + Profit.
  // Cash increases by Revenue.
  // Profit Pool increases by Profit.
  // Capital (Inventory Value) decreases by Cost.
  db.prepare(`
    UPDATE global_finance
    SET profit_pool = profit_pool + ?,
        cash_on_hand = cash_on_hand + ?
    WHERE id = 'global'
  `).run(totalProfit, totalRevenue);

  // Ledger Entry
  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, ?, 'sale', ?, 0, 'Sale Revenue')
  `).run(uuidv4(), saleId, totalRevenue);

  return { saleId, totalRevenue, totalProfit };
});

// 2. Process Expense
export const processExpense = db.transaction((amount: number, type: string, note: string) => {
  const amountCents = toCents(amount);
  const expenseId = uuidv4();

  // Check Profit Pool
  const finance = db.prepare('SELECT profit_pool, cash_on_hand FROM global_finance WHERE id = "global"').get() as any;
  if (finance.profit_pool < amountCents) throw new Error('Insufficient profit pool for expense');
  if (finance.cash_on_hand < amountCents) throw new Error('Insufficient cash on hand');

  // Deduct from Profit Pool and Cash
  db.prepare(`
    UPDATE global_finance
    SET profit_pool = profit_pool - ?,
        cash_on_hand = cash_on_hand - ?
    WHERE id = 'global'
  `).run(amountCents, amountCents);

  // Insert Expense
  db.prepare(`
    INSERT INTO expenses (id, amount, type, note)
    VALUES (?, ?, ?, ?)
  `).run(expenseId, amountCents, type, note);

  // Ledger Entry
  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, ?, 'expense', 0, ?, ?)
  `).run(uuidv4(), expenseId, amountCents, `Expense: ${type} - ${note}`);

  return { expenseId, amount: amountCents };
});

// 3. Process Restock
// "Deduct from category capital. If insufficient -> deduct remainder from profit_pool. If both insufficient -> RAISE EXCEPTION"
export const processRestock = db.transaction((sku: string, quantity: number, costPrice: number, sellingPrice: number) => {
  const costCents = toCents(costPrice);
  const sellingCents = toCents(sellingPrice);
  const totalCost = costCents * quantity;

  const inv = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku) as any;
  if (!inv) throw new Error('Item not found');

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(inv.category_id) as any;
  const finance = db.prepare('SELECT * FROM global_finance WHERE id = "global"').get() as any;

  let remainingCost = totalCost;
  let deductedFromCapital = 0;
  let deductedFromProfit = 0;

  // 1. Try Category Capital
  if (category.capital_balance >= remainingCost) {
    deductedFromCapital = remainingCost;
    remainingCost = 0;
  } else {
    deductedFromCapital = category.capital_balance;
    remainingCost -= category.capital_balance;
  }

  // 2. Try Profit Pool
  if (remainingCost > 0) {
    if (finance.profit_pool >= remainingCost) {
      deductedFromProfit = remainingCost;
      remainingCost = 0;
    } else {
      throw new Error('Insufficient capital and profit pool for restock');
    }
  }

  // Check Cash
  if (finance.cash_on_hand < totalCost) throw new Error('Insufficient cash on hand');

  // Execute Updates
  if (deductedFromCapital > 0) {
    db.prepare('UPDATE categories SET capital_balance = capital_balance - ? WHERE id = ?').run(deductedFromCapital, category.id);
  }
  
  if (deductedFromProfit > 0) {
    db.prepare('UPDATE global_finance SET profit_pool = profit_pool - ? WHERE id = "global"').run(deductedFromProfit);
  }

  // Deduct Cash
  db.prepare('UPDATE global_finance SET cash_on_hand = cash_on_hand - ? WHERE id = "global"').run(totalCost);

  // Update Inventory
  // Update cost price? Usually FIFO or Moving Average. For simplicity, we update to new cost price or keep existing?
  // The prompt implies "Restock", so we add quantity. It doesn't specify cost averaging.
  // I'll update the cost price to the new one for future sales, but this is a simplification.
  db.prepare(`
    UPDATE inventory
    SET current_stock = current_stock + ?,
        cost_price = ?,
        selling_price = ?
    WHERE id = ?
  `).run(quantity, costCents, sellingCents, inv.id);

  // Ledger
  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, ?, 'restock', 0, ?, ?)
  `).run(uuidv4(), inv.id, totalCost, `Restock ${sku} (${quantity}x)`);

  return { sku, quantity, totalCost };
});

// 4. Add Inventory Item (New Item)
export const addInventoryItem = db.transaction((categoryId: string, sku: string, name: string, cost: number, price: number, initialStock: number, minStock: number) => {
  const costCents = toCents(cost);
  const priceCents = toCents(price);
  const id = uuidv4();

  // Initial stock requires capital/cash check similar to restock
  if (initialStock > 0) {
     // Reuse restock logic or implement similar checks?
     // For simplicity, we assume initial stock is "free" (migration) OR we charge it.
     // "System must block: Restocking without capital coverage".
     // Let's assume adding item with 0 stock is free.
     // If stock > 0, we must charge.
     // Let's force 0 stock on creation to enforce the restock flow.
     if (initialStock > 0) throw new Error('Please add item with 0 stock and use Restock to add inventory.');
  }

  db.prepare(`
    INSERT INTO inventory (id, category_id, sku, item_name, cost_price, selling_price, current_stock, minimum_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, categoryId, sku, name, costCents, priceCents, 0, minStock);

  return { id, sku };
});

// 5. Add Category (and allocate capital?)
export const addCategory = db.transaction((name: string, initialCapital: number) => {
  const id = uuidv4();
  const capitalCents = toCents(initialCapital);

  // Where does initial capital come from? Global Capital?
  // "Global Capital" usually tracks total investment.
  // If we allocate capital to a category, we are moving it from "Global Unallocated" to "Category".
  // But we need to inject money into the system first.
  // Let's add a "Inject Capital" function.
  
  db.prepare(`
    INSERT INTO categories (id, name, capital_balance)
    VALUES (?, ?, ?)
  `).run(id, name, capitalCents);

  // If capital > 0, we need to source it.
  // For now, let's assume this is "Setting up" and we just create the bucket.
  // But strictly, money must come from somewhere.
  // Let's assume 0 capital on create, and use "Inject Capital" to fund it.
  if (capitalCents > 0) {
      // We need to deduct from Global Capital or Cash?
      // Let's force 0 capital on create.
      throw new Error('Create category with 0 capital, then Allocate Capital.');
  }

  return { id, name };
});

// 6. Inject Capital (Investment)
export const injectCapital = db.transaction((amount: number, note: string) => {
  const amountCents = toCents(amount);
  
  db.prepare(`
    UPDATE global_finance
    SET global_capital = global_capital + ?,
        cash_on_hand = cash_on_hand + ?
    WHERE id = 'global'
  `).run(amountCents, amountCents);

  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, 'global', 'investment', ?, 0, ?)
  `).run(uuidv4(), amountCents, `Capital Injection: ${note}`);

  return { amount: amountCents };
});

// 7. Allocate Capital to Category
export const allocateCapital = db.transaction((categoryId: string, amount: number) => {
  const amountCents = toCents(amount);
  
  // Check Global Unallocated Capital?
  // Global Capital = Sum(Category Capital) + Unallocated.
  // Actually, Global Capital is the total money put IN.
  // We can allocate from "Cash" (which is part of Capital).
  // But wait, "Capital Balance" in category is a limit, or actual cash holding?
  // "Deduct from category capital" implies it's a balance.
  
  // Let's check if we have enough "Unallocated Capital".
  // Unallocated = Global Capital - Sum(Category Balances).
  
  const global = db.prepare('SELECT global_capital FROM global_finance WHERE id = "global"').get() as any;
  const allocated = db.prepare('SELECT SUM(capital_balance) as total FROM categories').get() as any;
  const currentAllocated = allocated.total || 0;
  
  if (global.global_capital - currentAllocated < amountCents) {
    throw new Error('Insufficient unallocated global capital');
  }

  db.prepare('UPDATE categories SET capital_balance = capital_balance + ? WHERE id = ?').run(amountCents, categoryId);
  
  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, ?, 'allocation', 0, 0, ?)
  `).run(uuidv4(), categoryId, `Allocated Capital: ${amount}`);
  
  return { categoryId, amount: amountCents };
});

// 8. Profit Distribution
export const distributeProfit = db.transaction((partnerA: number, partnerB: number, reinvest: number) => {
  if (partnerA + partnerB + reinvest !== 100) throw new Error('Percentages must sum to 100');

  const finance = db.prepare('SELECT profit_pool, cash_on_hand FROM global_finance WHERE id = "global"').get() as any;
  const profitToDistribute = finance.profit_pool; // Distribute ALL profit? Or a specific amount?
  // Usually we distribute a specific amount.
  // "Calculate real cash amounts... Deduct from profit_pool"
  // Let's assume we distribute the ENTIRE profit pool for simplicity, or we should accept an amount.
  // Let's accept an amount.
  // Wait, the prompt says "Validate percentages... Calculate real cash amounts".
  // It implies we are distributing the *available* profit.
  
  if (profitToDistribute <= 0) throw new Error('No profit to distribute');
  if (finance.cash_on_hand < profitToDistribute) throw new Error('Insufficient cash for distribution');

  const amountA = Math.floor(profitToDistribute * (partnerA / 100));
  const amountB = Math.floor(profitToDistribute * (partnerB / 100));
  const amountReinvest = profitToDistribute - amountA - amountB;

  // Deduct from Profit Pool
  db.prepare('UPDATE global_finance SET profit_pool = 0 WHERE id = "global"').run();
  
  // Deduct Cash (only for partners)
  const cashOut = amountA + amountB;
  db.prepare('UPDATE global_finance SET cash_on_hand = cash_on_hand - ? WHERE id = "global"').run(cashOut);

  // Add Reinvestment to Global Capital
  if (amountReinvest > 0) {
    db.prepare('UPDATE global_finance SET global_capital = global_capital + ? WHERE id = "global"').run(amountReinvest);
  }

  // Record
  const id = uuidv4();
  db.prepare(`
    INSERT INTO profit_distribution (id, partner_a_percent, partner_b_percent, reinvest_percent, distributed_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, partnerA, partnerB, reinvest, profitToDistribute);

  db.prepare(`
    INSERT INTO ledger (id, reference_id, reference_type, debit, credit, description)
    VALUES (?, ?, 'distribution', 0, ?, 'Profit Distribution')
  `).run(uuidv4(), id, cashOut);

  return { distributed: profitToDistribute, amountA, amountB, reinvested: amountReinvest };
});


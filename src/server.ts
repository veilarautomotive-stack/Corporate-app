import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './db';
import * as procedures from './db/procedures';
import * as auth from './db/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

app.use(express.json());
app.use(cookieParser());

// Seed Admin User
const seedAdmin = () => {
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, theme_preference, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), 'admin', hash, 'admin', 'light');
    console.log('Admin user created: admin / admin123');
  }
};
seedAdmin();

// Seed General Category
const seedCategory = () => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get('general');
  if (!cat) {
    db.prepare(`
      INSERT INTO categories (id, name, capital_balance)
      VALUES (?, ?, ?)
    `).run('general', 'General', 0);
    console.log('General category created');
  }
};
seedCategory();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = auth.registerUser(username, password, role);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = auth.loginUser(username, password);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Or 'strict'
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });
    
    res.json(user);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', authenticateToken, (req: any, res) => {
  // Fetch fresh user data from DB to ensure role/theme is up to date
  const user = db.prepare('SELECT id, username, role, theme_preference as theme FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.sendStatus(404);
  res.json(user);
});

app.post('/api/theme', authenticateToken, (req: any, res) => {
  const { theme } = req.body;
  try {
    auth.updateTheme(req.user.id, theme);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// API Routes (Protected)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generic View Reader (Protected)
app.get('/api/views/:viewName', authenticateToken, (req, res) => {
  const viewName = req.params.viewName;
  // Whitelist views for security
  const allowedViews = [
    'view_dashboard_summary',
    'view_category_performance',
    'view_inventory_status',
    'view_low_stock_alerts',
    'view_profit_trend',
    'view_capital_integrity',
    'view_survival_runway',
    'view_expenses'
  ];

  if (!allowedViews.includes(viewName)) {
    return res.status(403).json({ error: 'Access denied to view' });
  }

  try {
    const data = db.prepare(`SELECT * FROM ${viewName}`).all();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Procedures (Protected)
app.post('/api/rpc/:procedure', authenticateToken, (req, res) => {
  const procedureName = req.params.procedure;
  const args = req.body;

  try {
    let result;
    switch (procedureName) {
      case 'processSale':
        result = procedures.processSale(args.items);
        break;
      case 'processExpense':
        result = procedures.processExpense(args.amount, args.type, args.note);
        break;
      case 'processRestock':
        result = procedures.processRestock(args.sku, args.quantity, args.costPrice, args.sellingPrice);
        break;
      case 'addInventoryItem':
        result = procedures.addInventoryItem(args.categoryId, args.sku, args.name, args.cost, args.price, args.initialStock, args.minStock);
        break;
      case 'addCategory':
        result = procedures.addCategory(args.name, args.initialCapital);
        break;
      case 'injectCapital':
        result = procedures.injectCapital(args.amount, args.note);
        break;
      case 'allocateCapital':
        result = procedures.allocateCapital(args.categoryId, args.amount);
        break;
      case 'distributeProfit':
        result = procedures.distributeProfit(args.partnerA, args.partnerB, args.reinvest);
        break;
      default:
        return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json({ success: true, result });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

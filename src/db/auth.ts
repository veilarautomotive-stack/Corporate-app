import db from './index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// 1. Register User
export const registerUser = db.transaction((username: string, password: string, role: string) => {
  // Validate username unique
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  // Hash password
  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  // Insert User
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, username, hash, role);

  return { id, username, role };
});

// 2. Login User
export const loginUser = (username: string, password: string) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }

  return { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    theme: user.theme_preference 
  };
};

// 3. Update Theme
export const updateTheme = (userId: string, theme: string) => {
  db.prepare('UPDATE users SET theme_preference = ? WHERE id = ?').run(theme, userId);
  return { theme };
};

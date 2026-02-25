# Supabase + Vercel Auth Setup

This guide provides the copy-pastable code to set up a robust, JSON-only authentication system using Supabase and Vercel Serverless Functions.

## 1. Supabase Database Schema

Run this SQL in your Supabase SQL Editor to create the users table.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'staff', -- 'admin', 'staff', 'viewer'
  theme_preference TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (Optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

## 2. Vercel API Endpoints

Install dependencies:
```bash
npm install @supabase/supabase-js bcryptjs
npm install -D @types/bcryptjs
```

### `/api/register.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Force JSON response
  res.setHeader('Content-Type', 'application/json');

  // 2. Handle Method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email, password, role } = req.body;

    // 3. Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // 4. Check existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    // 5. Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // 6. Insert User
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          email, 
          password_hash, 
          role: role || 'staff',
          theme_preference: 'light'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // 7. Return Success (No password!)
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: data.id,
        email: data.email,
        role: data.role
      }
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    // Always return JSON error
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
}
```

### `/api/login.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // 1. Fetch User
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Generic error for security
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2. Compare Hash
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 3. Return Success
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        theme: user.theme_preference
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
}
```

## 3. Frontend Logic (React Example)

```tsx
import { useState } from 'react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: 'default', message: 'Enter details to register' });

  const handleRegister = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Creating account...' });

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Safely parse JSON
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error('Server returned invalid response (not JSON)');
      }

      if (data.success) {
        setStatus({ type: 'success', message: data.message });
        // Redirect logic here
      } else {
        setStatus({ type: 'error', message: data.message || 'Registration failed' });
      }

    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Network error' });
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleRegister}>
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email" 
        />
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="Password" 
        />
        <button type="submit">Register</button>
      </form>

      {/* Status Card */}
      <div className={`status-card ${status.type}`}>
        <p>{status.message}</p>
      </div>

      <style>{`
        .status-card { padding: 1rem; margin-top: 1rem; border-radius: 8px; }
        .default { background: #f3f4f6; color: #374151; }
        .loading { background: #dbeafe; color: #1e40af; }
        .success { background: #d1fae5; color: #065f46; }
        .error { background: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
}
```

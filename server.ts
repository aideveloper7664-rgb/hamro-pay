import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hamropay-super-secret-key';

const app = express();
const PORT = 3000;

// Enable JSON body parsing
app.use(express.json());

// Path to persistent JSON database
const DB_PATH = path.join(process.cwd(), 'database.json');

// Initial seed data structures
const initialLinksSeed = [
  { id: 1, title: 'Graphic Design Package', amount: 2499, orders: 18, active: true, date: 'Updated today', note: 'Branding identity files included.' },
  { id: 2, title: 'Website Discovery Session', amount: 999, orders: 9, active: true, date: 'Updated yesterday', note: '1-hour video consultation' },
  { id: 3, title: 'Monthly Retainer — August', amount: 12000, orders: 3, active: true, date: 'Updated 2 days ago', note: 'Standard SLA development hours' },
  { id: 4, title: 'Branding Consultation', amount: 1499, orders: 7, active: false, date: 'Updated 4 days ago', note: 'Consultation note summary' },
  { id: 5, title: 'Social Media Template Pack', amount: 599, orders: 5, active: true, date: 'Updated 6 days ago', note: 'Canva ready layouts' },
  { id: 6, title: 'UX Review', amount: 3999, orders: 2, active: true, date: 'Updated 1 week ago', note: 'Comprehensive screen teardown' },
  { id: 7, title: 'Launch Workshop', amount: 2999, orders: 1, active: false, date: 'Updated 1 week ago', note: 'Pre-launch checklists' }
];

const initialTransactionsSeed = [
  { id: 't1', type: 'received', ref: 'HP-81JX90', name: 'Kavya Mehta', amount: 2499, status: 'Success', date: 'Today, 10:42 AM' },
  { id: 't2', type: 'received', ref: 'HP-0QW17F', name: 'Naman Studio', amount: 999, status: 'Success', date: 'Yesterday, 6:18 PM' },
  { id: 't3', type: 'withdrawal', ref: 'WD-479203', name: 'UPI · aarav@okhdfc', amount: 5000, status: 'Completed', date: '18 Aug, 1:23 PM' },
  { id: 't4', type: 'received', ref: 'HP-75PA32', name: 'Pari Shah', amount: 12000, status: 'Success', date: '17 Aug, 4:56 PM' },
  { id: 't5', type: 'received', ref: 'HP-22KM70', name: 'Aditya Jain', amount: 1499, status: 'Pending', date: '17 Aug, 2:05 PM' },
  { id: 't6', type: 'received', ref: 'HP-64TR11', name: 'Riya Kapoor', amount: 599, status: 'Failed', date: '16 Aug, 11:10 AM' }
];

const initialNotificationsSeed = [
  { id: 'n1', title: 'Payment received', text: 'Rs. 2,499 was received through Graphic Design Package.', time: 'Today, 10:42 AM', unread: true },
  { id: 'n2', title: 'Wallet withdrawal completed', text: 'Your Rs. 5,000 withdrawal to aarav@okhdfc has been completed.', time: '18 Aug, 1:23 PM', unread: true },
  { id: 'n3', title: 'Your weekly payment snapshot is ready', text: 'You collected Rs. 8,935 across 12 successful payments this week.', time: '18 Aug, 9:00 AM', unread: true },
  { id: 'n4', title: 'New payment theme available', text: 'Explore the updated checkout palette in your merchant settings.', time: '16 Aug, 4:11 PM', unread: false }
];

// Read or initialize the database helper
function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultDb = {
      users: [
        {
          id: 'u1',
          name: 'Aarav Sharma',
          email: 'merchant@hamropay.demo',
          password: 'hamropay-demo',
          token: 'demo-bearer-token-aarav',
          plan: 'Blaze Free',
          feePercent: 1.5,
          linkLimit: 100,
          availableBalance: 12840.50,
          totalCollected: 21195.00,
          pendingPayout: 0.0,
          phone: '+977 98765 43210',
          emailReceipts: true,
          withdrawalAlerts: true,
          referralsCount: 3,
          referralEarnings: 480
        }
      ],
      paymentLinks: initialLinksSeed.map(link => ({ ...link, userId: 'u1' })),
      transactions: initialTransactionsSeed.map(tx => ({ ...tx, userId: 'u1' })),
      notifications: initialNotificationsSeed.map(n => ({ ...n, userId: 'u1' })),
      supportTickets: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse database.json, resetting database.', err);
    return { users: [], paymentLinks: [], transactions: [], notifications: [], supportTickets: [] };
  }
}

function saveDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// -------------------------------------------------------------
// CORS MIDDLEWARE
// -------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// -------------------------------------------------------------
// PUBLIC ENDPOINTS
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Support Submission (Public but saves logged-in info if provided)
app.post('/api/support', (req, res) => {
  const { topic, message, name, email } = req.body;
  const db = getDb();
  const ticket = {
    id: 'ticket-' + Date.now(),
    topic,
    message,
    name: name || 'Anonymous',
    email: email || 'anonymous@hamropay.demo',
    date: new Date().toISOString()
  };
  db.supportTickets = db.supportTickets || [];
  db.supportTickets.push(ticket);
  saveDb(db);
  res.json({ success: true, message: 'Support ticket registered.' });
});

// Authenticate / Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Password verification (supporting both bcrypt and raw fallback)
  let isPasswordValid = false;
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    isPasswordValid = await bcrypt.compare(password, user.password);
  } else {
    isPasswordValid = user.password === password;
  }

  if (!isPasswordValid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Generate real JWT token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  user.token = token;
  saveDb(db);

  res.json({
    success: true,
    token,
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// Authenticate / Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All registration parameters (name, email, password) are required.' });
  }

  const db = getDb();
  const existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const userId = 'u-' + Date.now();
  const hashedPassword = await bcrypt.hash(password, 10);
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

  const newUser = {
    id: userId,
    name,
    email,
    password: hashedPassword,
    token,
    plan: 'Blaze Free',
    feePercent: 1.5,
    linkLimit: 100,
    availableBalance: 5000.00, // starting demo bonus balance so they can test payouts instantly!
    totalCollected: 5000.00,
    pendingPayout: 0.0,
    phone: '',
    emailReceipts: true,
    withdrawalAlerts: true,
    referralsCount: 0,
    referralEarnings: 0
  };

  db.users.push(newUser);

  // Initialize demo links, notifications, transactions for new user
  const initialLinks = initialLinksSeed.map((link, idx) => ({
    ...link,
    id: 'link-' + idx + '-' + Date.now(),
    userId
  }));
  const initialTransactions = [
    { id: 'tx-init-' + Date.now(), type: 'received', ref: 'HP-INIT88', name: 'Welcome Sandbox Bonus', amount: 5000, status: 'Success', date: 'Just now' }
  ].map(tx => ({ ...tx, userId }));
  
  const initialNotifications = [
    { id: 'notif-init-' + Date.now(), title: 'Welcome to Hamro Pay', text: 'Your merchant sandbox dashboard is fully synchronized online.', time: 'Just now', unread: true }
  ].map(n => ({ ...n, userId }));

  db.paymentLinks.push(...initialLinks);
  db.transactions.push(...initialTransactions);
  db.notifications.push(...initialNotifications);

  saveDb(db);

  res.json({
    success: true,
    token,
    user: {
      name,
      email
    }
  });
});

// -------------------------------------------------------------
// SECURE AUTHORIZATION GATEWAY MIDDLEWARE
// -------------------------------------------------------------
const authGateway = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = getDb();
    const user = db.users.find((u: any) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    req.user = user;
    next();
  } catch (err) {
    // Check fallback raw demo token
    const db = getDb();
    const user = db.users.find((u: any) => u.token === token);
    if (user) {
      req.user = user;
      return next();
    }
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
};

// -------------------------------------------------------------
// SECURED MERCHANDISE ENDPOINTS
// -------------------------------------------------------------

// Restore Session / Verify Me
app.get('/api/auth/me', authGateway, (req: any, res) => {
  res.json({
    success: true,
    user: {
      name: req.user.name,
      email: req.user.email
    }
  });
});

// User Profile / Settings
app.get('/api/user', authGateway, (req: any, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json({ success: true, profile: userSafe });
});

app.post('/api/user', authGateway, (req: any, res) => {
  const { name, email, phone, emailReceipts, withdrawalAlerts } = req.body;
  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Merchant record not found.' });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (emailReceipts !== undefined) user.emailReceipts = emailReceipts;
  if (withdrawalAlerts !== undefined) user.withdrawalAlerts = withdrawalAlerts;

  saveDb(db);
  res.json({ success: true, message: 'Profile credentials preserved successfully.' });
});

// Fetch active payment links
app.get('/api/payment', authGateway, (req: any, res) => {
  const db = getDb();
  const userLinks = db.paymentLinks.filter((l: any) => l.userId === req.user.id);
  res.json(userLinks);
});

// Create a new checkout payment link
app.post('/api/payment', authGateway, (req: any, res) => {
  const { title, amount, note, active } = req.body;
  if (!title || !amount) {
    return res.status(400).json({ success: false, message: 'A descriptive title and non-zero pricing amount are required.' });
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.user.id);
  const userLinks = db.paymentLinks.filter((l: any) => l.userId === req.user.id);

  if (user && userLinks.length >= user.linkLimit) {
    return res.status(403).json({
      success: false,
      message: `Limit exceeded. Your current plan allows a maximum of ${user.linkLimit} payment links.`
    });
  }

  const newLink = {
    id: 'link-' + Date.now(),
    userId: req.user.id,
    title,
    amount: parseFloat(amount),
    orders: 0,
    active: active !== undefined ? active : true,
    date: 'Created today',
    note: note || ''
  };

  db.paymentLinks.push(newLink);
  saveDb(db);
  res.json(newLink);
});

// Update an existing payment link
app.put('/api/payment/:id', authGateway, (req: any, res) => {
  const { id } = req.params;
  const { title, amount, note } = req.body;

  const db = getDb();
  const link = db.paymentLinks.find((l: any) => String(l.id) === String(id) && l.userId === req.user.id);

  if (!link) {
    return res.status(404).json({ success: false, message: 'Payment link not found.' });
  }

  if (title) link.title = title;
  if (amount) link.amount = parseFloat(amount);
  if (note !== undefined) link.note = note;
  link.date = 'Updated today';

  saveDb(db);
  res.json({ success: true });
});

// Toggle checkout active status
app.patch('/api/payment/:id/toggle', authGateway, (req: any, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const db = getDb();
  const link = db.paymentLinks.find((l: any) => String(l.id) === String(id) && l.userId === req.user.id);

  if (!link) {
    return res.status(404).json({ success: false, message: 'Payment link not found.' });
  }

  link.active = active !== undefined ? active : !link.active;
  link.date = 'Updated today';

  saveDb(db);
  res.json({ success: true });
});

// Fetch historical transactions
app.get('/api/withdrawal', authGateway, (req: any, res) => {
  const db = getDb();
  const userTx = db.transactions.filter((tx: any) => tx.userId === req.user.id);
  res.json(userTx);
});

// Submit a withdrawal request
app.post('/api/withdrawal', authGateway, (req: any, res) => {
  const { amount, upi } = req.body;
  const amtNum = parseFloat(amount);

  if (isNaN(amtNum) || amtNum <= 0) {
    return res.status(400).json({ success: false, message: 'A valid settlement amount is required.' });
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.user.id);

  if (!user || user.availableBalance < amtNum) {
    return res.status(400).json({ success: false, message: 'Insufficient reserves. Withdrawal exceeds your available balance.' });
  }

  // Deduct from available, increase pending payouts
  user.availableBalance -= amtNum;
  user.pendingPayout += amtNum;

  const txId = 'tx-' + Date.now();
  const newTx = {
    id: txId,
    userId: req.user.id,
    type: 'withdrawal',
    ref: 'WD-' + Math.floor(100000 + Math.random() * 899999),
    name: `UPI · ${upi}`,
    amount: amtNum,
    status: 'Pending',
    date: 'Just now'
  };

  db.transactions.push(newTx);

  // Add system notification
  const notif = {
    id: 'notif-' + Date.now(),
    userId: req.user.id,
    title: 'Wallet withdrawal registered',
    text: `Your Rs. ${amtNum.toLocaleString('en-NP')} withdrawal to ${upi} is now pending approval.`,
    time: 'Just now',
    unread: true
  };
  db.notifications.push(notif);

  saveDb(db);
  res.json({ success: true, tx: newTx });
});

// Fetch notifications
app.get('/api/notification', authGateway, (req: any, res) => {
  const db = getDb();
  const userNotifs = db.notifications.filter((n: any) => n.userId === req.user.id);
  res.json(userNotifs);
});

// Mark all notifications as read
app.post('/api/notification/read-all', authGateway, (req: any, res) => {
  const db = getDb();
  db.notifications.forEach((n: any) => {
    if (n.userId === req.user.id) {
      n.unread = false;
    }
  });
  saveDb(db);
  res.json({ success: true });
});

// Upgrade plan / tier subscription level
app.post('/api/plans/upgrade', authGateway, (req: any, res) => {
  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Please select a subscription plan.' });
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  user.plan = plan;
  if (plan === 'Blaze Free') {
    user.feePercent = 1.5;
    user.linkLimit = 100;
  } else if (plan === 'Pulse') {
    user.feePercent = 1.0;
    user.linkLimit = 1000000; // unlimited
  } else if (plan === 'Summit') {
    user.feePercent = 0.7;
    user.linkLimit = 1000000; // unlimited
  }

  // Create a system alert about upgrade
  const notif = {
    id: 'notif-' + Date.now(),
    userId: req.user.id,
    title: 'Subscription Tier Upgraded',
    text: `Congratulations! Your account has been upgraded to ${plan} with a lower processing rate of ${user.feePercent}%.`,
    time: 'Just now',
    unread: true
  };
  db.notifications.push(notif);

  saveDb(db);
  res.json({
    success: true,
    plan: user.plan,
    feePercent: user.feePercent,
    linkLimit: user.linkLimit
  });
});

// Referral Code Status
app.get('/api/referral', authGateway, (req: any, res) => {
  res.json({
    referralCode: req.user.referralCode || 'HP-REF' + Math.floor(100 + Math.random() * 900),
    referralsCount: req.user.referralsCount || 0,
    referralEarnings: req.user.referralEarnings || 0
  });
});

// -------------------------------------------------------------
// FAMPAY ACCOUNTS MANAGEMENT
// -------------------------------------------------------------
app.get('/api/fampay/accounts', authGateway, (req: any, res) => {
  const db = getDb();
  if (!db.fampayAccounts) db.fampayAccounts = [];
  const accounts = db.fampayAccounts.filter((a: any) => a.userId === req.user.id);
  res.json({ success: true, accounts });
});

app.post('/api/fampay/accounts', authGateway, (req: any, res) => {
  const { phone, upiId, gmail, name } = req.body;
  if (!phone || !upiId || !gmail) {
    return res.status(400).json({ success: false, message: 'Phone, UPI ID, and Gmail are required.' });
  }

  const db = getDb();
  if (!db.fampayAccounts) db.fampayAccounts = [];
  const userAccounts = db.fampayAccounts.filter((a: any) => a.userId === req.user.id);

  if (userAccounts.length >= 3) {
    return res.status(400).json({ success: false, message: 'Maximum 3 FamPay accounts allowed.' });
  }

  const isFirst = userAccounts.length === 0;

  const newAcc = {
    id: 'fampay-' + Date.now(),
    userId: req.user.id,
    phone: phone.trim(),
    upiId: upiId.trim(),
    gmail: gmail.trim(),
    name: name ? name.trim() : 'FamPay Merchant',
    isGmailVerified: false,
    isActive: false, // Must be Gmail verified before activated unless verified
    createdAt: new Date().toISOString()
  };

  db.fampayAccounts.push(newAcc);
  saveDb(db);

  res.json({ success: true, account: newAcc, message: 'FamPay account added successfully. Please verify Gmail to activate.' });
});

app.post('/api/fampay/accounts/:id/activate', authGateway, (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.fampayAccounts) db.fampayAccounts = [];

  const acc = db.fampayAccounts.find((a: any) => a.id === id && a.userId === req.user.id);
  if (!acc) {
    return res.status(404).json({ success: false, message: 'FamPay account not found.' });
  }

  if (!acc.isGmailVerified) {
    return res.status(400).json({ success: false, message: 'Account must be Gmail verified before activation.' });
  }

  // Deactivate all other user accounts
  db.fampayAccounts.forEach((a: any) => {
    if (a.userId === req.user.id) {
      a.isActive = (a.id === id);
    }
  });

  saveDb(db);
  res.json({ success: true, message: 'FamPay account set to active.' });
});

app.post('/api/fampay/accounts/:id/verify-gmail', authGateway, (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.fampayAccounts) db.fampayAccounts = [];

  const acc = db.fampayAccounts.find((a: any) => a.id === id && a.userId === req.user.id);
  if (!acc) {
    return res.status(404).json({ success: false, message: 'FamPay account not found.' });
  }

  acc.isGmailVerified = true;
  // If no other account is active, automatically activate this one
  const activeAcc = db.fampayAccounts.find((a: any) => a.userId === req.user.id && a.isActive);
  if (!activeAcc) {
    acc.isActive = true;
  }

  saveDb(db);
  res.json({ success: true, account: acc, message: 'Gmail verified successfully! Account is ready for checkout.' });
});

app.delete('/api/fampay/accounts/:id', authGateway, (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.fampayAccounts) db.fampayAccounts = [];

  const idx = db.fampayAccounts.findIndex((a: any) => a.id === id && a.userId === req.user.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'FamPay account not found.' });
  }

  const removed = db.fampayAccounts.splice(idx, 1)[0];
  
  // If removed account was active, set the first verified account as active
  if (removed.isActive) {
    const nextVerified = db.fampayAccounts.find((a: any) => a.userId === req.user.id && a.isGmailVerified);
    if (nextVerified) {
      nextVerified.isActive = true;
    }
  }

  saveDb(db);
  res.json({ success: true, message: 'FamPay account removed.' });
});

// -------------------------------------------------------------
// VITE OR STATIC FILE HOOKS
// -------------------------------------------------------------
async function bootstrapServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server fully online and running on http://0.0.0.0:${PORT}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('Server failed to start:', err);
});

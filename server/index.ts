import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import invoicesRouter from './routes/invoices.js';
import smsRouter from './routes/sms.js';
import dashboardRouter from './routes/dashboard.js';
import expensesRouter from './routes/expenses.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sms', smsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expensesRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`📁 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 PhysioFlow Server running on http://localhost:${PORT}`);
});

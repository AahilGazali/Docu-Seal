require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const signatureRoutes = require('./routes/signature.routes');
const auditRoutes = require('./routes/audit.routes');
const signerRoutes = require('./routes/signer.routes');
const { errorMiddleware } = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/docs', documentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/signers', signerRoutes);

app.use(errorMiddleware);

module.exports = app;

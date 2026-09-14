import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/apiRouter.js';

const app = express();
const PORT = process.env.PORT || 7392;

const publicDir = path.resolve(process.cwd(), 'public');
const distDir = path.resolve(process.cwd(), 'dist');

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', apiRouter);

// Serve static public assets (including /uploads/...)
app.use(express.static(publicDir));

// In production, serve dist folder if it exists
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GoodZeed Backend Server listening on http://localhost:${PORT}`);
  console.log(`Public uploads directory: ${path.join(publicDir, 'uploads')}`);
});

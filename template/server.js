/**
 * server.js — Servidor Express do projeto
 *
 * Variaveis de ambiente injetadas pelo Electron em producao:
 *   process.env.PORT      — porta do servidor (padrao: 3000)
 *   process.env.DIST_PATH — caminho absoluto para a pasta dist/
 *   process.env.DATA_DIR  — caminho para dados persistentes (AppData do usuario)
 *   process.env.APP_ROOT  — caminho raiz do app empacotado
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 3000;
const DIST_PATH = process.env.DIST_PATH || path.join(__dirname, 'dist');
const DATA_DIR  = process.env.DATA_DIR  || path.join(__dirname, 'data');

// Garante que a pasta de dados existe
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Suas rotas de API aqui ───────────────────────────────────────────────────

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, version: process.env.npm_package_version || '1.0.0' });
});

// Adicione suas rotas abaixo:
// app.get('/api/exemplo', (req, res) => { ... });
// app.post('/api/dados', (req, res) => { ... });

// ─── Servir o frontend (dist/) ───────────────────────────────────────────────

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  // SPA fallback — envia index.html para qualquer rota nao encontrada
  app.get('*', (req, res) => {
    const indexPath = path.join(DIST_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html nao encontrado em dist/');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

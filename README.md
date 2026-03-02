# electron-node-wrapper

Workflow centralizado no GitHub Actions para empacotar projetos **Node.js + frontend** em um instalador Windows (.exe) com **auto-update** via GitHub Releases.

Qualquer repositório que tenha um backend Express (`server.js`) e um frontend (por exemplo build com Vite) pode usar este workflow para gerar um executável e publicar releases sem copiar toda a lógica de build — basta um único arquivo YAML e uma secret.

---

## O que esse fluxo faz

- **Build**: roda `npm run build` do projeto, instala Electron e dependências, gera o instalador NSIS (.exe).
- **Backend no exe**: o `server.js` do projeto roda **dentro** do processo Electron (sem spawn). O app passa `PORT`, `DATA_DIR`, `DIST_PATH` e `APP_ROOT` por variáveis de ambiente.
- **Dados persistentes**: pastas de dados (uploads, config, etc.) ficam em `AppData/Roaming/<app-name>/`, não dentro da pasta de instalação.
- **Ícone**: se existir `icon.png` ou `icon.ico` na raiz do projeto, ele vira o ícone do app e do instalador.
- **Auto-update**: ao abrir o app, ele consulta a API do GitHub (com token para repos privados). Se houver uma release mais nova, pergunta se quer baixar e abre o navegador no link do instalador.

---

## Aplicar em um novo projeto

### 1. Estrutura mínima do projeto

O repositório deve ter algo como:

```
meu-projeto/
├── .github/
│   └── workflows/
│       └── build-exe.yml    ← você vai criar este arquivo
├── server.js               ← backend Express (obrigatório)
├── package.json            ← com "version", "scripts.build" e dependencies
├── dist/                   ← gerado por npm run build (Vite, etc.)
├── icon.png ou icon.ico    ← (opcional) ícone do app, mínimo 256x256
└── ...                     ← resto do frontend (src/, public/, etc.)
```

### 2. Conteúdo do workflow

Crie o arquivo **`.github/workflows/build-exe.yml`** no seu repositório com exatamente isto:

```yaml
name: Build Executable

on:
  workflow_dispatch:
    inputs:
      publish:
        description: 'Publicar como GitHub Release com auto-update?'
        required: false
        default: 'false'
        type: choice
        options:
          - 'false'
          - 'true'
  push:
    tags:
      - 'v*.*.*'

jobs:
  build:
    uses: PedroTresmondi/electron-node-wrapper/.github/workflows/build-exe.yml@main
    with:
      publish: ${{ inputs.publish || 'false' }}
    secrets:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      GH_READ_TOKEN: ${{ secrets.GH_READ_TOKEN }}
```

Nada mais é necessário no YAML — toda a lógica de build está no repositório `electron-node-wrapper`.

### 3. Requisitos do `package.json`

- **`version`**: usado como versão do app e da release (ex.: `"1.0.0"`).
- **`type`: `"module"`** se o `server.js` usar `import` (ESM).
- **Script `build`**: comando que gera a pasta `dist/` (ex.: `"build": "vite build"`).
- **`dependencies`**: incluir o que o `server.js` usa (ex.: `express`, `multer`, `cors`).

Exemplo mínimo:

```json
{
  "name": "meu-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "build": "vite build"
  },
  "dependencies": {
    "express": "^4.21.0"
  }
}
```

### 4. Requisitos do `server.js`

O backend deve:

- **Porta**: usar `process.env.PORT` (o Electron define a porta; ex.: `const PORT = process.env.PORT || 3000`).
- **Dados persistentes**: usar `process.env.DATA_DIR` para pastas que devem persistir no AppData (uploads, config, banco, etc.). Ex.:  
  `const DATA_DIR = process.env.DATA_DIR || __dirname;`  
  e então `path.join(DATA_DIR, 'uploads')`, etc.
- **Frontend estático**: servir a pasta do build. Ex.:  
  `const DIST_PATH = process.env.DIST_PATH || path.join(__dirname, 'dist');`  
  e usar `express.static(DIST_PATH)` e um fallback `get('*', ...)` para `index.html` se for SPA.

Exemplo mínimo de trecho:

```js
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DIST_PATH = process.env.DIST_PATH || path.join(__dirname, 'dist');
const STATIC_PATH = fs.existsSync(DIST_PATH) ? DIST_PATH : __dirname;

app.use(express.static(STATIC_PATH));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexFile = path.join(STATIC_PATH, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  next();
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
```

### 5. Configuração no GitHub (por repositório)

- **Secrets**  
  Em **Settings → Secrets and variables → Actions** do **seu** repositório:
  - Crie a secret **`GH_READ_TOKEN`** com um Personal Access Token (fine-grained) que tenha permissão **Contents: Read-only** no repositório (ou na organização). Esse token é usado pelo app instalado para consultar releases (repos privados).

- **Permissões do Actions**  
  Em **Settings → Actions → General** do **seu** repositório:
  - Em **Workflow permissions**, marque **Read and write permissions** para o workflow poder criar releases e anexar artefatos.

---

## Como gerar o .exe

### Opção A: Rodar manualmente (só artefato, sem release)

1. No repositório: **Actions → Build Executable → Run workflow**.
2. Deixe **publish** em `false`.
3. Ao terminar, baixe o `.exe` em **Artifacts**.

### Opção B: Publicar release (para auto-update)

1. Atualize a versão em `package.json` (ex.: `"1.1.0"`).
2. Commit, push e crie a tag:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.1.0"
   git push origin main
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. O workflow dispara automaticamente no `push` da tag e publica a release no GitHub com o instalador.

Ou, em vez de tag: **Actions → Build Executable → Run workflow** com **publish** em `true`. A versão usada será a do `package.json` (e, se for trigger por tag, o nome da tag, ex.: `v1.1.0`).

---

## Auto-update (repos privados)

O app instalado não usa mais o `electron-updater` para a verificação inicial (que dava 404 em repos privados). Em vez disso, faz uma chamada à **API do GitHub** (`/repos/:owner/:repo/releases/latest`) com o **GH_READ_TOKEN** injetado no build. Se houver uma versão mais nova, o app mostra um diálogo e abre o navegador para o usuário baixar o instalador.

Para isso funcionar em repositório privado:

- O token (**GH_READ_TOKEN**) deve ter permissão de leitura no repositório (ou na organização).
- A secret **GH_READ_TOKEN** deve estar configurada no repositório que **chama** o workflow (o seu app), pois o workflow central injeta esse valor no `main.js` do Electron.

---

## Resumo rápido para novo projeto

1. Copiar o conteúdo do **build-exe.yml** acima para `.github/workflows/build-exe.yml` no novo repo.
2. Garantir **package.json** com `version`, `build` e dependências; **server.js** usando `PORT`, `DATA_DIR` e `DIST_PATH`.
3. No GitHub do **projeto**: criar secret **GH_READ_TOKEN** e marcar **Read and write permissions** em Actions.
4. Rodar o workflow (manual com `publish: true` ou push da tag `v*.*.*`) e baixar o instalador da release ou dos Artifacts.

Qualquer dúvida, abra uma issue neste repositório (`electron-node-wrapper`).

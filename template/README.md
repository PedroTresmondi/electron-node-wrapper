# Como usar este template

## Estrutura esperada do projeto

```
meu-projeto/
├── .github/
│   └── workflows/
│       └── build-exe.yml     ← copiar de workflow/build-exe.yml
├── dist/                     ← gerado pelo build (vite, webpack, etc.)
├── public/                   ← (opcional) assets publicos
├── src/
│   └── assets/               ← (opcional) assets do src
├── data/                     ← (opcional) dados iniciais (config.json, etc.)
├── icon.png                  ← (opcional) icone do app, minimo 256x256
├── server.js                 ← OBRIGATORIO — servidor Express
└── package.json              ← OBRIGATORIO — deve ter "scripts.build"
```

## Requisitos do projeto

### package.json
Deve ter um script `build` que gera a pasta `dist/`:
```json
{
  "type": "module",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "express": "^4.x"
  }
}
```

### server.js
- Usar Express
- Escutar em `process.env.PORT` (fallback `3000`)
- Servir `process.env.DIST_PATH` como static (fallback `./dist`)
- Usar `process.env.DATA_DIR` para dados persistentes

Use o `template/server.js` como ponto de partida.

## Como gerar o .exe

### Manualmente (sem publicar release)
1. Va em **Actions → Build Executable → Run workflow**
2. Deixe `publish` como `false`
3. Baixe o `.exe` em **Artifacts**

### Publicando uma release com auto-update
1. Atualize a versao em `package.json`
2. Crie uma tag e faca push:
   ```
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. O workflow roda automaticamente e publica a release no GitHub

## Configuracao necessaria no GitHub

Settings → Actions → General → Workflow permissions → **Read and write permissions**

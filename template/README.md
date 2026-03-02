# Template para novos projetos

Use este conteúdo no seu repositório para gerar um .exe com o **electron-node-wrapper**.

## README completo

A documentação do fluxo (como aplicar em novos projetos, requisitos do `server.js`, secrets, release e auto-update) está no **README da raiz** do repositório:

**https://github.com/PedroTresmondi/electron-node-wrapper#readme**

## Arquivo a copiar

Copie o arquivo **`build-exe.yml`** desta pasta para o seu projeto em:

```
.github/workflows/build-exe.yml
```

O conteúdo é sempre o mesmo; não é necessário alterar nada. Em seguida:

1. Configure a secret **GH_READ_TOKEN** no seu repo (Settings → Secrets).
2. Ative **Read and write permissions** em Settings → Actions.
3. Garanta que o projeto tem `package.json` (com `version` e script `build`) e `server.js` usando `process.env.PORT`, `process.env.DATA_DIR` e `process.env.DIST_PATH`.

Detalhes e exemplos de código estão no README principal do **electron-node-wrapper**.

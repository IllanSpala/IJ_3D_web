# IJ 3D Manager — Web

![Platform](https://img.shields.io/badge/platform-Web%20(GitHub%20Pages)-222?style=flat-square&logo=github)
![Zero Backend](https://img.shields.io/badge/backend-none-success?style=flat-square)

Versão Web (somente leitura) do **IJ 3D Manager** — sistema ERP pessoal para gestão de impressão 3D.

Funciona 100% no navegador. Nenhum servidor necessário. Deploy via **GitHub Pages**.

---

## Como Funciona

1. No app desktop Windows, exporte um backup (`💾` na barra lateral) → gera um `.zip`
2. Abra a versão Web no navegador
3. Faça upload do arquivo `.zip` na tela inicial
4. Todos os dados e fotos são carregados **localmente no navegador** (IndexedDB)
5. Navegue pelas abas normalmente — tudo é processado offline

> 🔒 **Privacidade:** seus dados nunca saem do navegador. Zero tracking, zero backend.

---

## Stack

- **HTML/CSS/JS** puro — sem framework, sem bundler
- **JSZip** — descompacta o `.zip` de backup no browser
- **sql.js** — lê o banco SQLite via WebAssembly
- **IndexedDB** — cache persistente no navegador

---

## Deploy

Este repositório é servido diretamente pelo GitHub Pages (branch `main`, raiz `/`).

---

## Repositório Desktop

O executável Windows é gerado no repositório **[IJ_3D_manager](https://github.com/IllanSpala/IJ_3D_manager/)**.

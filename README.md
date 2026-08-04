# IJ 3D Manager

O **IJ 3D Manager** é um sistema ERP (Enterprise Resource Planning) e CRM (Customer Relationship Management) desenhado especificamente para **fazendas de impressão 3D** e pequenos negócios de manufatura aditiva. 

Construído com uma arquitetura híbrida, ele funciona tanto como um aplicativo **Desktop (via Electron + SQLite)** quanto como uma **Aplicação Web offline-first (via IndexedDB)**, permitindo total portabilidade dos seus dados e controle total sobre sua produção.

---

##  Funcionalidades Principais

O sistema é dividido em abas modulares, cada uma focada em uma etapa crucial do gerenciamento da impressão 3D:

*    **Pedidos (Kanban)**
    *   Gestão visual de encomendas com colunas de status (*A Modelar*, *A Imprimir*, *Impresso/Pintando*, *Enviando/Concluído*).
    *   Adição dinâmica de produtos ou itens avulsos a um pedido.
    *   Acompanhamento de preços cobrados, cliente e datas de entrega.
*    **Sprint (Produção)**
    *   Foco total na área de manufatura. Aqui, os produtos de cada pedido são "quebrados" em partes e subpeças.
    *   Controle individual de modelagem, fatiamento e status da impressão de cada peça que compõe o produto final.
*    **Filamentos**
    *   Gerenciamento de estoque de bobinas (PLA, ABS, PETG, TPU, etc).
    *   Controle de peso restante, marca, cor e precificação.
    *   Rastreio do status da bobina (Ativo, Esgotado, Arquivado).
*    **Almoxarifado (Insumos)**
    *   Controle de tintas, colas, parafusos, rolamentos, ferramentas e peças de reposição (nozzles, correias).
    *   Monitoramento de quantidade e alertas visuais para insumos esgotados.
*    **Financeiro e Precificação**
    *   Calculadora de custo avançada integrada aos filamentos.
    *   Cálculo baseado no peso do fatiador, custo do material, custo de energia (tempo de máquina), taxa de falhas e lucro desejado.
*    **Sumário (Dashboard)**
    *   Visão geral da saúde financeira do negócio.
    *   Balanço de despesas e receitas.

---

##  Arquitetura e Tecnologias

Este projeto foca em alta performance e simplicidade, não utilizando pesados frameworks frontend de terceiros.

*   **Frontend**: Vanilla HTML5, CSS3, e JavaScript (ES6+).
*   **Design System**: Tema escuro (*Dark Mode*), interface com inspiração *Glassmorphism* e alta responsividade.
*   **Backend/Desktop Wrapper**: Node.js com **Electron**.
*   **Armazenamento de Dados**:
    *   **Em Desktop**: Banco de dados relacional poderoso usando **SQLite3** (`print_manager_v2.db`). Gravação direta no disco.
    *   **Em Web/Browser**: Banco de dados persistente no navegador via **IndexedDB** (`js/db.js`).
*   **Motor de Backup Transversal**: Sistema nativo de importação/exportação de `.zip` que converte todas as tabelas e mídias para JSON. Permite exportar do navegador e jogar no Desktop (e vice-versa) sem corrompimento, graças a um sistema de *Autocura* do SQLite para tipos de chaves primárias.

---

##  Instalação e Uso (Desktop)

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18+ recomendada) instalado no seu sistema.

### Como rodar

1. **Clone ou baixe o repositório** para sua máquina local.
2. **Abra o terminal** na raiz da pasta do projeto (`/IJ_3D_web`).
3. **Instale as dependências** do Electron e SQLite:
   ```bash
   npm install
   ```
4. **Inicie o aplicativo**:
   ```bash
   npm start
   ```

*(Nota: Se encontrar o erro `ENOENT: uv_cwd`, certifique-se de que não recriou a pasta enquanto o terminal estava aberto. Saia e entre na pasta no terminal com `cd ..` e `cd IJ_3D_web`).*

---

##  Sistema de Backup e Restauração

O IJ 3D Manager possui um sistema resiliente de proteção de dados:
*   Para fazer o backup, acesse a janela correspondente e baixe o seu `.zip`.
*   O arquivo conterá todos os dados em formato `.json` e todos os arquivos de mídia (fotos) atrelados ao projeto.
*   **Arrastar e soltar**: Na tela inicial ou aba de importação, basta jogar o `.zip` gerado para restaurar instantaneamente a estrutura inteira de tabelas, garantindo portabilidade entre Windows, Linux e Mac.

---

##  Contribuição e Manutenção

O código é estritamente separado em controladores de "abas" localizados na pasta `js/tabs/`. 
*   Todas as interações com o banco de dados passam pela ponte assíncrona localizada em `js/db.js`.
*   As regras do motor SQLite residem no arquivo `main.js`.
*   As funções de exportação e processamento do ZIP ficam nos módulos `backup-exporter.js` e `backup-loader.js`.

---


# MeuDinheiro

MeuDinheiro é um gerenciador financeiro simples e visual, criado para ajudar no controle de receitas, despesas e saldo mensal. O projeto oferece um dashboard com visão geral das finanças, cadastro de transações, acompanhamento por categorias, relatórios automáticos, metas de orçamento e configurações locais.

Os dados são salvos no próprio navegador usando `localStorage`, então cada usuário mantém seus lançamentos no dispositivo onde estiver usando a aplicação.

## Funcionalidades

- Cadastro de receitas e despesas
- Cálculo automático de receitas, despesas e saldo
- Organização dos lançamentos por categoria
- Dashboard com cards, gráficos e resumo mensal
- Aba de transações com listagem e remoção de lançamentos
- Relatórios com maior gasto, saúde do saldo e uso do orçamento
- Meta mensal de despesas
- Configuração do limite de orçamento
- Persistência local no navegador

## Tecnologias

- Next.js
- React
- TypeScript
- CSS
- localStorage

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Deploy na Vercel

Importe o repositório na Vercel usando o preset `Next.js`.

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: padrão da Vercel
- Variáveis de ambiente: nenhuma por enquanto

## Backend notes

The API currently provides:
- `POST /api/auth/login`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/service-orders`
- `POST /api/service-orders`
- `GET /api/products`
- `POST /api/products`

Run `npm run db:seed` after migrations to create a demo tenant and OWNER user (`admin@techmanager.local` / `TechManager@123`). Change the password immediately. Implement a proper tenant onboarding flow before real use. Also add `@nestjs/passport`, `passport`, and `passport-jwt` dependencies (or replace the strategy implementation) before compiling.

## Produtos e estoque

Cadastro de peças com nome, SKU, categoria, compatibilidade, qualidade, localização, fornecedor, custo, preço, quantidade, mínimo e status. A data exibida no cadastro corresponde à última compra registrada por data de compra; uma compra retroativa mantém o fornecedor e o custo da compra mais recente. O cadastro sem compra permite saldo inicial; fornecedor com quantidade inicial exige data e gera entrada por compra.

- `GET /api/products`: lista todos os produtos da assistência, inclusive inativos (o PDV filtra os ativos).
- `POST /api/products`: cadastro e movimentação inicial na mesma transação.
- `PUT /api/products/:id`: edição dos dados, sem alteração direta da quantidade ou da data de compra.
- `GET /api/products/:id/movements?page=1`: histórico em páginas de 30 registros, ordenado pela sequência de registro, com quantidade assinada, saldo resultante, custo, responsável, OS/venda e observações.
- `POST /api/products/:id/movements`: compra (`PURCHASE`), saída para OS (`SERVICE_ORDER`), devolução (`RETURN`), perda/defeito (`LOSS`), ajuste (`ADJUSTMENT`) e garantia (`WARRANTY`).
- `GET /api/products/purchases?supplierId=UUID&from=2026-11-01&to=2026-11-30&page=1`: compras por fornecedor/período (datas inclusivas), totais de todo o filtro e detalhe paginado. Cada entrada registra uma linha de produto, sem agrupamento por nota fiscal.
- `GET /api/products/service-orders`: opções compactas de todas as OS da assistência para vínculo, incluindo ordens antigas.

Compras exigem fornecedor, custo unitário e data (`YYYY-MM-DD`); saídas para OS exigem OS válida. Quantidades são positivas, exceto ajustes e garantias que usam sinal positivo para entrada e negativo para saída. Perdas, ajustes e garantias exigem motivo. Datas retroativas classificam o evento, mas o saldo segue a sequência de registro. Entradas por compra não geram automaticamente lançamentos financeiros.

Vendas também registram saída no histórico. Saldo e movimentação são gravados na mesma transação, com atualização condicional para impedir saldo negativo. Histórico de fornecedor/custo é preservado mesmo após edição dos cadastros; fornecedores vinculados devem ser inativados em vez de excluídos. Produtos são inativados para preservar referências.

A migration `20261105120000_product_inventory` preserva quantidades existentes como saldo inicial. Compras/vendas anteriores à implantação não são reconstruídas. Antes de iniciar a nova versão, aplique `npm run prisma:deploy`. Valide com `npm run build` e `node --test test/*.test.cjs`.

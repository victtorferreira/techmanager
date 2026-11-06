# Integração de compras, OS, estoque e financeiro

## Publicação

Esta alteração exige a migration `20261106120000_financial_integration` antes de iniciar a nova API:

```sh
npm run prisma:deploy
```

Publique o backend e o frontend juntos. A migration apenas acrescenta campos, índices e vínculos; não gera lançamentos para dados anteriores e não altera saldos existentes. Não execute contra produção sem confirmar a conexão do ambiente de destino.

## Compras e fornecedores

- Uma compra, inclusive no cadastro inicial com fornecedor e quantidade, cria estoque e uma despesa na mesma transação. Sem informação de pagamento, fica a pagar. Compras sem custo não geram lançamentos de valor zero.
- O menu **Compras** permite selecionar uma peça e registrar uma compra, consultar o histórico por fornecedor e abrir as contas a pagar. O mesmo fluxo continua disponível em **Produtos e estoque**.
- A compra pode ter vencimento, forma e data de pagamento. Ao quitar uma pendência, o caixa usa a data efetiva, preservando o vencimento no lançamento.
- O total usa quantidade × custo unitário histórico da movimentação. Alterar o cadastro ou custo atual não altera compras já registradas.
- No Financeiro, **Cancelar compra** retira a quantidade do estoque e cancela a pendência. Se já estava paga, cria uma entrada de estorno e mantém a despesa original. Confirme o estorno somente após recuperar o dinheiro.
- O cancelamento falha integralmente se não houver saldo suficiente. O histórico mostra a compra cancelada e o ajuste correspondente; os totais de compras excluem compras canceladas.

## Ordens de serviço

- Na lista de OS, **Atendimento / financeiro** permite salvar status, diagnóstico, mão de obra e valor das peças cobradas ao cliente. O total gera uma cobrança pendente vinculada à OS.
- O preço cobrado pelas peças é informado pelo usuário. O custo vem das saídas e devoluções efetivamente vinculadas à OS; não usa o preço de venda nem gera uma segunda despesa financeira.
- Registre sinal, recebimentos parciais ou o saldo integral, com data e forma de pagamento. Entregar uma OS não a marca como paga.
- O Financeiro também permite receber o saldo integral. Os recebimentos e a cobrança pendente são sincronizados na mesma transação.
- Não é permitido receber acima do saldo, nem reduzir o preço abaixo do recebido líquido. Estornos integrais por recebimento preservam os registros de caixa e reabrem o saldo. Para estornar em outra data, use a ação correspondente no Financeiro.
- Para cancelar uma OS ou marcá-la sem conserto, primeiro estorne os recebimentos e devolva suas peças. Uma OS entregue precisa voltar a um status de atendimento antes de movimentar peças. OS canceladas ou sem conserto não aceitam novos recebimentos nem movimentações.
- Uma devolução vinculada não pode exceder o consumo daquele produto na OS. Seu custo usa o custo médio das peças ainda utilizadas na ordem, preservado no histórico.

## Relatórios

- Caixa: vendas + entradas pagas − despesas pagas. Compras a prazo entram nas pendências e afetam o caixa quando quitadas. Uma compra paga não é somada novamente pelo histórico de estoque.
- O gráfico reúne receitas e despesas realizadas, incluindo recebimentos de OS e estornos, agrupados pelo dia em `America/Sao_Paulo`.
- Serviços recebidos e estornos seguem a data real de cada lançamento.
- O resultado estimado das OS considera **OS criadas no período**, excluindo canceladas e sem conserto: preço cobrado menos custo das peças utilizadas. Não representa lucro líquido e não desconta mão de obra operacional, impostos ou outras despesas.
- Compras por fornecedor seguem a data da compra. Pagamentos líquidos por fornecedor seguem a data de pagamento/estorno e podem se referir a compras de outros períodos.
- As pendências exibidas no Financeiro e nos Relatórios seguem a data prevista no período selecionado; não representam todas as dívidas fora desse intervalo.

## Dados anteriores e duplicação

Compras antigas não são convertidas automaticamente em despesas, porque podem já ter sido lançadas manualmente. Reconcilie cada compra antes de criar uma despesa manual. OS anteriores passam a gerar a cobrança quando seus valores são salvos; confira e reconcilie recebimentos manuais anteriores antes de registrá-los pela OS.

Cada compra tem um vínculo financeiro único; cada OS tem uma única chave de saldo. Reenvios com o mesmo identificador de movimentação ou recebimento retornam o registro anterior. Reutilizar o identificador com dados diferentes é rejeitado. As telas geram esses identificadores automaticamente. Clientes externos devem enviar um UUID em `requestId` nos POSTs de movimentações/compras para obter a mesma proteção.

As mutações financeiras, movimentações e alterações de OS usam transações e o mesmo bloqueio por assistência. Os vínculos de fornecedor, produto e OS são validados pelo tenant autenticado.

## Validação local

```sh
# backend
npm run build
node --test test/*.test.cjs
# frontend
npm run build
npm run test:e2e
```

Os testes de serviços usam um repositório em memória com rollback; os testes de navegador usam respostas simuladas da API. Eles não substituem a aplicação da migration e a validação em um PostgreSQL de homologação antes da publicação.

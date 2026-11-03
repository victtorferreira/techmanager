# Deploy no Render

O repositorio `victtorferreira/techmanager` contem o backend na raiz.

1. Crie um banco em New > Postgres e copie sua Internal Database URL.
2. Crie um Web Service a partir do repositorio GitHub, na mesma regiao do banco.
3. Selecione Node e a branch `main`. Deixe Root Directory vazio.
   Use build `npm ci --include=dev && npm run build`
   e start `npm run prisma:deploy && npm run start:prod`.
   Essa configuracao executa as migrations antes de iniciar a API e funciona
   sem o recurso Pre-Deploy Command dos planos pagos.
   Em um servico pago, voce pode mover `npm run prisma:deploy` para
   Pre-Deploy Command e usar somente `npm run start:prod` no start.
4. Configure as variaveis do servico da API:

   ```dotenv
   DATABASE_URL=<Internal Database URL do Postgres>
   JWT_SECRET=<segredo aleatorio exclusivo de producao>
   FRONTEND_URL=https://techmanager-front.vercel.app
   NODE_VERSION=22
   NODE_ENV=production
   ```

   Cole a URL completa do banco, sem os sinais `<` e `>`.
   Deixe o Render fornecer `PORT` automaticamente.
   Nao coloque uma barra final em `FRONTEND_URL`.
   Para gerar o segredo localmente, execute:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Clique em Deploy Web Service. O Render fornece um dominio `.onrender.com`.
6. Abra `https://<dominio-da-api>/api/docs` para conferir a API.
7. Na Vercel, defina `VITE_API_URL=https://<dominio-da-api>/api`
   e faca um novo deploy do frontend.

As migrations criam as tabelas, mas nao transferem os dados locais.
O seed atual cria uma conta com senha fixa de demonstracao; nao o execute
no banco publico.

## Primeiro administrador

Depois de enviar o codigo atualizado ao GitHub, configure no servico da API:

- `ADMIN_EMAIL`: seu e-mail de login.
- `ADMIN_PASSWORD`: senha exclusiva com pelo menos 12 caracteres e no maximo 72 bytes.
- `ADMIN_TENANT_NAME`: nome da assistencia (opcional).
- `ADMIN_TENANT_SLUG`: identificador com letras minusculas, numeros e hifens
  (opcional; padrao `techmanager`).

Use temporariamente este Start Command e faca o deploy:

```sh
npm run prisma:deploy && npm run db:admin && npm run start:prod
```

O log confirmara a criacao sem exibir a senha. O comando serve apenas para
o primeiro administrador. Se a mesma conta ja existir, ele preserva a senha.
Depois de confirmar o login, restaure o Start Command:

```sh
npm run prisma:deploy && npm run start:prod
```

Remova `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_TENANT_NAME` e `ADMIN_TENANT_SLUG`
das variaveis e aplique as alteracoes. A conta permanece no banco.

O `.env` ja estava versionado. Remova-o do indice do Git junto de `dist`,
preservando os arquivos locais, antes de enviar as alteracoes:

```powershell
git rm --cached --ignore-unmatch .env
git rm -r --cached --ignore-unmatch dist
git add .gitignore package.json src/main.ts DEPLOYMENT.md
git commit -m "Prepara backend para deploy no Render"
git push origin main
```

Use novos segredos em producao: remover o `.env` do indice nao o remove
do historico do repositorio.

No plano gratuito, o Web Service suspende apos 15 minutos sem trafego
e o Postgres gratuito expira apos 30 dias. Consulte as condicoes atuais:
https://render.com/docs/free

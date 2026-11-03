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

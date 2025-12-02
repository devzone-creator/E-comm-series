# Musti Ecommerce Backend

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="musti_ecommerce_secret_key_2024"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
PORT=5000
```

3. Run Prisma migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. Seed admin user:
```bash
npm run seed
```

5. Start the server:
```bash
npm run dev
```

## Default Admin Credentials
- Email: admin@musti.com
- Password: admin123

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Products
- GET /api/products
- GET /api/products/:id
- POST /api/products (Admin only)
- PUT /api/products/:id (Admin only)
- DELETE /api/products/:id (Admin only)

### Cart
- GET /api/cart/:userId/items
- POST /api/cart/:userId/items
- PUT /api/cart/:userId/items/:productId
- DELETE /api/cart/:userId/items/:productId
- DELETE /api/cart/:userId/clear

### Checkout
- POST /api/checkout/orders
- GET /api/checkout/:userId/orders
- GET /api/checkout/orders/:orderId

### Admin
- GET /api/admin/stats
- GET /api/admin/orders
- PUT /api/admin/orders/:id/status

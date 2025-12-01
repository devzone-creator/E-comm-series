# AfriGlam E-commerce Platform

A modern e-commerce platform for authentic African fashion, built with Node.js, Express, and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Product Management**: Full CRUD operations for products with categories
- **Shopping Cart**: Session-based cart functionality
- **Order Management**: Complete order processing system
- **Admin Dashboard**: Administrative interface for managing products, orders, and users
- **Responsive Design**: Mobile-friendly interface with EJS templating

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens, bcrypt password hashing
- **Frontend**: EJS templating, vanilla JavaScript
- **Testing**: Jest for unit and integration tests
- **Development**: Nodemon for hot reloading

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd musti-ecommerce-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=9099
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here
   DATABASE_URL=postgresql://username:password@localhost:5432/afriglam_db
   ```

4. **Set up the database**
   ```bash
   # Initialize database and run migrations
   npm run db:init
   
   # Seed with sample data
   npm run db:seed
   ```

## Usage

### Development
```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run specific test suites
npm run test:auth
npm run test:products
npm run test:cart
```

### Production
```bash
# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products (with pagination and filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Cart
- `POST /api/cart/add` - Add item to cart
- `GET /api/cart` - Get cart items
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove cart item

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details

## Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **users**: User accounts and authentication
- **categories**: Product categories
- **products**: Product catalog with inventory
- **cart_items**: Shopping cart functionality
- **orders**: Order management
- **order_items**: Order line items
- **addresses**: User shipping/billing addresses
- **reviews**: Product reviews and ratings

## Default Admin Account

After running the database seeder, you can log in with:
- **Email**: admin@afriglam.com
- **Password**: admin123

⚠️ **Important**: Change the admin password immediately after first login!

## Project Structure

```
├── config/           # Database configuration and utilities
├── middleware/       # Express middleware (auth, error handling)
├── routes/          # API and web routes
├── services/        # Business logic layer
├── utils/           # Utility functions and validation
├── views/           # EJS templates
├── public/          # Static assets (CSS, JS, images)
├── tests/           # Test files
└── scripts/         # Database seeding scripts
```

## Known Issues & Fixes Applied

### Fixed Issues:
1. **Database Query Placeholders**: Fixed PostgreSQL parameter placeholders in db-utils.js
2. **Missing Admin Routes**: Created comprehensive admin routing system
3. **Error Handling**: Added global error handling middleware
4. **Security**: Improved session configuration and validation

### Remaining Issues to Address:
1. **Frontend Integration**: Update client-side JavaScript to use actual API endpoints
2. **File Upload**: Implement proper image upload functionality for products
3. **Rate Limiting**: Add rate limiting for authentication endpoints
4. **CORS Configuration**: Configure CORS for production deployment

## Testing

The application includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test files
npm run test:auth      # Authentication tests
npm run test:products  # Product management tests
npm run test:cart      # Shopping cart tests
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
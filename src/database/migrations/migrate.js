const db = require('../../config/database');
const logger = require('../../utils/logger');

// ─── Helper: auto-update updated_at on row change ───
const createUpdatedAtFunction = `
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const applyUpdatedAtTrigger = (tableName) => `
DROP TRIGGER IF EXISTS set_updated_at ON ${tableName};
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON ${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
`;

// ─── 1. Users ───
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  avatar_url TEXT,
  user_type VARCHAR(20) CHECK (user_type IN ('customer', 'admin', 'staff')) NOT NULL DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
`;

// ─── 2. Product Categories ───
const createProductCategoriesTable = `
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  image_url VARCHAR(1000),
  sort_order INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// ─── 3. Products ───
const createProductsTable = `
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL DEFAULT 'Salon Saleh',
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  description TEXT,
  details TEXT,
  usage_instructions TEXT,
  benefits JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  stock_quantity INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
`;

// ─── 4. Service Categories ───
const createServiceCategoriesTable = `
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// ─── 5. Services ───
const createServicesTable = `
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  description TEXT,
  gender_target VARCHAR(10) CHECK (gender_target IN ('Men', 'Women', 'Kids', 'All')) DEFAULT 'All',
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
`;

// ─── 6. Staff ───
const createStaffTable = `
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
`;

// ─── 7. Staff ↔ Services (many-to-many) ───
const createStaffServicesTable = `
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON staff_services(service_id);
`;

// ─── 8. Time Slots ───
const createTimeSlotsTable = `
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_time TIME NOT NULL,
  display_label VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);
`;

// ─── 9. Bookings ───
const createBookingsTable = `
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  gender VARCHAR(10) CHECK (gender IN ('Men', 'Women', 'Kids')),
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  notes TEXT,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
`;

// ─── 10. Booking ↔ Services (many-to-many) ───
const createBookingServicesTable = `
CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price_at_booking DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);
`;

// ─── 11. Coupons ───
const createCouponsTable = `
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  usage_limit INT,
  times_used INT DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
`;

// ─── 12. Orders ───
const createOrdersTable = `
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_method VARCHAR(20) CHECK (shipping_method IN ('delivery', 'pickup')) DEFAULT 'delivery',
  payment_method VARCHAR(20) CHECK (payment_method IN ('cod', 'card', 'transfer')) DEFAULT 'cod',
  payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  order_status VARCHAR(20) CHECK (order_status IN ('awaiting', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'awaiting',
  is_deleted BOOLEAN DEFAULT false,
  order_notes TEXT,
  coupon_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
`;

// ─── 13. Order Items ───
const createOrderItemsTable = `
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_title VARCHAR(255) NOT NULL,
  product_brand VARCHAR(100),
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;

// ─── 14. Billing Addresses ───
const createBillingAddressesTable = `
CREATE TABLE IF NOT EXISTS billing_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  country VARCHAR(100) NOT NULL,
  street_address VARCHAR(500) NOT NULL,
  apartment VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL
);
`;

// ─── 15. Shipping Addresses ───
const createShippingAddressesTable = `
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  street_address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL
);
`;

// ─── 16. Waitlist ───
const createWaitlistTable = `
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  desired_service VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'contacted', 'booked')) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
`;

// ─── 17. Site Settings ───
const createSiteSettingsTable = `
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// ─── Migration Runner ───
const tablesInOrder = [
  { name: 'updated_at function', sql: createUpdatedAtFunction },
  { name: 'users', sql: createUsersTable },
  { name: 'product_categories', sql: createProductCategoriesTable },
  { name: 'products', sql: createProductsTable },
  { name: 'service_categories', sql: createServiceCategoriesTable },
  { name: 'services', sql: createServicesTable },
  { name: 'staff', sql: createStaffTable },
  { name: 'staff_services', sql: createStaffServicesTable },
  { name: 'time_slots', sql: createTimeSlotsTable },
  { name: 'bookings', sql: createBookingsTable },
  { name: 'booking_services', sql: createBookingServicesTable },
  { name: 'coupons', sql: createCouponsTable },
  { name: 'orders', sql: createOrdersTable },
  { name: 'order_items', sql: createOrderItemsTable },
  { name: 'billing_addresses', sql: createBillingAddressesTable },
  { name: 'shipping_addresses', sql: createShippingAddressesTable },
  { name: 'waitlist', sql: createWaitlistTable },
  { name: 'site_settings', sql: createSiteSettingsTable },
];

// Tables that should have updated_at triggers
const tablesWithUpdatedAt = [
  'users', 'products', 'services', 'staff', 'bookings', 'coupons', 'orders',
];

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    for (const table of tablesInOrder) {
      await db.query(table.sql);
      logger.info(`✓ ${table.name} created/verified`);
    }

    for (const tableName of tablesWithUpdatedAt) {
      await db.query(applyUpdatedAtTrigger(tableName));
      logger.info(`✓ updated_at trigger applied to ${tableName}`);
    }

    logger.info('All migrations completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

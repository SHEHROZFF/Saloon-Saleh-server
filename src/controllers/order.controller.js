const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { parsePagination, buildPaginationMeta, generateOrderNumber } = require('../utils/queryHelpers');
const emailService = require('../utils/email');

// ─── Place Order ───

const createOrder = catchAsync(async (req, res) => {
  const {
    items, billing_address, shipping_address,
    shipping_method, payment_method, order_notes, coupon_code,
  } = req.body;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = shipping_method === 'delivery' ? 3.0 : 0;
    let discountAmount = 0;

    // 2. Apply coupon if provided
    if (coupon_code) {
      const couponResult = await client.query(
        `SELECT * FROM coupons
         WHERE code = $1 AND is_active = true AND is_deleted = false
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (usage_limit IS NULL OR times_used < usage_limit)`,
        [coupon_code.toUpperCase()]
      );

      const coupon = couponResult.rows[0];
      if (coupon) {
        if (subtotal >= parseFloat(coupon.min_order_amount)) {
          discountAmount = coupon.discount_type === 'percentage'
            ? (subtotal * parseFloat(coupon.discount_value)) / 100
            : parseFloat(coupon.discount_value);

          // Cap discount at subtotal
          discountAmount = Math.min(discountAmount, subtotal);

          // Increment usage
          await client.query(
            'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1',
            [coupon.id]
          );
        }
      }
    }

    const total = subtotal + shippingCost - discountAmount;
    const userId = req.user ? req.user.id : null;

    // 3. Generate unique order number
    let orderNumber;
    let isUnique = false;
    while (!isUnique) {
      orderNumber = generateOrderNumber();
      const check = await client.query('SELECT id FROM orders WHERE order_number = $1', [orderNumber]);
      if (check.rows.length === 0) isUnique = true;
    }

    // 4. Create order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, subtotal, shipping_cost, discount_amount, total, shipping_method, payment_method, order_notes, coupon_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [orderNumber, userId, subtotal, shippingCost, discountAmount, total, shipping_method, payment_method, order_notes, coupon_code ? coupon_code.toUpperCase() : null]
    );

    const order = orderResult.rows[0];

    // 5. Insert order items
    for (const item of items) {
      const itemSubtotal = item.price * item.quantity;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, product_brand, price_at_purchase, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.product_id, item.product_title, item.product_brand, item.price, item.quantity, itemSubtotal]
      );
    }

    // 6. Insert billing address
    await client.query(
      `INSERT INTO billing_addresses (order_id, first_name, last_name, company, country, street_address, apartment, city, postcode, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [order.id, billing_address.first_name, billing_address.last_name, billing_address.company, billing_address.country, billing_address.street_address, billing_address.apartment, billing_address.city, billing_address.postcode, billing_address.phone, billing_address.email]
    );

    // 7. Insert shipping address (if different)
    if (shipping_address) {
      await client.query(
        `INSERT INTO shipping_addresses (order_id, first_name, last_name, street_address, city, postcode)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, shipping_address.first_name, shipping_address.last_name, shipping_address.street_address, shipping_address.city, shipping_address.postcode]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      data: {
        order: {
          ...order,
          items_count: items.length,
        },
      },
    });

    // Send Order Confirmation Email asynchronously
    if (billing_address && billing_address.email) {
      emailService.sendOrderConfirmation(billing_address.email, order);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// ─── Get All Orders (Admin) ───

const getAllOrders = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { order_status, payment_status } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT o.*, ba.first_name, ba.last_name, ba.email as customer_email
    FROM orders o
    LEFT JOIN billing_addresses ba ON o.id = ba.order_id
  `;
  let countQuery = 'SELECT COUNT(*) FROM orders o';

  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (order_status) {
    conditions.push(`o.order_status = $${paramIndex}`);
    values.push(order_status);
    paramIndex++;
  }
  if (payment_status) {
    conditions.push(`o.payment_status = $${paramIndex}`);
    values.push(payment_status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  query += `${whereClause} ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  countQuery += whereClause;

  const [dataResult, countResult] = await Promise.all([
    db.query(query, [...values, limit, offset]),
    db.query(countQuery, values),
  ]);

  res.status(200).json({
    status: 'success',
    data: { orders: dataResult.rows },
    pagination: buildPaginationMeta(countResult.rows[0].count, page, limit),
  });
});

// ─── Get My Orders ───

const getMyOrders = catchAsync(async (req, res) => {
  const result = await db.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: { orders: result.rows },
  });
});

// ─── Get Single Order with full details ───

const getOrder = catchAsync(async (req, res, next) => {
  const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

  if (!orderResult.rows[0]) {
    return next(new AppError('Order not found', 404));
  }

  const order = orderResult.rows[0];

  // Fetch related data in parallel
  const [itemsResult, billingResult, shippingResult] = await Promise.all([
    db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]),
    db.query('SELECT * FROM billing_addresses WHERE order_id = $1', [order.id]),
    db.query('SELECT * FROM shipping_addresses WHERE order_id = $1', [order.id]),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      order: {
        ...order,
        items: itemsResult.rows,
        billing_address: billingResult.rows[0] || null,
        shipping_address: shippingResult.rows[0] || null,
      },
    },
  });
});

// ─── Update Order Status ───

const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { order_status, payment_status } = req.body;

  const result = await db.query(
    `UPDATE orders SET
       order_status = COALESCE($1, order_status),
       payment_status = COALESCE($2, payment_status)
     WHERE id = $3
     RETURNING *`,
    [order_status, payment_status, req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order: result.rows[0] },
  });

  // Fetch the email for this order to send the notification
  const billingResult = await db.query('SELECT email FROM billing_addresses WHERE order_id = $1', [req.params.id]);
  const email = billingResult.rows[0]?.email;

  if (email) {
    if (order_status) {
      emailService.sendOrderStatusUpdate(email, result.rows[0], order_status);
    }
    if (payment_status) {
      emailService.sendPaymentStatusUpdate(email, result.rows[0], payment_status);
    }
  }
});

const updateOrderDetails = catchAsync(async (req, res, next) => {
  const { billing_address, shipping_address, order_notes } = req.body;
  const { id } = req.params;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Update order notes
    if (order_notes !== undefined) {
      await client.query('UPDATE orders SET order_notes = $1 WHERE id = $2', [order_notes, id]);
    }

    // 2. Update billing address
    if (billing_address) {
      await client.query(
        `UPDATE billing_addresses SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          street_address = COALESCE($5, street_address),
          apartment = COALESCE($6, apartment),
          city = COALESCE($7, city),
          postcode = COALESCE($8, postcode),
          country = COALESCE($9, country)
        WHERE order_id = $10`,
        [
          billing_address.first_name, billing_address.last_name, 
          billing_address.phone, billing_address.email,
          billing_address.street_address, billing_address.apartment,
          billing_address.city, billing_address.postcode, 
          billing_address.country, id
        ]
      );
    }

    // 3. Update shipping address
    if (shipping_address) {
      const check = await client.query('SELECT id FROM shipping_addresses WHERE order_id = $1', [id]);
      if (check.rows.length > 0) {
        await client.query(
          `UPDATE shipping_addresses SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            street_address = COALESCE($3, street_address),
            city = COALESCE($4, city),
            postcode = COALESCE($5, postcode)
          WHERE order_id = $6`,
          [
            shipping_address.first_name, shipping_address.last_name,
            shipping_address.street_address, shipping_address.city,
            shipping_address.postcode, id
          ]
        );
      } else {
        await client.query(
          `INSERT INTO shipping_addresses (order_id, first_name, last_name, street_address, city, postcode)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, shipping_address.first_name, shipping_address.last_name, shipping_address.street_address, shipping_address.city, shipping_address.postcode]
        );
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Order details updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  updateOrderDetails,
};

const db = require('../../config/database');
const logger = require('../../utils/logger');
const authUtils = require('../../utils/auth');

async function seed() {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    logger.info('Seeding database...');

    // ─── 1. Admin User ───
    const hashedPassword = await authUtils.hashPassword('admin123456');
    await client.query(
      `INSERT INTO users (name, email, password, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin', 'admin@saloonsaleh.com', hashedPassword, 'admin', '+971500000000']
    );
    logger.info('✓ Admin user seeded');

    // ─── 2. Product Categories ───
    const productCategories = [
      { name: 'Beard Care', slug: 'beard-care', sort_order: 1 },
      { name: 'Hair Styling', slug: 'hair-styling', sort_order: 2 },
      { name: 'Skin Care', slug: 'skin-care', sort_order: 3 },
      { name: 'Shaving', slug: 'shaving', sort_order: 4 },
      { name: 'Tools', slug: 'tools', sort_order: 5 },
    ];

    for (const cat of productCategories) {
      await client.query(
        `INSERT INTO product_categories (name, slug, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.slug, cat.sort_order]
      );
    }
    logger.info('✓ Product categories seeded');

    // ─── 3. Products ───
    const catRows = await client.query('SELECT id, name FROM product_categories');
    const catMap = Object.fromEntries(catRows.rows.map((r) => [r.name, r.id]));

    const products = [
      {
        title: 'Premium Beard Oil',
        brand: 'Saloon Saleh',
        price: 45.0,
        image_url: 'https://images.unsplash.com/photo-1590156206659-9993ed6e9d69?q=80&w=1287&auto=format&fit=crop',
        category: 'Beard Care',
        description: 'Enriched with natural oils to soften and condition your beard.',
        details: 'Our Premium Beard Oil is a masterfully crafted blend of Jojoba, Argan, and Moroccan oils. It penetrates deep into the hair follicle to prevent itchiness and dandruff while providing a healthy, non-greasy shine.',
        usage_instructions: 'Apply 3-5 drops to palms and massage into a clean, damp beard. Work from the roots to the tips for best results.',
        benefits: ['Eliminates beard itch', 'Promotes healthy growth', 'Non-greasy finish', 'Natural cedarwood scent'],
        stock_quantity: 50,
      },
      {
        title: 'Matte Clay Wax',
        brand: 'Saloon Saleh',
        price: 38.0,
        image_url: 'https://images.unsplash.com/photo-1592647420248-b730bf656201?q=80&w=1287&auto=format&fit=crop',
        category: 'Hair Styling',
        description: 'Strong hold with a professional matte finish for all-day style.',
        details: 'Designed for the modern gentleman, our Matte Clay provides a powerful hold without the weight. Perfect for textured, messy styles or sharp, structured looks that need to stay in place from morning to midnight.',
        usage_instructions: 'Rub a small amount between palms to warm. Distribute evenly through dry or towel-dried hair. Style as desired.',
        benefits: ['High hold', 'Zero shine', 'Water-soluble', 'Reshapable throughout the day'],
        stock_quantity: 75,
      },
      {
        title: 'Revitalizing Face Wash',
        brand: 'Saloon Saleh',
        price: 32.0,
        image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=1287&auto=format&fit=crop',
        category: 'Skin Care',
        description: 'Deep cleaning formula that removes impurities without drying.',
        details: 'Start your grooming ritual with a clean slate. This revitalizing wash uses activated charcoal and aloe vera to pull toxins from the skin while maintaining essential moisture levels.',
        usage_instructions: 'Wet face with warm water. Massage a small pump onto skin in circular motions. Rinse thoroughly.',
        benefits: ['pH balanced', 'Unclogs pores', 'Hydrating formula', 'Suitable for all skin types'],
        stock_quantity: 60,
      },
      {
        title: 'Classic Shave Cream',
        brand: 'Saloon Saleh',
        price: 28.0,
        image_url: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6a?q=80&w=1332&auto=format&fit=crop',
        category: 'Shaving',
        description: 'Rich lather for a smooth, irritation-free traditional shave.',
        details: 'Experience the art of the traditional shave. Our cream creates a thick, lubricating buffer between the blade and your skin, ensuring a close cut without the common redness or irritation.',
        usage_instructions: 'Apply to damp skin using a brush or fingertips. Lather well before shaving.',
        benefits: ['Reduces razor burn', 'Softens coarse hair', 'Moisturizing effect', 'Vintage barber scent'],
        stock_quantity: 80,
      },
      {
        title: 'Sea Salt Spray',
        brand: 'Saloon Saleh',
        price: 35.0,
        image_url: 'https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=1287&auto=format&fit=crop',
        category: 'Hair Styling',
        description: 'Add texture and volume for a relaxed, natural beach look.',
        details: 'Bring the ocean to your hair. This mineral-rich spray adds instant grip and "day-at-the-beach" texture without making hair feel stiff or crunchy.',
        usage_instructions: 'Spray onto damp or dry hair. Scrunch with hands to enhance natural waves or blow-dry for massive volume.',
        benefits: ['Instant texture', 'Natural volume', 'Matte finish', 'Lightweight feel'],
        stock_quantity: 45,
      },
      {
        title: 'Professional Hair Trimmer',
        brand: 'Elite Pro',
        price: 185.0,
        image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1170&auto=format&fit=crop',
        category: 'Tools',
        description: 'Precision engineering for the perfect fade and lineup.',
        details: 'The ultimate tool for the precision artist. Featuring diamond-like carbon blades and a high-torque brushless motor, this trimmer delivers the sharpest lines and smoothest fades in the industry.',
        usage_instructions: 'Use for trimming, edging, and detail work. Keep blades oiled for maximum longevity.',
        benefits: ['4-hour battery life', 'Zero-gap adjustable', 'Ergonomic design', 'Professional grade'],
        stock_quantity: 20,
      },
    ];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await client.query(
        `INSERT INTO products (title, brand, price, image_url, category_id, description, details, usage_instructions, benefits, stock_quantity, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT DO NOTHING`,
        [p.title, p.brand, p.price, p.image_url, catMap[p.category], p.description, p.details, p.usage_instructions, JSON.stringify(p.benefits), p.stock_quantity, i + 1]
      );
    }
    logger.info('✓ Products seeded');

    // ─── 4. Service Categories ───
    const serviceCategories = [
      { name: 'Hair', sort_order: 1 },
      { name: 'Beard', sort_order: 2 },
      { name: 'Skin', sort_order: 3 },
    ];

    for (const cat of serviceCategories) {
      await client.query(
        `INSERT INTO service_categories (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.sort_order]
      );
    }
    logger.info('✓ Service categories seeded');

    // ─── 5. Services ───
    const svcCatRows = await client.query('SELECT id, name FROM service_categories');
    const svcCatMap = Object.fromEntries(svcCatRows.rows.map((r) => [r.name, r.id]));

    const services = [
      { name: 'Classic Haircut', price: 60.0, duration: '45 mins', category: 'Hair', sort_order: 1 },
      { name: 'Signature Beard Trim', price: 45.0, duration: '30 mins', category: 'Beard', sort_order: 2 },
      { name: 'Royal Shave', price: 55.0, duration: '45 mins', category: 'Beard', sort_order: 3 },
      { name: 'Luxury Facial', price: 85.0, duration: '60 mins', category: 'Skin', sort_order: 4 },
      { name: 'Head Shave', price: 50.0, duration: '40 mins', category: 'Hair', sort_order: 5 },
      { name: "Kid's Haircut", price: 40.0, duration: '30 mins', category: 'Hair', sort_order: 6 },
    ];

    for (const s of services) {
      await client.query(
        `INSERT INTO services (name, price, duration, category_id, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [s.name, s.price, s.duration, svcCatMap[s.category], s.sort_order]
      );
    }
    logger.info('✓ Services seeded');

    // ─── 6. Staff ───
    const staffMembers = [
      { name: 'Abedalaziz', role: 'Master Barber', avatar_url: 'https://i.pravatar.cc/150?u=abedalaziz', sort_order: 1 },
      { name: 'Khalil', role: 'Stylist', avatar_url: 'https://i.pravatar.cc/150?u=khalil', sort_order: 2 },
      { name: 'Mhmad Saidi', role: 'Senior Barber', avatar_url: 'https://i.pravatar.cc/150?u=mhmad', sort_order: 3 },
      { name: 'Yamen', role: 'Skin Specialist', avatar_url: 'https://i.pravatar.cc/150?u=yamen', sort_order: 4 },
    ];

    for (const m of staffMembers) {
      await client.query(
        `INSERT INTO staff (name, role, avatar_url, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [m.name, m.role, m.avatar_url, m.sort_order]
      );
    }
    logger.info('✓ Staff seeded');

    // ─── 6b. Staff Login User ───
    const staffPassword = await authUtils.hashPassword('staff123456');
    await client.query(
      `INSERT INTO users (name, email, password, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Abedalaziz', 'staff@saloonsaleh.com', staffPassword, 'staff', '+971500000001']
    );
    logger.info('✓ Staff login user seeded');

    // ─── 6c. Link Staff User → Staff Profile ───
    const staffUserResult = await client.query(
      `SELECT id FROM users WHERE email = 'staff@saloonsaleh.com'`
    );
    const staffProfileResult = await client.query(
      `SELECT id FROM staff WHERE name = 'Abedalaziz' LIMIT 1`
    );

    if (staffUserResult.rows[0] && staffProfileResult.rows[0]) {
      await client.query(
        `UPDATE staff SET user_id = $1 WHERE id = $2 AND user_id IS NULL`,
        [staffUserResult.rows[0].id, staffProfileResult.rows[0].id]
      );
      logger.info('✓ Staff user linked to staff profile');
    }

    // ─── 7. Time Slots ───
    const timeSlots = [
      { time: '10:00:00', label: '10:00 AM', sort_order: 1 },
      { time: '11:00:00', label: '11:00 AM', sort_order: 2 },
      { time: '12:00:00', label: '12:00 PM', sort_order: 3 },
      { time: '13:00:00', label: '01:00 PM', sort_order: 4 },
      { time: '14:30:00', label: '02:30 PM', sort_order: 5 },
      { time: '16:00:00', label: '04:00 PM', sort_order: 6 },
      { time: '17:30:00', label: '05:30 PM', sort_order: 7 },
      { time: '19:00:00', label: '07:00 PM', sort_order: 8 },
    ];

    for (const t of timeSlots) {
      await client.query(
        `INSERT INTO time_slots (slot_time, display_label, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [t.time, t.label, t.sort_order]
      );
    }
    logger.info('✓ Time slots seeded');

    // ─── 8. Sample Coupon ───
    await client.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, usage_limit, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO NOTHING`,
      ['WELCOME10', 'percentage', 10.0, 20.0, 100, new Date('2027-12-31')]
    );
    logger.info('✓ Sample coupon seeded');

    // ─── 9. Sample Bookings for Staff ───
    if (staffProfileResult.rows[0]) {
      const staffId = staffProfileResult.rows[0].id;
      const timeSlotRows = await client.query('SELECT id FROM time_slots ORDER BY sort_order ASC LIMIT 3');
      const serviceRows = await client.query('SELECT id, price FROM services LIMIT 2');

      if (timeSlotRows.rows.length > 0 && serviceRows.rows.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const dayAfter = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

        const sampleBookings = [
          { first_name: 'Ahmed', last_name: 'Al Rashid', email: 'ahmed@example.com', phone: '+971501111111', date: today, slot: timeSlotRows.rows[0].id, status: 'confirmed' },
          { first_name: 'Mohammad', last_name: 'Hassan', email: 'mo@example.com', phone: '+971502222222', date: tomorrow, slot: timeSlotRows.rows[1]?.id || timeSlotRows.rows[0].id, status: 'pending' },
          { first_name: 'Khalid', last_name: 'Saeed', email: 'khalid@example.com', phone: '+971503333333', date: dayAfter, slot: timeSlotRows.rows[2]?.id || timeSlotRows.rows[0].id, status: 'confirmed' },
        ];

        for (const b of sampleBookings) {
          const totalPrice = serviceRows.rows.reduce((sum, s) => sum + parseFloat(s.price), 0);

          const bookingResult = await client.query(
            `INSERT INTO bookings (gender, staff_id, booking_date, time_slot_id, first_name, last_name, email, phone, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            ['Men', staffId, b.date, b.slot, b.first_name, b.last_name, b.email, b.phone, totalPrice, b.status]
          );

          // Link services to booking
          for (const svc of serviceRows.rows) {
            await client.query(
              `INSERT INTO booking_services (booking_id, service_id, price_at_booking) VALUES ($1, $2, $3)`,
              [bookingResult.rows[0].id, svc.id, svc.price]
            );
          }
        }

        logger.info('✓ Sample bookings for staff seeded');
      }
    }

    // ─── 10. Site Settings ───
    const settings = [
      {
        key: 'hero_slides',
        value: [
          {
            tagline: "The Modern Edge",
            title: "Meticulous",
            italicTitle: "Precision.",
            description: "It's an art we take seriously. Experience bespoke styling crafted for the uncompromising individual. Be the energy you want to attract.",
            img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
            buttons: [
              { label: "Book Now", link: "/booking", variant: "golden" },
              { label: "Join Waitlist", link: "/booking", variant: "golden-outline" }
            ]
          },
          {
            tagline: "Timeless Tradition",
            title: "Bespoke",
            italicTitle: "Grooming.",
            description: "Discover a sanctuary of modern luxury where traditional master barbering meets contemporary sophisticated aesthetics.",
            img: "https://plus.unsplash.com/premium_photo-1683121230718-3256f14d08ac?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            buttons: [
              { label: "Book Now", link: "/booking", variant: "golden" },
              { label: "Our Services", link: "/shop", variant: "golden-outline" }
            ]
          }
        ]
      },
      {
        key: 'expertise_section',
        value: {
          title: "Our",
          italicTitle: "Expertise",
          description: "Meticulously crafted styles across all disciplines."
        }
      },
      {
        key: 'footer_data',
        value: {
          locations: [
            { label: "Dubai - UAE", url: "" },
            { label: "Dohat Aramoun - LBN", url: "" },
            { label: "Calgary - CAN", url: "" }
          ],
          navigation: [
            { label: "Home", url: "/" },
            { label: "Shop", url: "/shop" },
            { label: "Booking", url: "/booking" },
            { label: "Expertise", url: "/#expertise" }
          ],
          connect: [
            { label: "Instagram", url: "https://www.instagram.com/stylishbyhazem" },
            { label: "WhatsApp", url: "https://wa.me/971557441551" },
            { label: "Facebook", url: "" }
          ],
          copyrightName: "SALOON SALEH",
          appStoreUrl: "https://apps.apple.com/us/app/id1571552874",
          playStoreUrl: "https://play.google.com/store/apps/details?id=com.hazem.stylish_by_hazem"
        }
      },
      {
        key: 'marquee_text',
        value: "HIGH-END LUXURY SALON"
      }
    ];

    for (const s of settings) {
      await client.query(
        `INSERT INTO site_settings (key, value) 
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [s.key, JSON.stringify(s.value)]
      );
    }
    logger.info('✓ Site settings seeded');

    await client.query('COMMIT');
    logger.info('All seed data inserted successfully! 🌱');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };

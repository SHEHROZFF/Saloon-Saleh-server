const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  auth: {
    user: config.email.smtp.auth.user,
    pass: config.email.smtp.auth.pass,
  },
});

/**
 * Base generic function to send emails
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body of the email
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);

    // Log preview URL if using ethereal email (for local dev)
    if (config.email.smtp.host.includes('ethereal')) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    // We don't throw here to avoid breaking the main request flow if email fails
    return null;
  }
};

/**
 * Wrapper for beautiful, branded email template
 * Incorporating the frontend 'Cinzel' (fallback Georgia) and 'Inter' (fallback Arial) fonts
 * Colors: Base white, text black, accent #c5a059 (Golden), dark #050505
 */
const baseEmailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Inter', Arial, Helvetica, sans-serif; color: #333333; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9f9f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-top: 4px solid #c5a059; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 20px; background-color: #050505;">
              <h1 style="margin: 0; color: #c5a059; font-family: 'Cinzel', Georgia, serif; font-size: 32px; letter-spacing: 3px; text-transform: uppercase; font-weight: normal;">SALON SALEH</h1>
              <p style="margin: 10px 0 0; color: #a1a1aa; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Premium Grooming & Care</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; font-size: 16px; line-height: 1.6; color: #333333;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color: #f4f4f5; font-size: 12px; color: #71717a; border-top: 1px solid #eaeaea;">
              <p style="margin: 0 0 10px;">&copy; ${new Date().getFullYear()} Salon Saleh. All rights reserved.</p>
              <p style="margin: 0;">123 Premium Street, Style Avenue, NY 10001</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper for sleek buttons
const getSleekButton = (text, url) => `
<div style="text-align: center; margin: 30px 0;">
  <a href="${url}" style="display: inline-block; padding: 14px 35px; background-color: #050505; color: #c5a059; text-decoration: none; font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; border: 1px solid #c5a059; border-radius: 2px;">
    ${text}
  </a>
</div>
`;

// Helper for styled tables
const getStyledTable = (rows) => `
<table style="width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #eaeaea;">
  ${rows.map(row => `
    <tr>
      <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #71717a; width: 40%; font-size: 14px;"><strong>${row.label}</strong></td>
      <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #050505; font-size: 14px;">${row.value}</td>
    </tr>
  `).join('')}
</table>
`;

// ============================================================
// 🔐 Authentication & User Management
// ============================================================

const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to Salon Saleh';
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Welcome, ${user.name}</h2>
    <p>We are thrilled to have you join <strong>Salon Saleh</strong>. Experience the finest salon services and premium grooming products crafted for excellence.</p>
    <p>You can now book your appointments and shop online seamlessly.</p>
    ${getSleekButton('Book an Appointment', `${config.email.frontendUrl}/booking`)}
    <p>We look forward to elevating your style.</p>
  `;
  return sendEmail(user.email, subject, baseEmailTemplate(subject, content));
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.email.frontendUrl}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Password Reset Request</h2>
    <p>We received a request to reset the password associated with this email address. If you didn't make this request, you can safely ignore this email.</p>
    <p>To securely reset your password, click the button below:</p>
    ${getSleekButton('Reset Password', resetUrl)}
    <p style="font-size: 13px; color: #71717a;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 13px; word-break: break-all;"><a href="${resetUrl}" style="color: #c5a059;">${resetUrl}</a></p>
    <p style="font-size: 13px; color: #71717a;">This link is valid for 1 hour.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

// ============================================================
// 📅 Booking Workflow
// ============================================================

const sendBookingConfirmation = async (email, booking) => {
  const subject = 'Your Booking Confirmation';

  const tableRows = [
    { label: 'Date', value: new Date(booking.booking_date).toDateString() },
    { label: 'Time', value: booking.time_label || 'TBD' },
    { label: 'Professional', value: booking.staff_name || 'Any Available' },
    { label: 'Total Price', value: `$${parseFloat(booking.total_price).toFixed(2)}` },
  ];

  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Booking Confirmed</h2>
    <p>Dear ${booking.first_name},</p>
    <p>Your appointment has been successfully scheduled. Below are the details of your booking:</p>
    ${getStyledTable(tableRows)}
    <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
    <p>We look forward to providing you with an exceptional experience.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

const sendBookingStatusUpdate = async (email, booking, status) => {
  const statusMap = {
    confirmed: 'has been confirmed',
    completed: 'is now completed',
    cancelled: 'has been cancelled',
    no_show: 'was marked as a no-show'
  };
  const statusText = statusMap[status] || `is now ${status}`;

  const subject = `Booking Update: ${status.toUpperCase()}`;
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Booking Status Update</h2>
    <p>Dear ${booking.first_name},</p>
    <p>Your booking for <strong>${new Date(booking.booking_date).toDateString()}</strong> ${statusText}.</p>
    ${status === 'cancelled' ? '<p>If you have any questions or wish to schedule a new appointment, please visit our website.</p>' : ''}
    ${status === 'completed' ? '<p>Thank you for choosing Salon Saleh. We hope you enjoyed your premium service.</p>' : ''}
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

const sendBookingDetailsModifiedEmail = async (email, booking) => {
  const subject = 'Booking Rescheduled';

  const tableRows = [
    { label: 'New Date', value: new Date(booking.booking_date).toDateString() },
    { label: 'New Time', value: booking.time_label || 'TBD' },
    { label: 'Professional', value: booking.staff_name || 'Any Available' },
  ];

  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Booking Updated</h2>
    <p>Dear ${booking.first_name},</p>
    <p>The details of your appointment have been successfully modified. Here is your updated schedule:</p>
    ${getStyledTable(tableRows)}
    <p>If you did not request this change, please contact our concierge immediately.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

// ============================================================
// 🛍️ E-Commerce Orders Workflow
// ============================================================

const sendOrderConfirmation = async (email, order) => {
  const subject = `Order Confirmation #${order.order_number}`;

  const tableRows = [
    { label: 'Order Number', value: order.order_number },
    { label: 'Total Amount', value: `$${parseFloat(order.total).toFixed(2)}` },
    { label: 'Payment Method', value: order.payment_method.toUpperCase() },
  ];

  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Thank You For Your Order</h2>
    <p>We've received your order and our team is preparing it for shipment.</p>
    ${getStyledTable(tableRows)}
    <p>We will notify you with tracking details as soon as your package is dispatched.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

const sendOrderStatusUpdate = async (email, order, status) => {
  const statusMap = {
    processing: 'is now being processed',
    shipped: 'has been shipped',
    delivered: 'has been delivered',
    cancelled: 'has been cancelled'
  };
  const statusText = statusMap[status] || `status is ${status}`;

  const subject = `Order Update #${order.order_number}`;
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Order Status Update</h2>
    <p>Your order <strong>#${order.order_number}</strong> ${statusText}.</p>
    ${status === 'shipped' ? '<p>Your premium products are on their way. Keep an eye out for your package!</p>' : ''}
    ${status === 'delivered' ? '<p>Enjoy your purchase! We’d love to hear your feedback on the products.</p>' : ''}
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

const sendPaymentStatusUpdate = async (email, order, paymentStatus) => {
  const subject = `Payment Update #${order.order_number}`;
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Payment Status Update</h2>
    <p>The payment status for your order <strong>#${order.order_number}</strong> is now officially <strong>${paymentStatus.toUpperCase()}</strong>.</p>
    ${paymentStatus === 'failed' ? '<p>We were unable to process your payment. Please update your payment details to proceed.</p>' : ''}
    ${paymentStatus === 'refunded' ? '<p>A full refund has been issued to your original payment method. Please allow a few business days for it to appear.</p>' : ''}
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

// ============================================================
// ⏳ Waitlist Workflow
// ============================================================

const sendWaitlistConfirmation = async (email, waitlist) => {
  const subject = 'Waitlist Confirmation';
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">You're on the List</h2>
    <p>Dear ${waitlist.full_name},</p>
    <p>You have successfully joined the exclusive waitlist for <strong>${waitlist.desired_service || 'our premium services'}</strong>.</p>
    <p>Our concierge will contact you immediately when a spot becomes available.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

const sendWaitlistStatusUpdate = async (email, waitlist, status) => {
  if (status !== 'contacted') return; // Only send if contacted

  const subject = 'A Spot is Available!';
  const content = `
    <h2 style="color: #c5a059; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Good News!</h2>
    <p>Dear ${waitlist.full_name},</p>
    <p>A spot has opened up for you! Please contact our concierge or reply to this email to confirm and secure your booking.</p>
    <p>Spaces are highly sought after, so please respond at your earliest convenience.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

// ============================================================
// 👥 Staff Management
// ============================================================

const sendStaffWelcomeEmail = async (email, staffName, tempPassword) => {
  const subject = 'Welcome to the Team';
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">Welcome Aboard, ${staffName}!</h2>
    <p>Your professional account has been provisioned. You can now log in to manage your schedule and services.</p>
    <div style="background-color: #f4f4f5; padding: 20px; border-left: 4px solid #c5a059; margin: 20px 0;">
      <p style="margin: 0 0 10px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e4e4e7; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
    </div>
    <p>Please log in and update your password immediately for security purposes.</p>
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

// ============================================================
// 🎟️ Marketing & Coupons
// ============================================================

const sendCouponDistributionEmail = async (email, name, couponCode, discountText) => {
  const subject = 'An Exclusive Offer For You';
  const content = `
    <h2 style="color: #050505; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: normal; margin-top: 0;">A Special Treat</h2>
    <p>Hi ${name || 'there'},</p>
    <p>As a token of our appreciation, please enjoy <strong>${discountText}</strong> off your next purchase or booking with us.</p>
    <div style="text-align: center; margin: 40px 0;">
      <span style="display: inline-block; background-color: #050505; color: #c5a059; border: 1px dashed #c5a059; padding: 15px 40px; font-family: 'Cinzel', serif; font-size: 28px; letter-spacing: 4px;">
        ${couponCode}
      </span>
    </div>
    <p>Simply apply this code at checkout.</p>
    ${getSleekButton('Claim Offer', `${config.email.frontendUrl}`)}
  `;
  return sendEmail(email, subject, baseEmailTemplate(subject, content));
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmation,
  sendBookingStatusUpdate,
  sendBookingDetailsModifiedEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPaymentStatusUpdate,
  sendWaitlistConfirmation,
  sendWaitlistStatusUpdate,
  sendStaffWelcomeEmail,
  sendCouponDistributionEmail,
};

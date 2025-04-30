// utils/sendMail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendMail = async (booking, status) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: booking.email,
    subject: status === 'confirmed' ? '✅ Ticket Confirmed' : '❌ Ticket Cancelled',
    html: status === 'confirmed'
      ? `
        <h3>Dear ${booking.name}, your ticket is confirmed!</h3>
        <p><strong>From:</strong> ${booking.source}</p>
        <p><strong>To:</strong> ${booking.destination}</p>
        <p><strong>Date:</strong> ${booking.journeyDate}</p>
        <p><strong>Seat:</strong> ${booking.seatType}</p>
        <p>Safe travels! 🚍</p>
      `
      : `
        <h3>Sorry ${booking.name}, your ticket has been cancelled.</h3>
        <p>Please try again later.</p>
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
  }
};

module.exports = sendMail;

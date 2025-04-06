// src/routes/paymentWebhook.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Booking = require("../model/booking");
const Payment = require("../model/payment");

router.post(
  "/train/payment/webhook",
  express.raw({ type: "application/json" }), // Razorpay needs raw body
  async (req, res) => {
    const secret = "goRail@123";
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (signature === expectedSignature) {
      const payload = JSON.parse(body);
      console.log("✅ Webhook Received", payload);
      const orderId = payload.payload.payment.entity.order_id;
      const booking = await Booking.findOne({ razorpayOrderId: orderId });
      if (payload.event === "payment.captured") {
  
       

        if (booking) {
          booking.paymentStatus = "completed";
          await booking.save();
          console.log("✅ Booking updated in DB");
        }
      }

      const payment= await Payment({
        userId: booking.userId,
        trainId: booking.trainId,
        amount: booking.amount,
        orderId: booking.razorpayOrderId,
        paymentId: payload.payload.payment.entity.id,
      })
    payment.save()

      res.status(200).json({ status: "ok" ,payment});
    } else {
      res.status(400).json({ status: "invalid signature" });
    }
  }
);

module.exports = router;

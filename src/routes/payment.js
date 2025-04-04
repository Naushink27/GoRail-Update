// paymentRoutes.js or in your route file
const express = require('express');
const crypto = require('crypto');
const paymentRouter = express.Router();
const Booking = require('../model/booking'); // Adjust the path as necessary





paymentRouter.post("/payment/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const secret = 'goRail@123';
        const signature = req.headers["x-razorpay-signature"];
        const payload = JSON.parse(req.body); // ✅ Directly parse JSON

        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(JSON.stringify(payload)); // ✅ Use JSON.stringify
        const digest = shasum.digest("hex");

        if (digest !== signature) {
            return res.status(400).json({ status: "Invalid Signature ❌" });
        }

        const { razorpay_order_id } = payload.payload.payment.entity;

        // ✅ Update MongoDB
        const booking = await Booking.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            { paymentStatus: "completed" },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        console.log("✅ Payment verified & booking updated:", booking);
        res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});



module.exports = paymentRouter;

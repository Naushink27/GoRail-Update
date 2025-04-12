const express = require("express");
const app = express();
const connectDB = require("./src/config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const userRouter = require("./src/routes/user");
const adminRouter = require("./src/routes/admin");
const trainRouter = require("./src/routes/userTrain");
const verifybookingsRouter = require("./src/routes/verifyBookings");
const webhookRouter = require("./src/routes/paymentWebhook");

// 👇 THIS MUST COME FIRST!
app.use("/train/payment/webhook", express.raw({ type: "application/json" }));

// 👇 THEN use regular middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 👇 Setup your routers
app.use("/", userRouter);
app.use("/", adminRouter);
app.use("/", trainRouter);
app.use("/", verifybookingsRouter); // ✅ just this for admin
app.use("/", webhookRouter); // ✅ just this for webhook

// Connect DB and start server
connectDB().then(() => {
  console.log("MongoDB Connected ✅");
  app.listen(7777, () => {
    console.log("Server running on port 7777 🚀");
  });
}).catch((err) => console.error("DB Error:", err));

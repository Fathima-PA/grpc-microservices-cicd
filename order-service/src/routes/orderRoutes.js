
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
} = require("../controllers/orderController");

router.post("/", authenticate, createOrder);
router.get("/", authenticate, getOrders);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id", authenticate, updateOrder);



module.exports = router;

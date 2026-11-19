
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.createOrder = async (req, res) => {
  try {
    const { product, amount } = req.body;

    if (!product || amount === undefined) {
      return res.status(400).json({
        message: "Product and amount are required",
      });
    }

    if (
      typeof product !== "string" ||
      !product.trim() ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message: "Provide a valid product and positive amount",
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        product: product.trim(),
        amount,
      },
    });

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      message: "Failed to create order",
    });
  }
};


exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.userId !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Access denied. You cannot access this order.",
      });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get order by ID error:", error);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.userId !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);

    return res.status(500).json({
      message: "Failed to update order",
    });
  }
};

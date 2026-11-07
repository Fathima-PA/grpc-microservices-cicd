
require("dotenv").config();

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, "../proto/order.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).order;

async function getOrdersByUser(call, callback) {
  try {
    const { userId } = call.request;

    if (!userId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "userId is required",
      });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
    });

    callback(null, {
      orders: orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        product: order.product,
        amount: order.amount,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("GetOrdersByUser failed:", error.message);

    callback({
      code: grpc.status.INTERNAL,
      message: "Unable to fetch orders",
    });
  }
}

async function startServer() {
  await prisma.$connect();
  console.log("Order database connected (PostgreSQL)");

  const server = new grpc.Server();

  server.addService(proto.OrderService.service, {
    getOrdersByUser,
  });

  server.bindAsync(
    `0.0.0.0:${process.env.PORT || 50051}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error("gRPC server failed:", error);
        process.exit(1);
      }

      console.log(`Order Service listening on ${port}`);
    }
  );

  const shutdown = async () => {
    server.tryShutdown(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch(async (error) => {
  console.error("Order Service startup failed:", error.message);
  await prisma.$disconnect();
  process.exit(1);
});

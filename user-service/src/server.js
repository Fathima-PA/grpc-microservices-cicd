
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const User = require("./user.model");

const app = express();
app.use(express.json());

const protoOptions = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Load the Order Service contract
const orderDefinition = protoLoader.loadSync(
  path.join(__dirname, "../proto/order.proto"),
  protoOptions
);
const orderProto = grpc.loadPackageDefinition(orderDefinition).order;

// Load the User Service contract
const userDefinition = protoLoader.loadSync(
  path.join(__dirname, "../proto/user.proto"),
  protoOptions
);
const userProto = grpc.loadPackageDefinition(userDefinition).user;

// gRPC client for Order Service
const orderClient = new orderProto.OrderService(
  process.env.ORDER_GRPC_URL || "localhost:50051",
  grpc.credentials.createInsecure()
);

// Unary RPC: GetUser
async function getUser(call, callback) {
  try {
    const { userId } = call.request;

    if (!userId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "userId is required",
      });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: "User not found",
      });
    }

    return callback(null, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("GetUser failed:", error.message);

    return callback({
      code: grpc.status.INTERNAL,
      message: "Unable to fetch user",
    });
  }
}

// HTTP endpoint to create a user
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    const user = await User.create({ name, email });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// HTTP endpoint: User Service calls Order Service via gRPC
app.get("/users/:userId/orders", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    orderClient.getOrdersByUser(
      { userId: user._id.toString() },
      { deadline: new Date(Date.now() + 3000) },
      (error, response) => {
        if (error) {
          console.error("Order Service error:", error.message);

          return res.status(502).json({
            error: "Order Service unavailable",
          });
        }

        return res.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          },
          orders: response.orders,
        });
      }
    );
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

async function startServer() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("User database connected");

  const grpcServer = new grpc.Server();

  grpcServer.addService(userProto.UserService.service, {
    getUser,
  });

  const grpcPort = process.env.USER_GRPC_PORT || 50052;

  grpcServer.bindAsync(
    `0.0.0.0:${grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error("User gRPC server failed:", error);
        process.exit(1);
      }

      console.log(`User gRPC server listening on ${port}`);
    }
  );

  const httpPort = process.env.PORT || 3001;

  app.listen(httpPort, () => {
    console.log(`User HTTP API listening on ${httpPort}`);
  });
}

startServer().catch((error) => {
  console.error("User Service startup failed:", error.message);
  process.exit(1);
});

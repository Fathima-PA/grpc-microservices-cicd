const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../proto/user.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const userClient = new userProto.UserService(
  process.env.USER_GRPC_URL || "localhost:50052",
  grpc.credentials.createInsecure()
);

const getUserById = (userId) => {
  return new Promise((resolve, reject) => {
    userClient.getUser({ userId }, (error, user) => {
      if (error) {
        return reject(error);
      }

      resolve(user);
    });
  });
};

module.exports = { getUserById };
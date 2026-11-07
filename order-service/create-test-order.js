
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.create({
    data: {
      userId: "6addab7454281543f4e9ef2e",
      product: "Test Product",
      amount: 1499,
      status: "PENDING",
    },
  });

  console.log("Test order created successfully:");
  console.log(order);
}

main()
  .catch((error) => {
    console.error("Failed to create test order:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function findUserByEmail(email) {
  return await prisma.user.findUnique({ where: { email } });
}

async function findUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
}

async function createUser({ email, hashedPassword }) {
  return await prisma.user.create({
    data: { email, password: hashedPassword },
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};

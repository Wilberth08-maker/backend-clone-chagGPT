const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function runSeed() {
  console.log("🌱 Iniciando seed...");

  try {
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();

    const usersData = [
      { email: "jorge@example.com", password: "123456" },
      { email: "emir@example.com", password: "654321" },
    ];

    for (const user of usersData) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const createdUser = await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
        },
      });

      await prisma.chat.create({
        data: {
          title: "Chat de prueba",
          messages: [
            { role: "user", content: "Hola, ¿cómo estás?" },
            {
              role: "assistant",
              content: "Estoy bien, gracias por preguntar.",
            },
          ],
          userId: createdUser.id,
        },
      });
    }

    console.log("✅ Seed completado.");
  } catch (error) {
    console.error("❌ Error en seed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Conexión cerrada.");
  }
}

module.exports = { runSeed };

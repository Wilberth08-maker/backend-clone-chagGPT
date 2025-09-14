const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Obtener todos los chats de un usuario
async function getChatsByUser(userId) {
  return await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

// Obtener un chat por ID y usuario
async function getChatById(id, userId) {
  return await prisma.chat.findFirst({ where: { id, userId } });
}

// Crear un nuevo chat vacío
async function createChat({ title, userId }) {
  return await prisma.chat.create({
    data: {
      title: title || "Nuevo Chat",
      messages: [],
      userId,
    },
  });
}

// Crear un nuevo chat con mensajes iniciales
async function createChatWithMessages({ title, messages, userId }) {
  return await prisma.chat.create({
    data: {
      title: title || "Nuevo Chat",
      messages,
      userId,
    },
  });
}

// Actualizar mensajes y opcionalmente el título
async function updateChat({ id, messages, title }) {
  return await prisma.chat.update({
    where: { id },
    data: {
      messages,
      updatedAt: new Date(),
      ...(title && { title }),
    },
  });
}

// Eliminar un chat
async function deleteChat(id) {
  return await prisma.chat.delete({ where: { id } });
}

module.exports = {
  getChatsByUser,
  getChatById,
  createChat,
  createChatWithMessages,
  updateChat,
  deleteChat,
};

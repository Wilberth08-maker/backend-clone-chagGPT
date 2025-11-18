// 1. Cargar las variables de entorno desde .env
require("dotenv").config();

// 2. Importar módulos necesarios
const express = require("express");
const cors = require("cors");
// const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs").promises;
const path = require("path");
// const { PrismaClient } = require("@prisma/client");
const colors = require("colors");
const getChatsByUser = require("./services/chatService").getChatsByUser;
const getChatById = require("./services/chatService").getChatById;
const createChat = require("./services/chatService").createChat;
const updateChat = require("./services/chatService").updateChat;
const deleteChat = require("./services/chatService").deleteChat;
const createChatWithMessages =
  require("./services/chatService").createChatWithMessages;
const { runSeed } = require("./prisma/seed");

// 3. Inicializar Express y configurar el puerto
const app = express();
// const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

// Middleware (configuraciones para tu servidor)
app.use(cors()); // Permite peticiones de orígenes diferentes (tu frontend React)
app.use(express.json()); // Permite que el servidor entienda el JSON que le envías

// Importar rutas y middlewares personalizados
const authRoutes = require("./routes/authRoutes");
const authenticateToken = require("./middlewares/authMiddleware");
const optionalAuth = require("./middlewares/authOpcionalMiddleware");

app.use("/api/auth", authRoutes); // Rutas de autenticación

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Rutas de la API para la gestión de chats ---

// GET
app.get("/api/chats", authenticateToken, async (req, res) => {
  try {
    const chats = await getChatsByUser(req.userId);
    // const userChats = chats.filter((chat) => chat.userId === req.userId);
    res.json(chats);
  } catch (error) {
    console.error("Error al obtener los chats:", error);
    res.status(500).json({ error: "Hubo un error al recuperar los chats." });
  }
});

// POST
app.post("/api/chats", authenticateToken, async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }
  try {
    const newChat = await createChat({
      title: req.body.title,
      userId: req.userId,
    });
    res.status(201).json(newChat);
  } catch (error) {
    console.error("Error al crear un nuevo chat:", error);
    res.status(500).json({ error: "Hubo un error al crear el chat." });
  }
});

// GET por ID
app.get("/api/chats/:id", authenticateToken, async (req, res) => {
  try {
    const chat = await getChatById(req.params.id, req.userId);
    if (chat) {
      res.json(chat);
    } else {
      res.status(404).json({ error: "Chat no encontrado." });
    }
  } catch (error) {
    console.error("Error al obtener chat por ID:", error);
    res.status(500).json({ error: "Hubo un error al recuperar el chat." });
  }
});

// PUT
app.put("/api/chats/:id", authenticateToken, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Se requiere un array de mensajes." });
  }
  try {
    const chat = await getChatById(req.params.id, req.userId);
    if (!chat) return res.status(404).json({ error: "Chat no encontrado." });

    let title = chat.title;
    if (messages.length === 1 && title.startsWith("Nuevo Chat")) {
      const firstUserMessage = messages.find((msg) => msg.role === "user");
      if (firstUserMessage) {
        title =
          firstUserMessage.content.substring(0, 30) +
          (firstUserMessage.content.length > 30 ? "..." : "");
      }
    }

    const updatedChat = await updateChat(
      req.params.id,
      req.userId,
      messages,
      title
    );
    res.json(updatedChat);
  } catch (error) {
    console.error("Error al actualizar el chat:", error);
    res.status(500).json({ error: "Hubo un error al actualizar el chat." });
  }
});

// DELETE
app.delete("/api/chats/:id", authenticateToken, async (req, res) => {
  try {
    const chat = await getChatById(req.params.id, req.userId);
    if (!chat) return res.status(404).json({ error: "Chat no encontrado." });
    await deleteChat(req.params.id, req.userId);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar el chat:", error);
    res.status(500).json({ error: "Hubo un error al eliminar el chat." });
  }
});

app.post("/api/chat", optionalAuth, async (req, res) => {
  const { chatId, messages: frontendMessages } = req.body;

  if (
    !frontendMessages ||
    !Array.isArray(frontendMessages) ||
    frontendMessages.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Se requiere un array de mensajes no vacío." });
  }

  let currentChat = null;
  let isNewChat = false;
  let botReply;

  try {
    // Si no hay usuario autenticado
    if (!req.userId) {
      const chat = model.startChat({
        history: frontendMessages.slice(0, -1).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      });

      const lastUserMessage = frontendMessages.at(-1);
      try {
        const result = await chat.sendMessage(lastUserMessage.content);
        botReply = result.response.text();
      } catch (error) {
        console.error("Error IA:", error);
        botReply = "Lo siento, hubo un error al obtener la respuesta.";
      }

      return res.json({ reply: botReply, chatId: null, isNewChat: true });
    }

    //  Usuario autenticado
    if (chatId) {
      currentChat = await getChatById(chatId, req.userId);
    }

    if (!currentChat) {
      isNewChat = true;
      const title =
        frontendMessages[0]?.content?.substring(0, 30) || "Nuevo Chat";
      currentChat = await createChatWithMessages({
        title,
        messages: frontendMessages,
        userId: req.userId,
      });
    } else {
      await updateChat({
        id: currentChat.id,
        messages: frontendMessages,
      });
    }
    try {
      const chat = model.startChat({
        history: frontendMessages.slice(0, -1).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 768,
        },
      });
      const lastUserMessage = frontendMessages.at(-1);
      const result = await chat.sendMessage(lastUserMessage.content);
      botReply = result.response.text();
    } catch (error) {
      console.error("Error al llamar a la API de OpenAI:", error);
      botReply =
        "Lo siento, hubo un error al obtener la respuesta. Por favor, inténtalo de nuevo.";
    }

    const updatedMessages = [
      ...frontendMessages,
      { role: "assistant", content: botReply },
    ];

    await updateChat({
      id: currentChat.id,
      messages: updatedMessages,
    });

    res.json({ reply: botReply, chatId: currentChat.id, isNewChat });
  } catch (error) {
    console.error(
      "Error durante el proceso de chat (posiblemente simulación fallida o lectura/escritura de archivos):",
      error
    );

    const fallbackMessage = {
      role: "assistant",
      content:
        "Lo siento, hubo un error interno al procesar tu solicitud (simulado).",
    };

    if (currentChat) {
      await updateChat({
        id: currentChat.id,
        messages: [...frontendMessages, fallbackMessage],
      });
      return res
        .status(200)
        .json({ reply: fallbackMessage.content, chatId: currentChat.id });
    }

    // Si no hay chat, crea uno con el error
    const title =
      frontendMessages[0]?.content?.substring(0, 30) || "Error Chat";
    const fallbackChat = await createChatWithMessages({
      title,
      messages: [frontendMessages[0], fallbackMessage].filter(Boolean),
      userId: req.userId || null,
    });

    res
      .status(200)
      .json({ reply: fallbackMessage.content, chatId: fallbackChat.id });
  }
});

app.post("/seed", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      error: "Esta ruta solo está disponible en el entorno de desarrollo.",
    });
  }
  try {
    await runSeed();
    res.json({
      message: "Seed ejecutado exitosamente, usuarios creados.",
    });
  } catch (error) {
    console.error("Error al insertar los datos:", error);
    res.status(500).json({ error: "Algo salió mal al insertar los datos." });
  }
});

// 7. Iniciar el servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`.rainbow);
});

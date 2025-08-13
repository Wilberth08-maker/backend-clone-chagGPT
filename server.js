// 1. Cargar las variables de entorno desde .env
require('dotenv').config();


// 2. Importar módulos necesarios
const express = require('express');
const cors = require('cors');
// const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');

// 3. Inicializar Express y configurar el puerto
const app = express();
const port = process.env.PORT || 5000; 

// 4. Configurar el cliente de OpenAI con tu API Key
// const OPENAI = new OpenAI({
//     apiKey: process.env.GOOGLE_API_KEY,
// });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY); // <-- CAMBIO AQUÍ
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // <-- CAMBIO AQUÍ

// Ruta del archivo donde se guardarán los chats
const CHATS_FILE_PATH = path.join(__dirname, 'chats.json');

// Función para leer los chats desde el archivo
async function readChats() {
    try {
        const data = await fs.readFile(CHATS_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe o está vacío, retorna un array vacío
        if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
            return [];
        }
        console.error("Error al leer chats:", error);
        throw error;
    }
}

// Función para escribir los chats en el archivo
async function writeChats(chats) {
    try {
        await fs.writeFile(CHATS_FILE_PATH, JSON.stringify(chats, null, 2), 'utf8');
    } catch (error) {
        console.error("Error al escribir chats:", error);
        throw error;
    }
}

// 5. Middleware (configuraciones para tu servidor)
app.use(cors()); // Permite peticiones de orígenes diferentes (tu frontend React)
app.use(express.json()); // Permite que el servidor entienda el JSON que le envías

// --- Rutas de la API para la gestión de chats ---

// GET
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await readChats();
        // Opcional: Podrías filtrar aquí para un usuario específico si tuvieras autenticación
        res.json(chats);
    } catch (error) {
        console.error('Error al obtener los chats:', error);
        res.status(500).json({ error: 'Hubo un error al recuperar los chats.' });
    }
});

// POST
app.post('/api/chats', async (req, res) => {
    try {
        const chats = await readChats();
        const newChat = {
            id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // ID único
            title: req.body.title || "Nuevo Chat", // Título opcional
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        chats.push(newChat);
        await writeChats(chats);
        res.status(201).json(newChat); // 201 Created
    } catch (error) {
        console.error('Error al crear un nuevo chat:', error);
        res.status(500).json({ error: 'Hubo un error al crear el chat.' });
    }
});

// GET por ID
app.get('/api/chats/:id', async (req, res) => {
    try {
        const chats = await readChats();
        const chat = chats.find(c => c.id === req.params.id);
        if (chat) {
            res.json(chat);
        } else {
            res.status(404).json({ error: 'Chat no encontrado.' });
        }
    } catch (error) {
        console.error('Error al obtener chat por ID:', error);
        res.status(500).json({ error: 'Hubo un error al recuperar el chat.' });
    }
});

// PUT
app.put('/api/chats/:id', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Se requiere un array de mensajes para actualizar.' });
        }

        let chats = await readChats();
        const chatIndex = chats.findIndex(c => c.id === req.params.id);

        if (chatIndex !== -1) {
            chats[chatIndex].messages = messages; // Reemplaza o actualiza los mensajes
            chats[chatIndex].updatedAt = new Date().toISOString();
            // Si el chat es nuevo y no tiene título, usa el primer mensaje del usuario
            if (chats[chatIndex].messages.length === 1 && !chats[chatIndex].title.startsWith("Nuevo Chat")) {
                const firstUserMessage = messages.find(msg => msg.role === 'user');
                if (firstUserMessage) {
                    chats[chatIndex].title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
                }
            }
            await writeChats(chats);
            res.json(chats[chatIndex]);
        } else {
            res.status(404).json({ error: 'Chat no encontrado para actualizar.' });
        }
    } catch (error) {
        console.error('Error al actualizar el chat:', error);
        res.status(500).json({ error: 'Hubo un error al actualizar el chat.' });
    }
});

// DELETE
app.delete('/api/chats/:id', async (req, res) => {
    try {
        let chats = await readChats();
        const chatIndex = chats.findIndex(c => c.id === req.params.id);

        if (chatIndex !== -1) {
            chats.splice(chatIndex, 1); // Elimina el chat
            await writeChats(chats);
            res.status(204).send(); // 204 No Content
        } else {
            res.status(404).json({ error: 'Chat no encontrado para eliminar.' });
        }
    } catch (error) {
        console.error('Error al eliminar el chat:', error);
        res.status(500).json({ error: 'Hubo un error al eliminar el chat.' });
    }
});

app.post('/api/chat', async (req, res) => {

    // Valida que 'messages' sea un array no vacío en el cuerpo de la petición.
    if (!req.body || !req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de mensajes no vacío.' });
    }

    const { chatId, messages: frontendMessages } = req.body;

    try {
        let chats = await readChats();
        let currentChat = null;
        let chatIndex = -1;
        let isNewChat = false; // Añade esta bandera si no la tienes

        if (chatId) {
            chatIndex = chats.findIndex(c => c.id === chatId);
            if (chatIndex !== -1) {
                currentChat = chats[chatIndex];
            }
        }

        if (!currentChat) {
            isNewChat = true; // Establece la bandera
            const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const chatTitle = frontendMessages[0]?.content?.substring(0, 30) || 'Nuevo Chat';

            currentChat = {
                id: newChatId,
                title: chatTitle,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            chats.unshift(currentChat);
            chatIndex = 0;
        } else {
            currentChat.messages = [...frontendMessages];
            currentChat.updatedAt = new Date().toISOString();
            chats[chatIndex] = currentChat;
        }

        // --- SIMULACIÓN DE RESPUESTA DE LA IA ---
        // let botReply;
        // if (frontendMessages && frontendMessages[frontendMessages.length - 1]?.content.toLowerCase().includes('error')) {
        //     botReply = "Lo siento, acabo de simular un error en la IA.";
        // } else {
        //     botReply = `¡Hola! Esto es una respuesta simulada de la IA. Recibí tu mensaje: "${frontendMessages[frontendMessages.length - 1]?.content}"`;
        // }

        //  Maneja la lógica principal del chat
        let botReply;
        try {
            // OPENAI
            // const completion = await openai.chat.completions.create({
            //     model: 'model: 'gpt-4.1-nano-2025-04-14',
            //     messages: frontendMessages,
            //     temperature: 0.7,
            //     max_tokens: 256,
            //     top_p: 1,
            //     frequency_penalty: 0,
            //     presence_penalty: 0,
            // });

            // botReply = completion.choices[0].message.content.trim();
            const chat = model.startChat({
                history: frontendMessages.slice(0, -1).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 256,
                },
            })
            const lastUserMessage = frontendMessages[frontendMessages.length - 1];
            const result = await chat.sendMessage(lastUserMessage.content);
            botReply = result.response.text();
        } catch (error) {
            console.error("Error al llamar a la API de OpenAI:", error);
            botReply = "Lo siento, hubo un error al obtener la respuesta. Por favor, inténtalo de nuevo.";
        }

        const aiMessage = { role: 'assistant', content: botReply };

        currentChat.messages.push(aiMessage);
        currentChat.updatedAt = new Date().toISOString();
        chats[chatIndex] = currentChat; // Asegura que el objeto actualizado se asigne a la lista

        await writeChats(chats);
        res.json({ reply: botReply, chatId: currentChat.id, isNewChat: isNewChat }); 

    } catch (error) {
        console.error('Error durante el proceso de chat (posiblemente simulación fallida o lectura/escritura de archivos):', error);

        const fallbackMessage = {
            role: 'assistant',
            content: 'Lo siento, hubo un error interno al procesar tu solicitud (simulado).'
        };

        // Si ya existe el chat, intenta añadir el error a él
        if (currentChat && currentChat.messages) {
            // currentChat.messages ya tiene el mensaje del usuario si todo el flujo superior fue bien
            currentChat.messages.push(fallbackMessage);
            currentChat.updatedAt = new Date().toISOString();
            chats[chatIndex] = currentChat; // Asegura que el objeto actualizado se asigne a la lista
            await writeChats(chats).catch(writeError => console.error("Error al guardar chats después de un error de simulación:", writeError));
        } else {
            // Si no existía el chat (por algún fallo anterior), se crea uno nuevo con el error
            const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const firstUserMessage = frontendMessages[0]; // El primer mensaje que intentó enviar
            const fallbackChat = {
                id: newChatId,
                title: firstUserMessage?.content.substring(0, 30) + (firstUserMessage?.content.length > 30 ? '...' : '') || 'Error Chat',
                messages: [firstUserMessage, fallbackMessage].filter(Boolean), // Filtra mensajes nulos si firstUserMessage es undefined
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            chats.unshift(fallbackChat);
            await writeChats(chats);
            chatIndex = 0; // Para referencia posterior
            currentChat = fallbackChat; // Asegura que currentChat esté definido para la respuesta
        }


        res.status(200).json({ // Responde 200 OK para que el frontend no falle por el estado HTTP
            reply: fallbackMessage.content,
            chatId: currentChat?.id || chats[chatIndex]?.id // Asegura que se envíe un chatId válido
        });
    }
});

// 7. Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
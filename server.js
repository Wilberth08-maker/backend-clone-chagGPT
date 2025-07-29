// 1. Cargar las variables de entorno desde .env
require('dotenv').config();

// 2. Importar módulos necesarios
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// 3. Inicializar Express y configurar el puerto
const app = express();
const port = process.env.PORT || 5000; 

// 4. Configurar el cliente de OpenAI con tu API Key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

// 6. Definir la ruta de la API para el chat
app.post('/api/chat', async (req, res) => {

    const { chatId, messages: chatMessages } = req.body;

    if (!chatMessages || !Array.isArray(chatMessages) || chatMessages.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de mensajes no vacío.' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', 
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        // Accede a la respuesta del modelo
        const botReply = completion.choices[0].message.content.trim();
        const aiMessage = { role: 'assistant', content: botReply };
        if (chatId) {
            let chats = await readChats();
            const chatIndex = chats.findIndex(c => c.id === chatId);
            if (chatIndex !== -1) {
                // Asegúrate de que los mensajes incluyen la respuesta de la IA
                const updatedMessages = [...chatMessages,aiMessage];
                chats[chatIndex].messages = updatedMessages;
                chats[chatIndex].updatedAt = new Date().toISOString();
                await writeChats(chats);
            }
        }
        res.json({ reply: botReply }); // Envía la respuesta al frontend

    } catch (error) {
        console.error('Error al comunicarse con OpenAI:', error);
        // Envía un mensaje de error genérico para no exponer detalles internos
        res.status(500).json({ error: 'Hubo un error al procesar tu solicitud con OpenAI.' });
    }
});

// 7. Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
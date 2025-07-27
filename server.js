// 1. Cargar las variables de entorno desde .env
require('dotenv').config();

// 2. Importar módulos necesarios
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

// 3. Inicializar Express y configurar el puerto
const app = express();
const port = process.env.PORT || 5000; 

// 4. Configurar el cliente de OpenAI con tu API Key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 5. Middleware (configuraciones para tu servidor)
app.use(cors()); // Permite peticiones de orígenes diferentes (tu frontend React)
app.use(express.json()); // Permite que el servidor entienda el JSON que le envías

// 6. Definir la ruta de la API para el chat
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message; // Obtiene el mensaje del usuario del cuerpo de la petición

    if (!userMessage) {
        return res.status(400).json({ error: 'Falta el mensaje del usuario.' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', 
            messages: [{ role: 'user', content: userMessage }],
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        // Accede a la respuesta del modelo
        const botReply = completion.choices[0].message.content.trim();
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
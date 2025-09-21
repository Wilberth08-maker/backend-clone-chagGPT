# 🧠 CloneChatGPT — Backend

Backend para una aplicación de chat tipo ChatGPT, construido con ExpressJS, Prisma y PostgreSQL. Expone una API REST segura y modular, con autenticación JWT, validación con Zod, y generación de respuestas mediante la API de Google Gemini.

## 🚀 Tecnologías

- **ExpressJS** — Framework backend ligero y flexible
- **Prisma** — ORM moderno para PostgreSQL
- **PostgreSQL** — Base de datos relacional
- **Zod** — Validación de datos en controladores
- **JWT** — Autenticación segura con tokens
- **bcrypt** — Hashing de contraseñas
- **Google Generative AI (Gemini)** — Generación de respuestas tipo IA
- **Railway** — Despliegue en nube

## 🧱 Estructura del Proyecto

```
my-backend/
├── 🧠 controllers/ → authController (signup, login, getMe)
├── 🛡️ middlewares/ → authMiddleware, authOpcionalMiddleware
├── 🗄️ prisma/ → schema.prisma, seed.js, migrations/
├── 🚪 routes/ → authRoutes
├── 🔧 services/ → chatService, userService (PrismaClient)
└── 🧵 server.js → Configuración principal de Express
```

## 🎯 Funcionalidades

- Registro y login de usuarios con validación Zod
- Autenticación con JWT y verificación con middlewares
- Middleware opcional para rutas públicas con token no obligatorio
- Persistencia de usuarios y chats con Prisma + PostgreSQL
- Generación de respuestas tipo IA con Google Gemini (`gemini-1.5-flash`)
- Rutas RESTful: `POST`, `GET`, `DELETE`, `PUT`
- Despliegue en Railway con variables de entorno seguras

## 🔐 Seguridad

- Contraseñas hasheadas con `bcrypt`
- Tokens firmados con `jsonwebtoken`
- Validación de entrada con `zod`
- Middleware de protección (`authMiddleware`) y acceso opcional (`authOpcionalMiddleware`)

## 🤖 Integración con IA

```js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
```

La API de Gemini se utiliza para generar respuestas simuladas tipo ChatGPT, integradas en el flujo de conversación.

## 📦 Instalación

```bash
git clone https://github.com/Wilberth08-maker/backend-clone-chagGPT.git
cd my-backend
npm install
npm run dev
```

## 🌐 Despliegue

Este backend está desplegado en Railway con variables de entorno seguras.  
La API está protegida con JWT y expone rutas REST para autenticación y gestión de chats.

## 📄 Frontend

Este backend se conecta al frontend construido con React + Vite.

🔗 https://github.com/Wilberth08-maker/cloneChatGPT

## 🧠 Autor

Wilberth — Desarrollador frontend en formación activa, con experiencia práctica en proyectos reales y despliegue profesional de backend con ExpressJS, Prisma y PostgreSQL. Domina React, Tailwind, arquitectura modular y optimización visual. Apasionado por construir interfaces limpias, eficientes y escalables, con atención al detalle, arquitectura modular y experiencia visual elegante basada en buenas prácticas.

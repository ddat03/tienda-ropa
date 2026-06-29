# Guía de instalación y despliegue

## Requisitos previos
- Node.js 18+
- Cuenta Firebase (gratuita)
- Cuenta Twilio (tiene trial gratuito)
- Cuenta Railway o Render (hosting backend, plan gratuito disponible)

---

## 1. Firebase — configuración

### 1.1 Crear proyecto
1. Ir a https://console.firebase.google.com
2. Crear nuevo proyecto → "tienda-ropa"
3. Activar **Firestore Database** (modo producción)
4. Activar **Authentication** → Email/Password
5. Crear usuario para la dueña: Authentication → Add user

### 1.2 Service Account (backend)
1. Project Settings → Service accounts → Generate new private key
2. Descargar el JSON
3. Copiar los valores a `backend/.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

### 1.3 Config web (frontend)
1. Project Settings → General → Add app → Web
2. Copiar los valores a `frontend/.env`:
   - Todos los `VITE_FIREBASE_*`

### 1.4 FCM (notificaciones push)
1. Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
2. Copiar la clave a `frontend/.env` como `VITE_FIREBASE_VAPID_KEY`

### 1.5 Desplegar reglas e índices
```bash
npm install -g firebase-tools
firebase login
cd firebase
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 2. Twilio WhatsApp — configuración

### 2.1 Cuenta y sandbox
1. Crear cuenta en https://twilio.com (trial gratuito)
2. Ir a Messaging → Try it out → Send a WhatsApp message
3. Seguir instrucciones del sandbox (los clientes envían un mensaje join xxx-xxx)
4. Para producción: solicitar número WhatsApp Business aprobado (~$0/mes en tier gratuito)

### 2.2 Webhook
Después de desplegar el backend, ir a:
Twilio Console → Messaging → Settings → WhatsApp sandbox settings
→ "When a message comes in": `https://tu-backend.railway.app/webhook/whatsapp`
→ Método: HTTP POST

### 2.3 Variables de entorno
Copiar de Twilio Console a `backend/.env`:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886` (sandbox) o tu número aprobado

---

## 3. Backend — instalación y despliegue

### Local
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus valores reales
npm run dev
```

### Railway (recomendado — plan gratuito)
1. Crear cuenta en https://railway.app
2. New Project → Deploy from GitHub repo
3. Seleccionar carpeta `/backend`
4. Agregar variables de entorno en Railway dashboard
5. El URL del backend será algo como `https://tienda-ropa-backend.railway.app`
6. Actualizar `VITE_API_URL` en frontend con ese URL

---

## 4. Frontend — instalación y despliegue

### Local
```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con tus valores reales
npm run dev
```

### Firebase Hosting (gratuito)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

URL resultante: `https://tienda-ropa.web.app`

---

## 5. Primera configuración del negocio

### 5.1 Agregar inventario inicial
1. Abrir el panel web e iniciar sesión
2. Ir a "Inventario" → botón "+" para agregar cada prenda con:
   - Nombre (ej: "Blusa")
   - Color (ej: "Rosada")
   - Talla (S, M, L, etc.)
   - Cantidad disponible
   - Precio

### 5.2 Probar el bot
1. Desde WhatsApp, enviar un mensaje al número del sandbox de Twilio
2. Escribir "HOLA" → debería responder automáticamente
3. Escribir "ABONAR" → responde con instrucciones
4. Simular que confirmas el abono desde el panel Admin

### 5.3 Probar el flujo del live
1. Activar un cliente de prueba desde el panel Admin
2. Escribir desde WhatsApp: `ROC-AB34 blusa rosada M`
3. Ver el pedido aparecer en tiempo real en el Panel Live
4. Confirmar o rechazar desde el panel

---

## 6. Estructura de costos (Ecuador)

| Servicio | Plan gratuito | Costo con volumen |
|---|---|---|
| Firebase Firestore | 1GB, 50k lecturas/día | $0.06/100k operaciones |
| Firebase Hosting | 10GB/mes | Muy bajo |
| Railway (backend) | $5/mes crédito gratis | ~$5/mes |
| Twilio WhatsApp | 1000 conversaciones/mes gratis (Meta) | $0.005/mensaje después |
| Total estimado | **$0/mes** al inicio | **<$10/mes** con crecimiento |

---

## 7. Flujo completo del negocio

```
CLIENTE WHATSAPP          BOT/BACKEND              PANEL WEB
     │                        │                        │
     │── "HOLA" ─────────────▶│                        │
     │◀── Bienvenida ─────────│                        │
     │── "ABONAR" ───────────▶│                        │
     │◀── Instrucciones ──────│                        │
     │── [envía comprobante] ─▶│── Notifica dueña ────▶│ (Admin)
     │                        │                   Dueña confirma
     │◀── "Tu código: ROC-AB34"│◀───────────────────────│
     │     válido 15 días     │                        │
     │                        │                        │
  [Durante el live]           │                        │
     │── "ROC-AB34 blusa M" ──▶│── Verifica stock ─────▶│
     │◀── "Pedido recibido..." │── Crea pedido ────────▶│ (Live)
     │                        │                   Dueña confirma
     │◀── "¡Pedido confirmado!"│◀───────────────────────│
                              │── Descuenta inventario  │
```

#!/usr/bin/env node
/**
 * Nature Hotel & Sauna — Asistente AI Backend
 * Recibe consultas del panel, agrega contexto y responde con Claude
 * 
 * Deployment: Render.com (free tier)
 * Env vars requeridas: ANTHROPIC_API_KEY
 */

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(cors());

const client = new Anthropic();

const SYSTEM_PROMPT = `Eres el asistente de recepción de Nature Hotel & Sauna, un spa de lujo en Lima, Perú.

Tu rol es ayudar al equipo de recepción con consultas sobre:
- Disponibilidad de masajistas en tiempo real
- Horarios, turnos y descansos
- Citas programadas del día
- Cómo agendar nuevas citas
- Resolución de conflictos de horarios

Características:
- Responde SIEMPRE en español
- Sé conciso y directo (máximo 2-3 oraciones)
- Si hay datos en vivo (contexto), úsalos como verdad absoluta
- Sé profesional pero cálido
- Si no sabes algo, di "No tengo esa información" en lugar de adivinar
- Para agendar citas, guía paso a paso pero remite a "Agendar cita" en el panel

Contexto disponible:
El contexto incluye estado en vivo de masajistas (disponibles, en sesión, fuera de turno) y todas las citas del día.
Úsalo siempre como fuente de verdad para respuestas.`;

app.post('/chat', async (req, res) => {
  try {
    const { consulta, contexto, historial } = req.body;
    
    if (!consulta || !contexto) {
      return res.status(400).json({ error: 'Faltan consulta o contexto' });
    }
    
    // Construir historial para Claude
    const mensajes = (historial || []).map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Agregar la consulta actual
    mensajes.push({
      role: 'user',
      content: `${contexto}\n\n[CONSULTA DE RECEPCIÓN]\n${consulta}`
    });
    
    // Llamar a Claude
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: mensajes
    });
    
    const respuesta = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Error procesando respuesta';
    
    res.json({ respuesta });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      respuesta: 'Error al procesar tu consulta. Intenta de nuevo.'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', api_key_loaded: !!process.env.ANTHROPIC_API_KEY });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌿 Nature Hotel Asistente backend escuchando en puerto ${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY no configurada. El servicio no funcionará.');
  }
});

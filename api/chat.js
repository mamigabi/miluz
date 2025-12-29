import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;

    // Usamos gemini-1.5-flash que es el modelo gratuito por excelencia
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: "Eres Miluz, la mentora de trading institucional de Gabriel. Eres experta en Order Flow, Heatmap y metodología Blacksheep. Tu tono es profesional, motivador y directo. Ayudas a Gabriel a gestionar sus cuentas de Orion y Livox Capital.",
    });

    const reply = response.text();

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Error en Miluz:", error);
    return res.status(500).json({ error: error.message });
  }
}

// MILUZ Vision API - Análisis de gráficos con Gemini Vision
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image, prompt } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // Usar Gemini 1.5 Flash con vision
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-previewgemini-3-flash-preview' });

        // Prompt especializado para análisis técnico
        const analysisPrompt = prompt || `
Analiza este gráfico de trading de forma profesional:

1. **Tendencia**: Identifica la tendencia principal (alcista/bajista/lateral)
2. **Soportes y Resistencias**: Marca niveles clave
3. **Patrones**: Detecta patrones de velas, chartistas (triángulos, banderas, etc.)
4. **Indicadores**: Si hay indicadores visibles (RSI, MACD, medias móviles), analízalos
5. **Volumen**: Analiza el volumen si está visible
6. **Señales**: ¿Hay señales de compra/venta claras?
7. **Riesgo**: ¿Dónde colocarías stop loss y take profit?
8. **Recomendación**: Compra, venta, o esperar

Sé específico, profesional y basado en análisis técnico real.
        `.trim();

        // Convertir imagen base64 a formato que Gemini entiende
        const imagePart = {
            inlineData: {
                data: image.split(',')[1] || image, // Remover el prefijo data:image/... si existe
                mimeType: 'image/png'
            }
        };

        const result = await model.generateContent([analysisPrompt, imagePart]);
        const analysis = result.response.text();

        return res.status(200).json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en análisis de visión:', error);
        return res.status(500).json({
            error: 'Error analyzing image',
            details: error.message
        });
    }
}

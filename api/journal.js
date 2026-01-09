// MILUZ Journal API - Diario de Trading Automatizado
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { trade } = req.body;

        if (!trade) {
            return res.status(400).json({ error: 'Trade data required' });
        }

        // Generar análisis post-mortem con Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-previewgemini-3-flash-previewgemini-3-flash-preview' });
        
        const prompt = `
Analiza esta operación de trading y genera un post-mortem detallado:

**Datos de la operación:**
- Activo: ${trade.symbol || 'N/A'}
- Tipo: ${trade.type || 'N/A'}
- Precio entrada: ${trade.entryPrice || 'N/A'}
- Precio salida: ${trade.exitPrice || 'N/A'}
- Cantidad: ${trade.quantity || 'N/A'}
- Resultado: ${trade.profit || 'N/A'}
- Duración: ${trade.duration || 'N/A'}
- Notas: ${trade.notes || 'Sin notas'}

**Genera un análisis estructurado con:**
1. **Resumen ejecutivo**: ¿Fue exitosa? ¿Por qué?
2. **Decisión de entrada**: ¿Fue correcta? ¿Qué señales usó?
3. **Gestión de posición**: ¿Se respetó el plan? ¿Stop loss/take profit adecuados?
4. **Decisión de salida**: ¿Fue oportuna? ¿Se pudo mejorar?
5. **Emociones**: ¿Hubo emociones involucradas? ¿Miedo, codicia?
6. **Lecciones aprendidas**: 3 puntos clave para mejorar
7. **Rating**: Del 1 al 10, ¿cómo calificas esta operación?

Sé crítico y constructivo. El objetivo es mejorar.
        `.trim();

        const result = await model.generateContent(prompt);
        const analysis = result.response.text();

        // Guardar en Supabase
        const { data, error } = await supabase
            .from('trading_journal')
            .insert([{
                symbol: trade.symbol,
                type: trade.type,
                entry_price: trade.entryPrice,
                exit_price: trade.exitPrice,
                quantity: trade.quantity,
                profit: trade.profit,
                duration: trade.duration,
                notes: trade.notes,
                analysis: analysis,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Error saving to journal', details: error.message });
        }

        return res.status(200).json({
            success: true,
            journalEntry: data[0],
            analysis
        });

    } catch (error) {
        console.error('Journal error:', error);
        return res.status(500).json({
            error: 'Error creating journal entry',
            details: error.message
        });
    }
}

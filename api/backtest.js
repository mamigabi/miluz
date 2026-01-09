// MILUZ Backtest API - Backtesting y Paper Trading
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
        const { strategy, historicalData, mode } = req.body;

        if (!strategy || !mode) {
            return res.status(400).json({ error: 'Strategy and mode required' });
        }

        // Validar modo: backtest o paper
        if (!['backtest', 'paper'].includes(mode)) {
            return res.status(400).json({ error: 'Mode must be backtest or paper' });
        }

        // Usar Gemini para analizar estrategia y simular trades
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
Eres un motor de backtesting para estrategias de trading.

**Modo:** ${mode === 'backtest' ? 'Backtesting (datos históricos)' : 'Paper Trading (simulación en tiempo real)'}

**Estrategia:**
${strategy}

**Datos históricos:**
${historicalData ? JSON.stringify(historicalData) : 'No hay datos históricos'}

**Tu tarea:**
1. Analiza la estrategia propuesta
2. Simula la ejecución de trades basados en la estrategia
3. Calcula métricas clave:
   - Número de trades
   - Trades ganadores vs perdedores
   - Profit/Loss total
   - Sharpe ratio estimado
   - Drawdown máximo
   - Win rate (%)
4. Genera recomendaciones de mejora
5. Evalúa riesgo general (1-10)

Devuelve un JSON estructurado con estas métricas.
        `.trim();

        const result = await model.generateContent(prompt);
        let analysis = result.response.text();

        // Intentar parsear JSON de la respuesta
        let metrics;
        try {
            // Limpiar markdown si existe
            analysis = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            metrics = JSON.parse(analysis);
        } catch (e) {
            // Si no es JSON, usar respuesta como texto
            metrics = {
                analysis: analysis,
                mode: mode,
                strategy: strategy
            };
        }

        // Guardar resultado en Supabase
        const { data, error } = await supabase
            .from('backtest_results')
            .insert([{
                mode: mode,
                strategy: strategy,
                historical_data: historicalData,
                metrics: metrics,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            // Continuar aunque falle Supabase
        }

        return res.status(200).json({
            success: true,
            mode,
            metrics,
            backtestId: data ? data[0]?.id : null
        });

    } catch (error) {
        console.error('Backtest error:', error);
        return res.status(500).json({
            error: 'Error running backtest',
            details: error.message
        });
    }
}

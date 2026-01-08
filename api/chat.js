import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tziirdhvhxhrmuuxrgvb.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6aWlyZGh2aHhocm11dXhyZ3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4ODU2ODcsImV4cCI6MjA1MjQ2MTY4N30.WGXRr-qGCIWJ2EEm1Pd6K6HwCgMv0TZHCB8VC3gW0A4'
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// System Instructions completas unificadas
const SYSTEM_INSTRUCTION = `Eres MILUZ AI, un mentor de trading institucional especializado en XAUUSD (oro). Tu misión es enseñar trading de manera 1 a 1, como una maestra experimentada, nunca enviando a ver videos.

# PERSONALIDAD Y ESTILO
- Educativa y motivacional, SIN dar señales directas de compra/venta
- Enseñas conceptos, explicas el "por qué", y guías al trader a tomar sus propias decisiones
- Usas ATAS, MTS (Market Trading Software) y análisis de flujo de órdenes institucional
- Respondes en español de forma profesional pero cercana

# CONOCIMIENTO BASE - BLACK SHEEP ACADEMY

## ESTRATEGIA BLACKSHEEP (Principal - Trading Institucional)
La estrategia BlackSheep se basa en el seguimiento del dinero institucional mediante:
- **Heatmap**: Herramienta fundamental que muestra dónde están posicionadas las instituciones
- **Análisis de flujo de órdenes**: Identificar acumulación y distribución institucional
- **Estructura de mercado**: Máximos y mínimos, cambios de tendencia  
- **Pivots de Fibonacci**: Fibonacci pivot points ultimate para identificar zonas clave (R61, S61)

## ESTRATEGIA GRIETAS (WEALTH BLACK SHEEP)
Enfocada en criptomonedas y acciones:
- Buscar "grietas" o rupturas en estructura de mercado
- Secuencia de máximos y mínimos
- Análisis de volumen en puntos clave
- Ideal para swing trading

## ESTRATEGIA HEATMAP + PIVOTS INTRADÍA
Combinación para trading intradía:
- Usar Heatmap para identificar zonas de interés institucional
- Aplicar pivots (especialmente R61 o superior) como objetivos
- Buscar confluencias entre ambas herramientas
- Timeframes menores para entradas precisas

## PSICOTRADING
Aspectos mentales críticos que enseñas:
- **Neurotrading**: Sueño, descanso y rendimiento
- **Regulación emocional**: Control de avaricia, miedo
- **Metas y propósitos**: Trading con sentido y plan
- **Los 4 estados del trader**: Reconocer y gestionar cada estado
- **Confianza y autoestima**: Paz-ciencia en el trading

## GESTIÓN DE RIESGO
Principios NO negociables:
1. Obsesionarse con tomar liquidez perfecta
2. Operar sin ver cambio en el delta
3. Ignorar el contexto (comparar números sin contexto)
4. No combinar acción de precio + volumen
5. Complicarse con números en lugar de ver colores/patrones

**Regla de Oro:**
"No importa el número exacto, importa el CONTEXTO y el CAMBIO en el flujo de órdenes"

---

### APLICACIÓN PRÁCTICA

Cuando analices un setup:

1. **HTF (Higher Timeframe)**: Identifica estructura y zonas SMC
2. **MTF (Medium Timeframe)**: Valida Order Block con volumen
3. **LTF (Lower Timeframe)**: Busca patrón de entrada con footprint
4. **Ejecución**: Confirma con delta y big trades
5. **Gestión**: Monitorea cambios en el flow para salir

Recuerda: "Acción de precio + Volumen = Confluencia perfecta"¡pasión y profesionalismo!

---

**Cuando enseñes estas estrategias:**
1. Siempre explica el "POR QUÉ" detrás de cada concepto
2. Usa ejemplos prácticos en XAUUSD cuando sea posible
3. Enfatiza la CONFLUENCIA de múltiples factores
4. Recuerda que NO das señales, ENSEÑAS a analizar
5. La paciencia (paz-ciencia) es fundamental
6. Esperar el setup completo es mejor que forzar operaciones
7. La gestión de riesgo es MÁS importante que la estrategia
8. El trading institucional requiere visión de mediano plazo
9. Las instrucciones dejan "migas de pan" (señales) que debemos seguir
10. Cada trader debe desarrollar su PROPIO criterio

**Recuerda siempre:**
- Eres una MENTORA, no una señalera
- Tu objetivo es formar traders profesionales e independientes
- Cada pregunta es una oportunidad de enseñanza profunda
- La motivación y el apoyo emocional son parte de tu rol
- El psicotrading y la disciplina son tan importantes como la técnica`;

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // FASE 2: RAG - Buscar conocimiento relevante en Supabase
    let contextFromSupabase = '';
    
    try {
      // Buscar en academy_documents usando búsqueda de texto
      const { data: academyDocs, error: academyError } = await supabase
        .from('academy_documents')
        .select('title, content')
        .textSearch('content', message.split(' ').slice(0, 3).join(' | '))
        .limit(3);

      if (!academyError && academyDocs && academyDocs.length > 0) {
        contextFromSupabase += '\n\n=== CONOCIMIENTO RELEVANTE DE ACADEMY ===\n';
        academyDocs.forEach(doc => {
          contextFromSupabase += `\n**${doc.title}**:\n${doc.content.substring(0, 500)}...\n`;
        });
      }

      // Buscar en trading_knowledge
      const { data: tradingKnowledge, error: tkError } = await supabase
        .from('trading_knowledge')
        .select('*')
        .limit(2);

      if (!tkError && tradingKnowledge && tradingKnowledge.length > 0) {
        contextFromSupabase += '\n\n=== CONOCIMIENTO DE TRADING ===\n';
        tradingKnowledge.forEach(item => {
          contextFromSupabase += `${JSON.stringify(item).substring(0, 300)}...\n`;
        });
      }
    } catch (supabaseError) {
      console.log('Error consultando Supabase (continuando sin contexto adicional):', supabaseError);
    }

    // Construir prompt completo con contexto de Supabase si está disponible
    const fullPrompt = contextFromSupabase 
      ? `${message}\n\n${contextFromSupabase}`
      : message;

    // Llamar a Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    model: "gemini-1.5-flash",    const response = result.response;
    const text = response.text();

    res.status(200).json({ response: text });

  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({ 
      error: 'Error procesando mensaje',
      details: error.message 
    });
  }
}

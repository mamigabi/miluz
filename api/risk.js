// THE GUARDIAN - Módulo de Gestión de Riesgo
// Bloquea automáticamente operaciones que violan las reglas de gestión de riesgo

import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tziirdhvhxhrmuuxrgvb.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6aWlyZGh2aHhocm11dXhyZ3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4ODU2ODcsImV4cCI6MjA1MjQ2MTY4N30.WGXRr-qGCIWJ2EEm1Pd6K6HwCgMv0TZHCB8VC3gW0A4'
);

// REGLAS DE GESTIÓN DE RIESGO
const RISK_RULES = {
  MAX_RISK_PER_TRADE: 2, // Máximo 2% de riesgo por operación
  MAX_DAILY_LOSS: 5, // Máximo 5% de pérdida diaria
  MIN_RISK_REWARD: 1.5, // Ratio mínimo Riesgo/Beneficio 1:1.5
  MAX_POSITION_SIZE: 10, // Máximo 10% del capital en una posición
  MAX_DAILY_TRADES: 5, // Máximo 5 operaciones por día
  MIN_WIN_RATE: 40, // Tasa mínima de ganancia 40%
};

export default async function handler(req, res) {
  // CORS headers
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
    const { tradeData } = req.body;

    if (!tradeData) {
      return res.status(400).json({ 
        error: 'Datos de operación requeridos',
        blocked: true 
      });
    }

    // Extraer datos de la operación
    const {
      accountBalance,
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      riskAmount,
      riskPercentage
    } = tradeData;

    // Array para almacenar violaciones
    const violations = [];
    let isBlocked = false;

    // VALIDACIÓN 1: Riesgo por operación
    if (riskPercentage > RISK_RULES.MAX_RISK_PER_TRADE) {
      violations.push({
        rule: 'MAX_RISK_PER_TRADE',
        message: `⛔ Riesgo por operación (${riskPercentage.toFixed(2)}%) excede el máximo permitido (${RISK_RULES.MAX_RISK_PER_TRADE}%)`,
        severity: 'CRITICAL'
      });
      isBlocked = true;
    }

    // VALIDACIÓN 2: Tamaño de posición
    const positionPercentage = (positionSize * entryPrice / accountBalance) * 100;
    if (positionPercentage > RISK_RULES.MAX_POSITION_SIZE) {
      violations.push({
        rule: 'MAX_POSITION_SIZE',
        message: `⛔ Tamaño de posición (${positionPercentage.toFixed(2)}%) excede el máximo permitido (${RISK_RULES.MAX_POSITION_SIZE}%)`,
        severity: 'CRITICAL'
      });
      isBlocked = true;
    }

    // VALIDACIÓN 3: Ratio Riesgo/Beneficio
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = rewardDistance / riskDistance;

    if (riskRewardRatio < RISK_RULES.MIN_RISK_REWARD) {
      violations.push({
        rule: 'MIN_RISK_REWARD',
        message: `⚠️ Ratio R/R (1:${riskRewardRatio.toFixed(2)}) está por debajo del mínimo (1:${RISK_RULES.MIN_RISK_REWARD})`,
        severity: 'WARNING'
      });
    }

    // VALIDACIÓN 4: Drawdown diario
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTrades, error } = await supabase
        .from('trades')
        .select('pnl')
        .gte('created_at', today)
        .eq('user_id', 'gabriel'); // Ajustar según tu sistema de usuarios

      if (!error && todayTrades) {
        const dailyPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const dailyLossPercentage = (Math.abs(dailyPnL) / accountBalance) * 100;

        if (dailyPnL < 0 && dailyLossPercentage >= RISK_RULES.MAX_DAILY_LOSS) {
          violations.push({
            rule: 'MAX_DAILY_LOSS',
            message: `🛑 Pérdida diaria (${dailyLossPercentage.toFixed(2)}%) alcanzó el límite máximo (${RISK_RULES.MAX_DAILY_LOSS}%). NO OPERES MÁS HOY.`,
            severity: 'CRITICAL'
          });
          isBlocked = true;
        }

        // VALIDACIÓN 5: Número máximo de operaciones diarias
        if (todayTrades.length >= RISK_RULES.MAX_DAILY_TRADES) {
          violations.push({
            rule: 'MAX_DAILY_TRADES',
            message: `⚠️ Ya realizaste ${todayTrades.length} operaciones hoy. Límite: ${RISK_RULES.MAX_DAILY_TRADES}`,
            severity: 'WARNING'
          });
        }
      }
    } catch (error) {
      console.log('Error al consultar trades diarios:', error);
    }

    // Construir respuesta
    const response = {
      blocked: isBlocked,
      violations: violations,
      riskAnalysis: {
        riskPercentage: riskPercentage,
        riskAmount: riskAmount,
        positionPercentage: positionPercentage.toFixed(2),
        riskRewardRatio: riskRewardRatio.toFixed(2),
        status: isBlocked ? '🛑 OPERACIÓN BLOQUEADA' : (violations.length > 0 ? '⚠️ ADVERTENCIAS' : '✅ OPERACIÓN PERMITIDA')
      },
      message: isBlocked 
        ? '🛑 THE GUARDIAN ha bloqueado esta operación por violar reglas críticas de gestión de riesgo.'
        : (violations.length > 0 
          ? '⚠️ Advertencias detectadas. Revisa antes de operar.'
          : '✅ Operación aprobada por THE GUARDIAN. Todas las validaciones pasaron.')
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error en THE GUARDIAN:', error);
    res.status(500).json({ 
      error: 'Error procesando validación',
      details: error.message,
      blocked: true // En caso de error, bloquear por seguridad
    });
  }
}

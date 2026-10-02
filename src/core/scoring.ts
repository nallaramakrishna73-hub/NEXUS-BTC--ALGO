import {
  DisplacementResult,
  FairValueGap,
  LiquidityPool,
  MarketBias,
  MarketStructureState,
  SignalScoreBreakdown,
  TradeDirection,
} from '../types/trading';

export interface ScoringInputs {
  direction: TradeDirection;
  htfBias: MarketBias;
  structure5m: MarketStructureState;
  sweep: { isSweep: boolean; type: 'BULLISH' | 'BEARISH' | 'NONE'; sweptPool?: LiquidityPool };
  displacement: DisplacementResult;
  recentFvgs: FairValueGap[];
  activeRetestFvg: FairValueGap | null;
  volumeConfirmed: boolean;
  sessionValid: boolean;
  volatilityValid: boolean;
  isRanging: boolean;
  rangeReason?: string;
  cooldownActive: boolean;
  dailyLossHalted: boolean;
  consecutiveLossHalted: boolean;
}

/**
 * Evaluates the 12-point confirmation scoring engine
 */
export function calculateSignalScore(inputs: ScoringInputs): SignalScoreBreakdown {
  const noTradeReasons: string[] = [];
  let score = 0;

  if (inputs.direction === 'NONE') {
    return {
      score: 0,
      maxScore: 12,
      isTradable: false,
      htfBiasAlignment: false,
      liquiditySweep: false,
      displacement: false,
      mssBos: false,
      fvgPresent: false,
      fvgRetest: false,
      volumeConfirmation: false,
      sessionVolatilityConfirmation: false,
      noTradeReasons: ['No directional bias formed'],
    };
  }

  // 1. HTF Bias Alignment (+2)
  let htfBiasAlignment = false;
  if (inputs.direction === 'LONG' && inputs.htfBias === 'BULLISH') {
    score += 2;
    htfBiasAlignment = true;
  } else if (inputs.direction === 'SHORT' && inputs.htfBias === 'BEARISH') {
    score += 2;
    htfBiasAlignment = true;
  } else {
    noTradeReasons.push(`HTF bias (${inputs.htfBias}) does not align with ${inputs.direction}`);
  }

  // 2. Liquidity Sweep (+2)
  let liquiditySweep = false;
  if (
    inputs.sweep.isSweep &&
    ((inputs.direction === 'LONG' && inputs.sweep.type === 'BULLISH') ||
      (inputs.direction === 'SHORT' && inputs.sweep.type === 'BEARISH'))
  ) {
    score += 2;
    liquiditySweep = true;
  } else {
    noTradeReasons.push(`No confirmed ${inputs.direction === 'LONG' ? 'sell-side' : 'buy-side'} liquidity sweep`);
  }

  // 3. Displacement (+2)
  let displacement = false;
  if (
    inputs.displacement.isDisplacement &&
    ((inputs.direction === 'LONG' && inputs.displacement.direction === 'BULLISH') ||
      (inputs.direction === 'SHORT' && inputs.displacement.direction === 'BEARISH'))
  ) {
    score += 2;
    displacement = true;
  } else {
    noTradeReasons.push('Lack of institutional displacement candle');
  }

  // 4. MSS / BOS (+2)
  let mssBos = false;
  const isAlignedStructure =
    (inputs.direction === 'LONG' && inputs.structure5m.structure === 'BULLISH') ||
    (inputs.direction === 'SHORT' && inputs.structure5m.structure === 'BEARISH');

  if (isAlignedStructure && (inputs.structure5m.mss || inputs.structure5m.bos)) {
    score += 2;
    mssBos = true;
  } else if (inputs.structure5m.mss || inputs.structure5m.bos) {
    score += 1; // partial if structure is shifting
    mssBos = true;
  } else {
    noTradeReasons.push('No confirmed Break of Structure (BOS) or Shift (MSS)');
  }

  // 5. FVG Present (+1)
  let fvgPresent = false;
  const targetFvgType = inputs.direction === 'LONG' ? 'BULLISH' : 'BEARISH';
  const matchingFvgs = inputs.recentFvgs.filter((f) => f.type === targetFvgType && !f.mitigated);
  if (matchingFvgs.length > 0) {
    score += 1;
    fvgPresent = true;
  } else {
    noTradeReasons.push('No active Fair Value Gap (FVG) in direction of trade');
  }

  // 6. FVG Retest (+1)
  let fvgRetest = false;
  if (inputs.activeRetestFvg && inputs.activeRetestFvg.type === targetFvgType) {
    score += 1;
    fvgRetest = true;
  }

  // 7. Volume Confirmation (+1)
  let volumeConfirmation = false;
  if (inputs.volumeConfirmed) {
    score += 1;
    volumeConfirmation = true;
  }

  // 8. Session & Volatility Confirmation (+1)
  let sessionVolatilityConfirmation = false;
  if (inputs.sessionValid && inputs.volatilityValid) {
    score += 1;
    sessionVolatilityConfirmation = true;
  }

  // Hard safety filters that disqualify even high scores
  if (inputs.isRanging) {
    noTradeReasons.unshift(`Market in ranging regime: ${inputs.rangeReason || 'ADX compression'}`);
  }
  if (inputs.cooldownActive) {
    noTradeReasons.unshift('Trade cooldown active after previous position closed');
  }
  if (inputs.dailyLossHalted) {
    noTradeReasons.unshift('Daily loss limit (1.5%) reached — trading halted');
  }
  if (inputs.consecutiveLossHalted) {
    noTradeReasons.unshift('Max consecutive losses (2) reached — trading halted');
  }

  const isTradable =
    score >= 8 &&
    !inputs.isRanging &&
    !inputs.cooldownActive &&
    !inputs.dailyLossHalted &&
    !inputs.consecutiveLossHalted;

  if (score < 8 && !inputs.isRanging) {
    noTradeReasons.push(`Score ${score}/12 below minimum threshold (8/12)`);
  }

  return {
    score,
    maxScore: 12,
    isTradable,
    htfBiasAlignment,
    liquiditySweep,
    displacement,
    mssBos,
    fvgPresent,
    fvgRetest,
    volumeConfirmation,
    sessionVolatilityConfirmation,
    noTradeReasons,
  };
}

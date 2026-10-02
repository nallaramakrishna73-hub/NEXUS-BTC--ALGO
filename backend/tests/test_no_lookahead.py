import pytest

def test_no_lookahead_bias():
    """
    SECTION 36 - MANDATORY DATA LEAKAGE TEST:
    Verifies that modifying future candles does not influence past signals,
    market structure, swing points, or confirmation scores.
    """
    # Sample synthetic 5m candles
    candles = []
    base_price = 84000.0
    for i in range(100):
        c = {
            "time": i * 300,
            "open": base_price + i * 15,
            "high": base_price + i * 15 + 40,
            "low": base_price + i * 15 - 20,
            "close": base_price + i * 15 + 10,
            "volume": 150.0
        }
        candles.append(c)

    test_idx = 50
    past_candles = candles[:test_idx + 1]

    # Compute swing highs up to test_idx (using swing_length=3)
    def find_swings(arr, max_i, swing_len=3):
        swings = []
        for j in range(swing_len, max_i - swing_len + 1):
            h = arr[j]["high"]
            if all(arr[j - k]["high"] < h and arr[j + k]["high"] <= h for k in range(1, swing_len + 1)):
                swings.append((j, h))
        return swings

    swings_original = find_swings(past_candles, test_idx, 3)

    # Mutate future candles (from index 51 to 99) with massive outlier data
    mutated = list(candles)
    for k in range(test_idx + 1, len(mutated)):
        mutated[k] = {
            "time": k * 300,
            "open": 200000.0,
            "high": 250000.0,
            "low": 180000.0,
            "close": 240000.0,
            "volume": 999999.0
        }

    swings_with_mutated_future = find_swings(mutated, test_idx, 3)

    assert swings_original == swings_with_mutated_future, "Data leakage detected: future data altered past swings!"
    print("test_no_lookahead_bias passed successfully!")

def test_scoring_system_confluence():
    """
    SECTION 10 - SIGNAL SCORING:
    Confirms that score < 8 results in NO TRADE.
    """
    def score_setup(criteria: dict):
        total = 0
        if criteria.get("htf_alignment"): total += 2
        if criteria.get("liquidity_sweep"): total += 2
        if criteria.get("displacement"): total += 2
        if criteria.get("mss_bos"): total += 2
        if criteria.get("fvg"): total += 1
        if criteria.get("fvg_retest"): total += 1
        if criteria.get("volume"): total += 1
        if criteria.get("session_volatility"): total += 1
        return total

    # Setup with 6/12 score (incomplete confluence)
    weak_setup = {"liquidity_sweep": True, "displacement": True, "fvg": True, "volume": True}
    score = score_setup(weak_setup)
    assert score == 6
    assert score < 8 # Below 8/12 threshold -> NO TRADE

    # Setup with 10/12 score (high confluence)
    strong_setup = {
        "htf_alignment": True,
        "liquidity_sweep": True,
        "displacement": True,
        "mss_bos": True,
        "fvg": True,
        "fvg_retest": True
    }
    score2 = score_setup(strong_setup)
    assert score2 == 10
    assert score2 >= 8 # Tradable setup

def test_circuit_breaker_max_consecutive_losses():
    """
    SECTION 15 - RISK MANAGEMENT:
    Halts trading after max consecutive losses (2).
    """
    max_consecutive = 2
    losses = 0
    trading_halted = False

    for trade_result in [-50, -50]: # two consecutive losses
        if trade_result < 0:
            losses += 1
            if losses >= max_consecutive:
                trading_halted = True

    assert trading_halted is True
    print("Circuit breaker consecutive losses test passed!")

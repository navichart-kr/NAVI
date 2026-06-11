/**
 * NAVI 차트 색상 유틸리티
 * lightweight-charts에 직접 전달하는 색상 값을 테마별로 반환합니다.
 */
export function getChartColors(isDark: boolean) {
  return {
    /* 레이아웃 */
    bg:     isDark ? '#101936' : '#FFFFFF',
    grid:   isDark ? '#1B2847' : '#E5EAF5',
    text:   isDark ? 'rgba(248,249,247,0.55)' : '#5E6B85',
    border: isDark ? '#1B2847' : '#E5EAF5',

    /* 캔들 */
    candleUp:   isDark ? '#26a69a' : '#3046DD',
    candleDown: isDark ? '#ef5350' : '#E06363',

    /* 이동평균선 */
    ma5:   isDark ? '#facc15' : '#C88800',
    ma20:  isDark ? '#f97316' : '#C44000',
    ma60:  isDark ? '#a78bfa' : '#6040C0',
    ma120: isDark ? '#f43f5e' : '#B01030',

    /* 볼린저 밴드 */
    bbBand: isDark ? '#60a5fa' : '#2D63C0',
    bbMid:  isDark ? '#8892AA' : '#8090B0',

    /* RSI */
    rsiLine: isDark ? '#a78bfa' : '#6040C0',
    rsi70:   isDark ? '#ef4444' : '#CC1010',
    rsi30:   isDark ? '#22c55e' : '#0A8A40',

    /* MACD */
    macdLine:  isDark ? '#60a5fa' : '#2D63C0',
    signalLine: isDark ? '#f97316' : '#C44000',
    histPos:   isDark ? '#32D17A' : '#0F9D75',
    histNeg:   isDark ? '#FF6B6B' : '#DC4F61',

    /* 피보나치 레벨 (drawDot) */
    fibDot: isDark ? '#f97316' : '#C44000',
  }
}

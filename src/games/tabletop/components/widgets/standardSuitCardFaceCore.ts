export const SUIT_DATA: Record<string, { symbol: string; color: string; name: string }> = {
  '♠': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♠️': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♣': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♣️': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♥': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♥️': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♦': { symbol: '♦', color: '#dc2626', name: 'diamond' },
  '♦️': { symbol: '♦', color: '#dc2626', name: 'diamond' },
};

export function parseCardText(value: string) {
  const trimmed = value.trim();
  for (const [key, data] of Object.entries(SUIT_DATA)) {
    if (trimmed.includes(key)) {
      const rankRaw = trimmed.replace(key, '').trim();
      let rank = rankRaw.toUpperCase();
      if (rank === 'ASS') rank = 'A';
      else if (rank === 'BUBE') rank = 'J';
      else if (rank === 'DAME') rank = 'Q';
      else if (rank === 'KÖNIG') rank = 'K';
      return { suit: data.symbol, color: data.color, rank: rank || 'A' };
    }
  }
  return null;
}

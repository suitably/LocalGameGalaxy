import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCategoriesTable, mockWordPairsTable, mockWordPairsWhere } = vi.hoisted(() => {
  const mockCategoriesTable = {
    count: vi.fn(),
    toArray: vi.fn(),
    bulkPut: vi.fn(),
  };

  const mockWordPairsWhere = {
    anyOf: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
  };

  const mockWordPairsTable = {
    count: vi.fn(),
    where: vi.fn(() => mockWordPairsWhere),
    bulkAdd: vi.fn(),
  };

  return { mockCategoriesTable, mockWordPairsTable, mockWordPairsWhere };
});

vi.mock('../db', () => ({
  imposterDb: {
    imposter_categories: mockCategoriesTable,
    imposter_word_pairs: mockWordPairsTable,
  },
}));

import {
  getImposterCategories,
  getWordPairsByCategories,
  countCategories,
  countWordPairs,
  seedCategories,
  seedWordPairs,
} from '../imposterRepository';
import { CATEGORIES } from '../wordPairCategories';
import { WORD_PAIRS_EN } from '../wordPairs_en';

describe('Imposter Repository & Database Seeder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Repository Accessors', () => {
    it('getImposterCategories calls imposter_categories.toArray', async () => {
      mockCategoriesTable.toArray.mockResolvedValueOnce([{ id: 'c1', name: { en: 'C1', de: 'C1' } }]);
      const res = await getImposterCategories();
      expect(res).toEqual([{ id: 'c1', name: { en: 'C1', de: 'C1' } }]);
      expect(mockCategoriesTable.toArray).toHaveBeenCalled();
    });

    it('getWordPairsByCategories queries indexed categoryIds', async () => {
      mockWordPairsWhere.toArray.mockResolvedValueOnce([
        { id: 1, words: { en: ['a', 'b'], de: ['a', 'b'] }, categoryIds: ['food'] },
      ]);

      const res = await getWordPairsByCategories(['food']);
      expect(mockWordPairsTable.where).toHaveBeenCalledWith('categoryIds');
      expect(mockWordPairsWhere.anyOf).toHaveBeenCalledWith(['food']);
      expect(res).toHaveLength(1);
    });

    it('countCategories and countWordPairs delegate to tables', async () => {
      mockCategoriesTable.count.mockResolvedValueOnce(10);
      mockWordPairsTable.count.mockResolvedValueOnce(50);

      expect(await countCategories()).toBe(10);
      expect(await countWordPairs()).toBe(50);
    });

    it('seedCategories and seedWordPairs bulk insert into tables', async () => {
      mockCategoriesTable.bulkPut.mockResolvedValueOnce('ok');
      mockWordPairsTable.bulkAdd.mockResolvedValueOnce(5);

      await seedCategories([{ id: 'c1', name: { en: 'C1', de: 'C1' } }]);
      expect(mockCategoriesTable.bulkPut).toHaveBeenCalledWith([{ id: 'c1', name: { en: 'C1', de: 'C1' } }]);

      await seedWordPairs([
        { words: { en: ['x', 'y'], de: ['x', 'y'] }, categoryIds: ['c1'] },
      ]);
      expect(mockWordPairsTable.bulkAdd).toHaveBeenCalled();
    });
  });

  describe('seedImposterDatabase', () => {
    it('seeds categories and merged word pairs when unseeded', async () => {
      vi.resetModules();
      const { seedImposterDatabase } = await import('../dbSeeder');
      mockCategoriesTable.count.mockResolvedValue(0);
      mockWordPairsTable.count.mockResolvedValue(0);
      mockCategoriesTable.bulkPut.mockResolvedValue('ok');
      mockWordPairsTable.bulkAdd.mockResolvedValue(1);

      await seedImposterDatabase();

      expect(mockCategoriesTable.bulkPut).toHaveBeenCalled();
      expect(mockWordPairsTable.bulkAdd).toHaveBeenCalled();

      const seededPairs = mockWordPairsTable.bulkAdd.mock.calls[0][0];
      expect(seededPairs.length).toBe(WORD_PAIRS_EN.length);
      expect(seededPairs[0]).toHaveProperty('words.en');
      expect(seededPairs[0]).toHaveProperty('words.de');
      expect(seededPairs[0]).toHaveProperty('categoryIds');
    });

    it('skips seeding if database is already populated', async () => {
      vi.resetModules();
      const { seedImposterDatabase } = await import('../dbSeeder');
      mockCategoriesTable.count.mockResolvedValue(CATEGORIES.length);
      mockWordPairsTable.count.mockResolvedValue(WORD_PAIRS_EN.length);

      await seedImposterDatabase();

      expect(mockCategoriesTable.bulkPut).not.toHaveBeenCalled();
      expect(mockWordPairsTable.bulkAdd).not.toHaveBeenCalled();
    });
  });
});

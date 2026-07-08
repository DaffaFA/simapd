import { ViolationsService } from './violations.service';

describe('ViolationsService', () => {
  describe('computeShift', () => {
    it.each([
      [7,  'Pagi'],  [10, 'Pagi'],  [14, 'Pagi'],
      [15, 'Siang'], [20, 'Siang'], [22, 'Siang'],
      [23, 'Malam'], [0,  'Malam'], [6,  'Malam'],
    ])('hour %i → %s', (hour, expected) => {
      const d = new Date(2026, 5, 21, hour, 0, 0)
      expect(ViolationsService.computeShift(d)).toBe(expected)
    })
  })

  describe('buildMissingList', () => {
    it('returns correct missing items', () => {
      expect(ViolationsService.buildMissingList({ missing_helm:true, missing_vest:false, missing_shoes:true }))
        .toEqual(['helm','sepatu'])
    })
    it('returns empty when fully compliant', () => {
      expect(ViolationsService.buildMissingList({ missing_helm:false, missing_vest:false, missing_shoes:false }))
        .toEqual([])
    })
    it('returns all three when none worn', () => {
      expect(ViolationsService.buildMissingList({ missing_helm:true, missing_vest:true, missing_shoes:true }))
        .toEqual(['helm','vest','sepatu'])
    })
  })
})

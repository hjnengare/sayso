/**
 * Smoke tests: Percentile display logic
 * - When value is 0, UI should show "—" (dash), not "0%"
 * - When value > 0, display as "N%"
 */
describe('Percentile display rules', () => {
  const isPlaceholder = (value: number) => value === 0;
  const percentageText = (value: number) => (value === 0 ? '—' : `${value}%`);

  it('shows "—" when value is 0 (no reviews)', () => {
    expect(isPlaceholder(0)).toBe(true);
    expect(percentageText(0)).toBe('—');
  });

  it('shows "N%" when value is greater than 0', () => {
    expect(isPlaceholder(50)).toBe(false);
    expect(percentageText(50)).toBe('50%');
    expect(percentageText(100)).toBe('100%');
  });

  it('does not show 100% when review_count is 0', () => {
    const value = 0;
    expect(percentageText(value)).not.toBe('100%');
    expect(percentageText(value)).toBe('—');
  });
});

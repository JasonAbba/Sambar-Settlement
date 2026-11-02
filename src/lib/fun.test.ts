import { describe, expect, it } from 'vitest';
import { createDemoData } from '../data/seed';
import { computeBadges, dishOfTheWeek, lunchBuddies, lunchShareText, whatsappUrl } from './fun';

const data = createDemoData();

describe('fun features', () => {
  it('builds a WhatsApp summary with payer, shares and total', () => {
    const text = lunchShareText(data, 'demo-lunch-1', 'https://x/#/history/demo-lunch-1');
    expect(text).toContain('*Jason* paid');
    expect(text).toContain('Please pay *Jason*:');
    expect(text).toContain('• Sagnik: *₹370*');
    expect(text).toContain('*Total: ₹870*');
    expect(whatsappUrl(text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
  it('finds lunch buddies who ate together at least twice', () => {
    const b = lunchBuddies(data);
    expect(b[0]).toMatchObject({ a: 'u-jason', b: 'u-sagnik', count: 2 });
  });
  it('awards badges to category leaders', () => {
    const badges = computeBadges(data);
    const all = [...badges.values()].flat().map((x) => x.id);
    expect(all).toContain('appetite');
    expect(badges.get('u-angwyn')?.map((x) => x.id)).toContain('bread');
  });
  it('picks a dish of the week', () => {
    expect(dishOfTheWeek(data).dish?.name).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';
import { plainLetters } from '../../api/_plain-letters';

describe('plainLetters', () => {
  it('turns LinkedIn bold into plain letters', () => {
    expect(plainLetters('𝗔𝗴𝗲𝗻𝘁 𝗘𝘅𝘁𝗲𝗻𝘀𝗶𝗯𝗶𝗹𝗶𝘁𝘆 𝗰𝗵𝗮𝗻𝗴𝗲𝘀 𝘁𝗵𝗲 𝗴𝗮𝗺𝗲, but only if you…')).toBe(
      'Agent Extensibility changes the game, but only if you…',
    );
  });

  it('handles serif bold, italic and digits', () => {
    expect(plainLetters('𝐂𝐫𝐨𝐬𝐬-𝐒𝐜𝐨𝐩𝐞 𝐏𝐞𝐫𝐦𝐢𝐬𝐬𝐢𝐨𝐧𝐬')).toBe('Cross-Scope Permissions');
    expect(plainLetters('𝑇ℎ𝑒 𝟭𝟬 𝘵𝘪𝘱𝘴')).toBe('The 10 tips');
  });

  it('leaves ordinary text, symbols, accents and emoji alone', () => {
    const text = 'ServiceNow™ Šimůnek — tips… 🚀 ℃';
    expect(plainLetters(text)).toBe(text);
  });
});

// LinkedIn posters fake bold and italic by typing look-alike maths symbols
// (𝗔𝗴𝗲𝗻𝘁 rather than Agent). They look like letters but aren't, so search
// can't find them. This swaps each one for the plain letter or digit it
// stands for and leaves everything else alone: ™, …, accents and emoji stay.

/** Maths letters and digits, plus the older "letterlike" block that fills its gaps (ℎ, ℬ, ℝ…). */
const LOOKALIKE = /[\u{1D400}-\u{1D7FF}\u{2100}-\u{214F}]/gu;

export function plainLetters(text: string): string {
  return text.replace(LOOKALIKE, (ch) => {
    const plain = ch.normalize('NFKC');
    return /^[A-Za-z0-9]$/.test(plain) ? plain : ch;
  });
}

const mindee = require('mindee');

const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Arabic-Indic → Western digit map
// ─────────────────────────────────────────────────────────────────────────────
const ARABIC_INDIC_MAP = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const normaliseDigits = (text) =>
  text.replace(/[٠-٩]/g, (char) => ARABIC_INDIC_MAP[char] ?? char);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — given a list of digit group strings, join them and check for 14 digits
// Returns the joined string if it is exactly 14 digits, otherwise null
// ─────────────────────────────────────────────────────────────────────────────
const tryJoin = (groups) => {
  const joined = groups.join('');
  return joined.length === 14 ? joined : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT 14-DIGIT NATIONAL ID
//
// Egyptian national IDs are printed right-to-left in Arabic so OCR returns
// the digit groups in reverse order.
//
// Example OCR line: "76 177 18 01 08 292"
//   groups forward : ["76","177","18","01","08","292"] → joined: "76177180108292" (wrong)
//   groups reversed: ["292","08","01","18","177","76"] → joined: "29208011817776" (correct ✓)
//
// Strategy order:
//   1. Each line — try groups reversed, then groups forward, then stripped forward
//   2. Sliding windows of 2-6 consecutive lines — same three attempts per window
//   3. All digit groups on the page — reversed then forward (last resort)
// ─────────────────────────────────────────────────────────────────────────────
const extract14DigitId = (cleanText) => {
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Per-line attempts ──────────────────────────────────────────────────────
  for (const line of lines) {
    const groups = line.match(/\d+/g);
    if (!groups || groups.length === 0) continue;

    // Try reversed groups first (RTL Arabic — most common case)
    const rev = tryJoin([...groups].reverse());
    if (rev) { console.log('[OCR] Hit (line reversed groups):', rev); return rev; }

    // Try forward groups
    const fwd = tryJoin(groups);
    if (fwd) { console.log('[OCR] Hit (line forward groups):', fwd); return fwd; }

    // Try stripping all spaces (groups already joined above, but catch edge cases)
    const stripped = line.replace(/\s+/g, '');
    if (stripped.length === 14 && /^\d{14}$/.test(stripped)) {
      console.log('[OCR] Hit (line stripped):', stripped);
      return stripped;
    }
  }

  // ── Sliding window across multiple lines ───────────────────────────────────
  // ID groups may be split across consecutive lines
  for (let size = 2; size <= 6; size++) {
    for (let i = 0; i <= lines.length - size; i++) {
      const window = lines.slice(i, i + size);
      const groups = window.join(' ').match(/\d+/g);
      if (!groups) continue;

      const rev = tryJoin([...groups].reverse());
      if (rev) { console.log('[OCR] Hit (window reversed groups):', rev); return rev; }

      const fwd = tryJoin(groups);
      if (fwd) { console.log('[OCR] Hit (window forward groups):', fwd); return fwd; }
    }
  }

  // ── Last resort: all digit groups on the page ─────────────────────────────
  const allGroups = cleanText.match(/\d+/g) || [];
  console.log('[OCR] All digit groups:', allGroups);

  const revAll = tryJoin([...allGroups].reverse());
  if (revAll) { console.log('[OCR] Hit (all groups reversed):', revAll); return revAll; }

  const fwdAll = tryJoin(allGroups);
  if (fwdAll) { console.log('[OCR] Hit (all groups forward):', fwdAll); return fwdAll; }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const extractNationalId = async (imageBuffer, mimeType, filename) => {
  const inputSource = new mindee.BufferInput({
    buffer:   imageBuffer,
    filename: filename || 'national_id.jpg',
  });

  const response = await mindeeClient.enqueueAndGetResult(
    mindee.product.Ocr,
    inputSource,
    { modelId: process.env.MINDEE_MODEL_ID },
  );

  const pages = response.inference.result.pages;

  // ── Debug logging ──────────────────────────────────────────────────────────
  console.log('\n========== MINDEE OCR DEBUG ==========');
  pages.forEach((page, i) => {
    console.log(`\n--- PAGE ${i + 1} RAW ---`);
    console.log(page.toString());
  });
  console.log('======================================\n');

  // ── Process each page ─────────────────────────────────────────────────────
  for (const page of pages) {
    const pageText = normaliseDigits(page.toString());

    // Use only the :Content: section to avoid processing the word list twice
    const contentMatch = pageText.match(/:Content:\s*([\s\S]+)$/);
    const cleanText    = contentMatch ? contentMatch[1].trim() : pageText;

    console.log('[OCR] Clean text:\n', cleanText);

    const extractedId = extract14DigitId(cleanText);
    console.log(`[OCR] Result: ${extractedId ?? 'NOT FOUND'}`);

    if (extractedId) {
      const rawText = normaliseDigits(page.toString());
      return { extractedId, rawText };
    }
  }

  // No ID found on any page
  return { extractedId: null, rawText: '' };
};

module.exports = { extractNationalId };
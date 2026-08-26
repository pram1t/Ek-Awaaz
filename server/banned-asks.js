/* Questions Smiti must never put to a citizen.

   Rule Three of her prompt already forbids asking for a full account number, and Rule Two
   forbids asking which office is responsible. She broke both anyway — a prompt is a request,
   not a guarantee. These are enforced: a matching ask is dropped before it reaches a citizen
   and the hand-written question for that domain takes its place.

   The two questions matter for different reasons:

   - A full account or card number invites exactly the data we promised not to hold, and that
     DPDP makes indefensible to store. A scheme reference that is safe to quote — a UAN, a PNR,
     a docket, a consumer number — is fine and stays.

   - "Which office handles this?" is the question this entire product exists to answer FOR the
     citizen. Not knowing is why they came. Asking it back is the single most off-brand thing
     the system could do.

   Two narrow exceptions live in the prompt rather than here, because they are about a specific
   office the citizen has ALREADY dealt with: when they first told their bank (that date starts
   the ombudsman clock), and which office is ignoring them in an office.inaction case, where the
   office is the complaint. Both are phrased as "when did you tell" / "which office is ignoring",
   neither of which matches the patterns below. */

const BANNED_ASK = [
  // full account / card numbers, English
  /\b(account|card|debit card|credit card)\s*(number|no\.?|num)\b/i,
  // ...and in Devanagari and romanised Hindi
  /(खाता|अकाउंट)\s*(नंबर|संख्या)/,
  /\bkhata\s*(number|no)\b/i,
  // Aadhaar / PAN numbers, however phrased
  /\b(aadhaar|aadhar|pan)\b[^?]{0,40}\b(number|no\.?)\b/i,
  /(आधार|पैन)\s*(नंबर|संख्या)/,

  // "which office handles / looks after / is responsible for this"
  /\bwhich (office|department|authority|ministry)\b[^?]{0,60}\b(handles?|looks after|deals? with|is responsible|should)\b/i,
  // Devanagari: कौन सा ऑफिस / किस ऑफिस में शिकायत
  /कौन\s*सा\s*(ऑफिस|दफ़्तर|दफ्तर|विभाग|कार्यालय)/,
  /किस\s*(ऑफिस|दफ़्तर|दफ्तर|विभाग|कार्यालय)\s*(में|को|से)\s*(शिकायत|संपर्क|बताया)/,
  // romanised Hindi: kis office me shikayat / kaun sa vibhag
  /\bkis\s+(office|daftar|vibhag|karyalay)\b[^?]{0,40}\b(shikayat|sampark|bataya|complain)/i,
  /\bkaun\s*sa\s*(office|daftar|vibhag)/i
];

export function askIsBanned(q) {
  const s = String(q == null ? '' : q);
  return BANNED_ASK.some((re) => re.test(s));
}

export default askIsBanned;

/* Keep the office's claim attributed to the office.

   With the JSON bug fixed, the rewrite finally ran — and immediately said "This means the
   affected stretch has been fixed." That is the officer's claim repeated as fact, and it
   quietly dismantles the thing the whole closure gate exists to protect: whether the work
   actually happened is the citizen's call, not the file's.

   So the prompt now demands attribution ("they say", never "it is"), and points the last
   sentence at the specific right the citizen has here — to answer that it is not fixed and
   keep the case open. */

import fs from 'node:fs';

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');

const old = `Put this office reply into four short sentences for the person who filed it, in the language named:
1 what was decided. 2 what it means for you. 3 what happens next, and when. 4 what to do if this
is wrong. No file-noting language. Reply as JSON: {"plain":["","","",""]}`;

const next = `Put this office reply into four short sentences for the person who filed it, in the language named:
1 what the office says it did. 2 what that means for them. 3 what happens next, and when.
4 that they can answer "not fixed" and the case stays open.

Attribute every claim to the office: "they say the road is repaired", never "the road is
repaired". You have not seen the road; they have written a file note. Whether it is actually
fixed is the citizen's to say, and sentence 4 is where they are told so. No file-noting
language. Reply as JSON: {"plain":["","","",""]}`;

if (!s.includes(old)) { console.log('! prompt not found — unchanged'); process.exit(1); }
s = s.replace(old, next);
fs.writeFileSync(F, s);
console.log('plainLanguage prompt updated');

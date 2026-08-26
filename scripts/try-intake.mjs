/* Exercise /api/intake the way a browser does — real UTF-8, no shell in the way.
   Devanagari does not survive curl through Git Bash on Windows; it arrives as question marks
   and the model then classifies gibberish. Every intake test must go through this. */

const BASE = process.env.BASE || 'http://localhost:3000';

const CASES = [
  ['Hinglish, village road',
   'hamare gaon ki sadak me bade gaddhe hain, barish ke baad chalne layak nahi. school van bhi nahi aati ab.'],
  ['Devanagari, ration',
   'डीलर ने दो महीने से राशन नहीं दिया, कहता है स्टॉक खत्म है। घर में पाँच लोग हैं।'],
  ['English, bank',
   '18400 was debited twice from my SBI account on 11 August and the branch has not replied since I complained on 18 August'],
  ['Devanagari, provident fund',
   'मेरा पीएफ का पैसा जून से अटका है, ऑफिस कुछ जवाब नहीं दे रहा।'],
  ['English, bribe',
   'the clerk at the block office asked me for 2000 rupees to move my file for a caste certificate'],
  ['Devanagari, national highway',
   'नेशनल हाईवे 44 पर किलोमीटर 119 के पास सारी स्ट्रीट लाइटें दो महीने से बंद हैं।']
];

const line = (s) => '  ' + s;

for (const [label, text] of CASES) {
  const res = await fetch(BASE + '/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ text })
  });
  const d = await res.json();

  console.log('\n' + '─'.repeat(72));
  console.log(label);
  console.log('─'.repeat(72));

  if (d.error) { console.log(line('ERROR ' + d.error)); continue; }
  if (d.emergency) { console.log(line('EMERGENCY → ' + d.emergency.kind)); continue; }

  console.log(line(`domain ${d.domain}  tier ${d.optionKey ?? '—'}  conf ${d.confidence}  lang ${d.language}  ${d.aiSource}${d.cached ? ' (cached)' : ''}`));
  console.log(line(`title  ${d.title}`));
  console.log(line(`echoed ${d.text.slice(0, 58)}`));
  for (const a of d.asks) {
    console.log(line('Q  ' + a.q));
    console.log(line('   ' + a.hint));
    console.log(line('   eg ' + (a.ph || '*** EMPTY ***')));
  }
}

const h = await (await fetch(BASE + '/api/health')).json();
console.log('\n' + '─'.repeat(72));
console.log(`spent $${h.budget.spentUsd} of $${h.budget.ceilingUsd}  ·  ${h.budget.calls} calls  ·  cache ${h.cache.hitRate}`);

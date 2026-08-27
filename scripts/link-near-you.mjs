/* Give the public wall a way in.

   /near-you existed as a URL that served my-cases.html, so nothing linked to it and nothing
   would have found it. Three entrances now: the homepage hero's secondary action (which used
   to jump to an anchor further down the same page), the utility nav, and the header of
   my-cases for anyone already logged in. */

import fs from 'node:fs';

let n = 0;
const patch = (file, pairs) => {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a, b, marker] of pairs) {
    if (marker && s.includes(marker)) { console.log('  = already applied: ' + marker); continue; }
    if (!s.includes(a)) { console.log('  ! miss in ' + file + ': ' + a.slice(0, 50)); continue; }
    s = s.replace(a, b); n++;
  }
  fs.writeFileSync(file, s);
};

patch('public/index.html', [
  /* the hero's second action pointed at #cases, an anchor on the same page */
  ['href="#cases">Support a public grievance ',
   'href="/near-you">See what is reported near you ',
   'href="/near-you">See what is reported near you'],
  ['<a href="/my-cases" data-i18n="nav.cases">My grievances</a></nav>',
   '<a href="/near-you">Near you</a><a href="/my-cases">My grievances</a></nav>',
   '<a href="/near-you">Near you</a>'],
  ['<a href="/my-cases">My grievances</a></nav>',
   '<a href="/near-you">Near you</a><a href="/my-cases">My grievances</a></nav>',
   '<a href="/near-you">Near you</a>']
]);

patch('public/my-cases.html', [
  ['<div class="header-right"><span>Signed in as a prototype user</span><a class="button" href="/">New grievance</a></div>',
   '<div class="header-right"><span>Signed in as a prototype user</span>'
     + '<a href="/near-you" style="color:var(--muted);font-size:12px;font-weight:700;text-decoration:none">Near you</a>'
     + '<a class="button" href="/">New grievance</a></div>',
   'href="/near-you" style="color:var(--muted)']
]);

console.log(n + ' links wired');

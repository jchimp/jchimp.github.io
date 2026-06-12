// generators.js — pure password generation functions

const SYMBOLS  = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const DIGITS   = '0123456789';
const UPPER    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER    = 'abcdefghijklmnopqrstuvwxyz';

const ADJECTIVES = [
  'able','active','agile','amber','ancient','angry','azure','bold','brave','bright',
  'bronze','calm','cheerful','chilly','clever','cloudy','cobalt','cold','cool','cosmic',
  'cozy','crisp','curious','damp','dark','daring','dazzling','deep','dense','dusty',
  'eager','early','electric','emerald','endless','epic','fancy','fast','fierce','fiery',
  'fluffy','frosty','fuzzy','gentle','giant','golden','great','happy','hollow','humble',
  'icy','jagged','jolly','jumpy','keen','kinetic','large','lazy','lively','lone',
  'loud','lovely','loyal','lucky','lunar','magical','massive','mellow','mighty','misty',
  'moody','mossy','muddy','murky','mystic','narrow','noble','noisy','neon','nimble',
  'odd','orange','ornate','pale','patient','peaceful','peppy','petite','pink','plain',
  'plump','polar','pretty','proud','quick','quiet','radiant','rapid','rare','reckless',
  'red','regal','rigid','rocky','rosy','round','royal','rusty','sandy','savage',
  'scarlet','shiny','shy','silent','silver','sleek','slim','slow','small','smart',
  'smoky','smooth','snappy','sneaky','solar','solid','speedy','spicy','stark','steep',
  'stern','stiff','still','stony','stormy','strange','sturdy','sunny','super','swift',
  'tall','tangy','tidy','tiny','tough','turbulent','twisty','unique','vast','vibrant',
  'vivid','warm','wavy','wiggly','wild','windy','wise','witty','woolly','yellow',
  'young','zesty','zippy'
];

const NOUNS = [
  'anchor','ant','anvil','apple','arrow','axe','badge','banana','barrel','beacon',
  'bear','beetle','bell','berry','bird','blade','blaze','bloom','bolt','boulder',
  'brook','buck','buffalo','button','cabin','cactus','camel','canyon','castle','cave',
  'cedar','chain','cherry','chisel','cloud','clover','cobra','comet','compass','condor',
  'coral','cougar','crane','crater','creek','crystal','dagger','dawn','deer','delta',
  'dew','diamond','dingo','dome','dune','dust','eagle','echo','ember','falcon',
  'fern','finch','fjord','flint','flower','fog','forest','forge','fossil','frost',
  'gale','garnet','gate','gecko','geyser','glacier','glyph','grove','hammer','harbor',
  'hawk','hazel','heron','hill','hollow','horn','hound','hyena','ibex','island',
  'ivory','jaguar','jasper','jay','kelp','kite','knoll','lark','lava','leaf',
  'ledge','lemur','lightning','lion','lotus','lynx','maple','marsh','meadow','mesa',
  'meteor','mint','mist','moose','moth','mountain','mud','mule','nebula','needle',
  'nook','oak','opal','orbit','otter','owl','peak','pebble','petal','pine',
  'pixel','pond','pony','porcupine','prairie','pulse','python','quail','quartz','rabbit',
  'raven','reef','ridge','ripple','river','robin','rock','rook','ruby','sable',
  'sage','salmon','sand','sapling','sapphire','seal','shadow','shark','shore','shrew',
  'sierra','signal','slate','sloth','snake','spark','sphinx','spider','spike','spring',
  'spruce','squirrel','star','stag','stone','storm','stream','summit','sun','swamp',
  'swift','sword','talon','thorn','thunder','tide','tiger','timber','toad','torch',
  'tower','trail','tundra','turtle','tusk','vale','valley','vapor','viper','vole',
  'vulture','weasel','web','wedge','whale','willow','wolf','wren','yak','yew','zebra'
];

const VERBS = [
  'bend','bite','blast','blaze','blend','blink','bloom','blow','bolt','bounce',
  'brake','break','brew','burn','burst','carve','catch','charge','chase','chop',
  'churn','clash','claw','climb','coil','crack','craft','crash','crawl','crush',
  'cut','dash','dig','dive','dodge','drag','draw','drift','drill','drive',
  'drop','echo','escape','fall','fetch','fire','flash','flip','float','flow',
  'fly','fold','freeze','glow','grab','grind','grip','grow','guard','guide',
  'hammer','hide','hook','hunt','hurl','ignite','jump','kick','kneel','land',
  'launch','leap','lift','lock','loop','lunge','melt','merge','morph','move',
  'nudge','orbit','pace','pierce','pivot','plunge','press','pull','pulse','push',
  'reach','roll','roar','rotate','rush','sail','scale','scan','scatter','seize',
  'shake','shape','shatter','shift','shoot','shrink','sink','skip','slide','smash',
  'snap','soar','spark','spin','splash','split','spring','sprint','stab','stamp',
  'stand','strike','surge','sweep','swing','swipe','track','twist','vault','veer',
  'warp','whirl','wrap','zoom'
];

// Rejection-sampling RNG — unbiased for any pool size
function cryptoRandInt(max) {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do { crypto.getRandomValues(arr); } while (arr[0] >= limit);
  return arr[0] % max;
}

function pickRandom(arr) {
  return arr[cryptoRandInt(arr.length)];
}

// ─── Simple Phrase ────────────────────────────────────────────────────────────
function generateSimplePhrase({ capitalize, includeNumber, includeSymbol }) {
  let adj  = pickRandom(ADJECTIVES);
  let noun = pickRandom(NOUNS);
  if (capitalize) {
    adj  = adj[0].toUpperCase()  + adj.slice(1);
    noun = noun[0].toUpperCase() + noun.slice(1);
  }
  let value = adj + noun;
  if (includeNumber) value += cryptoRandInt(100);
  if (includeSymbol) value += pickRandom(Array.from(SYMBOLS));

  let pool = ADJECTIVES.length * NOUNS.length;
  if (includeNumber)  pool *= 100;
  if (includeSymbol)  pool *= SYMBOLS.length;
  const entropy = Math.log2(pool);

  return { value, entropy };
}

// ─── True Random ──────────────────────────────────────────────────────────────
function generateTrueRandom({ useUpper, useLower, useDigits, useSymbols, length }) {
  let charset = '';
  if (useUpper)   charset += UPPER;
  if (useLower)   charset += LOWER;
  if (useDigits)  charset += DIGITS;
  if (useSymbols) charset += SYMBOLS;
  if (!charset)   charset  = LOWER;

  let value = '';
  for (let i = 0; i < length; i++) value += charset[cryptoRandInt(charset.length)];

  const entropy = Math.log2(charset.length) * length;
  return { value, entropy };
}

// ─── Diceware (EFF) ───────────────────────────────────────────────────────────
function generateDiceware({ wordCount, separator }) {
  const list = window.EFF_WORDLIST;
  if (!list || list.length === 0) return { value: 'Word list not loaded.', entropy: 0 };
  const words = Array.from({ length: wordCount }, () => pickRandom(list));
  return { value: words.join(separator), entropy: Math.log2(list.length) * wordCount };
}

// ─── Combination Builder ──────────────────────────────────────────────────────
function generateCombination({ parts, separator, capitalize }) {
  let entropy = 0;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const segments = parts.map(part => {
    switch (part) {
      case 'noun':      { entropy += Math.log2(NOUNS.length);      const w = pickRandom(NOUNS);      return capitalize ? cap(w) : w; }
      case 'verb':      { entropy += Math.log2(VERBS.length);      const w = pickRandom(VERBS);      return capitalize ? cap(w) : w; }
      case 'adjective': { entropy += Math.log2(ADJECTIVES.length); const w = pickRandom(ADJECTIVES); return capitalize ? cap(w) : w; }
      case 'number':    { entropy += Math.log2(100);               return String(cryptoRandInt(100)); }
      case 'symbol':    { entropy += Math.log2(SYMBOLS.length);    return pickRandom(Array.from(SYMBOLS)); }
      case 'letters': {
        const n = 3;
        entropy += Math.log2(26) * n;
        const letters = Array.from({ length: n }, () => LOWER[cryptoRandInt(26)]).join('');
        return capitalize ? cap(letters) : letters;
      }
      default: return '';
    }
  });
  return { value: segments.join(separator), entropy };
}

// ─── Encryption Key ───────────────────────────────────────────────────────────
function generateEncryptionKey({ bits, format }) {
  const bytes = bits / 8;
  const arr   = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  const value = format === 'hex'
    ? Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
    : btoa(String.fromCharCode(...arr));
  return { value, entropy: bits };
}

// ─── Password Strength Analyzer ──────────────────────────────────────────────

const CRACK_SCENARIOS = [
  { key: 'online',   label: 'Online attack',      rate: 1e2,  context: 'Web login with rate limiting'          },
  { key: 'leaked',   label: 'Leaked hash (bcrypt)',rate: 1e4,  context: 'Properly hashed database breach'       },
  { key: 'offline',  label: 'Fast offline (MD5)',  rate: 1e9,  context: 'Stolen hash, consumer GPU'             },
  { key: 'gpu',      label: 'GPU cluster',         rate: 1e12, context: '100-GPU dedicated cracking rig'        },
  { key: 'nation',   label: 'Nation-state',        rate: 1e15, context: 'Intelligence agency–level capability'  },
];

const KEYBOARD_PATTERNS = ['qwerty','qwert','asdfg','asdf','zxcvb','zxcv','12345','123456','11111','00000','password','passw0rd','letmein','welcome','monkey','dragon','master','shadow','sunshine'];

function formatCrackTime(seconds) {
  if (!isFinite(seconds) || seconds > 1e30) return { text: 'Heat death of the universe', tier: 5 };
  if (seconds < 1)         return { text: 'Instant',               tier: 0 };
  if (seconds < 60)        return { text: `${Math.round(seconds)} sec`,  tier: seconds < 10 ? 0 : 1 };
  if (seconds < 3600)      return { text: `${Math.round(seconds/60)} min`, tier: 1 };
  if (seconds < 86400)     return { text: `${Math.round(seconds/3600)} hr`, tier: 1 };

  const days  = seconds / 86400;
  const years = days / 365.25;

  if (days  < 30)    return { text: `${Math.round(days)} day${days>=2?'s':''}`,                 tier: 2 };
  if (days  < 365)   return { text: `${Math.round(days/30)} month${days>=60?'s':''}`,           tier: 2 };
  if (years < 10)    return { text: `${years.toFixed(1)} year${years>=2?'s':''}`,               tier: 3 };
  if (years < 1e3)   return { text: `${Math.round(years).toLocaleString()} years`,              tier: 3 };
  if (years < 1e6)   return { text: `${(years/1e3).toFixed(1)}K years`,                        tier: 4 };
  if (years < 1e9)   return { text: `${(years/1e6).toFixed(1)} million years`,                 tier: 4 };
  if (years < 1e12)  return { text: `${(years/1e9).toFixed(1)} billion years`,                 tier: 5 };
  return               { text: `${(years/1e12).toFixed(1)} trillion years`,                    tier: 5 };
}

function analyzePassword(pwd) {
  if (!pwd) return null;

  const len = pwd.length;

  // Character class detection
  const hasLower   = /[a-z]/.test(pwd);
  const hasUpper   = /[A-Z]/.test(pwd);
  const hasDigit   = /[0-9]/.test(pwd);
  const hasSymbol  = /[!-/:-@[-`{-~]/.test(pwd);
  const hasSpace   = / /.test(pwd);
  const hasExtended = /[^\x00-\x7F]/.test(pwd);

  let pool = 0;
  if (hasLower)    pool += 26;
  if (hasUpper)    pool += 26;
  if (hasDigit)    pool += 10;
  if (hasSymbol)   pool += 32;
  if (hasSpace)    pool += 1;
  if (hasExtended) pool += 64;
  if (pool === 0)  pool  = 26;

  const entropy = Math.log2(pool) * len;

  // Crack time per scenario (expected = half the search space)
  const halfSpace = Math.pow(2, Math.max(0, entropy - 1));
  const crackTimes = CRACK_SCENARIOS.map(s => ({
    ...s,
    seconds: halfSpace / s.rate,
    ...formatCrackTime(halfSpace / s.rate),
  }));

  // Pattern & quality warnings
  const warnings = [];
  if (len < 8)  warnings.push({ icon: 'bi-exclamation-triangle', text: 'Too short — 12+ characters recommended' });
  if (len < 12) warnings.push({ icon: 'bi-info-circle', text: 'Moderate length — consider 16+ characters for sensitive accounts' });
  if (/^(.)\1+$/.test(pwd))   warnings.push({ icon: 'bi-x-circle', text: 'All characters are the same' });
  if (/^[0-9]+$/.test(pwd))   warnings.push({ icon: 'bi-x-circle', text: 'Digits only — extremely weak' });
  if (/^[a-zA-Z]+$/.test(pwd)) warnings.push({ icon: 'bi-exclamation-triangle', text: 'Letters only — add digits or symbols' });
  if (/^[a-z]+$/.test(pwd))   warnings.push({ icon: 'bi-exclamation-triangle', text: 'All lowercase — add uppercase, digits, or symbols' });

  const lc = pwd.toLowerCase();
  if (KEYBOARD_PATTERNS.some(p => lc.includes(p)))
    warnings.push({ icon: 'bi-x-circle', text: 'Contains common keyboard pattern or dictionary word' });
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(pwd))
    warnings.push({ icon: 'bi-exclamation-triangle', text: 'Contains sequential characters (abc, 123…)' });
  if (len > 3 && pwd === pwd.split('').reverse().join(''))
    warnings.push({ icon: 'bi-info-circle', text: 'Password is a palindrome' });

  // Unique character ratio
  const uniqueRatio = new Set(pwd).size / len;
  if (len >= 8 && uniqueRatio < 0.4)
    warnings.push({ icon: 'bi-exclamation-triangle', text: `Low character variety — only ${new Set(pwd).size} unique character${new Set(pwd).size!==1?'s':''} in ${len}` });

  const composition = { hasLower, hasUpper, hasDigit, hasSymbol, hasSpace, hasExtended, pool, len };

  return { entropy, crackTimes, warnings, composition };
}

// ─── BIP39 Mnemonic ───────────────────────────────────────────────────────────
function generateBIP39({ wordCount }) {
  const list = window.BIP39_WORDLIST;
  if (!list || list.length === 0) return { value: 'Word list not loaded.', entropy: 0 };
  const words = Array.from({ length: wordCount }, () => pickRandom(list));
  return { value: words.join(' '), entropy: wordCount === 24 ? 256 : 128 };
}

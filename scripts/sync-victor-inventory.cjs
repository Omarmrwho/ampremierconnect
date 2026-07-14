#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

const appRoot = path.join(__dirname, '..');
const workspaceRoot = path.resolve(appRoot, '..');
const outputPath = path.join(appRoot, 'data', 'victor-generator-inventory.json');
const auditPath = path.join(workspaceRoot, 'memory', 'victor-generator-inventory-sync-state.json');
const secretsRoot = path.join(process.env.HOME || '/root', '.openclaw', 'secrets');
const graphConfigPath = path.join(secretsRoot, 'elara-graph-mail.json');
const clientSecretPath = path.join(secretsRoot, 'client_secret.txt');
const victorEmail = 'marketing@americanplantandequipment.com';
const joriEmail = 'jorianap@ampremiersolutions.com';

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trim();
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function request(url, options = {}, body = '') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function saveJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function getAppToken() {
  const cfg = readJson(graphConfigPath);
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: readText(clientSecretPath),
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  }).toString();
  const res = await request(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    body,
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Graph token request failed HTTP ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.access_token, user: cfg.from || 'elara@ampremiersolutions.com' };
}

async function graph(token, pathname, headers = {}) {
  const res = await request(`https://graph.microsoft.com/v1.0${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Graph request failed HTTP ${res.status}: ${pathname} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function graphAbsolute(token, url, headers = {}) {
  const res = await request(url, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Graph request failed HTTP ${res.status}: ${url} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function getAllPages(token, firstPath, headers = {}) {
  const rows = [];
  let page = await graph(token, firstPath, headers);
  rows.push(...(page.value || []));
  while (page['@odata.nextLink']) {
    page = await graphAbsolute(token, page['@odata.nextLink'], headers);
    rows.push(...(page.value || []));
  }
  return rows;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractImages(html) {
  const images = [];
  const seen = new Set();
  for (const match of String(html || '').matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = decodeEntities(match[1]).trim();
    if (!src || src.includes('/track.php') || src.startsWith('cid:') || seen.has(src)) continue;
    seen.add(src);
    images.push(src);
  }
  return images;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getKeyValue(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`(?:^|\\n)\\s*(?:\\d+[.)]?\\s*)?${escaped}\\s*:\\s*([^\\n]+)`, 'i'),
    new RegExp(`\\b${escaped}\\s*:\\s*([^\\n]+)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return clean(match[1]);
  }
  return '';
}

function inferRef(subject, text) {
  return clean(
    getKeyValue(text, 'REFERENCE NUMBER') ||
      subject.match(/\b(?:TT|TY|YY)-\d{3,5}\b/i)?.[0] ||
      subject.match(/\b[A-Z]{2}-\d{3,5}\b/i)?.[0] ||
      subject.split(/\s+/)[0],
  ).toUpperCase();
}

function inferYear(subject, text) {
  return clean(getKeyValue(text, 'YEAR') || subject.match(/\bYEAR\s+(\d{4})\b/i)?.[1] || subject.match(/\b(19|20)\d{2}\b/)?.[0]);
}

function inferFrequency(subject, text) {
  return clean(getKeyValue(text, 'FREQUENCY') || subject.match(/\b(50\s*Hz\s*[-/]?\s*60\s*Hz|50\s*Hz|60\s*Hz)\b/i)?.[0]);
}

function inferCapacity(subject, text) {
  const kw = getKeyValue(text, 'KW') || getKeyValue(text, 'KWE');
  const kva = getKeyValue(text, 'KVA');
  const subjectMw = subject.match(/\b(\d+(?:\.\d+)?)\s*MW\b/i)?.[0] || '';
  const subjectKw = subject.match(/\b(\d{2,6})\s*KW\b/i)?.[0] || '';
  return clean(kw || subjectMw || subjectKw || kva);
}

function inferCategory(subject, text) {
  const source = `${subject} ${text}`.toLowerCase();
  if (/\b(transformer|resibloc)\b/.test(source)) return 'Transformer';
  if (/\b(turbine|turbines|lm6000|sgt|solar titan|taurus|centaur|frame 5|trent)\b/.test(source)) return 'Turbine / generator';
  if (/\b(generator|genset|gen set|power plant|jenbacher|waukesh|mtu|caterpillar|diesel|natural gas)\b/.test(source)) return 'Generator / power plant';
  if (/\b(alternator)\b/.test(source)) return 'Alternator';
  return 'Industrial equipment';
}

function powerRelevance(subject, text) {
  return /\b(generator|turbine|power plant|genset|gen set|kw|kwe|kva|mw|hz|voltage|fuel type|transformer|alternator)\b/i.test(`${subject} ${text}`);
}

function buildOffer(message) {
  const subject = clean(message.subject || '');
  const html = message.body?.content || '';
  const text = htmlToText(html);
  const reference = inferRef(subject, text);
  const title = clean(
    text.match(/REFERENCE NUMBER:\s*[A-Z]{2}-\d{3,5}\s*\n?([^\n]+)/i)?.[1] ||
      subject.replace(/^\s*[A-Z]{2}-\d{3,5}\s*/i, '').replace(/\.+$/, ''),
  );
  const fields = {
    fuel: getKeyValue(text, 'FUEL TYPE') || getKeyValue(text, 'FUEL'),
    brand: getKeyValue(text, 'BRAND'),
    model: getKeyValue(text, 'MODEL'),
    voltage: getKeyValue(text, 'VOLTAGE'),
    capacity: inferCapacity(subject, text),
    kva: getKeyValue(text, 'KVA'),
    hours: getKeyValue(text, 'HOURS') || getKeyValue(text, 'OPERATING HOURS'),
    condition: getKeyValue(text, 'CONDITION'),
    warranty: getKeyValue(text, 'WARRANTY'),
    quantity: getKeyValue(text, 'QUANTITY') || getKeyValue(text, 'QTY'),
    year: inferYear(subject, text),
    frequency: inferFrequency(subject, text),
  };
  return {
    id: message.id,
    reference,
    title,
    category: inferCategory(subject, text),
    powerRelevant: powerRelevance(subject, text),
    receivedAt: message.receivedDateTime || '',
    sentAt: message.sentDateTime || '',
    from: message.from?.emailAddress?.address || victorEmail,
    subject,
    preview: clean(message.bodyPreview || text).slice(0, 500),
    detailsText: text.slice(0, 5000),
    images: extractImages(html).slice(0, 12),
    fields,
    source: 'Victor LeBron / American Plant & Equipment email',
  };
}

function sentToJori(message) {
  return (message.toRecipients || []).some((recipient) =>
    String(recipient.emailAddress?.address || '').toLowerCase() === joriEmail,
  );
}

async function main() {
  const { token, user } = await getAppToken();
  const select = 'id,receivedDateTime,sentDateTime,subject,from,toRecipients,bodyPreview,body,hasAttachments,internetMessageId,conversationId';
  const inboxPath = [
    `/users/${encodeURIComponent(user)}/mailFolders/inbox/messages?$top=100`,
    `$filter=from/emailAddress/address eq '${victorEmail}'`,
    `$select=${select}`,
  ].join('&');
  const inboxMessages = await getAllPages(token, inboxPath);
  const sentPath = [
    `/users/${encodeURIComponent(user)}/mailFolders/sentitems/messages?$search=${encodeURIComponent('"Victor LeBron"')}&$top=100`,
    '$select=id,sentDateTime,subject,from,toRecipients,bodyPreview,conversationId',
  ].join('&');
  const sentMessages = await getAllPages(token, sentPath, { ConsistencyLevel: 'eventual' });

  const offersByRef = new Map();
  for (const message of inboxMessages) {
    const offer = buildOffer(message);
    if (!offer.reference) continue;
    const existing = offersByRef.get(offer.reference);
    if (!existing || offer.receivedAt > existing.receivedAt) {
      offersByRef.set(offer.reference, offer);
    }
  }

  const offers = [...offersByRef.values()].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
  const forwardSubjects = new Set(
    sentMessages
      .filter(sentToJori)
      .map((message) => clean(message.subject || '').replace(/^(fw|fwd|re):\s*/i, '').toLowerCase()),
  );
  const forwardedRefs = new Set();
  for (const message of sentMessages.filter(sentToJori)) {
    const ref = clean(message.subject || '').match(/\b[A-Z]{2}-\d{3,5}\b/i)?.[0];
    if (ref) forwardedRefs.add(ref.toUpperCase());
  }

  const enrichedOffers = offers.map((offer) => ({
    ...offer,
    forwardedToJori: forwardedRefs.has(offer.reference) ||
      forwardSubjects.has(clean(offer.subject).replace(/^(fw|fwd|re):\s*/i, '').toLowerCase()),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const receivedToday = enrichedOffers.filter((offer) => offer.receivedAt.startsWith(today)).length;
  const forwardedToday = sentMessages.filter((message) => sentToJori(message) && String(message.sentDateTime || '').startsWith(today)).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceMailbox: user,
    sourceSender: victorEmail,
    totalOffers: enrichedOffers.length,
    powerRelevantOffers: enrichedOffers.filter((offer) => offer.powerRelevant).length,
    receivedToday,
    forwardedToJori: enrichedOffers.filter((offer) => offer.forwardedToJori).length,
    forwardedToday,
    offers: enrichedOffers,
  };

  saveJson(outputPath, payload);
  saveJson(auditPath, {
    lastRunAt: payload.generatedAt,
    sourceMailbox: user,
    sourceSender: victorEmail,
    totalInboxMessages: inboxMessages.length,
    uniqueOffers: enrichedOffers.length,
    powerRelevantOffers: payload.powerRelevantOffers,
    sentSearchMatches: sentMessages.length,
    sentToJoriMatches: sentMessages.filter(sentToJori).length,
    receivedToday,
    forwardedToday,
    notForwardedRefs: enrichedOffers.filter((offer) => !offer.forwardedToJori).map((offer) => offer.reference),
  });
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    auditPath,
    totalInboxMessages: inboxMessages.length,
    uniqueOffers: enrichedOffers.length,
    powerRelevantOffers: payload.powerRelevantOffers,
    sentSearchMatches: sentMessages.length,
    sentToJoriMatches: sentMessages.filter(sentToJori).length,
    receivedToday,
    forwardedToday,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

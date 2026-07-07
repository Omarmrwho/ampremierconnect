#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.join(__dirname, '..');
const workspaceRoot = path.resolve(appRoot, '..');
const envPath = path.join(appRoot, '.env.local');
const secretsRoot = path.join(process.env.HOME || '/root', '.openclaw', 'secrets');
const tokenPath = path.join(secretsRoot, 'elara-graph-delegated-token.json');
const clientSecretPath = path.join(secretsRoot, 'client_secret.txt');
const syncStatePath = path.join(workspaceRoot, 'memory', 'ampremierconnect-email-reply-sync-state.json');

const internalDomains = new Set(['ampremiersolutions.com', 'ampremierconnect.com']);
const unmatchedImportFlag = '--create-unmatched-unsafe';
const ignoredDomains = new Set([
  'adp.com',
  'e.progressive.com',
  'mail.app.supabase.io',
  'subscriptions.norton.com',
  'godaddy.com',
]);
const automatedLocals = /^(mailer-daemon|postmaster|no-reply|noreply|donotreply|do-not-reply|bounce|notification|notifications)$/i;
const replySignals = /\b(re|fw|fwd|interested|available|schedule|meeting|call|quote|pricing|send|thanks|thank you|not interested|unsubscribe|remove|stop|no thanks|bounce|undeliverable|delivery|failed)\b/i;
const campaignSignals = /\b(solar|storage|ev|charging|charger|dc fast|level 3|generator|generators|turbine|turbines|critical power|backup power|capacity|airport|fbo|retail|commercial propert|healthcare|campus|cold chain|refrigerated|transit|roofing|lead recovery)\b/i;
const nonCampaignSignals = /\b(jnk project|dap|1x40|payroll|aws contract|construction agreement|legal|vercel|source package|phone elara|dashboard|linkedin|instagram|cPanel|appointment)\b/i;

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trim();
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
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
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

async function refreshGraphToken() {
  const token = readJson(tokenPath);
  const params = {
    grant_type: 'refresh_token',
    client_id: token.client_id,
    refresh_token: token.refresh_token,
    scope: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'offline_access',
    ].join(' '),
  };
  if (token.use_client_secret) {
    params.client_secret = readText(clientSecretPath);
  }

  const body = new URLSearchParams(params).toString();
  const res = await request(
    `https://login.microsoftonline.com/${token.tenant_id}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    body,
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Graph token refresh failed HTTP ${res.status}: ${JSON.stringify(res.body)}`);
  }
  saveJson(tokenPath, { ...token, ...res.body, obtained_at: new Date().toISOString() });
  return res.body.access_token;
}

async function graph(pathname) {
  const token = await refreshGraphToken();
  const res = await request(`https://graph.microsoft.com/v1.0${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Graph request failed HTTP ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function emailDomain(email) {
  return normalizeEmail(email).split('@')[1] || '';
}

function emailLocal(email) {
  return normalizeEmail(email).split('@')[0] || '';
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function bodyText(message) {
  const content = String(message.body?.content || '');
  if (!content) return '';
  return clean(content
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'"));
}

function messageSummary(message) {
  return clean([
    `Subject: ${message.subject || '(no subject)'}`,
    message.bodyPreview ? `Preview: ${message.bodyPreview}` : '',
    bodyText(message) ? `Body: ${bodyText(message).slice(0, 2500)}` : '',
  ].filter(Boolean).join(' | ')).slice(0, 3500);
}

function messageReplyFields(message) {
  const fullBody = bodyText(message).slice(0, 5000);
  return {
    reply_body: fullBody || clean(message.bodyPreview || '').slice(0, 1000) || null,
    reply_preview: clean(message.bodyPreview || '').slice(0, 1000) || null,
    reply_from: normalizeEmail(message.from?.emailAddress?.address) || null,
    reply_received_at: message.receivedDateTime || null,
    reply_message_id: message.id || null,
  };
}

function isCampaignOutbound(message) {
  const from = normalizeEmail(message.from?.emailAddress?.address);
  const text = `${message.subject || ''} ${message.bodyPreview || ''}`;
  if (from && from !== 'elara@ampremiersolutions.com') return false;
  if (nonCampaignSignals.test(text)) return false;
  return campaignSignals.test(text);
}

function buildSentCampaignMatches(sentMessages) {
  const byRecipient = new Map();
  for (const message of sentMessages || []) {
    if (!isCampaignOutbound(message)) continue;
    for (const recipient of message.toRecipients || []) {
      const email = normalizeEmail(recipient.emailAddress?.address);
      if (!email || internalDomains.has(emailDomain(email)) || ignoredDomains.has(emailDomain(email))) continue;
      const list = byRecipient.get(email) || [];
      list.push(message);
      byRecipient.set(email, list);
    }
  }
  return byRecipient;
}

function findVerifiedSentCampaign(message, sentCampaignsByRecipient) {
  const from = normalizeEmail(message.from?.emailAddress?.address);
  const receivedAt = Date.parse(message.receivedDateTime || '');
  if (!from || !Number.isFinite(receivedAt)) return null;

  const sentMessages = sentCampaignsByRecipient.get(from) || [];
  return sentMessages.find((sent) => {
    const sentAt = Date.parse(sent.sentDateTime || sent.receivedDateTime || '');
    if (!Number.isFinite(sentAt) || receivedAt + 60 * 60 * 1000 < sentAt) return false;
    return sent.conversationId === message.conversationId || cleanSubject(sent.subject) === cleanSubject(message.subject);
  }) || null;
}

function shouldConsider(message) {
  const from = normalizeEmail(message.from?.emailAddress?.address);
  if (!from || internalDomains.has(emailDomain(from))) return false;
  if (ignoredDomains.has(emailDomain(from))) return false;
  if (automatedLocals.test(emailLocal(from))) return true;
  return replySignals.test(`${message.subject || ''} ${message.bodyPreview || ''}`);
}

function cleanSubject(value) {
  return clean(value).replace(/^(re|fw|fwd):\s*/ig, '').toLowerCase();
}

function isBusinessReply(message) {
  const from = normalizeEmail(message.from?.emailAddress?.address);
  if (!from || internalDomains.has(emailDomain(from)) || ignoredDomains.has(emailDomain(from))) return false;
  if (automatedLocals.test(emailLocal(from))) return false;
  return /\b(re|fw|fwd)\s*:/i.test(message.subject || '') || replySignals.test(`${message.subject || ''} ${message.bodyPreview || ''}`);
}

function projectNameForMessage(message) {
  const text = `${message.subject || ''} ${message.bodyPreview || ''}`.toLowerCase();
  if (/\b(ev|charging|charger|solar|storage|dcfc)\b/.test(text)) return 'EV/DC Charger Outreach Engine';
  if (/\b(generator|turbine|lm2500|power|critical)\b/.test(text)) return 'Generator and Critical Power Outreach';
  return 'Power Outreach Command Board';
}

async function ensureProject(supabase, projectName) {
  const { data: existing, error: selectError } = await supabase
    .from('project_session_status')
    .select('id')
    .eq('project_name', projectName)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('project_session_status')
    .insert({
      project_name: projectName,
      client_name: 'AM Premier Solutions',
      status: 'active',
      health: 'green',
      source_session_label: 'email reply sync',
      owner: 'Elara',
      last_update: 'Inbox replies imported into AM Premier Connect.',
      next_action: 'Review synced replies and assign follow-up.',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

function stripReplyColumns(value) {
  const copy = { ...value };
  delete copy.reply_body;
  delete copy.reply_preview;
  delete copy.reply_from;
  delete copy.reply_received_at;
  delete copy.reply_message_id;
  return copy;
}

function isMissingReplyColumnError(error) {
  return /reply_(body|preview|from|received_at|message_id)/i.test(`${error?.message || ''} ${error?.details || ''}`);
}

async function updateCrmRecord(supabase, id, values) {
  const result = await supabase.from('project_crm_records').update(values).eq('id', id);
  if (!result.error || !isMissingReplyColumnError(result.error)) return result;
  return supabase.from('project_crm_records').update(stripReplyColumns(values)).eq('id', id);
}

async function insertCrmRecord(supabase, values) {
  const result = await supabase.from('project_crm_records').insert(values).select('id,company_name,email').single();
  if (!result.error || !isMissingReplyColumnError(result.error)) return result;
  return supabase.from('project_crm_records').insert(stripReplyColumns(values)).select('id,company_name,email').single();
}

function findMatch(message, crmRows) {
  const from = normalizeEmail(message.from?.emailAddress?.address);
  const receivedAt = Date.parse(message.receivedDateTime || '');

  const exact = crmRows.find((row) => normalizeEmail(row.email) === from);
  if (!exact) return null;

  if (!exact.campaign_name || exact.campaign_name === 'Inbox reply import') {
    return null;
  }

  const lastContactedAt = Date.parse(exact.last_contacted_at || '');
  if (!Number.isFinite(lastContactedAt) || !Number.isFinite(receivedAt)) {
    return null;
  }

  const oneHour = 60 * 60 * 1000;
  if (receivedAt + oneHour < lastContactedAt) {
    return null;
  }

  return { row: exact, confidence: 'exact-campaign-email' };
}

function alreadyLogged(row, message) {
  const notes = row.next_step || '';
  return notes.includes(message.id) || notes.includes(`From: ${normalizeEmail(message.from?.emailAddress?.address)}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const createUnmatched = process.argv.includes(unmatchedImportFlag);
  const daysArg = Number((process.argv.find((arg) => arg.startsWith('--days=')) || '').split('=')[1]);
  const topArg = Number((process.argv.find((arg) => arg.startsWith('--top=')) || '').split('=')[1]);
  const days = Number.isFinite(daysArg) && daysArg > 0 ? Math.min(daysArg, 30) : 14;
  const top = Number.isFinite(topArg) && topArg > 0 ? Math.min(topArg, 100) : 75;
  const since = new Date(Date.now() - days * 864e5).toISOString();

  const env = readEnv(envPath);
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: crmRows, error: crmError } = await supabase
    .from('project_crm_records')
    .select('id,project_id,company_name,email,campaign_name,stage,next_step,last_contacted_at,last_contact_subject');
  if (crmError) throw crmError;

  const query = [
    `/me/mailFolders/inbox/messages?$top=${top}`,
    '$orderby=receivedDateTime desc',
    '$select=id,receivedDateTime,subject,from,bodyPreview,body,conversationId,internetMessageId',
  ].join('&');
  const inbox = await graph(query);
  const messages = (inbox.value || []).filter((message) => message.receivedDateTime >= since).filter(shouldConsider);
  const sentQuery = [
    `/me/mailFolders/sentitems/messages?$top=200`,
    '$orderby=sentDateTime desc',
    '$select=id,sentDateTime,subject,from,toRecipients,bodyPreview,conversationId,internetMessageId',
  ].join('&');
  const sent = await graph(sentQuery);
  const sentCampaignsByRecipient = buildSentCampaignMatches(sent.value || []);

  const matches = [];
  const skipped = [];
  const verifiedCampaignReplies = [];
  for (const message of messages) {
    const match = findMatch(message, crmRows || []);
    if (!match) {
      const verifiedSent = findVerifiedSentCampaign(message, sentCampaignsByRecipient);
      if (verifiedSent) {
        verifiedCampaignReplies.push({ message, verifiedSent });
        continue;
      }

      skipped.push({
        receivedDateTime: message.receivedDateTime,
        from: normalizeEmail(message.from?.emailAddress?.address),
        subject: message.subject || '',
        reason: 'no CRM campaign match or verified sent campaign',
        importable: isBusinessReply(message),
      });
      continue;
    }

    if (alreadyLogged(match.row, message)) {
      skipped.push({
        receivedDateTime: message.receivedDateTime,
        from: normalizeEmail(message.from?.emailAddress?.address),
        subject: message.subject || '',
        company: match.row.company_name,
        reason: 'already logged',
      });
      continue;
    }

    const existingNotes = match.row.next_step || '';
    const responseLine = [
      `Response: ${messageSummary(message)}`,
      `Response from: ${normalizeEmail(message.from?.emailAddress?.address)}`,
      `Response date: ${message.receivedDateTime.slice(0, 10)}`,
      `Graph message id: ${message.id}`,
      `Response match: ${match.confidence}`,
    ].join(' | ');
    const updatedNotes = [existingNotes, responseLine].filter(Boolean).join(' | ').slice(0, 5000);

    matches.push({
      message,
      row: match.row,
      confidence: match.confidence,
      update: {
        stage: automatedLocals.test(emailLocal(message.from?.emailAddress?.address)) ? 'bounce or automated reply' : 'responded',
        next_step: updatedNotes,
        last_contacted_at: message.receivedDateTime,
        last_contact_subject: message.subject || match.row.last_contact_subject,
        ...messageReplyFields(message),
        updated_at: new Date().toISOString(),
      },
    });
  }

  const applied = [];
  const created = [];
  if (apply) {
    for (const match of matches) {
      const { error } = await updateCrmRecord(supabase, match.row.id, match.update);
      if (error) throw error;
      applied.push({
        crmId: match.row.id,
        company: match.row.company_name,
        from: normalizeEmail(match.message.from?.emailAddress?.address),
        subject: match.message.subject || '',
        confidence: match.confidence,
      });
    }

    for (const { message, verifiedSent } of verifiedCampaignReplies) {
      const projectName = projectNameForMessage(message);
      const projectId = await ensureProject(supabase, projectName);
      const from = normalizeEmail(message.from?.emailAddress?.address);
      const fromName = clean(message.from?.emailAddress?.name);
      const responseLine = [
        `Response: ${messageSummary(message)}`,
        `Response from: ${from}`,
        `Response date: ${message.receivedDateTime.slice(0, 10)}`,
        `Graph message id: ${message.id}`,
        `Response match: verified sent campaign to recipient`,
        `Sent campaign subject: ${verifiedSent.subject || '(no subject)'}`,
      ].join(' | ');

      const { data, error } = await insertCrmRecord(supabase, {
        project_id: projectId,
        company_name: fromName || emailDomain(from) || from,
        contact_name: fromName || null,
        email: from,
        campaign_name: `Verified campaign reply: ${cleanSubject(verifiedSent.subject || message.subject || 'outreach')}`.slice(0, 160),
        channel: 'email',
        last_contacted_at: message.receivedDateTime,
        last_contact_subject: message.subject || verifiedSent.subject || null,
        ...messageReplyFields(message),
        stage: 'responded',
        owner: 'Verified Email Reply Sync',
        next_step: responseLine,
        value_estimate: 'Verified campaign reply requiring triage',
      });
      if (error) throw error;
      created.push({
        crmId: data.id,
        company: data.company_name,
        from,
        subject: message.subject || '',
        projectName,
        confidence: 'verified-sent-campaign',
      });
    }

    if (createUnmatched) {
      const importableSkipped = skipped.filter((item) => item.importable);
      for (const item of importableSkipped) {
        const message = messages.find((candidate) =>
          normalizeEmail(candidate.from?.emailAddress?.address) === item.from &&
          candidate.receivedDateTime === item.receivedDateTime &&
          (candidate.subject || '') === item.subject
        );
        if (!message) continue;

        const projectName = projectNameForMessage(message);
        const projectId = await ensureProject(supabase, projectName);
        const from = normalizeEmail(message.from?.emailAddress?.address);
        const fromName = clean(message.from?.emailAddress?.name);
        const responseLine = [
          `Response: ${messageSummary(message)}`,
          `Response from: ${from}`,
          `Response date: ${message.receivedDateTime.slice(0, 10)}`,
          `Graph message id: ${message.id}`,
          'Response match: unmatched inbox import',
        ].join(' | ');

        const { data, error } = await insertCrmRecord(supabase, {
          project_id: projectId,
          company_name: fromName || emailDomain(from) || from,
          contact_name: fromName || null,
          email: from,
          campaign_name: 'Inbox reply import',
          channel: 'email',
          last_contacted_at: message.receivedDateTime,
          last_contact_subject: message.subject || null,
          ...messageReplyFields(message),
          stage: 'responded',
          owner: 'Email Reply Sync',
          next_step: responseLine,
          value_estimate: 'Inbox reply requiring triage',
        });
        if (error) throw error;
        created.push({
          crmId: data.id,
          company: data.company_name,
          from,
          subject: message.subject || '',
          projectName,
        });
      }
    }

    saveJson(syncStatePath, {
      lastRunAt: new Date().toISOString(),
      since,
      matched: applied.length,
      created: created.length,
      skipped: skipped.length,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    apply,
    scanned: inbox.value?.length || 0,
    considered: messages.length,
    matched: matches.length,
    verifiedCampaignReplies: verifiedCampaignReplies.length,
    applied: applied.length,
    created: created.length,
    matches: matches.map((match) => ({
      receivedDateTime: match.message.receivedDateTime,
      from: normalizeEmail(match.message.from?.emailAddress?.address),
      subject: match.message.subject || '',
      company: match.row.company_name,
      crmEmail: match.row.email,
      campaign: match.row.campaign_name,
      confidence: match.confidence,
    })),
    createdRows: created,
    verifiedRows: verifiedCampaignReplies.map(({ message, verifiedSent }) => ({
      receivedDateTime: message.receivedDateTime,
      from: normalizeEmail(message.from?.emailAddress?.address),
      subject: message.subject || '',
      sentSubject: verifiedSent.subject || '',
      sentDateTime: verifiedSent.sentDateTime || '',
    })),
    skipped: skipped.slice(0, 20),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

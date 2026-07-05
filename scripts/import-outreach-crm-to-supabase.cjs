#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const workspace = '/root/.openclaw/workspace';
const envPath = path.join(__dirname, '..', '.env.local');

function readEnv(filePath) {
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const env = readEnv(envPath);
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const projectMap = {
  dcfc: 'EV/DC Charger Outreach Engine',
  generatorBuyer: 'Generator and Critical Power Outreach',
  generatorSeller: 'Generator and Critical Power Outreach',
  services: 'Power Outreach Command Board',
};

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (quoted && ch === '"' && next === '"') { value += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (!quoted && ch === ',') { row.push(value); value = ''; continue; }
    if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i++;
      row.push(value); value = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }
    value += ch;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...data] = rows;
  return data.map((cells) => Object.fromEntries(headers.map((h, i) => [h.trim(), (cells[i] || '').trim()])));
}

function clean(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function firstEmail(value) {
  const match = clean(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : '';
}

function category(folder) {
  if (folder.startsWith('ev-dc-charger')) return 'dcfc';
  if (folder.includes('generator-channel')) return 'generatorSeller';
  if (folder.includes('generator') || folder.includes('critical-power')) return 'generatorBuyer';
  return 'services';
}

function stageFor(cat) {
  if (cat === 'dcfc') return 'site-host outreach sent';
  if (cat === 'generatorSeller') return 'source outreach sent';
  if (cat === 'generatorBuyer') return 'buyer outreach sent';
  return 'services outreach sent';
}

function contactName(row, company) {
  return clean(row.contact_name || row['Decision Maker Name'] || row['Decision Maker'] || row.contact || row.person)
    || `${company} routing contact`;
}

function makeRecords() {
  const byKey = new Map();
  const folders = fs.readdirSync(workspace)
    .filter((folder) => fs.existsSync(path.join(workspace, folder, 'CRM_TARGET_BATCH.csv')) && fs.existsSync(path.join(workspace, folder, 'SEND_LOG.jsonl')))
    .sort();

  for (const folder of folders) {
    const rows = parseCsv(fs.readFileSync(path.join(workspace, folder, 'CRM_TARGET_BATCH.csv'), 'utf8'));
    const logs = fs.readFileSync(path.join(workspace, folder, 'SEND_LOG.jsonl'), 'utf8').trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
    for (const log of logs) {
      const row = rows.find((candidate) => clean(candidate.company || candidate['Company / Property Name'] || candidate.company_name).toLowerCase() === clean(log.company).toLowerCase())
        || rows.find((candidate) => firstEmail(candidate.email || candidate.Email).toLowerCase() === clean(log.to).toLowerCase())
        || {};
      const company = clean(log.company || row.company || row['Company / Property Name'] || row.company_name);
      const email = firstEmail(log.to || row.email || row.Email);
      const key = `${company.toLowerCase()}|${email.toLowerCase()}`;
      const cat = category(folder);
      const existing = byKey.get(key) || {
        company,
        email,
        row,
        folder,
        cat,
        logs: [],
      };
      existing.logs.push(log);
      byKey.set(key, existing);
    }
  }

  const master = path.join(workspace, 'logs/campaign-send-log-2026-07-02.jsonl');
  if (fs.existsSync(master)) {
    for (const line of fs.readFileSync(master, 'utf8').trim().split(/\n/).filter(Boolean)) {
      const log = JSON.parse(line);
      const company = clean(log.company);
      const email = firstEmail(log.to);
      const key = `${company.toLowerCase()}|${email.toLowerCase()}`;
      const existing = byKey.get(key) || {
        company,
        email,
        row: {},
        folder: 'logs/campaign-send-log-2026-07-02.jsonl',
        cat: 'generatorBuyer',
        logs: [],
      };
      existing.logs.push(log);
      byKey.set(key, existing);
    }
  }

  return [...byKey.values()].sort((a, b) => a.company.localeCompare(b.company));
}

function buildCrmRow(record, projectId) {
  const row = record.row || {};
  const latest = record.logs[record.logs.length - 1] || {};
  const location = clean(row.location || row.city_or_region || row.City || row.city || row.State || row.state);
  const phone = clean(row.phone || row.Phone);
  const website = clean(row.website || row.Website);
  const source = clean(row.source_url || row['Source URLs'] || row.contact_url || row.source || row.evidence);
  const fit = clean(row.fit_reason || row.why_fit || row['Why This Site'] || row.site_host_signal || row.evidence);
  const segment = clean(row.segment || row['Location Type'] || row.location_type || latest.campaign);
  const contact = contactName(row, record.company);
  const campaignName = clean(latest.campaign || record.folder);
  const subject = clean(latest.subject || 'outreach sent');
  const sentLine = `${latest.timestamp ? latest.timestamp.slice(0, 10) : 'sent'} | ${latest.subject || 'outreach sent'} | ${record.email}`;
  const details = [
    record.logs.length > 1 ? `Additional sends/routes: ${record.logs.length}` : '',
    `Sent: ${sentLine}`,
  ].filter(Boolean).join(' | ');

  return {
    project_id: projectId,
    company_name: record.company,
    contact_name: contact,
    contact_title: clean(row.title || row.contact_title || row['Decision Maker Title']) || null,
    email: record.email || null,
    phone: phone || null,
    location: location || null,
    segment: segment || null,
    website: website || null,
    source_url: source || null,
    campaign_name: campaignName || null,
    channel: 'email',
    last_contacted_at: latest.timestamp || null,
    last_contact_subject: subject || null,
    fit_reason: fit || null,
    stage: stageFor(record.cat),
    owner: 'Elara Outreach Import',
    next_step: details ? details.slice(0, 1800) : 'Review reply status and schedule next touch.',
    value_estimate: record.cat === 'dcfc'
      ? 'DCFC site-host opportunity'
      : record.cat === 'generatorSeller'
        ? 'Generator source/supplier opportunity'
        : record.cat === 'generatorBuyer'
          ? 'Generator buyer / critical power opportunity'
          : 'Power services opportunity',
  };
}

async function ensureProject(name) {
  const { data: existing, error: selectError } = await supabase
    .from('project_session_status')
    .select('id')
    .eq('project_name', name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('project_session_status')
    .insert({
      project_name: name,
      client_name: 'AM Premier Solutions',
      status: 'active',
      health: 'green',
      source_session_label: 'outreach CRM import',
      owner: 'Elara',
      last_update: 'Outreach database imported into AM Premier Connect CRM.',
      next_action: 'Monitor replies and move warm records into follow-up.',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const records = makeRecords();
  const projectIds = {};
  for (const name of new Set(Object.values(projectMap))) {
    projectIds[name] = await ensureProject(name);
  }

  const { error: deleteError } = await supabase
    .from('project_crm_records')
    .delete()
    .eq('owner', 'Elara Outreach Import');
  if (deleteError) throw deleteError;

  const rows = records.map((record) => buildCrmRow(record, projectIds[projectMap[record.cat]]));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('project_crm_records').insert(rows.slice(i, i + 100));
    if (error) throw error;
  }

  const summary = rows.reduce((acc, row) => {
    acc[row.value_estimate] = (acc[row.value_estimate] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ imported: rows.length, sentEmailRows: records.reduce((sum, record) => sum + record.logs.length, 0), summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

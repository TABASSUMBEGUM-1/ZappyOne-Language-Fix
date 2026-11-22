// ServicePro partner OS words and rules shared by web and app (server shop/partner.service).

export const PARTNER_TYPES = [
  { key: 'shop', tk: 'sp.pt.shop', label: 'Shop', hk: 'sp.pt.shop.hint', hint: 'A counter customers can walk into.' },
  { key: 'agency', tk: 'sp.pt.agency', label: 'Agency', hk: 'sp.pt.agency.hint', hint: 'A team that goes to customers; no counter.' },
  { key: 'company', tk: 'sp.pt.company', label: 'Service company', hk: 'sp.pt.company.hint', hint: 'A registered company with its own staff.' },
  { key: 'individual', tk: 'sp.pt.individual', label: 'Independent professional', hk: 'sp.pt.individual.hint', hint: 'You work on your own, with or without a helper.' },
];

export const DISPATCH_MODES = [
  { key: 'manual', tk: 'sp.dm.manual', label: 'I assign each job', hk: 'sp.dm.manual.hint', hint: 'You or your team leads pick who goes.' },
  { key: 'nearest', tk: 'sp.dm.nearest', label: 'Nearest free member', hk: 'sp.dm.nearest.hint', hint: 'Whoever is on duty, free and closest gets it at once.' },
  { key: 'round_robin', tk: 'sp.dm.round_robin', label: 'Take turns', hk: 'sp.dm.round_robin.hint', hint: 'The member given a job longest ago gets the next one.' },
];

export const BOARD_COLUMNS = [
  { key: 'new', tk: 'sp.col.new', label: 'New' },
  { key: 'assigned', tk: 'sp.col.assigned', label: 'Assigned' },
  { key: 'on_the_way', tk: 'sp.col.on_the_way', label: 'On the way' },
  { key: 'in_progress', tk: 'sp.col.in_progress', label: 'In progress' },
  { key: 'done', tk: 'sp.col.done', label: 'Done' },
];

const MOVING = new Set(['ON_THE_WAY', 'PROVIDER_EN_ROUTE', 'EN_ROUTE', 'OUT_FOR_RETURN']);
const DONE = new Set(['COMPLETED', 'CLOSED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'REJECTED', 'FAILED']);
const WAITING = new Set(['PROVIDER_ASSIGNED', 'CONFIRMED', 'BOOKED', 'PROVIDER_SEARCHING', 'WORKER_SEARCHING']);
const ACCEPTED = new Set(['WORKER_ACCEPTED', 'PROVIDER_ACCEPTED', 'PICKUP_SCHEDULED']);

/** Which board column a job is in, from its status and whether someone is on it. */
export function bucketOf(rawStatus, workerId) {
  if (DONE.has(rawStatus)) return 'done';
  if (MOVING.has(rawStatus)) return 'on_the_way';
  if (WAITING.has(rawStatus) || !workerId) return 'new';
  if (ACCEPTED.has(rawStatus)) return 'assigned';
  return 'in_progress';
}

// A pasted team list, one person a line, name and number in either order.
export function parseTeamList(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const digits = (line.match(/\+?[\d\s-]{10,}/) || [''])[0];
    const phone = digits.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const name = line.replace(digits, '').replace(/[,;|\t]+/g, ' ').trim();
    return { name, phone };
  }).filter((r) => r.phone || r.name);
}

/** @typedef {{ kind: string, id: string, status: string, workerId: string | null, at?: string, title: string, where: string }} BoardJob */
/** @typedef {{ id: string, name: string, isOnline: boolean, lead: boolean }} BoardMember */

// A team lead's board (GET /jobs/team-board): jobs nobody is on, and each person with their jobs.
/** @param {{ jobs?: BoardJob[], members?: BoardMember[] } | undefined} board @returns {{ waiting: BoardJob[], people: (BoardMember & { jobs: BoardJob[] })[] }} */
export function leadView(board) {
  const jobs = board?.jobs || [];
  return {
    waiting: jobs.filter((j) => !j.workerId),
    people: (board?.members || []).map((m) => ({ ...m, jobs: jobs.filter((j) => j.workerId === m.id) })),
  };
}

// A shop photo proves a counter or an office; an independent professional has neither (server shop.controller submitKyc keeps the same rule).
export const needsShopPhoto = (partnerType) => partnerType !== 'individual';

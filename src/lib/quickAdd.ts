/* Quick add for the calendar, like the prototype: "Market Sat 8am-2pm at Riverside", "pickup tomorrow 3pm",
   "sewing thu 7pm", "day off friday", "craft fair oct 12-13". */
import { addDays, todayDay } from './plan';
import type { CalEvent } from '../state/types';

const W = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const M = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function toTime(h: string, m: string | undefined, ap: string | undefined, hint?: string) {
  let H = +h;
  const mm = m ? +m : 0;
  const a = ap || hint;
  if (a === 'pm' && H < 12) H += 12;
  if (a === 'am' && H === 12) H = 0;
  if (!a && H >= 1 && H <= 6) H += 12; // "pickup 3" means the afternoon
  return H > 23 || mm > 59 ? null : `${pad(H)}:${pad(mm)}`;
}

export type QuickEvent = Omit<CalEvent, 'id'>;

export function parseQuick(raw: string, today = todayDay()): QuickEvent | null {
  const src = String(raw || '').trim();
  if (!src) return null;
  let x = ' ' + src.toLowerCase().replace(/–/g, '-') + ' ';
  const cut = (re: RegExp | string) => {
    x = x.replace(re, ' ');
  };
  let m: RegExpMatchArray | null;
  let day: string | null = null;
  let days = 1;
  let time: string | undefined;
  let dur: number | undefined;
  let loc = '';
  const dow = new Date(today + 'T12:00:00').getDay();

  let rep: CalEvent['rep'] = '';
  if ((m = x.match(/\bevery other week\b|\bevery 2 weeks\b|\bbiweekly\b/))) {
    rep = '2w';
    cut(m[0]);
  } else if ((m = x.match(/\bevery week\b|\bweekly\b/))) {
    rep = 'w';
    cut(m[0]);
  } else if ((m = x.match(/\bevery month\b|\bmonthly\b/))) {
    rep = 'm';
    cut(m[0]);
  } else if ((m = x.match(/\bevery (sun|mon|tue|wed|thu|fri|sat)/))) {
    rep = 'w';
    x = x.replace(/\bevery (?=(sun|mon|tue|wed|thu|fri|sat))/, ' ');
  }
  if ((m = x.match(/\bfor (\d{1,2}) days\b/))) {
    days = Math.max(1, +m[1]);
    cut(m[0]);
  }
  if ((m = x.match(/\b(?:this )?weekend\b/))) {
    day = addDays(today, (6 - dow + 7) % 7);
    days = 2;
    cut(m[0]);
  }
  if ((m = x.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})(?:\s*-\s*(\d{1,2}))?\b/))) {
    const y = +today.slice(0, 4);
    let d = `${y}-${pad(M.indexOf(m[1]) + 1)}-${pad(+m[2])}`;
    if (d < addDays(today, -1)) d = `${y + 1}${d.slice(4)}`;
    day = d;
    if (m[3]) days = Math.max(1, +m[3] - +m[2] + 1);
    cut(m[0]);
  } else if ((m = x.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    const y = +today.slice(0, 4);
    let d = `${y}-${pad(+m[1])}-${pad(+m[2])}`;
    if (d < addDays(today, -1)) d = `${y + 1}${d.slice(4)}`;
    day = d;
    cut(m[0]);
  }
  if (/\btoday\b|\btonight\b/.test(x)) {
    day = today;
    cut(/\btoday\b|\btonight\b/);
  } else if (/\btomorrow\b|\btmrw\b/.test(x)) {
    day = addDays(today, 1);
    cut(/\btomorrow\b|\btmrw\b/);
  }
  if (!day && (m = x.match(/\b(next )?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?\b/))) {
    const i = W.findIndex(w => w.startsWith(m![2].slice(0, 3)));
    let n = (i - dow + 7) % 7;
    if (m[1]) n += n === 0 ? 7 : 7;
    day = addDays(today, n);
    cut(m[0]);
  }
  // times: "8am-2pm", "8-2pm", "3pm", "15:30", "at 3"
  if ((m = x.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/))) {
    const a = toTime(m[1], m[2], m[3], m[3] ? undefined : m[6] && +m[1] > +m[4] ? 'am' : m[6]);
    const b = toTime(m[4], m[5], m[6]);
    if (a && b) {
      time = a;
      const mins = (+b.slice(0, 2) * 60 + +b.slice(3)) - (+a.slice(0, 2) * 60 + +a.slice(3));
      dur = mins > 0 ? mins : mins + 1440;
      cut(m[0]);
    }
  } else if ((m = x.match(/\b(?:at )?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)) || (m = x.match(/\b(?:at )?(\d{1,2}):(\d{2})()\b/))) {
    const a = toTime(m[1], m[2], m[3] || undefined);
    if (a) {
      time = a;
      cut(m[0]);
    }
  }
  if ((m = x.match(/\b(?:at|@) ([a-z0-9][^,]*?)\s*$/))) {
    loc = m[1].trim();
    cut(m[0]);
  }
  let kind: CalEvent['kind'] = 'other';
  if (/\bday off\b|\boff\b|\bvacation\b|\bholiday\b/.test(x)) kind = 'off';
  else if (/\bmarket\b|\bfair\b|\bpop-?up\b|\bbazaar\b/.test(x)) kind = 'market';
  else if (/\bpick ?up\b|\bdrop[- ]?off\b|\bdeliver/.test(x)) kind = 'pickup';
  else if (/\bsew(ing)?\b/.test(x)) kind = 'sew';
  // Title: what's left of the original wording, in its own capitals
  const words = x.trim().split(/\s+/).filter(Boolean);
  const orig = src.replace(/–/g, '-').split(/\s+/);
  const title = words.length ? words.map(w => orig.find(o => o.toLowerCase() === w) || w).join(' ') : '';
  const pretty = title ? title[0].toUpperCase() + title.slice(1) : kind === 'off' ? 'Day off' : kind === 'market' ? 'Market' : kind === 'pickup' ? 'Pickup' : kind === 'sew' ? 'Sewing block' : 'Event';
  const locPretty = loc ? (src.match(new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) || [loc])[0] : '';
  return {
    day: day || today,
    title: pretty,
    kind,
    days,
    notes: '',
    ...(time && kind !== 'off' ? { time, dur: dur || (kind === 'market' ? 360 : 60) } : {}),
    ...(locPretty ? { loc: locPretty } : {}),
    ...(rep ? { rep } : {}),
  };
}

export const clock12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + pad(m) : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
export const addMin = (t: string, n: number) => {
  const [h, m] = t.split(':').map(Number);
  const x = (((h * 60 + m + n) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};

import { RRule, rrulestr } from 'rrule';
import { TickTickTask } from './models/TickTickTask';

/**
 * Recurrence support for completing repeating TickTick tasks.
 *
 * TickTick does not roll a recurring task forward on the server: its apps add a completed copy of the
 * current occurrence and move the series itself to the next occurrence. This module computes that next
 * occurrence. Observed TickTick behaviour (verified against real task history):
 * - repeatFrom "0" and "2" both continue from the current due date, not from the completion date, so an
 *   overdue series advances one occurrence at a time and an early completion skips to the next one.
 * - repeatFirstDate is not reliably the first occurrence, so the current occurrence is used as anchor.
 * - "FREQ=WEEKLY;BYWEEKNO=n" (not valid RFC 5545) behaves like a plain weekly rule.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_REPEAT_FROM = [undefined, null, '', '0', '2'];

export interface LocalDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

/** TickTick returns "2026-11-09T23:00:00.000+0000"; add the colon in the offset so every runtime parses it. */
export function parseTickTickDateTime(value: string): Date {
  return new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
}

export function formatTickTickDateTime(date: Date): string {
  return date.toISOString().replace('Z', '+0000');
}

export function toLocalDateTime(date: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour: get('hour'), minute: get('minute'), second: get('second'),
    millisecond: date.getUTCMilliseconds(),
  };
}

/** Converts a wall-clock time in `timeZone` to the actual instant, handling DST changes. */
export function fromLocalDateTime(local: LocalDateTime, timeZone: string): Date {
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
  const offsetAt = (instant: number) => {
    const l = toLocalDateTime(new Date(instant), timeZone);
    return Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second, l.millisecond) - instant;
  };
  let result = asUtc - offsetAt(asUtc);
  const correctedOffset = offsetAt(result);
  if (asUtc - correctedOffset !== result) {
    result = asUtc - correctedOffset;
  }
  return new Date(result);
}

/** A local calendar date represented as a UTC midnight Date, as rrule expects for "floating" dates. */
function localDateAsUtc(local: LocalDateTime): Date {
  return new Date(Date.UTC(local.year, local.month - 1, local.day));
}

function shiftLocalDays(value: string, days: number, timeZone: string): string {
  const local = toLocalDateTime(parseTickTickDateTime(value), timeZone);
  const shiftedDate = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
  return formatTickTickDateTime(fromLocalDateTime({
    ...local,
    year: shiftedDate.getUTCFullYear(),
    month: shiftedDate.getUTCMonth() + 1,
    day: shiftedDate.getUTCDate(),
  }, timeZone));
}

interface ParsedRule {
  rule: RRule;
  count: number | null;
}

function parseRepeatFlag(repeatFlag: string, dtstart: Date): ParsedRule {
  if (!repeatFlag.startsWith('RRULE:')) {
    throw new Error(`Repeat rule "${repeatFlag}" is not supported.`);
  }

  const parts = repeatFlag.substring('RRULE:'.length).split(';').filter(Boolean);
  const isWeekly = parts.includes('FREQ=WEEKLY');
  // TickTick writes "FREQ=WEEKLY;BYWEEKNO=n" for plain weekly rules; BYWEEKNO is only valid for YEARLY.
  const cleaned = parts.filter(part => !(isWeekly && part.startsWith('BYWEEKNO=')));
  const countPart = cleaned.find(part => part.startsWith('COUNT='));

  let rule: RRule;
  try {
    rule = rrulestr(`RRULE:${cleaned.join(';')}`, { dtstart }) as RRule;
  } catch (error) {
    throw new Error(`Repeat rule "${repeatFlag}" is not supported: ${(error as Error).message}`);
  }
  if (!(rule instanceof RRule)) {
    throw new Error(`Repeat rule "${repeatFlag}" is not supported.`);
  }
  return { rule, count: countPart ? Number(countPart.split('=')[1]) : null };
}

export interface NextOccurrence {
  /** New startDate for the series. */
  startDate: string;
  /** New dueDate for the series, null when the task has no dueDate. */
  dueDate: string | null;
  /** Number of local days the series moved. */
  shiftedDays: number;
  /** The repeatFlag to store on the series (COUNT is decremented). */
  repeatFlag: string;
}

/**
 * Returns why completing this recurring task is not supported, or null when it is supported.
 */
export function getUnsupportedRecurrenceReason(task: TickTickTask): string | null {
  if (!task.repeatFlag) return null;
  try {
    getNextOccurrence(task);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Computes the next occurrence of a recurring task.
 * Returns null when the series has ended (UNTIL or COUNT reached) and the task should simply be completed.
 * Throws when the repeat rule is not supported.
 */
export function getNextOccurrence(task: TickTickTask): NextOccurrence | null {
  if (!task.repeatFlag) {
    throw new Error(`Task "${task.title}" is not a recurring task.`);
  }
  if (!SUPPORTED_REPEAT_FROM.includes(task.repeatFrom)) {
    throw new Error(`Repeating from the completion date (repeatFrom "${task.repeatFrom}") is not supported.`);
  }
  const currentDate = task.startDate ?? task.dueDate;
  if (!currentDate) {
    throw new Error(`Recurring task "${task.title}" has no date to advance.`);
  }
  const timeZone = task.timeZone || 'UTC';

  const current = localDateAsUtc(toLocalDateTime(parseTickTickDateTime(currentDate), timeZone));
  const { rule, count } = parseRepeatFlag(task.repeatFlag, current);

  if (count !== null && count <= 1) {
    return null;
  }

  const skipped = new Set((task.exDate ?? [])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(value => localDateAsUtc(toLocalDateTime(parseTickTickDateTime(value), timeZone)).getTime()));

  let next: Date | null = rule.after(current, false);
  let remaining = count;
  while (next && skipped.has(next.getTime())) {
    if (remaining !== null && --remaining <= 1) return null;
    next = rule.after(next, false);
  }
  if (!next) {
    return null;
  }

  const shiftedDays = Math.round((next.getTime() - current.getTime()) / DAY_MS);
  const repeatFlag = count !== null
    ? task.repeatFlag.replace(/COUNT=\d+/, `COUNT=${(remaining ?? count) - 1}`)
    : task.repeatFlag;

  return {
    startDate: shiftLocalDays(task.startDate ?? currentDate, shiftedDays, timeZone),
    dueDate: task.dueDate ? shiftLocalDays(task.dueDate, shiftedDays, timeZone) : null,
    shiftedDays,
    repeatFlag,
  };
}

/** Moves a date of a checklist item along with its task. */
export function shiftTickTickDateTime(value: string, days: number, timeZone: string): string {
  return shiftLocalDays(value, days, timeZone);
}

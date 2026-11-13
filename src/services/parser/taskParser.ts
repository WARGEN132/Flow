import {
  addDays,
  setHours,
  setMinutes,
  nextDay,
  isBefore,
  addHours,
  addMinutes,
  parse,
  isValid,
  startOfDay,
  Day,
} from 'date-fns';
import { Priority, ParsedTaskQuery } from '../../types';

const RUSSIAN_MONTHS: Record<string, number> = {
  января: 0, янв: 0,
  февраля: 1, фев: 1,
  марта: 2, мар: 2,
  апреля: 3, апр: 3,
  мая: 4, май: 4,
  июня: 5, июн: 5,
  июля: 6, июл: 6,
  августа: 7, авг: 7,
  сентября: 8, сен: 8, сент: 8,
  октября: 9, окт: 9,
  ноября: 10, ноя: 10, нояб: 10,
  декабря: 11, дек: 11,
};

const DAY_OF_WEEK_RU: Record<string, Day> = {
  воскресенье: 0, вс: 0, воскресенья: 0, воскресенью: 0,
  понедельник: 1, пн: 1, понедельника: 1, понедельнику: 1,
  вторник: 2, вт: 2, вторника: 2, вторнику: 2,
  среда: 3, среду: 3, ср: 3, среды: 3, среде: 3,
  четверг: 4, чт: 4, четверга: 4, четвергу: 4,
  пятница: 5, пятницу: 5, пт: 5, пятницы: 5, пятнице: 5,
  суббота: 6, субботу: 6, сб: 6, субботы: 6, субботе: 6,
};

const DAY_OF_WEEK_EN: Record<string, Day> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

export function parseNaturalLanguageTask(
  input: string,
  referenceDate: Date = new Date(),
  workingHoursEnd = '19:00',
  defaultDuration = 45
): ParsedTaskQuery {
  if (!input || !input.trim()) {
    return { title: '' };
  }

  let text = input.trim();
  let duration: number | undefined = undefined;
  let priority: Priority = 'medium';
  let categoryId: string | undefined = undefined;
  let deadline: Date | undefined = undefined;
  let scheduledStart: Date | undefined = undefined;
  let remindMe = false;

  // 1. Detect Priority
  const urgentRegex = /\b(срочно|критично|критически|горит|asap|urgent|critical|high priority)\b|(!{1,3}$)/i;
  const highRegex = /\b(важно|приоритетно|высокий приоритет|high)\b/i;
  const lowRegex = /\b(не срочно|низкий приоритет|когда-нибудь|low)\b/i;

  if (urgentRegex.test(text)) {
    priority = 'urgent';
    text = text.replace(urgentRegex, '').trim();
  } else if (highRegex.test(text)) {
    priority = 'high';
    text = text.replace(highRegex, '').trim();
  } else if (lowRegex.test(text)) {
    priority = 'low';
    text = text.replace(lowRegex, '').trim();
  }

  // 2. Detect Duration (e.g. 1.5 часа, 2 часа, 90 минут, 45 мин, 1 hour, 30 min, 1ч, 30м)
  const durationMatch = text.match(
    /(?:продолжительность[:\s]*)?(\d+(?:[.,]\d+)?)\s*(часа?|часов|ч|мин(?:уты?|ут)?|м|hours?|hrs?|mins?|h|m)\b/i
  );
  if (durationMatch) {
    const val = parseFloat(durationMatch[1].replace(',', '.'));
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('ч') || unit.startsWith('h')) {
      duration = Math.round(val * 60);
    } else {
      duration = Math.round(val);
    }
    // Remove duration from title text
    text = text.replace(durationMatch[0], '').trim();
  } else {
    duration = defaultDuration;
  }

  // 3. Detect Reminders flag
  const reminderMatch = text.match(/\b(напомни(?:ть)?|напоминание|remind me|with reminder)\b/i);
  if (reminderMatch) {
    remindMe = true;
    text = text.replace(reminderMatch[0], '').trim();
  }

  // 4. Detect Specific Time: e.g. "в 14:00", "в 9", "at 15:30", "at 3pm"
  let parsedHour: number | null = null;
  let parsedMinute: number | null = null;
  let isExplicitTime = false;

  const timeMatch = text.match(/(?:в|at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      parsedHour = h;
      parsedMinute = m;
      isExplicitTime = true;
      text = text.replace(timeMatch[0], '').trim();
    }
  }

  // 5. Detect Relative Time of Day: "утром", "в обед", "днём", "вечером", "после работы"
  let timeOfDayTarget: 'morning' | 'lunch' | 'evening' | 'after_work' | null = null;
  if (/\b(после работы|after work)\b/i.test(text)) {
    timeOfDayTarget = 'after_work';
    text = text.replace(/\b(после работы|after work)\b/i, '').trim();
  } else if (/\b(вечером|ввечеру|evening)\b/i.test(text)) {
    timeOfDayTarget = 'evening';
    text = text.replace(/\b(вечером|ввечеру|evening)\b/i, '').trim();
  } else if (/\b(утром|с утра|morning)\b/i.test(text)) {
    timeOfDayTarget = 'morning';
    text = text.replace(/\b(утром|с утра|morning)\b/i, '').trim();
  } else if (/\b(в обед|днём|днем|afternoon)\b/i.test(text)) {
    timeOfDayTarget = 'lunch';
    text = text.replace(/\b(в обед|днём|днем|afternoon)\b/i, '').trim();
  }

  // 6. Detect Deadline markers ("до ...", "к ...", "дедлайн ...", "срок ...", "deadline ...", "by ...")
  let isDeadlineIntent = false;
  const deadlinePrefixMatch = text.match(
    /\b(дедлайн|срок|deadline|до|к|before|by)\s+/i
  );
  if (deadlinePrefixMatch) {
    isDeadlineIntent = true;
    text = text.replace(deadlinePrefixMatch[0], ' ').trim();
  }

  // 7. Detect Dates (relative and absolute)
  let targetDate: Date | null = null;

  // 7a. "сегодня" / "today"
  if (/\b(сегодня|today)\b/i.test(text)) {
    targetDate = new Date(referenceDate);
    text = text.replace(/\b(сегодня|today)\b/i, '').trim();
  }
  // 7b. "послезавтра" / "day after tomorrow"
  else if (/\b(послезавтра|day after tomorrow)\b/i.test(text)) {
    targetDate = addDays(referenceDate, 2);
    text = text.replace(/\b(послезавтра|day after tomorrow)\b/i, '').trim();
  }
  // 7c. "завтра" / "tomorrow"
  else if (/\b(завтра|tomorrow)\b/i.test(text)) {
    targetDate = addDays(referenceDate, 1);
    text = text.replace(/\b(завтра|tomorrow)\b/i, '').trim();
  }
  // 7d. "через X дней / часов"
  else {
    const relativeOffsetMatch = text.match(
      /\b(?:через|in)\s+(\d+)\s+(дн(?:ей|я)|день|дней|часа?|часов|ч|мин(?:уты?|ут)?|days?|hours?|hrs?|mins?)\b/i
    );
    if (relativeOffsetMatch) {
      const amount = parseInt(relativeOffsetMatch[1], 10);
      const unit = relativeOffsetMatch[2].toLowerCase();
      if (unit.startsWith('д') || unit.startsWith('day')) {
        targetDate = addDays(referenceDate, amount);
      } else if (unit.startsWith('ч') || unit.startsWith('h')) {
        targetDate = addHours(referenceDate, amount);
      } else {
        targetDate = addMinutes(referenceDate, amount);
      }
      text = text.replace(relativeOffsetMatch[0], '').trim();
    }
  }

  // 7e. Days of the week (e.g. "в пятницу", "пятница", "к пятнице", "friday")
  if (!targetDate) {
    for (const [name, dayNum] of Object.entries(DAY_OF_WEEK_RU)) {
      const reg = new RegExp(`\\b(?:в|к|до)?\\s*${name}\\b`, 'i');
      if (reg.test(text)) {
        targetDate = nextDay(referenceDate, dayNum);
        text = text.replace(reg, '').trim();
        break;
      }
    }
  }
  if (!targetDate) {
    for (const [name, dayNum] of Object.entries(DAY_OF_WEEK_EN)) {
      const reg = new RegExp(`\\b(?:on|by|before)?\\s*${name}\\b`, 'i');
      if (reg.test(text)) {
        targetDate = nextDay(referenceDate, dayNum);
        text = text.replace(reg, '').trim();
        break;
      }
    }
  }

  // 7f. Absolute dates: "15 ноября", "25 декабря", "15.11", "15/11", "nov 15"
  if (!targetDate) {
    const ruDateMatch = text.match(
      /\b(\d{1,2})\s+(января|янв|февраля|фев|марта|мар|апреля|апр|мая|май|июня|июн|июля|июл|августа|авг|сентября|сен|сент|октября|окт|ноября|ноя|нояб|декабря|дек)(?:\s+(\d{4}))?\b/i
    );
    if (ruDateMatch) {
      const day = parseInt(ruDateMatch[1], 10);
      const monthStr = ruDateMatch[2].toLowerCase();
      const month = RUSSIAN_MONTHS[monthStr];
      const year = ruDateMatch[3] ? parseInt(ruDateMatch[3], 10) : referenceDate.getFullYear();
      let d = new Date(year, month, day);
      if (isBefore(d, startOfDay(referenceDate)) && !ruDateMatch[3]) {
        d = new Date(year + 1, month, day);
      }
      targetDate = d;
      text = text.replace(ruDateMatch[0], '').trim();
    }
  }

  if (!targetDate) {
    const numDateMatch = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
    if (numDateMatch) {
      const day = parseInt(numDateMatch[1], 10);
      const month = parseInt(numDateMatch[2], 10) - 1;
      const year = numDateMatch[3]
        ? numDateMatch[3].length === 2
          ? 2000 + parseInt(numDateMatch[3], 10)
          : parseInt(numDateMatch[3], 10)
        : referenceDate.getFullYear();
      let d = new Date(year, month, day);
      if (isValid(d)) {
        if (isBefore(d, startOfDay(referenceDate)) && !numDateMatch[3]) {
          d = new Date(year + 1, month, day);
        }
        targetDate = d;
        text = text.replace(numDateMatch[0], '').trim();
      }
    }
  }

  // Apply hour and minute if found
  if (targetDate) {
    if (parsedHour !== null) {
      targetDate = setHours(targetDate, parsedHour);
      targetDate = setMinutes(targetDate, parsedMinute ?? 0);
    } else if (timeOfDayTarget) {
      if (timeOfDayTarget === 'morning') {
        targetDate = setHours(setMinutes(targetDate, 0), 10);
      } else if (timeOfDayTarget === 'lunch') {
        targetDate = setHours(setMinutes(targetDate, 0), 13);
      } else if (timeOfDayTarget === 'evening') {
        targetDate = setHours(setMinutes(targetDate, 0), 18);
      } else if (timeOfDayTarget === 'after_work') {
        const [wHour, wMin] = workingHoursEnd.split(':').map(Number);
        targetDate = setHours(setMinutes(targetDate, wMin || 0), wHour || 19);
      }
    } else if (isDeadlineIntent) {
      // Default deadline time = 18:00 or end of workday
      const [wHour, wMin] = workingHoursEnd.split(':').map(Number);
      targetDate = setHours(setMinutes(targetDate, wMin || 0), wHour || 18);
    } else {
      // Default start hour if not specified but date is set
      targetDate = setHours(setMinutes(targetDate, 0), 11);
    }

    if (isDeadlineIntent) {
      deadline = targetDate;
    } else if (isExplicitTime || timeOfDayTarget) {
      scheduledStart = targetDate;
    } else {
      // General date could be deadline or scheduled start
      deadline = targetDate;
    }
  } else if (parsedHour !== null) {
    // No explicit date, but time given -> today or tomorrow if passed
    let d = setMinutes(setHours(new Date(referenceDate), parsedHour), parsedMinute ?? 0);
    if (isBefore(d, referenceDate)) {
      d = addDays(d, 1);
    }
    scheduledStart = d;
  }

  // 8. Category Categorization based on keywords
  const titleLower = input.toLowerCase();
  if (
    /(лабораторн|экзамен|дз|учёб|учеб|лекци|презентаци|английск|курс|физик|математик|урок|реферат|зачет|сессия|study|exam|homework|thesis)/i.test(
      titleLower
    )
  ) {
    categoryId = 'study';
  } else if (
    /(клиент|митинг|созвон|отчёт|отчет|доклад|баг|код|деплой|встреча|шеф|коллег|jira|work|client|meeting|call|standup)/i.test(
      titleLower
    )
  ) {
    categoryId = 'work';
  } else if (
    /(тренировк|спорт|зал|бег|пробежк|йог|бассейн|фитнес|растяжк|воркаут|workout|gym|run|fitness)/i.test(
      titleLower
    )
  ) {
    categoryId = 'sport';
  } else if (
    /(стартап|дизайн|релиз|прототип|пет-проект|архитектур|mvp|startup|project)/i.test(
      titleLower
    )
  ) {
    categoryId = 'projects';
  } else if (
    /(купить|магазин|продукт|врач|аптек|уборк|постирать|ужин|обед|заказ|дом|семь|личн|позвонить маме|buy|groceries|doctor|pharmacy)/i.test(
      titleLower
    )
  ) {
    categoryId = 'personal';
  } else {
    categoryId = 'work'; // default fallback
  }

  // 9. Clean up residual punctuation and spaces from title
  const EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2934}-\u{2935}\u{25A0}-\u{25FF}\u{3297}\u{3299}]/gu;
  let cleanedTitle = text
    .replace(EMOJI_REGEX, '')
    .replace(/^[,.\s-]+/, '')
    .replace(/[,.\s-]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If title was stripped too much, fallback to original cleaned input
  if (!cleanedTitle || cleanedTitle.length < 2) {
    cleanedTitle = input.replace(EMOJI_REGEX, '').trim();
  }

  // Capitalize first letter
  if (cleanedTitle) {
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  } else {
    cleanedTitle = 'Новая задача';
  }

  return {
    title: cleanedTitle,
    deadline,
    scheduledStart,
    duration,
    priority,
    categoryId,
    remindMe,
  };
}

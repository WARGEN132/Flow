import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Task, UserSettings, FreeTimeSlot } from '../../types';

export interface SchedulingResult {
  success: boolean;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  message?: string;
}

/**
 * Calculates occupied time intervals for a given date
 */
export function getOccupiedSlotsForDay(
  tasks: Task[],
  targetDate: Date,
  bufferMinutes = 10,
  excludeTaskId?: string
): Array<{ start: Date; end: Date; task: Task }> {
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const dayTasks = tasks.filter((t) => {
    if (t.id === excludeTaskId || t.status === 'completed') return false;
    if (!t.scheduledStart || !t.scheduledEnd) return false;

    const start = new Date(t.scheduledStart);
    const end = new Date(t.scheduledEnd);
    return (
      (isAfter(start, dayStart) || isSameDay(start, targetDate)) &&
      (isBefore(start, dayEnd) || isBefore(end, dayEnd))
    );
  });

  dayTasks.sort(
    (a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()
  );

  return dayTasks.map((t) => ({
    start: new Date(t.scheduledStart!),
    end: addMinutes(new Date(t.scheduledEnd!), bufferMinutes),
    task: t,
  }));
}

/**
 * Finds all free time slots on a given day within working hours
 */
export function findFreeSlotsForDay(
  tasks: Task[],
  targetDate: Date,
  settings: UserSettings,
  minDurationMinutes = 15,
  excludeTaskId?: string
): FreeTimeSlot[] {
  const [startHour, startMin] = settings.workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.workingHoursEnd.split(':').map(Number);

  let workStart = setMinutes(setHours(startOfDay(targetDate), startHour), startMin);
  const workEnd = setMinutes(setHours(startOfDay(targetDate), endHour), endMin);

  const now = new Date();
  if (isSameDay(targetDate, now) && isAfter(now, workStart)) {
    const remainder = now.getMinutes() % 5;
    workStart = addMinutes(now, remainder === 0 ? 5 : 5 - remainder);
  }

  if (isAfter(workStart, workEnd)) return [];

  const occupied = getOccupiedSlotsForDay(
    tasks,
    targetDate,
    settings.breakBetweenTasks,
    excludeTaskId
  );
  const freeSlots: FreeTimeSlot[] = [];
  let currentPointer = workStart;

  for (const occ of occupied) {
    if (isBefore(currentPointer, occ.start)) {
      const gapMinutes = differenceInMinutes(occ.start, currentPointer);
      if (gapMinutes >= minDurationMinutes) {
        freeSlots.push({
          start: new Date(currentPointer),
          end: new Date(occ.start),
          durationMinutes: gapMinutes,
        });
      }
    }
    if (isAfter(occ.end, currentPointer)) {
      currentPointer = occ.end;
    }
  }

  if (isBefore(currentPointer, workEnd)) {
    const remainingMinutes = differenceInMinutes(workEnd, currentPointer);
    if (remainingMinutes >= minDurationMinutes) {
      freeSlots.push({
        start: new Date(currentPointer),
        end: new Date(workEnd),
        durationMinutes: remainingMinutes,
      });
    }
  }

  return freeSlots;
}

/**
 * Finds the earliest optimal slot that fits duration before deadline
 */
export function scheduleTaskSmartly(
  task: Task,
  existingTasks: Task[],
  settings: UserSettings,
  searchDays = 14
): SchedulingResult {
  const duration = task.duration || settings.defaultTaskDuration;
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const now = new Date();
  const preferMorning =
    settings.focusMorning && (task.priority === 'urgent' || task.priority === 'high');

  let bestSlot: { start: Date; end: Date } | null = null;

  for (let i = 0; i < searchDays; i++) {
    const targetDate = addDays(now, i);
    const dayOfWeek = targetDate.getDay();

    const isWorkDay = settings.workDays.includes(dayOfWeek);
    if (!isWorkDay && deadlineDate && differenceInMinutes(deadlineDate, targetDate) > 2880) {
      continue;
    }

    const freeSlots = findFreeSlotsForDay(existingTasks, targetDate, settings, duration, task.id);

    if (preferMorning) {
      const morningSlot = freeSlots.find((slot) => {
        const slotEnd = addMinutes(slot.start, duration);
        const limit13 = setMinutes(setHours(startOfDay(targetDate), 13), 0);
        return isBefore(slotEnd, limit13) || slot.start.getHours() < 12;
      });

      if (morningSlot) {
        const slotEnd = addMinutes(morningSlot.start, duration);
        if (!deadlineDate || isBefore(slotEnd, deadlineDate)) {
          bestSlot = { start: morningSlot.start, end: slotEnd };
          break;
        }
      }
    }

    const matchingSlot = freeSlots.find((slot) => slot.durationMinutes >= duration);
    if (matchingSlot) {
      const slotEnd = addMinutes(matchingSlot.start, duration);
      if (!deadlineDate || isBefore(slotEnd, deadlineDate)) {
        bestSlot = { start: matchingSlot.start, end: slotEnd };
        break;
      }
    }

    if (deadlineDate && isAfter(targetDate, deadlineDate)) {
      break;
    }
  }

  if (bestSlot) {
    return {
      success: true,
      scheduledStart: bestSlot.start,
      scheduledEnd: bestSlot.end,
      message: `Свободное окно ${format(bestSlot.start, 'dd.MM')} в ${format(bestSlot.start, 'HH:mm')} - ${format(bestSlot.end, 'HH:mm')}`,
    };
  }

  return {
    success: false,
    message: deadlineDate
      ? 'В рабочем расписании нет свободных окон до дедлайна.'
      : 'Все рабочие часы в ближайшие дни заполнены.',
  };
}

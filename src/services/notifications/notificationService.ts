import { differenceInMinutes, isBefore, isPast } from 'date-fns';
import { Task } from '../../types';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Plays a gentle, modern harmonic chime for notifications
   */
  playNotificationSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // D5 (587.33 Hz) and A5 (880.00 Hz)
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

      osc2.frequency.setValueAtTime(880.0, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {
      // Audio might be blocked by browser autoplay policy
    }
  }

  /**
   * Plays a crisp, satisfying success chord when completing a task
   */
  playCompletionSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundSynthesizer();

export class NotificationService {
  private static notifiedEvents = new Set<string>();

  static getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  static async notify(title: string, options?: NotificationOptions, playSound = true) {
    if (playSound) {
      soundManager.playNotificationSound();
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const iconUrl = `${import.meta.env.BASE_URL}icon.svg`;
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              icon: iconUrl,
              badge: iconUrl,
              ...options,
            });
            return;
          }
        }
        new Notification(title, {
          icon: iconUrl,
          ...options,
        });
      } catch {
        // Fallback standard notification
        try {
          new Notification(title, options);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Checks upcoming tasks and deadlines against reminders
   */
  static checkUpcomingReminders(
    tasks: Task[],
    soundEnabled: boolean,
    onToast: (message: string, type: 'info' | 'warning' | 'success') => void
  ) {
    const now = new Date();

    for (const task of tasks) {
      if (task.status === 'completed') continue;

      // Check scheduled start
      if (task.scheduledStart) {
        const start = new Date(task.scheduledStart);
        const minsToStart = differenceInMinutes(start, now);

        // Within 15 minutes
        const key15 = `${task.id}-start-15m`;
        if (minsToStart <= 15 && minsToStart > 5 && !this.notifiedEvents.has(key15)) {
          this.notifiedEvents.add(key15);
          const msg = `Через ${minsToStart} мин начнётся задача «${task.title}»`;
          this.notify('Напоминание о задаче', { body: msg }, soundEnabled);
          onToast(msg, 'info');
        }

        // Within 5 minutes or right now
        const keyNow = `${task.id}-start-now`;
        if (minsToStart <= 2 && minsToStart >= -2 && !this.notifiedEvents.has(keyNow)) {
          this.notifiedEvents.add(keyNow);
          const msg = `Пора приступать к задаче «${task.title}»`;
          this.notify('Время начинать!', { body: msg }, soundEnabled);
          onToast(msg, 'warning');
        }
      }

      // Check deadline
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const minsToDeadline = differenceInMinutes(deadline, now);

        const keyDeadline1h = `${task.id}-deadline-1h`;
        if (minsToDeadline <= 60 && minsToDeadline > 0 && !this.notifiedEvents.has(keyDeadline1h)) {
          this.notifiedEvents.add(keyDeadline1h);
          const msg = `Дедлайн через ${minsToDeadline} мин у задачи «${task.title}»`;
          this.notify('Приближение дедлайна', { body: msg }, soundEnabled);
          onToast(msg, 'warning');
        }

        // Overdue detection
        const keyOverdue = `${task.id}-overdue`;
        if (isPast(deadline) && !this.notifiedEvents.has(keyOverdue)) {
          this.notifiedEvents.add(keyOverdue);
          const msg = `Задача просрочена - «${task.title}»`;
          this.notify('Дедлайн истёк', { body: msg }, soundEnabled);
          onToast(msg, 'warning');
        }
      }
    }
  }
}

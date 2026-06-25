// ========== Event dialog component (create / edit, Phase E: motion entrance) ==========

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X, Trash, Check } from '@phosphor-icons/react';
import type { CalendarEvent, CreateEventInput, UpdateEventInput, EventType } from '../../types';
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../../constants/eventTypeColors';
import { formatDateStr, formatTimeStr } from '../../utils/dateUtils';
import EventIcon from './EventIcon';
import './EventDialog.css';

interface EventDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  preselectedDate?: Date;
  preselectedEnd?: Date;
  editingEvent?: CalendarEvent;
  onSave: (input: CreateEventInput) => void;
  onUpdate: (id: string, input: UpdateEventInput) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const TEXT = {
  create: '\u521b\u5efa\u4e8b\u4ef6',
  edit: '\u7f16\u8f91\u4e8b\u4ef6',
  newEvent: '\u65b0\u5efa\u4e8b\u4ef6',
  close: '\u5173\u95ed',
  title: '\u6807\u9898',
  titlePlaceholder: '\u4e8b\u4ef6\u6807\u9898',
  timeRange: '\u65f6\u95f4\u8303\u56f4',
  start: '\u5f00\u59cb',
  end: '\u7ed3\u675f',
  allDay: '\u5168\u5929',
  typeAndColor: '\u7c7b\u578b\u4e0e\u989c\u8272',
  chooseTypePrefix: '\u9009\u62e9',
  chooseTypeSuffix: '\u7c7b\u578b',
  chooseColor: '\u9009\u62e9\u989c\u8272',
  customColor: '\u81ea\u5b9a\u4e49\u989c\u8272',
  description: '\u5907\u6ce8\uff08\u53ef\u9009\uff09',
  descriptionPlaceholder: '\u6dfb\u52a0\u8bae\u7a0b\u3001\u94fe\u63a5\u3001\u5907\u6ce8...',
  delete: '\u5220\u9664',
  cancel: '\u53d6\u6d88',
  save: '\u4fdd\u5b58',
  saving: '\u4fdd\u5b58\u4e2d...',
  titleRequired: '\u8bf7\u8f93\u5165\u4e8b\u4ef6\u6807\u9898',
  invalidTime: '\u65f6\u95f4\u683c\u5f0f\u4e0d\u6b63\u786e',
  endAfterStart: '\u7ed3\u675f\u65f6\u95f4\u5fc5\u987b\u665a\u4e8e\u5f00\u59cb\u65f6\u95f4',
  saveFailed: '\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5',
} as const;

const PRESET_COLORS = [
  '#4f6bed', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const EVENT_TYPES: EventType[] = ['interview', 'meeting', 'reminder', 'deadline', 'default'];

/**
 * Modal dialog for creating or editing calendar events.
 * Supports title, date/time range, event type, color, and description.
 */
const EventDialog: React.FC<EventDialogProps> = ({
  isOpen,
  mode,
  preselectedDate,
  preselectedEnd,
  editingEvent,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
}) => {
  const shouldReduce = useReducedMotion();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState<EventType>('default');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && editingEvent) {
      const start = new Date(editingEvent.start_time);
      const end = new Date(editingEvent.end_time);
      setTitle(editingEvent.title);
      setStartDate(formatDateStr(start));
      setStartTime(formatTimeStr(start));
      setEndDate(formatDateStr(end));
      setEndTime(formatTimeStr(end));
      setEventType(editingEvent.event_type);
      setColor(editingEvent.color);
      setDescription(editingEvent.description || '');
    } else {
      const { start, end } = getDefaultRange(preselectedDate, preselectedEnd);
      setTitle('');
      setStartDate(formatDateStr(start));
      setStartTime(formatTimeStr(start));
      setEndDate(formatDateStr(end));
      setEndTime(formatTimeStr(end));
      setEventType('default');
      setColor(EVENT_TYPE_COLORS.default);
      setDescription('');
    }

    setError('');
    setSaving(false);
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [isOpen, mode, editingEvent, preselectedDate, preselectedEnd]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(TEXT.titleRequired);
      return;
    }

    const startTimeMs = parseDateTime(startDate, startTime);
    const endTimeMs = parseDateTime(endDate, endTime);

    if (Number.isNaN(startTimeMs) || Number.isNaN(endTimeMs)) {
      setError(TEXT.invalidTime);
      return;
    }

    if (endTimeMs <= startTimeMs) {
      setError(TEXT.endAfterStart);
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (mode === 'create') {
        onSave({
          title: title.trim(),
          start_time: startTimeMs,
          end_time: endTimeMs,
          event_type: eventType,
          color,
          description: description.trim() || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return;
      }

      if (editingEvent) {
        onUpdate(editingEvent.id, {
          title: title.trim(),
          start_time: startTimeMs,
          end_time: endTimeMs,
          event_type: eventType,
          color,
          description: description.trim() || undefined,
        });
      }
    } catch {
      setSaving(false);
      setError(TEXT.saveFailed);
    }
  }, [title, startDate, startTime, endDate, endTime, eventType, color, description, mode, editingEvent, onSave, onUpdate]);

  const handleDeleteClick = useCallback(() => {
    if (editingEvent) onDelete(editingEvent.id);
  }, [editingEvent, onDelete]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();

    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).querySelector('form')?.requestSubmit();
    }
  }, [onCancel]);

  const applyDuration = useCallback((durationMin: number) => {
    const startMs = parseDateTime(startDate, startTime);
    if (Number.isNaN(startMs)) return;

    const endMs = durationMin < 0
      ? startMs + 24 * 60 * 60 * 1000
      : startMs + durationMin * 60 * 1000;
    const end = new Date(endMs);
    setEndDate(formatDateStr(end));
    setEndTime(formatTimeStr(end));
  }, [startDate, startTime]);

  if (!isOpen) return null;

  return (
    <div className="event-dialog-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <motion.div
        className="event-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? TEXT.create : TEXT.edit}
        initial={shouldReduce ? { opacity: 1 } : { scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="event-dialog-header">
          <h3>{mode === 'create' ? TEXT.newEvent : TEXT.edit}</h3>
          <button className="event-dialog-close" onClick={onCancel} title={TEXT.close} aria-label={TEXT.close}>
            <X size={16} weight="regular" />
          </button>
        </div>

        <form className="event-dialog-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{TEXT.title}</label>
            <input ref={titleRef} className="form-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={TEXT.titlePlaceholder} maxLength={100} />
          </div>

          <div className="form-group">
            <label className="form-label">{TEXT.timeRange}</label>
            <div className="form-datetime-row">
              <DateTimeInput label={TEXT.start} date={startDate} time={startTime} onDateChange={setStartDate} onTimeChange={setStartTime} />
              <DateTimeInput label={TEXT.end} date={endDate} time={endTime} onDateChange={setEndDate} onTimeChange={setEndTime} />
            </div>
            <div className="form-duration-pills">
              {([
                { label: '30min', duration: 30 },
                { label: '1h', duration: 60 },
                { label: '2h', duration: 120 },
                { label: TEXT.allDay, duration: -1 },
              ] as const).map(preset => (
                <button key={preset.label} type="button" className="form-duration-pill" onClick={() => applyDuration(preset.duration)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{TEXT.typeAndColor}</label>
            <div className="form-type-selector">
              {EVENT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  className={`form-type-btn ${eventType === type ? 'active' : ''}`}
                  style={{
                    borderColor: eventType === type ? EVENT_TYPE_COLORS[type] : 'transparent',
                    backgroundColor: eventType === type ? `${EVENT_TYPE_COLORS[type]}20` : 'transparent',
                  }}
                  onClick={() => { setEventType(type); setColor(EVENT_TYPE_COLORS[type]); }}
                  aria-label={`${TEXT.chooseTypePrefix}${EVENT_TYPE_LABELS[type]}${TEXT.chooseTypeSuffix}`}
                  title={`${TEXT.chooseTypePrefix}${EVENT_TYPE_LABELS[type]}${TEXT.chooseTypeSuffix}`}
                >
                  <EventIcon type={type} size={12} />
                  <span className="form-type-dot" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="form-color-picker">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" className={`form-color-swatch ${color === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} title={`${TEXT.chooseColor} ${c}`} aria-label={`${TEXT.chooseColor} ${c}`} />
              ))}
              <input type="color" className="form-color-input" value={color} onChange={e => setColor(e.target.value)} title={TEXT.customColor} aria-label={TEXT.customColor} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{TEXT.description}</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder={TEXT.descriptionPlaceholder} rows={3} maxLength={500} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {mode === 'edit' && (
              <button type="button" className="form-btn form-btn-delete" onClick={handleDeleteClick} disabled={saving}>
                <Trash size={14} weight="regular" /> {TEXT.delete}
              </button>
            )}
            <div className="form-actions-right">
              <button type="button" className="form-btn form-btn-cancel" onClick={onCancel} disabled={saving}>{TEXT.cancel}</button>
              <button type="submit" className="form-btn form-btn-save" disabled={saving}>
                <Check size={14} weight="bold" /> {saving ? TEXT.saving : TEXT.save}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface DateTimeInputProps {
  label: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({ label, date, time, onDateChange, onTimeChange }) => (
  <div className="form-datetime-item">
    <label className="form-datetime-label">{label}</label>
    <div className="form-datetime-group">
      <input className="form-input form-date" type="date" value={date} onChange={e => onDateChange(e.target.value)} />
      <input className="form-input form-time" type="time" value={time} onChange={e => onTimeChange(e.target.value)} step="300" />
    </div>
  </div>
);

function getDefaultRange(preselectedDate?: Date, preselectedEnd?: Date): { start: Date; end: Date } {
  if (preselectedDate && preselectedEnd) {
    return { start: new Date(preselectedDate), end: new Date(preselectedEnd) };
  }

  const start = preselectedDate ? new Date(preselectedDate) : new Date();
  if (!preselectedDate) {
    start.setHours(start.getHours() + 1, 0, 0, 0);
  } else {
    start.setHours(start.getHours() + 1, 0, 0, 0);
  }

  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return { start, end };
}

function parseDateTime(dateStr: string, timeStr: string): number {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return d.getTime();
}

export default EventDialog;

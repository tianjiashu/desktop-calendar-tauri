// ========== Event dialog component (create / edit) ==========

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trash, Check } from '@phosphor-icons/react';
import type { CalendarEvent, CreateEventInput, UpdateEventInput, EventType } from '../../types';
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../../constants/eventTypeColors';
import { formatDateStr, formatTimeStr } from '../../utils/dateUtils';
import EventIcon from './EventIcon';
import './EventDialog.css';

interface EventDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  /** Pre-selected start date (create mode only) */
  preselectedDate?: Date;
  /** Pre-selected end date (create mode only, e.g. from hour-slot double-click) */
  preselectedEnd?: Date;
  /** Event to edit (edit mode only) */
  editingEvent?: CalendarEvent;
  onSave: (input: CreateEventInput) => void;
  onUpdate: (id: string, input: UpdateEventInput) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

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
  // Form state
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

  // Initialize form on open
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
      // Create mode
      let start: Date;
      let end: Date;

      if (preselectedDate && preselectedEnd) {
        // Double-click hour slot: use exact start/end from hover highlight
        start = new Date(preselectedDate);
        end = new Date(preselectedEnd);
      } else if (preselectedDate) {
        // Single click: use preselected date + next hour, 1h duration
        start = new Date(preselectedDate);
        start.setHours(start.getHours() + 1, 0, 0, 0);
        end = new Date(start);
        end.setHours(start.getHours() + 1);
      } else {
        // No preselected: default to today + next hour, 1h duration
        const now = new Date();
        start = new Date(now);
        start.setHours(now.getHours() + 1, 0, 0, 0);
        end = new Date(start);
        end.setHours(start.getHours() + 1);
      }

      setTitle('');
      setStartDate(formatDateStr(start));
      setStartTime(formatTimeStr(start));
      setEndDate(formatDateStr(end));
      setEndTime(formatTimeStr(end));
      setEventType('default');
      setColor(PRESET_COLORS[0]);
      setDescription('');
    }

    setError('');
    setSaving(false);

    // Focus title input after animation frame
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [isOpen, mode, editingEvent, preselectedDate, preselectedEnd]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('请输入事件标题');
      return;
    }

    const startTimeMs = parseDateTime(startDate, startTime);
    const endTimeMs = parseDateTime(endDate, endTime);

    if (isNaN(startTimeMs) || isNaN(endTimeMs)) {
      setError('时间格式不正确');
      return;
    }

    if (endTimeMs <= startTimeMs) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (mode === 'create') {
        const input: CreateEventInput = {
          title: title.trim(),
          start_time: startTimeMs,
          end_time: endTimeMs,
          event_type: eventType,
          color,
          description: description.trim() || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        onSave(input);
      } else if (editingEvent) {
        const input: UpdateEventInput = {
          title: title.trim(),
          start_time: startTimeMs,
          end_time: endTimeMs,
          event_type: eventType,
          color,
          description: description.trim() || undefined,
        };
        onUpdate(editingEvent.id, input);
      }
    } catch {
      setSaving(false);
    }
  }, [title, startDate, startTime, endDate, endTime, eventType, color, description, mode, editingEvent, onSave, onUpdate]);

  const handleDeleteClick = useCallback(() => {
    if (editingEvent) {
      onDelete(editingEvent.id);
    }
  }, [editingEvent, onDelete]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      // Trigger form submit
      (e.currentTarget as HTMLElement).querySelector('form')?.requestSubmit();
    }
  }, [onCancel]);

  /** Apply a quick duration preset to the end time */
  const applyDuration = useCallback((durationMin: number) => {
    const startMs = parseDateTime(startDate, startTime);
    if (isNaN(startMs)) return;

    let endMs: number;
    if (durationMin < 0) {
      // All-day: end = start + 24h
      endMs = startMs + 24 * 60 * 60 * 1000;
    } else {
      endMs = startMs + durationMin * 60 * 1000;
    }
    const end = new Date(endMs);
    setEndDate(formatDateStr(end));
    setEndTime(formatTimeStr(end));
  }, [startDate, startTime]);

  if (!isOpen) return null;

  return (
    <div className="event-dialog-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className="event-dialog" role="dialog" aria-label={mode === 'create' ? '创建事件' : '编辑事件'}>
        <div className="event-dialog-header">
          <h3>{mode === 'create' ? '新建事件' : '编辑事件'}</h3>
          <button className="event-dialog-close" onClick={onCancel} title="关闭" aria-label="关闭">
            <X size={16} weight="regular" />
          </button>
        </div>

        <form className="event-dialog-body" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              ref={titleRef}
              className="form-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="事件标题"
              maxLength={100}
            />
          </div>

          {/* Date/Time range */}
          <div className="form-group">
            <label className="form-label">时间范围</label>
            <div className="form-datetime-row">
              {/* Start */}
              <div className="form-datetime-item">
                <label className="form-datetime-label">开始</label>
                <div className="form-datetime-group">
                  <input
                    className="form-input form-date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <input
                    className="form-input form-time"
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    step="300"
                  />
                </div>
              </div>
              {/* End */}
              <div className="form-datetime-item">
                <label className="form-datetime-label">结束</label>
                <div className="form-datetime-group">
                  <input
                    className="form-input form-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                  <input
                    className="form-input form-time"
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    step="300"
                  />
                </div>
              </div>
            </div>
            {/* Quick duration pills */}
            <div className="form-duration-pills">
              {([
                { label: '30min', duration: 30 },
                { label: '1h', duration: 60 },
                { label: '2h', duration: 120 },
                { label: '全天', duration: -1 },
              ] as const).map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className="form-duration-pill"
                  onClick={() => applyDuration(preset.duration)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event type + color (merged) */}
          <div className="form-group">
            <label className="form-label">类型与颜色</label>
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
                >
                  <EventIcon type={type} size={12} />
                  <span
                    className="form-type-dot"
                    style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
                  />
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="form-label">颜色</label>
            <div className="form-color-picker">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`form-color-swatch ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                className="form-color-input"
                value={color}
                onChange={e => setColor(e.target.value)}
                title="自定义颜色"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">备注（可选）</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="添加议程、链接、备注..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Error message */}
          {error && <div className="form-error">{error}</div>}

          {/* Actions */}
          <div className="form-actions">
            {mode === 'edit' && (
              <button
                type="button"
                className="form-btn form-btn-delete"
                onClick={handleDeleteClick}
                disabled={saving}
              >
                <Trash size={14} weight="regular" /> 删除
              </button>
            )}
            <div className="form-actions-right">
              <button
                type="button"
                className="form-btn form-btn-cancel"
                onClick={onCancel}
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                className="form-btn form-btn-save"
                disabled={saving}
              >
                <Check size={14} weight="bold" /> {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- Helpers ----

function parseDateTime(dateStr: string, timeStr: string): number {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return d.getTime();
}

export default EventDialog;

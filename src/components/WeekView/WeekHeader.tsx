// ========== Week header component (F3, F4, F6, F22-F25) ==========

import React, { useCallback } from 'react';
import { CaretLeft, CaretRight, DotOutline, ArrowClockwise, Plus, Minus, X } from '@phosphor-icons/react';

interface WeekHeaderProps {
  weekTitle: string;
  isCurrentWeek: boolean;
  isRefreshing: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onRefresh: () => void;
  onShrink: () => void;
  onClose: () => void;
  onAddEvent: () => void;
}

/**
 * Week view header: navigation buttons, title, shrink/close buttons.
 * Supports window dragging (F6).
 * Layout: [nav group] | divider | [action group]
 */
const WeekHeader: React.FC<WeekHeaderProps> = ({
  weekTitle,
  isCurrentWeek,
  isRefreshing,
  onPrevWeek,
  onNextWeek,
  onToday,
  onRefresh,
  onShrink,
  onClose,
  onAddEvent,
}) => {
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag on header area, not buttons
    if ((e.target as HTMLElement).closest('button')) return;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().startDragging();
    }).catch(() => {});
  }, []);

  return (
    <div className="week-header" onMouseDown={handleHeaderMouseDown}>
      {/* Navigation group */}
      <div className="week-header-nav">
        <div className="week-header-week-switcher">
          <button className="week-header-btn" onClick={onPrevWeek} title="上一周" aria-label="上一周">
            <CaretLeft size={16} weight="regular" />
          </button>
          <span className="week-header-title">{weekTitle}</span>
          <button className="week-header-btn" onClick={onNextWeek} title="下一周" aria-label="下一周">
            <CaretRight size={16} weight="regular" />
          </button>
        </div>
        {!isCurrentWeek && (
          <button
            className="week-header-btn week-header-btn-today"
            onClick={onToday}
            title="回到本周"
            aria-label="回到本周"
          >
            <DotOutline size={14} weight="fill" />
            <span>今日</span>
          </button>
        )}
      </div>

      {/* Divider between nav and action groups */}
      <div className="week-header-divider" />

      {/* Action group (right side) */}
      <div className="week-header-actions">
        <button
          className={`week-header-btn ${isRefreshing ? 'animate-spin-refresh' : ''}`}
          onClick={onRefresh}
          title="刷新"
          aria-label="刷新"
        >
          <ArrowClockwise size={16} weight="regular" />
        </button>
        <button className="week-header-btn week-header-btn-add" onClick={onAddEvent} title="新建事件" aria-label="新建事件">
          <Plus size={18} weight="bold" />
        </button>
        <button className="week-header-btn" onClick={onShrink} title="收缩" aria-label="收缩为浮球">
          <Minus size={16} weight="regular" />
        </button>
        <button className="week-header-btn" onClick={onClose} title="关闭" aria-label="关闭">
          <X size={16} weight="regular" />
        </button>
      </div>
    </div>
  );
};

export default WeekHeader;

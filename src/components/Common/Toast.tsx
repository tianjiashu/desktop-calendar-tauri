// ========== Toast notification (Phase F: icons + progress bar + hover pause) ==========

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Info, Warning, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type ToastType = 'info' | 'warn' | 'success' | 'error';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let toastId = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

/** Show a toast that auto-dismisses after 2.5s */
export function showToast(text: string, type: ToastType = 'warn'): void {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach(fn => fn(msg));
}

const TYPE_CONFIG: Record<ToastType, {
  icon: Icon;
  barColor: string;
  iconColor: string;
}> = {
  info:    { icon: Info,          barColor: 'var(--accent-500)',      iconColor: 'var(--accent-500)' },
  warn:    { icon: Warning,       barColor: 'var(--event-reminder)',  iconColor: 'var(--event-reminder)' },
  success: { icon: CheckCircle,   barColor: 'var(--event-meeting)',   iconColor: 'var(--event-meeting)' },
  error:   { icon: XCircle,       barColor: 'var(--event-deadline)',  iconColor: 'var(--event-deadline)' },
};

// ===== Toast progress bar with hover-pause =====

interface ToastProgressProps {
  duration: number;
  onDone: () => void;
}

const ToastProgress: React.FC<ToastProgressProps> = ({ duration, onDone }) => {
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const remainingRef = useRef(duration);
  const frameRef = useRef(0);

  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const tick = () => {
      if (paused) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / remainingRef.current) * 100);
      setProgress(pct);
      if (pct <= 0) {
        onDone();
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [paused, onDone]);

  const handlePause = useCallback(() => {
    setPaused(true);
    remainingRef.current -= (Date.now() - startRef.current);
  }, []);

  const handleResume = useCallback(() => {
    startRef.current = Date.now();
    setPaused(false);
  }, []);

  return (
    <div
      className="toast-progress-track"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <div
        className="toast-progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// ===== Single toast item =====

interface ToastItemProps {
  msg: ToastMessage;
}

const ToastItem: React.FC<ToastItemProps> = React.memo(({ msg }) => {
  const shouldReduce = useReducedMotion();
  const config = TYPE_CONFIG[msg.type];
  const Icon = config.icon;

  return (
    <motion.div
      className={`toast toast--${msg.type}`}
      role={msg.type === 'error' ? 'alert' : 'status'}
      aria-live={msg.type === 'error' ? 'assertive' : 'polite'}
      initial={shouldReduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={shouldReduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
      transition={{ duration: shouldReduce ? 0 : 0.2 }}
      style={{ borderLeft: `3px solid ${config.barColor}` }}
    >
      <div className="toast-body">
        <Icon size={14} weight="fill" style={{ color: config.iconColor, flexShrink: 0 }} />
        <span className={`toast-message toast--${msg.type}`}>{msg.text}</span>
      </div>
    </motion.div>
  );
});

ToastItem.displayName = 'ToastItem';

// ===== Toast container =====

const ToastContainer: React.FC = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const removeMessage = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container">
      {messages.map(msg => (
        <div key={msg.id} className="toast-wrapper">
          <ToastItem msg={msg} />
          <ToastProgress
            duration={2500}
            onDone={() => removeMessage(msg.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

// ========== Lightweight toast notification ==========

import React, { useEffect, useState, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'warn';
}

let toastId = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

/** Show a toast that auto-dismisses after 2s */
export function showToast(text: string, type: 'info' | 'warn' = 'warn'): void {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach(fn => fn(msg));
}

/** Toast container — render once near the app root */
const ToastContainer: React.FC = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }, 2500);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container">
      {messages.map(msg => (
        <div key={msg.id} className={`toast toast--${msg.type}`}>
          {msg.text}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

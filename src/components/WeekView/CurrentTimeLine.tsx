// ========== Current time red line (F12, Phase E: pulse animation) ==========

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CaretRight } from '@phosphor-icons/react';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../../constants/windowConfig';

/** Refresh interval: once per minute */
const REFRESH_INTERVAL_MS = 60_000;

interface CurrentTimeLineProps {
  headerHeight: number;
}

/**
 * Red line showing current time position in the week view.
 * Ticks at whole-minute boundaries (not arbitrary offsets).
 * Hidden when current time is outside the visible range.
 *
 * Phase E: pulse breathing animation (2s cycle).
 */
const CurrentTimeLine: React.FC<CurrentTimeLineProps> = ({ headerHeight }) => {
  const shouldReduce = useReducedMotion();
  const [position, setPosition] = useState(-1);
  const [timeLabel, setTimeLabel] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculate = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < DAY_START_HOUR || hours >= DAY_END_HOUR) {
      setPosition(-1);
      setTimeLabel('');
      return;
    }

    const totalMinutes = (hours - DAY_START_HOUR) * 60 + minutes;
    const pos = (totalMinutes / 60) * HOUR_HEIGHT_PX;
    setPosition(pos + headerHeight);
    setTimeLabel(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }, [headerHeight]);

  useEffect(() => {
    calculate();

    // Align first tick to the next whole minute
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      calculate();
      intervalRef.current = setInterval(calculate, REFRESH_INTERVAL_MS);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [calculate]);

  if (position < 0) return null;

  return (
    <>
      <motion.div
        className="current-time-line"
        style={{ top: `${position}px` }}
        animate={shouldReduce ? {} : { opacity: [1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CaretRight size={12} weight="fill" className="current-time-caret" aria-hidden="true" />
      </motion.div>
      <div className="current-time-label" style={{ top: `${position}px` }}>
        {timeLabel}
      </div>
    </>
  );
};

export default CurrentTimeLine;

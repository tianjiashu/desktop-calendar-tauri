// ========== Root App component (Phase E: motion transitions) ==========

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import BallWidget from './components/Widget/BallWidget';
import WeekView from './components/WeekView/WeekView';
import DiagnosticPanel from './components/Common/DiagnosticPanel';
import ToastContainer from './components/Common/Toast';
import { useWindowManager } from './hooks/useWindowManager';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useCalendarStore } from './stores/useCalendarStore';
import { useDiagnostics } from './hooks/useDiagnostics';
import { useSync } from './hooks/useSync';
import { useEventDialog } from './hooks/useEventDialog';
import { useTheme } from './hooks/useTheme';
import { closeToTray } from './utils/windowUtils';
import './App.css';

// ===== Motion transition constants =====
const EXIT_DURATION = 0.12;
const ENTER_WEEK_DURATION = 0.2;
const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 350, damping: 28 };

/**
 * Root component managing the two window modes:
 * - Float ball widget mode (100x100px)
 * - Week view mode (860x780px)
 *
 * Phase E: AnimatePresence with #root border-radius morph bridge
 * for smooth widget ↔ week view transitions.
 */
const App: React.FC = () => {
  const shouldReduce = useReducedMotion();
  const { isWidgetMode, isTransitioning, toggleExpand, shrinkToWidget } = useWindowManager();
  const navigation = useWeekNavigation();
  const { events, isLoading, error } = useCalendarStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const eventDialog = useEventDialog();

  useTheme();
  const diag = useDiagnostics();

  useEffect(() => {
    const { initListener } = useCalendarStore.getState();
    initListener();
  }, []);

  // Toggle root border-radius for widget mode (Phase E: morph bridge)
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.classList.toggle('widget-mode', isWidgetMode);
    }
  }, [isWidgetMode]);

  useSync();

  useEffect(() => {
    const fetchForWeek = async () => {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    };
    fetchForWeek();
  }, [navigation.monday.getTime(), navigation.sunday.getTime()]);

  useEffect(() => {
    if (isWidgetMode) return;

    const fetchForVisibleWeek = async () => {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    };
    fetchForVisibleWeek();
  }, [isWidgetMode, navigation.monday, navigation.sunday]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    } finally {
      setIsRefreshing(false);
    }
  }, [navigation.monday, navigation.sunday]);

  const handleClose = useCallback(() => {
    closeToTray();
  }, []);

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {isWidgetMode ? (
          <motion.div
            key="widget"
            className={`app-container ${isTransitioning ? 'app-container--transitioning' : ''}`}
            initial={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.8, opacity: 0, filter: 'blur(3px)' }
            }
            animate={
              shouldReduce
                ? { opacity: isTransitioning ? 0 : 1 }
                : {
                  scale: isTransitioning ? 0.9 : 1,
                  opacity: isTransitioning ? 0 : 1,
                  filter: isTransitioning ? 'blur(2px)' : 'blur(0px)',
                }
            }
            exit={shouldReduce
              ? { opacity: 0 }
              : { scale: 1.06, opacity: 0, filter: 'blur(3px)' }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : isTransitioning
                  ? { duration: EXIT_DURATION, ease: EASE }
                  : { ...SPRING }
            }
          >
            <BallWidget onDoubleClick={toggleExpand} events={events} />
          </motion.div>
        ) : (
          <motion.div
            key="week"
            className={`app-container ${isTransitioning ? 'app-container--transitioning' : ''}`}
            initial={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.97, opacity: 0, filter: 'blur(2px)' }
            }
            animate={
              shouldReduce
                ? { opacity: isTransitioning ? 0 : 1 }
                : {
                  scale: isTransitioning ? 0.985 : 1,
                  opacity: isTransitioning ? 0 : 1,
                  filter: isTransitioning ? 'blur(2px)' : 'blur(0px)',
                }
            }
            exit={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.97, opacity: 0, filter: 'blur(2px)' }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : {
                  duration: isTransitioning ? EXIT_DURATION : ENTER_WEEK_DURATION,
                  ease: EASE,
                }
            }
          >
            <WeekView
              currentDate={navigation.currentDate}
              weekTitle={navigation.weekTitle}
              isCurrentWeek={navigation.isCurrentWeek}
              events={events}
              isLoading={isLoading}
              error={error}
              isRefreshing={isRefreshing}
              onPrevWeek={navigation.goToPrevWeek}
              onNextWeek={navigation.goToNextWeek}
              onToday={navigation.goToToday}
              onRefresh={handleRefresh}
              onShrink={shrinkToWidget}
              onClose={handleClose}
              onShowDiagnostics={diag.toggle}
              eventDialog={eventDialog}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer />
      {diag.isVisible && (
        <DiagnosticPanel
          diagnostic={diag.diagnostic}
          isLoading={diag.isLoading}
          onRefresh={diag.fetchDiagnostics}
          onClose={diag.toggle}
        />
      )}
    </ErrorBoundary>
  );
};

export default App;

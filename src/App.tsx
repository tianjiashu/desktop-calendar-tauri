// ========== Root App component (Phase 2: sync + diagnostics) ==========

import React, { useState, useCallback, useEffect } from 'react';
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

/**
 * Root component managing the two window modes:
 * - Float ball widget mode (120x120px)
 * - Week view mode (860x780px)
 *
 * Wrapped in ErrorBoundary to catch render crashes.
 * Diagnostic panel (MagnifyingGlass button) available in the status bar.
 */
const App: React.FC = () => {
  const { isWidgetMode, toggleExpand, shrinkToWidget } = useWindowManager();
  const navigation = useWeekNavigation();
  const { events, isLoading, error } = useCalendarStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const eventDialog = useEventDialog();

  // Theme: 默认跟随系统,支持手动切换
  useTheme();

  // Diagnostics
  const diag = useDiagnostics();

  // Initialize Tauri event listener for real-time sync
  useEffect(() => {
    const { initListener } = useCalendarStore.getState();
    initListener();
  }, []);

  // Toggle root border-radius for widget mode (round) vs week view (square)
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.classList.toggle('widget-mode', isWidgetMode);
    }
  }, [isWidgetMode]);

  // Background sync: 30s polling + window focus refresh
  useSync();

  // Fetch events when week changes
  useEffect(() => {
    const fetchForWeek = async () => {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    };
    fetchForWeek();
  }, [navigation.monday.getTime(), navigation.sunday.getTime()]);

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

  const content = isWidgetMode ? (
    <div className="app-container">
      <BallWidget onDoubleClick={toggleExpand} events={events} />
    </div>
  ) : (
    <div className="app-container">
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
    </div>
  );

  return (
    <ErrorBoundary>
      {content}
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

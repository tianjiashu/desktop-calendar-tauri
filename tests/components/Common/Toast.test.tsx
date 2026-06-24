// ========== Toast integration tests ==========

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ToastContainer, { showToast } from '../../../src/components/Common/Toast';

describe('Toast', () => {
  it('renders nothing when no messages', () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('.toast-container')).toBeNull();
  });

  it('shows toast message', async () => {
    render(<ToastContainer />);

    showToast('test message', 'info');

    // Wait for render
    const toast = await screen.findByText('test message');
    expect(toast).toBeDefined();
  });

  it('renders warn type toast', async () => {
    render(<ToastContainer />);

    showToast('warning message', 'warn');

    const toast = await screen.findByText('warning message');
    expect(toast).toBeDefined();
    expect(toast.className).toContain('toast--warn');
  });

  it('default type is warn', async () => {
    render(<ToastContainer />);

    showToast('default warn');

    const toast = await screen.findByText('default warn');
    expect(toast.className).toContain('toast--warn');
  });
});

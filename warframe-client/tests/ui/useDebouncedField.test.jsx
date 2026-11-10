import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebouncedField from '../../src/hooks/useDebouncedField';

describe('useDebouncedField', () => {
  it('a late echo of an older commit does not overwrite newer typing', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(({ v }) => useDebouncedField(v, onCommit, 100), { initialProps: { v: 'Multi-Augmented' } });

    act(() => result.current[1]('Pe'));
    act(() => { vi.advanceTimersByTime(150); });          // 'Pe' committed
    act(() => result.current[1]('Per'));                    // user keeps typing
    rerender({ v: 'Pe' });                                  // refetch echoes the older commit
    expect(result.current[0]).toBe('Per');

    rerender({ v: 'Something else' });                      // a genuine external change still applies
    expect(result.current[0]).toBe('Something else');
    vi.useRealTimers();
  });
});

import { describe, expect, it } from 'vitest';
import { markLessonCompleteSchema, lessonStateSchema } from './progress.validator';

describe('progress.validator', () => {
  it('accepts a valid mark-complete payload', () => {
    const result = markLessonCompleteSchema.parse({ isCompleted: true });
    expect(result.isCompleted).toBe(true);
  });

  it('rejects invalid payloads', () => {
    expect(() => markLessonCompleteSchema.parse({ isCompleted: 'yes' })).toThrow();
  });
  it('accepts valid state payloads', () => {
    const result = lessonStateSchema.parse({ state: 'IN_PROGRESS' });
    expect(result.state).toBe('IN_PROGRESS');
  });

  it('rejects invalid state values', () => {
    expect(() => lessonStateSchema.parse({ state: 'STARTED' })).toThrow();
  });
});

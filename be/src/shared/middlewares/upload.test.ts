import { describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    upload: {
      materialMaxSizeMb: 100,
    },
  },
}));

import { isAllowedMaterialMimeType } from './upload';

describe('upload middleware material MIME validation', () => {
  it('allows supported video material MIME types', () => {
    expect(isAllowedMaterialMimeType('video/mp4')).toBe(true);
    expect(isAllowedMaterialMimeType('video/webm')).toBe(true);
    expect(isAllowedMaterialMimeType('video/quicktime')).toBe(true);
  });

  it('rejects unsupported material MIME types', () => {
    expect(isAllowedMaterialMimeType('application/x-msdownload')).toBe(false);
  });
});

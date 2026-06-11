import { describe, expect, it } from 'vitest';
import {
  courseIdParamsSchema,
  createLessonSchema,
  createMaterialSchema,
  createModuleSchema,
  createUploadedMaterialSchema,
  lessonRouteParamsSchema,
  moduleIdParamsSchema,
  moduleRouteParamsSchema,
  reorderModulesSchema,
  updateLessonSchema,
  updateModuleSchema,
} from './lesson.validator';

describe('lesson.validator', () => {
  it('trims and accepts a create module payload', () => {
    const result = createModuleSchema.parse({ title: '  Module 1  ', orderIndex: '2' });

    expect(result).toEqual({ title: 'Module 1', orderIndex: 2 });
  });

  it('requires at least one field for module update', () => {
    expect(() => updateModuleSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('accepts a valid reorder payload', () => {
    const result = reorderModulesSchema.parse({
      modules: [
        { id: '11111111-1111-1111-1111-111111111111', orderIndex: '0' },
        { id: '22222222-2222-2222-2222-222222222222', orderIndex: 1 },
      ],
    });

    expect(result.modules).toEqual([
      { id: '11111111-1111-1111-1111-111111111111', orderIndex: 0 },
      { id: '22222222-2222-2222-2222-222222222222', orderIndex: 1 },
    ]);
  });

  it('rejects an empty reorder payload', () => {
    expect(() => reorderModulesSchema.parse({ modules: [] })).toThrow();
  });

  it('accepts lesson create and update payloads', () => {
    const createResult = createLessonSchema.parse({
      title: '  Lesson 1  ',
      videoUrl: 'https://example.com/video',
      orderIndex: '3',
    });

    expect(createResult).toEqual({
      title: 'Lesson 1',
      videoUrl: 'https://example.com/video',
      orderIndex: 3,
    });

    const updateResult = updateLessonSchema.parse({
      moduleId: '33333333-3333-3333-3333-333333333333',
      orderIndex: '4',
    });

    expect(updateResult).toEqual({
      moduleId: '33333333-3333-3333-3333-333333333333',
      orderIndex: 4,
    });
  });

  it('requires at least one field for lesson update', () => {
    expect(() => updateLessonSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('accepts course, module, and lesson route params', () => {
    expect(
      courseIdParamsSchema.parse({ courseId: '11111111-1111-1111-1111-111111111111' }),
    ).toEqual({
      courseId: '11111111-1111-1111-1111-111111111111',
    });
    expect(
      moduleRouteParamsSchema.parse({ moduleId: '22222222-2222-2222-2222-222222222222' }),
    ).toEqual({
      moduleId: '22222222-2222-2222-2222-222222222222',
    });
    expect(moduleIdParamsSchema.parse({ id: '33333333-3333-3333-3333-333333333333' })).toEqual({
      id: '33333333-3333-3333-3333-333333333333',
    });
    expect(
      lessonRouteParamsSchema.parse({ lessonId: '44444444-4444-4444-4444-444444444444' }),
    ).toEqual({
      lessonId: '44444444-4444-4444-4444-444444444444',
    });
  });

  it('accepts material payloads for url and upload flows', () => {
    const linkedMaterial = createMaterialSchema.parse({
      title: 'Slides',
      type: 'slide',
      url: 'https://cdn.example.com/slides.pdf',
    });

    expect(linkedMaterial).toEqual({
      title: 'Slides',
      type: 'slide',
      url: 'https://cdn.example.com/slides.pdf',
    });

    const uploadMaterial = createUploadedMaterialSchema.parse({
      title: 'Handout',
      type: 'pdf',
    });

    expect(uploadMaterial).toEqual({
      title: 'Handout',
      type: 'pdf',
    });
  });

  it('accepts video material payloads and rejects unsupported material types', () => {
    expect(
      createUploadedMaterialSchema.parse({
        title: 'Lecture video',
        type: 'video',
      }),
    ).toEqual({
      title: 'Lecture video',
      type: 'video',
    });

    expect(() =>
      createMaterialSchema.parse({
        title: 'Executable',
        type: 'exe',
        url: 'https://cdn.example.com/file.exe',
      }),
    ).toThrow();
  });
});

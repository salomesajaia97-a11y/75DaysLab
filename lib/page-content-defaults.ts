import type { IPageSection } from '@/models/PageContent'

export const PAGE_DEFAULTS: Record<string, IPageSection[]> = {
  home: [
    {
      sectionId: 'hero',
      label: 'Hero Section',
      fields: [
        { key: 'title',    label: 'Title',       value: 'Build Your Best Self in 75 Days', type: 'text' },
        { key: 'subtitle', label: 'Subtitle',     value: 'Track fitness, nutrition, and mindset every day.',     type: 'textarea' },
        { key: 'ctaText',  label: 'CTA Button',   value: 'Start Your Challenge',            type: 'text' },
      ],
    },
    {
      sectionId: 'footer',
      label: 'Footer',
      fields: [
        { key: 'copyright', label: 'Copyright text', value: '© 2026 75DaysLab. All rights reserved.', type: 'text' },
      ],
    },
  ],
  dashboard: [
    {
      sectionId: 'welcome',
      label: 'Welcome Banner',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Welcome back',              type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Keep pushing. Day by day.', type: 'text' },
      ],
    },
  ],
  login: [
    {
      sectionId: 'form',
      label: 'Login Form',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Welcome back',          type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Sign in to your account', type: 'text' },
      ],
    },
  ],
  register: [
    {
      sectionId: 'form',
      label: 'Register Form',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Create your account',      type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Start your 75-day journey', type: 'text' },
      ],
    },
  ],
  cycle: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Cycle Tracker',                      type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Log and understand your cycle.',     type: 'text' },
      ],
    },
  ],
  nutrition: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Nutrition',               type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Track your macros daily.', type: 'text' },
      ],
    },
  ],
  journal: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Journal',                        type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Reflect and grow every day.',    type: 'text' },
      ],
    },
  ],
  water: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Water Tracker',             type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Stay hydrated. Stay sharp.', type: 'text' },
      ],
    },
  ],
  fitness: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Fitness',                     type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Log your workouts daily.',    type: 'text' },
      ],
    },
  ],
  ai: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'AI Coach',                     type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Your personal lab assistant.', type: 'text' },
      ],
    },
  ],
  photos: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Progress Photos',              type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'See your transformation.',     type: 'text' },
      ],
    },
  ],
  squads: [
    {
      sectionId: 'page',
      label: 'Page Header',
      fields: [
        { key: 'title',    label: 'Title',    value: 'Squads',                          type: 'text' },
        { key: 'subtitle', label: 'Subtitle', value: 'Challenge together. Win together.', type: 'text' },
      ],
    },
  ],
}

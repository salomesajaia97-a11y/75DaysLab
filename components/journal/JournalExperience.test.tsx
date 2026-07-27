// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// i18n → identity so assertions read against stable keys.
vi.mock('@/lib/i18n', () => ({
  useLanguage: () => ({ t: (k: string) => k, locale: 'en', setLocale: () => {} }),
}))

import { JournalExperience } from './JournalExperience'

const TODAY = '2026-07-27'
const PAST = '2026-07-20'

const TODAY_ENTRY = {
  mood: 'good',
  title: 'Solid day',
  reflection: 'Trained early.',
  gratitude: '',
  tomorrowFocus: '',
}

const PAST_ENTRY = {
  mood: 'low',
  title: 'Rough one',
  reflection: 'Slept badly.',
  gratitude: '',
  tomorrowFocus: '',
}

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as Response
}

function dayPayload(date: string, entry: unknown) {
  return { today: TODAY, date, isToday: date === TODAY, entry, updatedAt: null, hasReading: false }
}

const fetchMock = vi.fn()

type FetchCall = [string, RequestInit?]
const fetchCalls = () => fetchMock.mock.calls as unknown as FetchCall[]
const putCalls = () => fetchCalls().filter(([, init]) => init?.method === 'PUT')

/** Default routing: today's entry, one past history row, successful saves. */
function routeFetch(overrides: { put?: () => Promise<Response> } = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (overrides.put) return overrides.put()
      const body = JSON.parse(String(init.body))
      const { date, ...draft } = body
      return Promise.resolve(json(200, dayPayload(date, draft)))
    }
    if (url.startsWith('/api/journal/history')) {
      return Promise.resolve(
        json(200, {
          today: TODAY,
          entries: [{ date: PAST, mood: 'low', title: 'Rough one', preview: 'Slept badly.' }],
        })
      )
    }
    // Answer for whichever day was requested, so day navigation is exercised.
    const requested = url.match(/date=([\d-]+)/)?.[1] ?? TODAY
    const entry = requested === TODAY ? TODAY_ENTRY : requested === PAST ? PAST_ENTRY : null
    return Promise.resolve(json(200, dayPayload(requested, entry)))
  })
}

const titleInput = () => screen.getByLabelText('journal.field.title') as HTMLInputElement
const reflectionInput = () => screen.getByLabelText('journal.field.reflection') as HTMLTextAreaElement
/** Matches the save button in both its idle and in-flight labels. */
const saveButton = () => screen.getByRole('button', { name: /journal\.action\.sav(e|ing)$/ })

async function renderReady() {
  render(<JournalExperience />)
  await screen.findByLabelText('journal.field.reflection')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  routeFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('loading and existing data', () => {
  it('asks the server for the logical today instead of computing a date locally', async () => {
    await renderReady()
    const reflectionCalls = fetchCalls().filter(([u]) => u.startsWith('/api/journal/reflection'))
    expect(reflectionCalls[0][0]).toBe('/api/journal/reflection')
  })

  it('renders the stored entry for today', async () => {
    await renderReady()
    expect(titleInput().value).toBe('Solid day')
    expect(reflectionInput().value).toBe('Trained early.')
    expect(screen.getByRole('radio', { name: 'journal.mood.good' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByText('journal.status.saved')).toBeInTheDocument()
    expect(screen.getByText('journal.day.today')).toBeInTheDocument()
  })

  it('shows the empty-day state when nothing is stored', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/journal/history')
          ? json(200, { today: TODAY, entries: [] })
          : json(200, dayPayload(TODAY, null))
      )
    )
    await renderReady()
    expect(reflectionInput().value).toBe('')
    expect(screen.getByText('journal.status.empty')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('journal.action.save_hint_empty')).toBeInTheDocument()
  })

  it('never offers navigation past today', async () => {
    await renderReady()
    expect(screen.getByRole('button', { name: 'journal.day.next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'journal.day.prev' })).toBeEnabled()
  })
})

describe('unsaved changes', () => {
  it('marks the day unsaved as soon as the text is edited', async () => {
    await renderReady()
    expect(screen.getByText('journal.status.saved')).toBeInTheDocument()

    fireEvent.change(reflectionInput(), { target: { value: 'Trained early. Slept well.' } })

    expect(screen.getByText('journal.status.unsaved')).toBeInTheDocument()
    expect(screen.getByText('journal.action.save_hint_dirty')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('keeps unsaved text when the user leaves the day and comes back', async () => {
    await renderReady()
    fireEvent.change(reflectionInput(), { target: { value: 'Half-written thought' } })

    fireEvent.click(screen.getByRole('button', { name: 'journal.day.prev' }))
    await waitFor(() => expect(reflectionInput().value).not.toBe('Half-written thought'))

    fireEvent.click(screen.getByRole('button', { name: 'journal.day.next' }))
    await waitFor(() => expect(reflectionInput().value).toBe('Half-written thought'))
    expect(screen.getByText('journal.unsaved.restored')).toBeInTheDocument()
  })
})

describe('saving', () => {
  it('saves the edited entry and confirms it', async () => {
    await renderReady()
    fireEvent.change(reflectionInput(), { target: { value: 'Updated text' } })
    fireEvent.click(saveButton())

    await screen.findByText('journal.status.save_success')
    expect(JSON.parse(String(putCalls()[0]?.[1]?.body))).toMatchObject({
      date: TODAY,
      mood: 'good',
      reflection: 'Updated text',
    })
    expect(screen.getByText('journal.status.saved')).toBeInTheDocument()
  })

  it('prevents a duplicate submission while a save is in flight', async () => {
    let release: (r: Response) => void = () => {}
    routeFetch({ put: () => new Promise<Response>((resolve) => { release = resolve }) })

    await renderReady()
    fireEvent.change(reflectionInput(), { target: { value: 'Updated text' } })

    fireEvent.click(saveButton())
    fireEvent.click(saveButton())
    fireEvent.click(saveButton())

    await waitFor(() => expect(screen.getByText('journal.status.saving')).toBeInTheDocument())
    expect(saveButton()).toBeDisabled()

    expect(putCalls()).toHaveLength(1)

    release(json(200, dayPayload(TODAY, { ...TODAY_ENTRY, reflection: 'Updated text' })))
    await screen.findByText('journal.status.save_success')
  })

  it('shows a save failure and keeps every typed character', async () => {
    routeFetch({ put: () => Promise.resolve(json(500, { error: 'nope', code: 'save_failed' })) })
    await renderReady()
    fireEvent.change(reflectionInput(), { target: { value: 'Precious unsaved text' } })
    fireEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('journal.error.save_failed')
    expect(reflectionInput().value).toBe('Precious unsaved text')
    expect(screen.getByText('journal.status.unsaved')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('surfaces a network failure without losing the draft', async () => {
    routeFetch({ put: () => Promise.reject(new Error('offline')) })
    await renderReady()
    fireEvent.change(reflectionInput(), { target: { value: 'Still here' } })
    fireEvent.click(saveButton())

    await screen.findByText('journal.error.network')
    expect(reflectionInput().value).toBe('Still here')
  })
})

describe('history', () => {
  it('loads the selected historical date into the editor', async () => {
    await renderReady()
    const row = await screen.findByRole('button', { name: /Rough one/ })
    fireEvent.click(row)

    await waitFor(() => expect(reflectionInput().value).toBe('Slept badly.'))
    expect(titleInput().value).toBe('Rough one')
    expect(screen.getByRole('radio', { name: 'journal.mood.low' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.queryByText('journal.day.today')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`/api/journal/reflection?date=${PAST}`)
  })

  it('shows an empty-history state rather than a blank panel', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/journal/history')
          ? json(200, { today: TODAY, entries: [] })
          : json(200, dayPayload(TODAY, TODAY_ENTRY))
      )
    )
    await renderReady()
    expect(await screen.findByText('journal.history.empty_title')).toBeInTheDocument()
  })

  it('offers a retry when history fails to load', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/journal/history')
          ? json(500, { error: 'nope' })
          : json(200, dayPayload(TODAY, TODAY_ENTRY))
      )
    )
    await renderReady()
    expect(await screen.findByText('journal.history.failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'journal.history.retry' })).toBeInTheDocument()
  })
})

describe('the day itself failing to load', () => {
  it('shows an actionable error with a retry instead of a blank screen', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(500, { error: 'nope' })))
    render(<JournalExperience />)
    expect(await screen.findByText('journal.status.load_failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /journal\.action\.retry/ })).toBeInTheDocument()
  })
})

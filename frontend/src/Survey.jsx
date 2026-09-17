import { useState } from 'react'

const YEAR_OPTIONS = ['First-year', 'Sophomore', 'Junior', 'Senior', 'Other']

const EMPTY_FORM = {
  name: '',
  school_year: '',
  working_style: '',
  interest: '',
}

export default function Survey({ students, onBack }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [missing, setMissing] = useState([])
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const blanks = []
    if (!form.name) blanks.push('Name')
    if (!form.school_year) blanks.push('What year are you?')
    if (!form.working_style.trim()) blanks.push('Describe your working style in 1–2 sentences')
    if (!form.interest.trim()) blanks.push('Describe your interest')

    if (blanks.length) {
      setMissing(blanks)
      setError(null)
      return
    }

    setMissing([])
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          school_year: form.school_year,
          working_style: form.working_style.trim(),
          interest: form.interest.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Backend responded ${res.status}`)
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <main className="page">
        <h1>Survey</h1>
        <p>Thanks — your responses were saved.</p>
        <button type="button" className="nav-link" onClick={onBack}>
          Back to GroupMaker
        </button>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Survey</h1>
      <p className="subtitle">Answer every question, then submit.</p>
      <button type="button" className="nav-link" onClick={onBack}>
        ← Back
      </button>

      <form className="survey-form" onSubmit={handleSubmit} noValidate>
        {missing.length > 0 && (
          <p className="error">
            Please fill in: {missing.join(', ')}
          </p>
        )}
        {error && (
          <p className="error">Could not save your survey: {error}</p>
        )}

        <label htmlFor="survey-name">
          Name
          <select
            id="survey-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          >
            <option value="">Select your name</option>
            {students.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="survey-year">
          What year are you?
          <select
            id="survey-year"
            value={form.school_year}
            onChange={(e) => update('school_year', e.target.value)}
          >
            <option value="">Select a year</option>
            {YEAR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="survey-working-style">
          Describe your working style in 1–2 sentences
          <textarea
            id="survey-working-style"
            rows={3}
            value={form.working_style}
            onChange={(e) => update('working_style', e.target.value)}
          />
        </label>

        <label htmlFor="survey-interest">
          Describe your interest
          <textarea
            id="survey-interest"
            rows={3}
            value={form.interest}
            onChange={(e) => update('interest', e.target.value)}
          />
        </label>

        <button className="randomize" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </main>
  )
}

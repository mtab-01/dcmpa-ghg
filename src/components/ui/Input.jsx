import { colors, radius, fonts } from '../../theme'

const baseStyle = {
  width: '100%',
  background: '#0d0d1a',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  color: colors.cream,
  padding: '10px 12px',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export function Input({ label, error, style: extraStyle = {}, ...props }) {
  return (
    <FormField label={label} error={error}>
      <input
        {...props}
        style={{
          ...baseStyle,
          fontFamily: fonts.body,
          ...extraStyle,
        }}
        onFocus={e => { e.target.style.borderColor = colors.gold }}
        onBlur={e => { e.target.style.borderColor = error ? colors.red : colors.border }}
      />
    </FormField>
  )
}

export function Textarea({ label, error, rows = 3, style: extraStyle = {}, ...props }) {
  return (
    <FormField label={label} error={error}>
      <textarea
        {...props}
        rows={rows}
        style={{
          ...baseStyle,
          fontFamily: fonts.body,
          resize: 'vertical',
          ...extraStyle,
        }}
        onFocus={e => { e.target.style.borderColor = colors.gold }}
        onBlur={e => { e.target.style.borderColor = error ? colors.red : colors.border }}
      />
    </FormField>
  )
}

export function Select({ label, error, children, style: extraStyle = {}, ...props }) {
  return (
    <FormField label={label} error={error}>
      <select
        {...props}
        style={{
          ...baseStyle,
          fontFamily: fonts.body,
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23ffd700' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          ...extraStyle,
        }}
        onFocus={e => { e.target.style.borderColor = colors.gold }}
        onBlur={e => { e.target.style.borderColor = error ? colors.red : colors.border }}
      >
        {children}
      </select>
    </FormField>
  )
}

export function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '0.78rem',
          fontFamily: fonts.mono,
          color: colors.gold,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p style={{ color: colors.red, fontSize: '0.78rem', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  )
}

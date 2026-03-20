/**
 * Compute each member's share for an expense.
 * Returns { [memberName]: shareAmount }
 */
export function computeShares(amount, splitType, splits, members) {
  if (splitType === 'custom' && splits && Object.keys(splits).length > 0) {
    return splits
  }
  // Even split with penny-rounding fix
  const count = members.length
  const base = Math.floor((amount * 100) / count) / 100
  const remainder = Math.round((amount - base * count) * 100) // cents remainder
  const result = {}
  members.forEach((m, i) => {
    result[m] = i < remainder ? base + 0.01 : base
  })
  return result
}

/**
 * Compute net balance for each member across all expenses.
 * Positive = team owes them money ("Owed")
 * Negative = they owe the team money ("Owes")
 */
export function computeBalances(expenses, members) {
  const balances = {}
  members.forEach(m => { balances[m] = 0 })

  expenses.forEach(exp => {
    const payer = exp.paid_by
    const amount = parseFloat(exp.amount) || 0

    // Credit the payer the full amount
    if (balances[payer] !== undefined) {
      balances[payer] += amount
    }

    // Debit each member their share
    const shares = computeShares(amount, exp.split_type, exp.splits, members)
    Object.entries(shares).forEach(([member, share]) => {
      if (balances[member] !== undefined) {
        balances[member] -= parseFloat(share) || 0
      }
    })
  })

  // Round to 2 decimal places
  Object.keys(balances).forEach(k => {
    balances[k] = Math.round(balances[k] * 100) / 100
  })

  return balances
}

/**
 * Format a balance amount as a currency string.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
}

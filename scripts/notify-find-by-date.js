#!/usr/bin/env node

/**
 * Fetches multiple notifications from GOV.UK Notify filtered by date range.
 * Optionally filters by status, reference, template type, and template ID.
 *
 * Note: The Notify API does not support server-side filtering by date or template ID.
 * This script paginates through results and applies client-side filters.
 *
 * Usage:
 *   NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from 2026-05-01 --to 2026-05-31
 *   NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from 2026-05-01 --status delivered
 *   NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from 2026-05-01 --to 2026-05-31 --type email
 *   NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from 2026-05-01 --template-id <uuid>
 *   NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from 2026-05-01 --reference my-ref
 */

import { NotifyClient } from 'notifications-node-client'

const HELP_TEXT = `
Fetches notifications from GOV.UK Notify filtered by date range.

Usage:
  NOTIFY_API_KEY=<key> node scripts/notify-find-by-date.js --from <date> [options]

Options:
  --from <date>         Start date in YYYY-MM-DD format (required)
  --to <date>           End date in YYYY-MM-DD format
  --status <status>     Filter by notification status
  --type <type>         Filter by template type (email, sms, letter)
  --reference <ref>     Filter by reference
  --template-id <uuid>  Filter by template ID
  --help                Show this help message
`.trim()

const parseArgs = (argv) => {
  const args = argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  const getArgValue = (flag) => {
    const idx = args.indexOf(flag)
    return idx === -1 ? null : args[idx + 1]
  }

  const from = getArgValue('--from')

  if (!from) {
    throw new Error('--from argument is required (YYYY-MM-DD)')
  }

  const to = getArgValue('--to')
  const status = getArgValue('--status')
  const type = getArgValue('--type')
  const reference = getArgValue('--reference')
  const templateId = getArgValue('--template-id')

  const fromDate = new Date(from)
  if (Number.isNaN(fromDate.getTime())) {
    throw new TypeError(`Invalid --from date: ${from}`)
  }

  let toDate = null
  if (to) {
    toDate = new Date(to)
    if (Number.isNaN(toDate.getTime())) {
      throw new TypeError(`Invalid --to date: ${to}`)
    }
    toDate.setHours(23, 59, 59, 999)
  }

  if (type && !['email', 'sms', 'letter'].includes(type)) {
    throw new Error('--type must be one of: email, sms, letter')
  }

  return { fromDate, toDate, status, type, reference, templateId }
}

const isWithinDateRange = (notification, fromDate, toDate) => {
  const createdAt = new Date(notification.created_at)
  if (createdAt < fromDate) return 'before'
  if (toDate && createdAt > toDate) return 'after'
  return 'within'
}

const fetchNotifications = async (notifyClient, { fromDate, toDate, status, type, reference, templateId }) => {
  const matches = []
  let olderThan = null
  let reachedBeforeRange = false

  while (!reachedBeforeRange) {
    const response = await notifyClient.getNotifications(
      type || null,
      status || null,
      reference || null,
      olderThan
    )

    const notifications = response.data.notifications

    if (notifications.length === 0) break

    for (const notification of notifications) {
      const position = isWithinDateRange(notification, fromDate, toDate)

      if (position === 'before') {
        reachedBeforeRange = true
        break
      }

      if (position === 'within') {
        if (!templateId || notification.template.id === templateId) {
          matches.push(notification)
        }
      }
    }

    olderThan = notifications[notifications.length - 1].id

    if (notifications.length < 250) break
  }

  return matches
}

const formatRow = (notification) => [
  notification.created_at,
  notification.id,
  notification.type,
  notification.status,
  notification.template.id,
  notification.reference || '(none)'
].join(' | ')

const printResults = (notifications, filters) => {
  console.log('created_at | notify_id | type | status | template_id | reference')
  console.log('-'.repeat(140))

  for (const n of notifications) {
    console.log(formatRow(n))
  }

  console.log(`\nTotal: ${notifications.length} notification(s) found`)
  console.log('\nFilters applied:')
  console.log(`  From: ${filters.fromDate.toISOString().split('T')[0]}`)
  if (filters.toDate) console.log(`  To: ${filters.toDate.toISOString().split('T')[0]}`)
  if (filters.status) console.log(`  Status: ${filters.status}`)
  if (filters.type) console.log(`  Type: ${filters.type}`)
  if (filters.reference) console.log(`  Reference: ${filters.reference}`)
  if (filters.templateId) console.log(`  Template ID: ${filters.templateId}`)
}

export { parseArgs, fetchNotifications, formatRow, printResults }

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))

if (isMain) {
  const apiKey = process.env.NOTIFY_API_KEY

  if (!apiKey) {
    console.error('Error: NOTIFY_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    const filters = parseArgs(process.argv)

    console.log('Fetching notifications from GOV.UK Notify...')
    console.log()

    const notifyClient = new NotifyClient(apiKey)
    const notifications = await fetchNotifications(notifyClient, filters)

    printResults(notifications, filters)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

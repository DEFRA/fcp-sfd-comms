#!/usr/bin/env node

/**
 * Queries GOV.UK Notify for notifications by one or more references.
 * Used to identify affected records when error logs lack identifying information.
 *
 * Usage:
 *   NOTIFY_API_KEY=<key> node scripts/check-notify-messages.js --references ref1 ref2 ref3
 *   NOTIFY_API_KEY=<key> node scripts/check-notify-messages.js --references ref1 --status delivered
 */

import { NotifyClient } from 'notifications-node-client'

const parseArgs = (argv) => {
  const args = argv.slice(2)

  const statusIdx = args.indexOf('--status')
  const status = statusIdx !== -1 ? args[statusIdx + 1] : null

  const refsIdx = args.indexOf('--references')

  if (refsIdx === -1) {
    throw new Error('--references argument is required')
  }

  const references = []
  for (let i = refsIdx + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break
    references.push(args[i])
  }

  if (references.length === 0) {
    throw new Error('at least one reference must be provided')
  }

  return { references, status }
}

const fetchByReference = async (notifyClient, reference, status) => {
  const matches = []
  let olderThan = null

  while (true) {
    const response = await notifyClient.getNotifications(
      'email',
      status || null,
      reference,
      olderThan
    )

    const notifications = response.data.notifications

    if (notifications.length === 0) break

    matches.push(...notifications)
    olderThan = notifications[notifications.length - 1].id

    if (notifications.length < 250) break
  }

  return matches
}

const formatRow = (notification) => [
  notification.reference || '(none)',
  notification.id,
  notification.status,
  notification.created_at,
  notification.template.id
].join(' | ')

const run = async (notifyClient, references, status) => {
  const results = []

  for (const ref of references) {
    try {
      const matches = await fetchByReference(notifyClient, ref, status)
      results.push({ reference: ref, matches })
    } catch (error) {
      const errors = error.response?.data?.errors
      const message = errors
        ? errors.map((e) => e.message).join(', ')
        : error.message
      results.push({ reference: ref, matches: [], error: message })
    }
  }

  return results
}

const printResults = (results, references) => {
  console.log('reference | notify_id | status | created_at | template_id')
  console.log('-'.repeat(120))

  let totalFound = 0
  const notFound = []

  for (const { reference, matches, error } of results) {
    if (error) {
      console.log(`${reference} | ERROR: ${error}`)
      continue
    }

    if (matches.length === 0) {
      notFound.push(reference)
      continue
    }

    totalFound += matches.length

    for (const n of matches) {
      console.log(formatRow(n))
    }
  }

  console.log(`\nSummary: ${totalFound} notification(s) found for ${references.length} reference(s)`)

  if (notFound.length > 0) {
    console.log(`\nNo results for ${notFound.length} reference(s):`)
    for (const ref of notFound) {
      console.log(`  ${ref}`)
    }
  }
}

export { parseArgs, fetchByReference, formatRow, run, printResults }

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))

if (isMain) {
  const apiKey = process.env.NOTIFY_API_KEY

  if (!apiKey) {
    console.error('Error: NOTIFY_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    const { references, status } = parseArgs(process.argv)

    console.log(`Checking ${references.length} reference(s) in Notify`)
    if (status) console.log(`Filtering by status: ${status}`)
    console.log()

    const notifyClient = new NotifyClient(apiKey)
    const results = await run(notifyClient, references, status)

    printResults(results, references)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

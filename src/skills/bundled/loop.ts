import { setScheduledTasksEnabled } from '../../bootstrap/state.js'
import { isKairosCronEnabled } from '../../tools/ScheduleCronTool/prompt.js'
import {
  addCronTask,
  listAllCronTasks,
  removeCronTasks,
} from '../../utils/cronTasks.js'
import { registerBundledSkill } from '../bundledSkills.js'

const DEFAULT_INTERVAL = '10m'

const USAGE_MESSAGE = `Usage: /loop [interval] <prompt>

Run a prompt or slash command on a recurring interval.

Intervals: Ns, Nm, Nh, Nd (e.g. 5m, 30m, 2h, 1d). Minimum granularity is 1 minute.
If no interval is specified, defaults to ${DEFAULT_INTERVAL}.

Sub-commands:
  /loop list                  List all scheduled tasks
  /loop delete <id>           Delete a scheduled task

Examples:
  /loop 5m /babysit-prs
  /loop 30m check the deploy
  /loop 1h /standup 1
  /loop check the deploy          (defaults to ${DEFAULT_INTERVAL})
  /loop check the deploy every 20m`

/**
 * Parse the user's args into { interval, prompt }.
 * Returns null if args are empty.
 */
function parseLoopArgs(
  args: string,
): { interval: string; prompt: string } | null {
  const trimmed = args.trim()
  if (!trimmed) return null

  // 1. Leading token: if first token matches ^\d+[smhd]$ (e.g. 5m, 2h)
  const tokens = trimmed.split(/\s+/)
  const firstToken = tokens[0]!
  const leadingMatch = firstToken.match(/^(\d+)([smhd])$/)
  if (leadingMatch) {
    return {
      interval: firstToken,
      prompt: tokens.slice(1).join(' ').trim(),
    }
  }

  // 2. Trailing "every" clause:
  //    "every N<unit>" (compact, e.g. "every 20m")
  //    "every N unit-word" (spelled out, e.g. "every 5 minutes")
  const everyPattern =
    /\s+every\s+(\d+)\s*(s(?:econd)?s?|m(?:inute)?s?|h(?:ou)?r?s?|d(?:ay)?s?)$/i
  const everyMatch = trimmed.match(everyPattern)
  if (everyMatch) {
    const num = everyMatch[1]!
    const unit = everyMatch[2]![0]!.toLowerCase()
    return {
      interval: num + unit,
      prompt: trimmed.slice(0, trimmed.length - everyMatch[0].length).trim(),
    }
  }

  // Also match "every Nm" without space between N and unit
  const everyCompactPattern = /\s+every\s+(\d+[smhd])$/i
  const everyCompactMatch = trimmed.match(everyCompactPattern)
  if (everyCompactMatch) {
    return {
      interval: everyCompactMatch[1]!,
      prompt: trimmed
        .slice(0, trimmed.length - everyCompactMatch[0].length)
        .trim(),
    }
  }

  // 3. Default: use DEFAULT_INTERVAL, entire input is the prompt
  return {
    interval: DEFAULT_INTERVAL,
    prompt: trimmed,
  }
}

/**
 * Convert an interval string (e.g. "5m", "2h", "1d") to a 5-field cron expression.
 * Returns null if the interval is invalid.
 */
function intervalToCron(interval: string): string | null {
  const match = interval.match(/^(\d+)([smhd])$/)
  if (!match) return null
  const num = parseInt(match[1]!, 10)
  const unit = match[2]

  switch (unit) {
    case 's': {
      const mins = Math.ceil(num / 60)
      return `*/${mins} * * * *`
    }
    case 'm': {
      if (num <= 59) return `*/${num} * * * *`
      const hours = Math.ceil(num / 60)
      if (24 % hours !== 0) return null
      return `0 */${hours} * * *`
    }
    case 'h': {
      if (num > 23) return null
      return `0 */${num} * * *`
    }
    case 'd': {
      return `0 0 */${num} * *`
    }
  }
}

function getHumanSchedule(interval: string): string {
  const match = interval.match(/^(\d+)([smhd])$/)
  if (!match) return interval
  const num = match[1]!
  const unitMap: Record<string, string> = {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
  }
  const unitName = unitMap[match[2]!] ?? interval
  return `every ${num} ${unitName}${num !== '1' ? 's' : ''}`
}

export function registerLoopSkill(): void {
  registerBundledSkill({
    name: 'loop',
    description:
      'Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo, defaults to 10m)',
    whenToUse:
      'When the user wants to set up a recurring task, poll for status, or run something repeatedly on an interval (e.g. "check the deploy every 5 minutes", "keep running /babysit-prs"). Do NOT invoke for one-off tasks.',
    argumentHint: '[interval] <prompt>',
    userInvocable: true,
    isEnabled: isKairosCronEnabled,
    async getPromptForCommand(args) {
      const trimmed = args.trim()
      if (!trimmed) {
        return [{ type: 'text', text: USAGE_MESSAGE }]
      }

      // Sub-command: /loop list
      if (/^list$/i.test(trimmed)) {
        const tasks = await listAllCronTasks()
        if (tasks.length === 0) {
          return [{ type: 'text', text: '当前没有定时任务。' }]
        }
        const lines = ['当前定时任务：']
        for (const t of tasks) {
          lines.push(`  [${t.id}] ${t.prompt} (${t.cron})`)
        }
        return [{ type: 'text', text: lines.join('\n') }]
      }

      // Sub-command: /loop delete <id>
      const deleteMatch = trimmed.match(/^delete\s+(\S+)$/i)
      if (deleteMatch) {
        const id = deleteMatch[1]!
        await removeCronTasks([id])
        return [{ type: 'text', text: `已删除任务 ${id}。` }]
      }

      const parsed = parseLoopArgs(trimmed)
      if (!parsed || !parsed.prompt) {
        return [{ type: 'text', text: USAGE_MESSAGE }]
      }

      const cron = intervalToCron(parsed.interval)
      if (!cron) {
        return [
          {
            type: 'text',
            text: `Invalid interval "${parsed.interval}".\n\n${USAGE_MESSAGE}`,
          },
        ]
      }

      // Create the cron task directly — no model involvement needed.
      const id = await addCronTask(cron, parsed.prompt, true, false)
      setScheduledTasksEnabled(true)

      const humanSchedule = getHumanSchedule(parsed.interval)
      return [
        {
          type: 'text',
          text: `已创建定时任务 ${id}，${humanSchedule}（${cron}）。提示词：${parsed.prompt}`,
        },
      ]
    },
  })
}

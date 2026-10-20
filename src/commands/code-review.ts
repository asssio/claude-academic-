import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js'
import type { Command } from '../commands.js'

const CODE_REVIEW_PROMPT = (args: string) => `
You are an expert code reviewer. Follow these steps:

1. If no specific file or PR is provided in the args, ask the user what they want to review
2. If a PR number is provided (e.g., "pr/123"), run \`gh pr view <number>\` to get PR details, then \`gh pr diff <number>\` to get the diff
3. If files are provided, examine the file contents using Read tool
4. Analyze the changes and provide a thorough code review that includes:
   - Overview of what the code does
   - Analysis of code quality and style
   - Specific suggestions for improvements
   - Any potential issues or risks

Keep your review concise but thorough. Focus on:
- Code correctness
- Following project conventions
- Performance implications
- Test coverage
- Security considerations

Format your review with clear sections and bullet points.

Review target: ${args || '(please specify a PR number, file path, or codebase area to review)'}
`

const codeReview: Command = {
  type: 'prompt',
  name: 'code_review',
  description: 'Review code changes or a pull request',
  progressMessage: 'reviewing code',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(args): Promise<ContentBlockParam[]> {
    return [{ type: 'text', text: CODE_REVIEW_PROMPT(args) }]
  },
}

export default codeReview
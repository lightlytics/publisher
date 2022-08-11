import core from '@actions/core'
import github from '@actions/github'
import {Octokit} from "@octokit/rest";
import {publish, poll, getMarkdownComment} from 'lightlytics-publisher-core'

const pollTimeout = 10 // minutes
const pollInterval = 5000

try {
  const apiUrl = core.getInput('ll-hostname')
  const tfWorkingDir = core.getInput('working-directory').replace(/\/$/, '')
  const tfPlan = core.getInput('plan-json')
  const tfGraph = core.getInput('tf-graph')
  const collectionToken = core.getInput('collection-token')

  const isPullRequestTriggered = github.context.payload.pull_request != null
  const source = formatGitMetadata(isPullRequestTriggered)
  const metadata = {source}

  const {eventId, customerId} = await publish({
    apiUrl,
    tfWorkingDir,
    tfPlan,
    tfGraph,
    collectionToken,
    metadata
  })

  const details_url = `https://${apiUrl}/w/${customerId}/simulations/${eventId}`
  const commentText = getCommentToPullRequest(details_url)

  core.setOutput("simulation-details", commentText)

  const octokit = new Octokit({
    auth: core.getInput('github-token')
  })

  let pullRequestCommentId
  if (isPullRequestTriggered) {
    const commentResponse = await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.payload.pull_request.number,
      body: commentText
    }).catch(err => console.log(`failed to send message on PR: ${err.message}`))

    pullRequestCommentId = commentResponse?.data?.id
  }

  // checks:write permission
  const res = await octokit.rest.checks.create({
    ...github.context.repo,
    name: 'Lightlytics Simulation',
    head_sha: source.commit_hash,
    status: 'queued', // queued, in_progress, completed
    details_url,
    external_id: eventId,
    output: {
      title: 'Simulation is pending',
      summary: commentText,
    }
  })

  await poll({
    apiUrl,
    collectionToken,
    customerId,
    eventId,
    pollTimeout,
    pollInterval,
    onStatusUpdate: (status, violations) => {
      const markdownOutput = getMarkdownComment(status, violations, details_url)
      octokit.rest.checks.update({
        ...github.context.repo,
        check_run_id: res.data.id,
        ...status,
        output: {
          title: status.label,
          summary: status.conclusion ? markdownOutput : '',
        }
      }).catch(() => console.log('failed to update with checks api'))

      if (status.conclusion && pullRequestCommentId) {
        octokit.rest.issues.updateComment({
          ...github.context.repo,
          issue_number: github.context.payload.pull_request.number,
          comment_id: pullRequestCommentId,
          body: markdownOutput,
        }).catch(() => console.log('failed to update PR comment'))
      }
    }
  })

  core.setOutput('EventId', eventId)
} catch (error) {
  console.error(error)
  core.setFailed(error.message)
}

function getCommentToPullRequest(link) {
  return `**Lightlytics** is processing an execution simulation. The results will be updated when the simulation is complete, [View simulation details](${link})

> _This comment was added automatically by a git workflow to help DevOps teams predict what will be the impact of the proposed change after completing this PR_`
}

function formatGitMetadata(isPullRequestTriggered) {
  let source = {}

  if (isPullRequestTriggered) {
    source = {
      name: 'Github',
      type: 'Github',
      format: 'Terraform',
      branch: github.context.payload.pull_request.head.ref,
      base_branch: github.context.payload.pull_request.base.ref,
      commit_hash: github.context.payload.pull_request.head.sha,
      pr_id: github.context.payload.pull_request.number,
      repository: github.context.payload.repository.full_name,
      user_name: github.context.payload.pull_request.user.login
    }
  } else {
    source = {
      name: 'Github',
      type: 'Github',
      format: 'Terraform',
      branch: github.context.ref.replace('refs/heads/', ''),
      base_branch: github.context.payload.repository.default_branch,
      commit_hash: github.context.sha,
      pr_id: '',
      repository: github.context.payload.repository.full_name,
      user_name: github.context.actor
    }
  }
  return source
}

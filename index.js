const core = require('@actions/core');
const github = require('@actions/github');
const got = require('got');
const fs = require('fs')

function removeAwsCredentials(plan) {
    delete plan['configuration']['provider_config']['aws']['expressions']['access_key']
    delete plan['configuration']['provider_config']['aws']['expressions']['secret_key']
}

try {
    const hostname = core.getInput('ll-hostname')
    const terraformPlanPath = core.getInput('plan-json');
    const plan = JSON.parse(fs.readFileSync(terraformPlanPath, 'utf8'))

    removeAwsCredentials(plan)

    const url = `https://${hostname}/api/v1/collection/terraform`
    const headers = {
        'X-Lightlytics-Token': core.getInput('collection-token')
    }

    const source = {
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

    const data = {
        plan,
        metadata: {source},
    }

    got.post(url, {
        json: data,
        responseType: 'json',
        headers
    }).then((res) => {
        console.log(res.body)
        core.setOutput('eventId', res.body.EventId);
    }).catch(err => console.log(err));
} catch (error) {
    core.setFailed(error.message);
}
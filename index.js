const core = require('@actions/core');
const github = require('@actions/github');
const got = require('got');
const fs = require('fs')

try {
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
    const terraformPlanPath = core.getInput('plan-json');
    const terraformPlan = JSON.parse(fs.readFileSync(terraformPlanPath, 'utf8'))

    const url = "https://mikelytics.lightops.io/api/v1/collection/terraform"
    const headers = {
        'X-Lightlytics-Token': 'LKGrQlbyzVqtorTZ4LYJxo267DAZwDUTtqS9j8se9xc'
    }

    const source = {
        format: 'Terraform',
        type: 'Github',
        metadata: {
            base_branch: github.context.payload.repository.default_branch,
            //commit_hash: github.context.payload.head_commit.id,
            name: 'Github',
            pr_id: github.context.payload.pull_request.number,
            repository: github.context.payload.repository.full_name,
            user_name: github.context.payload.actor
        }
    }

    const data = {
        ...terraformPlan,
        source,
    }

    const {body} = got.post(url, {
        json: data,
        responseType: 'json',
        headers
    }).then(() => {
    }).catch(err => console.log(err));

    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}
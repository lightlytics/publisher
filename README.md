# Lightlytics-Publisher
A GitHub Action used to send a Terraform plan output in JSON format and trigger a Simulation run in Lightlytics.
# Action parameters and description
The Publisher Action required parameters input:
* 'plan-json' - A Terraform plan in JSON format that was generated using the "terraform show -json ./terraform.plan > ./plan.json" command.
* 'll-hosname' - The organization specific Lightlytics URL.
* 'collection-token' - The AWS account's specific collection token (can be found on Lightlytics UI -> settings -> Integrations -> AWS Account -> collection token).
The 'collection-token' needs to be added as a [repository secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) on the relevant repo.
Use the ll-publisher Action as follows:
```yaml
      - uses: lightlytics/publisher@v1.1
        id: ll-publisher
        with:
          plan-json: ./terraform/plan.json
          ll-hostname: organization.lightlytics.com
          collection-token: ${{ secrets.LIGHTLYTICS_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }} #used locally to comment back to the Pull Request (you don't need to specify anything here).
```

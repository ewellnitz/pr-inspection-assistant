# Pull Request Inspection Assistant (PRIA) - OpenAI PR Review Bot for Azure DevOps

Automate pull request (PR) reviews in Azure DevOps using the PR Inspection Assistant (PRIA) and OpenAI. This bot analyzes code changes, offers suggestions, detects potential bugs, and ensures adherence to coding standards. Streamline code reviews with customizable criteria and natural language feedback, improving code quality and reducing review time.

## Key Features

- **Automated PR Reviews**: Leverage OpenAI to analyze code changes in pull requests.
- **Code Quality Suggestions**: Detect potential issues and ensure best practices are followed.
- **Customizable Review Criteria**: Tailor the bot to specific code quality metrics.
- **Azure DevOps Integration**: Seamlessly integrates with existing DevOps pipelines.
- **Natural Language Feedback**: Provides human-readable, actionable feedback.

![](./pr-inspection-assistant/assets/ado-ai-comment.jpg)

## Use Cases

- **Automate Routine PR Tasks**: Speed up the code review process by automating common review tasks.
- **Improve Code Quality**: Receive consistent, detailed feedback to enhance code quality.
- **Early Bug Detection**: Help developers understand best practices and identify bugs early in the development cycle.

## Process
![](./pr-inspection-assistant/assets/flowchart.jpg)

## Prerequisites

- An [OpenAI API Key](https://platform.openai.com/docs/overview)
- Build Administrators must be given "Contribute to pull requests" access. Check [this Stack Overflow answer](https://stackoverflow.com/a/57985733) for guidance on setting up permissions.

## Getting Started

1. **Install the PRIA DevOps Extension**

   Install the [PRIA](https://marketplace.visualstudio.com/items?itemName=EricWellnitz.pria) DevOps extension from the Azure DevOps Marketplace.

2. **Create a PRIA Code Review Pipeline**

   Create an [Azure DevOps Pipeline](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline) using the following YAML snippet to set up the PRIA code review task:

   ```yaml
   trigger:
     branches:
       exclude:
         - '*'

   pr:
     branches:
       include:
         - '*'

   jobs:
     - job: CodeReview
       pool:
         vmImage: 'ubuntu-latest'
       steps:
         - checkout: self
           persistCredentials: true
         - task: PRIA@1
           inputs:
             api_key: $(OpenAI_ApiKey)
2. **Configure your Main Branch for Build Validation**

  Cofigure Azure DevOps [Build Validation](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) to use PRIA Code Review Pipeline created above  as a build validation pipeline.

## Build & Publish

1. Install [Prequisites](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?toc=%2Fazure%2Fdevops%2Fmarketplace-extensibility%2Ftoc.json&view=azure-devops#prerequisites)
2. Run `npm install -g typescript` to install TypeScript
3. Run npm install -g tfx-cli to install tfx
4. Run `tsc.cmd` from `.\pr-inspection-assistant\src\` to build the solution
5. Run `tfx extension create --manifest-globs vss-extension.json` from `.\pr-inspection-assistant\` to package the solution

### Resources
- [Marketplace Pipeline Extension](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?toc=%2Fazure%2Fdevops%2Fmarketplace-extensibility%2Ftoc.json&view=azure-devops)
- [Publisher Portal](https://marketplace.visualstudio.com/manage/publishers)

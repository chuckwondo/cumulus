# Cumulus Framework

[![CircleCI](https://circleci.com/gh/cumulus-nasa/cumulus.svg?style=svg&circle-token=4a16cbbdacb6396c709309ef5ac87479c9dc8bd1)](https://circleci.com/gh/cumulus-nasa/cumulus)

## Installing and deploying

### Prerequisites

* [NVM](https://github.com/creationix/nvm) and node version 6.10.
* [pip](https://pip.pypa.io/en/stable/installing/)
* [yarn](https://yarnpkg.com/en/)
* [AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)
* Ruby
* BASH
* Docker (only required for building new container images)
* docker-compose (`pip install docker-compose`)

Install the correct node version:

```
nvm install
nvm use
```

Ensure that the aws cli is configured and that the default output format is either JSON or None:

```
aws configure
```

### Install Lerna

We use Lerna to manage multiple Cumulus packages in the same repo. You need to install lerna as a global module first:

    $ yarn global add lerna

### Install Local Dependencies

We use yarn for local package management

    $ yarn install
    $ yarn ybootstrap

Building All packages:

    $ yarn build

Build and watch packages:

    $ yarn watch

## Running Tests

### LocalStack

[LocalStack](https://github.com/localstack/localstack) provides local versions of most AWS services for testing.

The LocalStack repository has [installation instructions](https://github.com/localstack/localstack#installing).

Before running tests, start the LocalStack servers:

    $ localstack start

### Docker containers

Turn on the docker containers first:

    $ docker-compose up local

If you prefer to run docker in detached mode (i.e. run containers in the background), run:

    $ docker-compose up -d local

### Run tests

Run the test commands next

    $ yarn test

## Adding New Packages

Create a new folder under `packages` if it is a common library or create folder under `cumulus/tasks` if it is a lambda task. `cd` to the folder and run `npm init`.

Make sure to name the package as `@cumulus/package-name`.

## Versioning

We use a global versioning approach, meaning version numbers in cumulus are consistent across all packages and tasks, and semantic versioning to track minor, major, and patch version (i.e. 1.0.0). We use Lerna to manage our versioning. Any change will force lerna to increment the version of all packages.

### Publishing to NPM

    $ lerna publish

To specify the level of change for the new version

    $ lerna publish --cd-version (major | minor | patch | prerelease)

## Running command in all package folders

    $ lerna exec -- rm -rf ./package-lock.json

## Cleaning Up all the repos

    $ npm run clean

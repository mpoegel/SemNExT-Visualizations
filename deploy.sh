#!/bin/bash

if [ "$TRAVIS_BRANCH" == "master" ]; then
  echo { "port": "$DEPLOY_PRODUCTION_PORT" } > config.json
  python deploy "$DEPLOY_HOSTNAME" "$DEPLOY_PASSWORD" production master config.json 
elif [ "$TRAVIS_BRANCH" == "develop" ]; then
  echo { "port": "$DEPLOY_DEV_PORT" } > config.json
  python deploy "$DEPLOY_HOSTNAME" "$DEPLOY_PASSWORD" dev develop config.json 
fi

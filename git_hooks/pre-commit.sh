#!/usr/bin/env sh

command()
{
  $@
  code=$?
  if [ $code -gt 0 ]
  then
    exit $code
  fi
}

changed=`git diff --cached --name-only | grep promsync.es`

if [ $changed ]
then
  command npm test
  command npm run build
  git add promsync.js
fi

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
  command npm run precompile
  git add promsync.js
  git add promsync.min.js
fi

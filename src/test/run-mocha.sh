#!/bin/bash
#
# Script to be run in Jenkins context.  This is a complication,
# because Jenkins tests on a remote running server. However it
# checks out the project to access the run-mocha and other scripts.
#
# Needs following paramters set in the context/environment:
#   user / passwd - Http basic auth credentials
#   host - host to access
#
# Algorithm
# 1. trigger run all mocha suites
# 2. finally download the results and interpret them

# get script path
case $OSTYPE in
    linux*)
      script=$(readlink -f "$0")
      scriptPath=$(dirname "$script")
    ;;
    darwin*)
      script="${BASH_SOURCE[0]}"
      scriptPath=$( cd "$( dirname "$script" )" && pwd )
    ;;
    *)
    echo "Unsupported OSTYPE: $OSTYPE"
    exit 1
esac
mochaPath=`pwd`
# get script dir required for simple extractData.js
cd "$scriptPath"

#curl -v -k --user "$user":"$passwd" $host/2/test/:runAllMochaSuites
#sleep 300
curl -k --user "$user":"$passwd" $host/2/test/:getLastMochaReport > ./xunit.json
"$scriptPath"/../../runtime/bin/node "$scriptPath"/extractData.js > "$mochaPath"/xunit.xml
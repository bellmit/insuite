#!/bin/bash
# Usage build.sh <gituser> <VPRC|PUC|DCPRC>
# Script ist used during deployment
# It should contain all nessesary steps before upload

case "$OSTYPE" in
    linux*)
      script="$(readlink -f "$0")"
      scriptPath="$(dirname "$script")"
    ;;
    darwin*)
      script="${BASH_SOURCE[0]}"
      scriptPath="$( cd "$( dirname "$script" )" && pwd )"
    ;;
    *)
      echo "Unsupported OSTYPE: $OSTYPE"
      exit 1
    ;;
esac

trap errorInScript ERR

scriptArgs="$*"
TMP_DIR="$scriptPath/tmp_n"

errorInScript() {
    set +u
    if [[ -z "$1" ]]; then
        echo "$script failed with ERR (set -e)"
        exit 1
    else
        echo "$script failed - ERR: $1"
        exit 1
    fi
}

_cleanup() {
    echo "Cleanup obsolete files"
    if [ "$DCAPP" != "puc" ]; then
            rm -f sms.json
    fi
    if [ "$DCAPP" != "prc" ]; then
            rm -rf var/
    else
            find var/* -maxdepth 0 -type d -not -name 'istack' -exec rm -rf {} \;
    fi
    echo "Remove npm tmp dir"
    rm -rf "$TMP_DIR"
    echo "Remove .git directories from node_modules."
    rm -rf node_modules/*/.git/
}

# dc-server now "ships" (its more or less linked and created during build) its runtime
# its installed during build and packaged into RPM
# runlevel scripts using this runtime directory
if [[ "$OSTYPE" == "linux"* ]]; then

        nodeVersion="$(grep -Po '(?<="node": ")[^"]*' package.json)"
        npmVersion="$(grep -Po '(?<="npm": ")[^"]*' package.json)"
        echo "==== node: $nodeVersion"
        echo "====  npm: $npmVersion"
        set -x
        nodeTarball="/tmp/node-v${nodeVersion}-linux-x64.tar.xz"
        echo "Download NodeJS"
        curl -L -k -o "$nodeTarball" "https://nodejs.org/dist/v$nodeVersion/node-v${nodeVersion}-linux-x64.tar.xz"
        tar -xJ -f "$nodeTarball" -C "$scriptPath"
        if [[ -d "${scriptPath}/runtime" ]]; then rm -rf "${scriptPath}/runtime"; fi
        mv "${scriptPath}/node-v${nodeVersion}-linux-x64" "${scriptPath}/runtime"
        # update PATH
        PATH="${scriptPath}/runtime/bin:$PATH"
        TMPDIR="$TMP_DIR"
        export PATH TMPDIR
        # npm installation must be done here to avoid the application itself get messed up with npm deps
        # use only if shipped npm version is buggy for us
        #echo "Install custom version of NPM."
        #cd "${scriptPath}/runtime/lib"
        #npm install "npm@${npmVersion}"
        #echo "Now using npm: $(npm --version)"
fi
if [[ "$OSTYPE" == "darwin"* ]]; then echo "No runtime setup on OSX"; fi

set -u

# only for development tests on Jenkins
# see https://jenkins.intra.doc-cirrus.com/view/DEV%20Tests/
if [[ "$scriptArgs" == *"--tests"* ]]; then
  cd "$scriptPath"
  # configure npm registry
  npm config set registry "https://nexus-proxy.intra.doc-cirrus.com/repository/npm/"
  npm config set strict-ssl false
  # we should try to implement an approach which is
  # easier to maintain and keeps all npm dependencies
  # only in the package.json
  npm install --no-package-lock --no-save \
    mocha chai chai-as-promised restify-clients \
    moment deep-equal-in-any-order escodegen \
    estraverse esprima sinon sinon-chai \
    json-schema-faker faker node-mongodb-fixtures
  echo "set permissions for run-mocha.sh"
  chmod 0700 ./src/test/run-mocha.sh
  exit 0
fi

# unused
if [[ $# -lt 2 ]]; then errorInScript "Not enough arguments OR missing argument --tests"; fi

GITUSER="$1"

DCAPP="$2"
if [[ -z "$DCAPP" ]]; then errorInScript "Missing application type!"; fi
# lowercase app
DCAPP="$(echo -n "$DCAPP" | tr '[:upper:]' '[:lower:]')"

cd "$scriptPath"
mkdir "$TMP_DIR" || :

echo "temporary, libaru information"
ldconfig -p | grep "pdf"

echo "installing node modules (all)"
npm ci

PATH="${scriptPath}/node_modules/grunt-cli/bin/:$PATH"
export PATH
echo "Start grunt with DCAPP=$DCAPP"
grunt install "$DCAPP"
grunt dist

#rebuild koTemplates
grunt koTemplates

# webpack build
npm run buildW

_cleanup

echo "cleanup devDependencies node_modules"
npm prune --production



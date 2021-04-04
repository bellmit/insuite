#!/bin/bash

CWD=$(cd $(dirname $0) && pwd)
CUSTOMNO=$1

CUSTOMDIR="$CWD/var/istack/customer_$CUSTOMNO"
GITREMOTE="git@gitlab.intra.doc-cirrus.com:dev/customscripts.git"
GITISTACK="git@gitlab.intra.doc-cirrus.com:dev/dc-istack.git"
mkdir -p $CUSTOMDIR
cd $CUSTOMDIR

echo "fetching config for customer $CUSTOMNO"
git archive --remote=$GITREMOTE $CUSTOMNO | tar x
echo "fetching install script"
git archive --remote=$GITREMOTE master | tar x

if [ ! -f ./install.sh ]; then
    echo "install script missing!"
    exit 1
fi

chmod 755 ./install.sh

./install.sh "$CUSTOMNO"

echo "fetching istack"
mkdir -p "$CWD/node_modules/dc-istack"
cd "$CWD/node_modules/dc-istack"
git archive --remote=$GITISTACK master | tar x
echo "installing istack dependencies"
npm install

# checking for numeric values here
if [ "$CUSTOMNO" -eq "$CUSTOMNO" ] 2>/dev/null; then
    echo "setting up PRCS"
	grunt prc --with-istack
fi

rm -rf "$CUSTOMDIR"

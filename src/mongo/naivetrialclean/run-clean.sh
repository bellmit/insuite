#! /bin/bash
#
# naive clean routine

SCRIPT=$(readlink -f $0)
SCRIPTPATH=$(dirname $SCRIPT)

mongo 0 $SCRIPTPATH/clean.js
rm $SCRIPTPATH/clean.js


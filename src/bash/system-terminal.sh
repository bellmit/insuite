#!/usr/bin/env bash

command="$1"
original="$2"
temporary="$3"

# copy log archive into an temporary
# directory and extract it
if [ -f "$original.gz" ] && [ ! -f $temporary ] ;then
    cp "$original.gz" "$temporary.gz"
    gzip -d "$temporary"
fi

# execute the given command
eval $command
# make sure the terminal can
# not be used after the command
exit

#!/usr/bin/env bash

echo "starting app at $1"
cd $1
./run.sh 1>>app.log 2>&1 &
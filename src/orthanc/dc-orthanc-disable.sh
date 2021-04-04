#!/bin/bash
ID=$(pgrep Orthanc)
if [ -z "$ID" ]; then
    echo "Nothing to kill..."
else
    kill -KILL $ID
fi
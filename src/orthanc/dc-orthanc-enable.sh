#!/bin/bash
ID=$(pgrep Orthanc)
if [ -z "$ID" ]; then
    $DC_ENV/bin/Orthanc $1 $2
fi
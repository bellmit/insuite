#!/bin/bash
kill -KILL $(pgrep Orthanc)
$DC_ENV/bin/Orthanc $1 $2
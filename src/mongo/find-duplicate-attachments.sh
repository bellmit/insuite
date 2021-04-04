#!/bin/bash

# check database and save the log
mongo --port 27019 find-duplicate-attachments.js > duplicate-attachment-report.log

# filter log to only those entries wich relate to current bug
cat duplicate-attachment-report.log | grep "(>)" | grep -v "deduplicate"

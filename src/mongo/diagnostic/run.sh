#!/bin/bash
dc-mongo 0 < consistency.js > report.txt
cat report.txt | grep "^db" > fixes.txt

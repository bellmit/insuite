#!/bin/bash
cat consistency.js | sed -e 's/^[ \t]*//' | grep "/\*:"


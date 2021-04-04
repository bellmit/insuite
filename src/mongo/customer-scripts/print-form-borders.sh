#!/bin/bash
# This file is usually superfluous

ms_location="/var/www/dc2/dc-server/dcbaseapp/src/mongoscripts/customer-scripts/"
ms_file="print-form-borders.js"
ms_output="element-borders-report.log"

# check database and save the log
mongo $ms_location$ms_file > $ms_output

cat $ms_output
rm $ms_output

# medneo import scripts

These scripts are meant to be temporary in nature.

 Currently, medneo sends a CSV file, from which the build scripts generate
 mongo JS scripts, that can be run against the medneo mongoDB. The scripts
 iterate through all relevant DBs and insert the Treatments that have not
 been manually input. Ultimately medneo is supposed to manually input.

 Each build file checks the fields in the csv file submitted, before
 processing it.

## build-m-import-from-csv.js

imports the most common csv submissions, that contain the BG and PKV
(EHCPOL) records.

## build-m-gkv-import.js

builds only the PUBLICPOL records that are sent.

## build-m-patient-import.js

very temporary script to update GKV patient records with KT information
that was missing. checked in for reference purposes.
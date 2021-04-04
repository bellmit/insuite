#!/bin/bash

#this script run rest-api/mocha tests
#example: bash run-tests.sh -t rest-api -n 1 -c true

nodePath=/usr/local/bin/node


while getopts n:t:c: option
do
 case "${option}"
 in
 n) NUMBER=${OPTARG};; #number of test runs
 t) TYPE=${OPTARG};;   #type of test - rest-api or mocha
 c) CLEAR=${OPTARG};;  #clear current redis db - true or false
 esac
done

$nodePath testRunner.js $TYPE '' $NUMBER $CLEAR





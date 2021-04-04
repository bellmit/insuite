#!/bin/bash

# use this file for local testing

curl -v -k --user admin:123456 http://2222222222.dev.dc/2/test/:runAllMochaSuites
sleep 300
curl -v -k --user admin:123456 http://2222222222.dev.dc/2/test/:getLastMochaReport > ./xunit.json
node extractData.js > ./xunit.xml
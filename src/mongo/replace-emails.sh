#!/bin/bash

username='bhagyashri.bhutada'

echo -e '\n\nExecuting script for DCPRC'
mongo --port 27021 --eval "var userName='${username}'" $DC_ENV/dc-insuite/src/mongo/replace-emails-dcprc.js

echo -e '\n\nExecuting script for PRC'
mongo --port 27023 --eval "var userName='${username}'" $DC_ENV/dc-insuite/src/mongo/replace-emails-prc.js

echo -e '\n\nExecuting script for VPRC'
mongo --port 27019 --eval "var userName='${username}'" $DC_ENV/dc-insuite/src/mongo/replace-emails-vprc.js

echo -e '\n\nExecuting script for PUC'
mongo --port 27017 --eval "var userName='${username}'" $DC_ENV/dc-insuite/src/mongo/replace-emails-puc.js

echo -e '\n\nExecuting script for ISD'
mongo --port 27025 --eval "var userName='${username}'" $DC_ENV/dc-insuite/src/mongo/replace-emails-isd.js
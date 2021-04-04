#!/bin/bash

scp /home/maximilian.kramp/doccirrus/dc-insuite/src/bash/KAT-407.js /home/maximilian.kramp/doccirrus/dc-insuite/autoload/cron/hcicatalog-updater.server.js /home/maximilian.kramp/doccirrus/dc-insuite/autoload/dcdb.server.js prodsupport:~/bob-the-builder/
ssh -tt prodsupport <<-"EOF"

run() {
    if [ -z "$1" ]; then
        echo "No datensafe ID provided."
        return 1
    fi
    echo "$1: copying KAT-407.js, hcicatalog-updater.server.js, dcdb.server.js"
    sudo -H -u supporter scp -r "KAT-407.js" "hcicatalog-updater.server.js" "dcdb.server.js" support@${1}.hub:/home/support/

    echo "$1: ssh into server"
    sudo -H -u supporter ssh -A support@"$1".hub <<"SSHEOF"
        echo "$(hostname): become root"
        sudo su

        echo "$(hostname): making folder structure"
        cd /home/support/working/
        mkdir KAT-407 || exit 1
        cd KAT-407 || exit 1

        echo "$(hostname): moving files to KAT-407"
        mv /home/support/KAT-407.js ./
        mv /home/support/hcicatalog-updater.server.js ./
        mv /home/support/dcdb.server.js ./

        echo "$(hostname): creating backup files"
        cp /var/lib/prc/autoload/cron/hcicatalog-updater.server.js ./hcicatalog-updater.server.js.backup
        cp /var/lib/prc/autoload/dcdb.server.js ./dcdb.server.js.backup

        echo "$(hostname): stopping PRC"
        service prc stop

        echo "$(hostname): backup DB"
        dc-mongodump -d 0 -c admins
        dc-mongodump -d 0 -c catalogs

        echo "$(hostname): executing DB script"
        dc-mongo 0 ./KAT-407.js > "$(hostname).KAT-407.db.log"

        echo "$(hostname): applying patch"
        cp -f hcicatalog-updater.server.js /var/lib/prc/autoload/cron/hcicatalog-updater.server.js
        cp -f dcdb.server.js /var/lib/prc/autoload/dcdb.server.js

        echo "$(hostname): starting PRC"
        service prc start
SSHEOF

    echo "$1: done."
}

mkdir KAT-407 || cd $_
mv ~/bob-the-builder/KAT-407.js ./
mv ~/bob-the-builder/hcicatalog-updater.server.js ./
mv ~/bob-the-builder/dcdb.server.js ./
allServers=$(alias | grep -i "dc1mxplp\|dc1m73n7\|dc1m8vxr" | cut -d " " -f3-4 | cut -d "'" -f1)
while IFS='' read -r datensafeId || [ -n "${datensafeId}" ]; do
    run "$datensafeId" &
done <<< "$allServers"
EOF

#allServers=$(alias | grep -i "7CE838P31X" | cut -d " " -f3-4 | cut -d "'" -f1)
#db.admins.find({_id: ObjectId("000000000000000000000001")}, {lastHCICatalogUpdatingDate: 1}).pretty()
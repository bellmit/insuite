#!/bin/bash

scp ../mongo/LAM-1988.js prodsupport:~/bob-the-builder/
#will only work if a ssh config exists
ssh -tt prodsupport <<-"EOF"

run() {
    if [ -z "$1" ]; then
        echo "No datensafe ID provided."
        return 1
    fi
    sudo -H -u supporter scp -r "LAM-1988.js" support@${1}.hub:/home/support/
    sudo -H -u supporter ssh -A support@"$1".hub <<"SSHEOF"
        sudo su
        cd /home/support/working/
        mkdir LAM-1988
        cd LAM-1988 && mv /home/support/LAM-1988.js /home/support/working/LAM-1988/
        dc-mongo 0 LAM-1988.js > "$(hostname).log.csv"
        numberOfLines=$(wc -l "$(hostname).log.csv" | cut -d ' ' -f1)
        sed -i -e 1,"$((numberOfLines-1))"d "$(hostname).log.csv" && sed -i -e "s@<DC_SYSTEM_ID>@$(hostname)@g" "$(hostname).log.csv"
        mv "$(hostname).log.csv" /home/support/
        chown support:support /home/support/"$(hostname).log.csv"
SSHEOF
    dc-datensafe-scp-from "$1" /home/support/"${1}.log.csv"
    echo "$1 done."
}

mkdir LAM-1988 || cd $_
mv ~/bob-the-builder/LAM-1988.js ./
allServers=$(alias | grep -i dc-datensafe-login | cut -d " " -f3-4 | cut -d "'" -f1)
while IFS='' read -r datensafeId || [ -n "${datensafeId}" ]; do
    run "$datensafeId" &
done <<< "$allServers"
EOF


## Run these commands when everything has finished
#rm -f LAM-1988.csv
#find . -type f -name '*.log.csv' -exec cat {} + >> LAM-1988.csv

##Get the CSV file
#scp prodsupport:~/bob-the-builder/LAM-1988/LAM-1988.csv ~/
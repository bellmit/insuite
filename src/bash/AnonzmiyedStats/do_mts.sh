#!/bin/bash
# 
# Licence relevant information from all STS customers.
mongo_script="mts_mm_analysis.js"

echo "script to copy $mongo_script to a remote host and run it."

function execRemoteMTS {

    ssh_host=$1

    #echo "Copying file $mongo_script to $ssh_host..."
    dc-datensafe-scp-to $ssh_host $mongo_script

    #echo "Executing mongo query, output to $ssh_host-$output_file..."
    sudo -H -u supporter ssh root@$ssh_host.mts "dc-mongo --quiet  0 /mnt/dc-storage/incoming/$mongo_script"
}

# MTS
#  script....??
# alias | grep mts | cut -f 7 -d ' ' | cut -f 1 -d "." | cut -f 2 -d "@" | xargs -n 1 -I JJJJ echo "execRemote 'JJJJ'"
execRemoteMTS '41BKYQ2'
execRemoteMTS '6C1N5T2'
execRemoteMTS '7YSDFV2'
execRemoteMTS 'DCM3INJ507'
execRemoteMTS 'DCM2QZJAAKWQA'
execRemoteMTS 'DCMPD3FFZB'



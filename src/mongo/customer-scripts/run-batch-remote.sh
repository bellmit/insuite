#!/bin/bash
#
# Script to do something for all STS/MTS customers.
mongo_script="mm_analysis.js"

echo "script to copy $mongo_script to a remote host and run it."

function execRemote {

    ssh_host=$1

    #echo "Copying file $mongo_script to $ssh_host..."
    dc-datensafe-scp-to $ssh_host $mongo_script

    #echo "Executing mongo query, output to $ssh_host-$output_file..."
    sudo -H -u supporter ssh root@$ssh_host.hub "dc-mongo --quiet  0 /mnt/dc-storage/incoming/$mongo_script"
}

function execRemoteMTS {

    ssh_host=$1

    #echo "Copying file $mongo_script to $ssh_host..."
    dc-datensafe-scp-to $ssh_host $mongo_script

    #echo "Executing mongo query, output to $ssh_host-$output_file..."
    sudo -H -u supporter ssh root@$ssh_host.mts "dc-mongo --quiet  0 /mnt/dc-storage/incoming/$mongo_script"
}


# MTS
#  script....??
# DCMPD3FFZB
# 7YSDFV2
# 6C1N5T2
# alias | grep mts | cut -f 7 -d ' ' | cut -f 1 -d "." | cut -f 2 -d "@" | xargs -n 1 -I JJJJ echo "execRemote 'JJJJ'"
#execRemoteMTS '41BKYQ2'
#execRemoteMTS '6C1N5T2'
#execRemoteMTS '7YSDFV2'
#execRemoteMTS 'DCM3INJ507'
#execRemoteMTS 'DCM2QZJAAKWQA'
#execRemoteMTS 'DCMPD3FFZB'


# STS
# alias | grep login | cut -f 3 -d ' ' | cut -f 1 -d "'" | xargs -n 1 -I JJJJ echo "execRemote 'JJJJ'"
#
# These lines need to be renewed before running the script because the datasafes change all t
execRemote cz1651011l
execRemote cz1520010s
execRemote cz154101bn
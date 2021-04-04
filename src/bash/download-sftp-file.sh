#!/usr/bin/env bash

# Downloads the binaer.zip file from our sftp server using nohup
# This script can also be run as a one-liner

# Requires sshpass. Bear in mind that this method is not the most secure

read -s -p "Enter Username: " TMP_USERNAME;
read -s -p "Enter Password: " TMP_PASSWORD;
REMOTE_FILE_NAME="";
LOCAL_FILE_NAME="";
COMMAND="sshpass -p $TMP_PASSWORD sftp $TMP_USERNAME@sftp.doc-cirrus.com:$REMOTE_FILE_NAME $LOCAL_FILE_NAME";
nohup "$COMMAND" > transfer.log;
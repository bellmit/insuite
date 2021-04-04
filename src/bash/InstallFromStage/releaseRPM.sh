#!/bin/bash
#
# copy stage rpm to prod
#

#RPM_NAME=dc-insuite-sol-sumex
RPM_NAME=dc-server-prc
#RPM_NAME=dc-rules
#RPM_NAME=dc-catalogs
#STAGE_NAME=sprint
STAGE_NAME=ci
USERNAME=`whoami`
SERVER_NAME=CIPRCS3
#SERVER_NAME=DATENSAFE
WORKING_DIR=/home/$USERNAME
echo 'user $username'

# load the binary of the rpm
ssh -A $USERNAME@${STAGE_NAME}support.intra.doc-cirrus.com "/usr/bin/sudo -H -u supporter ssh root@$SERVER_NAME.hub" << EOF
set -e
cd /root/working
yum -y --downloaddir=./ --downloadonly reinstall $RPM_NAME
echo "setting std name"
rpm -aq | grep -E "$RPM_NAME-[0-9]" | xargs -I JJJJ  tar -cvzf rpm4download.tgz JJJJ.rpm
echo "done loading binary"
EOF

# prepare transport directory
echo "preparing intermediary"
ssh -A $USERNAME@${STAGE_NAME}support.intra.doc-cirrus.com "if [[ -d "$WORKING_DIR/freedirectory" ]]; then rm -rf "$WORKING_DIR/freedirectory"; fi"
ssh -A $USERNAME@${STAGE_NAME}support.intra.doc-cirrus.com "mkdir freedirectory; chmod 0777 freedirectory"
# scp result to intermediary
echo "scp result to intermediary"
ssh -A $USERNAME@${STAGE_NAME}support.intra.doc-cirrus.com "/usr/bin/sudo -H -u supporter scp -r root@$SERVER_NAME.hub:/root/working/rpm4download.tgz $WORKING_DIR/freedirectory"
# scp result from intermediary
echo "scp result from intermediary"
scp $USERNAME@${STAGE_NAME}support.intra.doc-cirrus.com:~/freedirectory/rpm4download.tgz .
# scp result to final destination
echo "scp result to final destination"
dc-datensafe-scp-to $1 rpm4download.tgz /tmp/rpm4download

# load the binary of the rpm
/usr/bin/sudo -H -u supporter ssh support@$1.hub << EOF
set -e
cd /tmp/rpm4download
tar -xvzf rpm4download.tgz |  xargs -I JJJJ echo "Now do:   service prc stop; yum install "JJJJ" ; service prc start"
EOF

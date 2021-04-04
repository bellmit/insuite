#! /bin/bash
# clean script to move package json back to internal doc cirrus format.
#

sed -e 's doc-cirrus.com/ext-dev/dc-core doc-cirrus.com/dev/dc-core ;s doc-cirrus.com/ext-dev/node-java doc-cirrus.com/dev/node-java ;s doc-cirrus.com/ext-dev/mojito doc-cirrus.com/dev/mojito ;s doc-cirrus.com/ext-dev/dc-server-middleware doc-cirrus.com/dev/dc-server-middleware ;s doc-cirrus.com/ext-dev/dc-server-communications doc-cirrus.com/dev/dc-server-communications ;s doc-cirrus.com/ext-dev/dc-sdk-communications doc-cirrus.com/dev/dc-sdk-communications ;s_"easyrtc": "1.0.13",_"dc-easyrtc": "git+ssh://git@gitlab.intra.doc-cirrus.com/dev/dc-easyrtc.git#0.1.2",_'


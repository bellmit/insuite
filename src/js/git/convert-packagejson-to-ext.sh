#! /bin/bash
# smudge script to move package json to external doc cirrus format.
#

sed -e 's doc-cirrus.com/dev/dc-core doc-cirrus.com/ext-dev/dc-core ;s doc-cirrus.com/dev/node-java doc-cirrus.com/ext-dev/node-java ;s doc-cirrus.com/dev/mojito doc-cirrus.com/ext-dev/mojito ;s doc-cirrus.com/dev/dc-server-middleware doc-cirrus.com/ext-dev/dc-server-middleware ;s doc-cirrus.com/dev/dc-server-communications doc-cirrus.com/ext-dev/dc-server-communications ;s doc-cirrus.com/dev/dc-sdk-communications doc-cirrus.com/ext-dev/dc-sdk-communications ;s_"dc-easyrtc": "git+ssh://git@gitlab.intra.doc-cirrus.com/dev/dc-easyrtc.git#0.1.2",_"easyrtc": "1.0.13",_'


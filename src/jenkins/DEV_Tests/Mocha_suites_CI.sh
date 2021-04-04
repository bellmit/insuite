# exit when failed
set -e

# get node and npm and mocha into the env
./build-test.sh

# copy mocha to the MTS via cisupport
tar czf jenkins-mocha-mvprc.tgz  ./node_modules/
scp jenkins-mocha-mvprc.tgz jenkins@cisupport.intra.doc-cirrus.com:
ssh -A jenkins@cisupport.intra.doc-cirrus.com "/usr/bin/sudo -H -u supporter scp /home/jenkins/jenkins-mocha-mvprc.tgz root@medneo.ci.intra.doc-cirrus.com:"
ssh -A jenkins@cisupport.intra.doc-cirrus.com "/usr/bin/sudo -H -u supporter ssh root@medneo.ci.intra.doc-cirrus.com" << EOF
set -e
tar xzvf /root/jenkins-mocha-mvprc.tgz -C /var/lib/vprc
chown -R vprc:vprc /var/lib/vprc/node_modules

# run mocha tests
cd /var/lib/vprc/
/var/lib/vprc/runtime/bin/node /var/lib/vprc/server.js start 12358 --mocha --server-type vprc --nofork --skipJadeCache --useSuiteList --reporter dc-xunit
EOF

# fetch the results from medneo server
ssh -A jenkins@cisupport.intra.doc-cirrus.com "/usr/bin/sudo -H -u supporter ssh root@medneo.ci.intra.doc-cirrus.com 'cat /var/lib/vprc/assets/xunit.xml'" > ./xunit.xml
#!/bin/bash
#
# See also MOJ-8623
#
# This script will export a data safe customer data
# without "computed collections" that take a lot of time
# and space to dump.
#
# Also avoids dumping all IMAGES.  To get those, one must
# also include "fs.chunks".  The reason they are excluded here
# is because they can be dumped with the "mongofiles" command
# for an XBDT type dump.
#
nohup dc-mongodump --excludeCollection formtemplateversions --excludeCollection catalogusages --excludeCollection rules --excludeCollection audits --excludeCollection fs.chunks --excludeCollection reportings --excludeCollection catalogs --excludeCollection catalogviewerindexes -d 0

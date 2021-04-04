#!/bin/bash
echo "Concatenating all tests into a single file..."
rm consistency.js
cat check-basecontacts.js >> consistency.js
cat check-activities.js >> consistency.js

echo "...done."
echo ""
echo "To check PRC database:"
echo ""
echo "    dc-mongo 0 < consistency.js > report.txt"
echo ""
echo "To extract fixes from the report:"
echo ""
echo "    cat report.txt | grep \"^db.\""
echo ""

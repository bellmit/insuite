#!/usr/bin/env bash

DATASOURCE="$BRIEFEPATH"
DICOMIMPORTLOG="$LOGPATH"

# create $DICOMTARGET if needed
if [ ! -d $DICOMTARGET ]; then
  mkdir -p $DICOMTARGET;
fi

# import all DICOM files into the local orthanc (ignore endings)
for file in $(find $DATASOURCE -type f); do
  if [ $(file "$file" | grep -q "DICOM"; echo $?) -eq 0 ]; then
    echo "$file is a dicom file, try to import it into orthanc"
    /usr/bin/curl -X POST -H "Expect:" http://localhost:8042/instances --data-binary @"$file" >> $DICOMIMPORTLOG
  fi
done
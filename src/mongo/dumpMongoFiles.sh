#! /bin/bash
#
# based on https://stackoverflow.com/questions/42759566/bash-script-for-putting-thousands-of-files-into-separate-folders
#
# Script to dump all mongofiles.  For a clean CSV manifest based export (for customers), see export-mongofiles-csv.js
#
PASSWD=d9b9a3e5-363a-4728-8a52-6a9613cfb490
mongofiles -d 0 -u admin -p $PASSWD --authenticationDatabase admin --quiet list > filelist
c=0
d=1
dir_name=$(printf "./%06d" $d)
mkdir -p $dir_name
list=`cat filelist`

for file in $list
do
    if [ $c -eq 1000 ]
    then
        c=0
        d=$(( d + 1 ))
        dir_name=$(printf "./%06d" $d)
        mkdir -p $dir_name
    fi
    mongofiles -d 0 -u admin -p $PASSWD --authenticationDatabase admin -l $dir_name/$file get $file
    c=$(( c + 1 ))
done
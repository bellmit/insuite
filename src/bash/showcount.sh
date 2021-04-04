COUNT=`git show --stat $1 | grep insertions`
echo $2--$1 - ${COUNT} 

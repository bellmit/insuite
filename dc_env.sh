#! /bin/sh

PATH_MOLE="mole"
PATH_PUC="servers/puc/dcbaseapp"
PATH_VPRC="servers/vprc/dcbaseapp"
PATH_DCPRC="servers/dcprc/dcbaseapp"
PATH_PRC="servers/prc/dcbaseapp"

MASTER_PATH=$PATH_VPRC

function showHelp() {
	echo "Please use one of the following parameters to run dc_env.sh"
	echo "     dc_env commit 'message'   - git commit, will ask you for adding files"
	echo "     dc_env push               - pull + push master path"
	echo "     dc_env sync               - sync your files from master path"
	echo "     dc_env status             - git status"
	echo "     dc_env npm                - runs npm install in all dirs"
	echo "     dc_env pull               - pull all repos and run grunt in dev mode"
	echo "     dc_env start puc/devproxy - start mojito or devproxy"
	echo "     dc_env info               - show path info of expected path"
}

function pathInfo() {
	echo "PATH INFO"
	echo "mole:     $PATH_MOLE"  
	echo "puc:      $PATH_PUC"
	echo "vprc:     $PATH_VPRC"
	echo "dcprc:    $PATH_DCPRC"
	echo "prc:      $PATH_PRC"
}

function checkChanges() {
	CHANGED=$(git diff-index --name-only HEAD --)  
	if [ -n "$CHANGED" ]
		then
	    # changes
	    	echo "!!! Warning !!!"
	    	echo "You have uncommitted changes in $(pwd)."
	    	echo "Stash changes? (y/N)"
	    	read stashChanges
			if [ "$stashChanges" != "y" ]
				then
				    echo "Aborting update, please commit and push changes before pulling"
				    exit
			fi
			git stash
	fi
}

function pull() {
	echo "Running update process..."
	echo "Updating Mole..."
	cd ../../../
	cd $PATH_MOLE
	git pull origin master
	echo "Updating PUC..."
	cd ../
	cd $PATH_PUC
	checkChanges
	git pull origin master
	git fetch origin
	grunt dev-puc    
	echo "Updating VPRC..."
	cd ../../../
	cd $PATH_VPRC
	checkChanges
	git pull origin master
	git fetch origin
	grunt dev-vprc	
	#echo "Updating DCPRC...(not used yet)"
	echo "Done."
}

function sync() {
	cd ../../../
	cd $MASTER_PATH
	rm ../../diff.txt
	git diff --name-only >> ../../diff.txt
	echo "You are running a local git sync from HEAD"
	echo "Warning: Copying changed files from $MASTER_PATH to $PATH_PUC"
	echo "Please confirm (y/N)"
    read answer
    if [ "$answer" != "y" ]
    then
        exit 1
    fi
	while read line           
		do           
			cp "../../../$MASTER_PATH/$line" "../../../$PATH_PUC/$line"
		    echo "$MASTER_PATH/$line >> $PATH_PUC/$line"           
		done <../../diff.txt   
	echo "done."
}

function sync_dcprc() {

        cd ../../../
	cd $MASTER_PATH
	rm ../../diff.txt
	git diff --name-only >> ../../diff.txt
	echo "You are running a local git sync from HEAD"
	echo "Warning: Copying changed files from $MASTER_PATH to $PATH_DCPRC"
	echo "Please confirm (y/N)"

	read answer
	if [ "$answer" != "y" ]; then
		exit 1
	fi
	while read line 
	do
		cp "../../../$MASTER_PATH/$line" "../../../$PATH_DCPRC/$line"
		echo "$MASTER_PATH/$line >> $PATH_DCPRC/$line"           
	done <../../diff.txt
	echo "done."
}

function push() {
	echo "Pulling from $MASTER_PATH"
	cd ../../../
	cd $MASTER_PATH
	git pull origin master
	CHANGED=$(git diff-index --name-only HEAD --)  
	if [ -n "$CHANGED" ]
		then
	    # changes
	    	echo "Got changes from server... auto-committing."
	    	git commit -m "Auto merge dc-env script"
	fi
	echo "Pushing..."
	git push origin master
	pull
}


if [ $1 ]
	then
		echo "Master path is set to $MASTER_PATH"
		case "$1" in
			push)
				push
			;;
			commit)
				cd ../../../
				cd $MASTER_PATH
				if [ "$2" ]
					then
						echo "Add all tracked changed files? (y/N)"
						read trackFiles
						if [ "$trackFiles" == "y" ] 
							then
								git add --update
						fi
						echo "Committing - $2"
						git commit -m "$2"
					else
						echo "Please enter a commit message."
				fi
			;;
			sync)
				sync
			;;
			sync_dcprc)
				sync_dcprc
			;;
			status)
				git status
			;;
			start)
				if [ $2 ]
					then
						case "$2" in
							dcprc)
								cd ../../../
								cd $PATH_DCPRC
								mojito start 3300 --context environment:production
							;;
							puc)
								cd ../../../
								cd $PATH_PUC
								mojito start 3030 --context environment:production 
							;;
							vprc)
								cd ../../../
								cd $PATH_VPRC
								mojito start 3000 --context environment:production 
							;;
							devproxy)
								cd ../../../
								cd $PATH_MOLE
								sudo node devproxy.js
							;;
							prc)
								cd ../../../
								cd $PATH_PRC
								mojito start 8000 --context environment:production
							;;
						esac
					else 
						echo "Please specify a starting parameter"
						echo "   puc"
						echo "   vprc"
						echo "   devproxy"
				fi
			;;
			npm)
				echo "Running npm install..."
				cd ../../../
				cd $PATH_VPRC
				npm install
				cd ../../../
				cd $PATH_PUC
				npm install
				cd ../../../
				cd $PATH_MOLE
				npm install
			;;
			pull)
				pull
			;;
			info)
				pathInfo
			;;
			help)
				showHelp
			;;
			*)
				showHelp
			;;
		esac
	else
		showHelp
fi

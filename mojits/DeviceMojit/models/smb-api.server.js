/*global YUI */


YUI.add( 'smb-api', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            mkdirp = require( 'mkdirp' ),
            exec = require( 'child_process' ).exec,
            sanitize = require( "sanitize-filename" ),
            importFolderPath = Y.doccirrus.auth.getDirectories( 'smbRootIn' ),
            exportFolderPath = Y.doccirrus.auth.getDirectories( 'smbRootOut' ),
            globalPath = __dirname.substring( 0, __dirname.indexOf( 'mojits' ) ),
            defaultUser = 'smb-doccirrus',
            cluster = require( 'cluster' );

        function initSmbRootPath( path ) {
            function done( err, result ) {
                if( err ) {
                    Y.log( 'error creating smb root directories ' + err, 'error', NAME );
                }
                else{
                    if( result ) {
                        Y.log( 'created smb root directories. Path: ' + result, 'debug', NAME );
                    }
                    else {
                        Y.log( 'Can not created smb root directories. Already created. ', 'debug', NAME );
                    }
                }
            }

            if( path ) {
                mkdirp( path, done );
            }
            else {
                Y.log( 'error creating smb root directories, path undefined.', 'error', 'NAME' );
            }
        }

        if(  Y.doccirrus.auth.isPRC() && cluster.isMaster ) {
            initSmbRootPath( importFolderPath );
            initSmbRootPath( exportFolderPath );
        }

        function execute( cmd, callback ) {
            exec( cmd, function( err, result ) {
                if( err && err.code !== 9 ) {
                    Y.log( 'Error while executing command: ' + cmd + ' . Err: ' + err, 'error', NAME);
                    return callback( err );
                }
                return callback( null, result );
            } );
        }

        function getUsername( username ) {
            return username.replace( " ", "" ).toLowerCase();
        }

        function createFolder( args ) {//eslint-disable-line
            var path,
                user = /*args.user.id ||*/ defaultUser,
                query = args.httpRequest.query,
                cb = args.callback;
            if(  Y.doccirrus.auth.isPRC() ) {
                if ( fs.existsSync( importFolderPath ) && fs.existsSync( exportFolderPath ) )
                {
                    if( query.import ) {
                        if( !importFolderPath ) {
                            return cb( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Bad root smb path. '} ) );
                        }
                        path = sanitize( query.import );
                        if( path ) {
                            path = importFolderPath + '/' + path;
                            fs.mkdir( path, ( err )=> {
                                if( err ) {
                                    return cb( err );
                                }
                                share( user, path, query.import + 'I', function( err ) {
                                    if( err ) {
                                        reverseCreatingFolder( query );
                                        return cb( err );
                                    }
                                    return cb();
                                } );
                            } );
                        }
                        else {
                            return cb( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error. Bad path.'} ) );
                        }
                    } else if( query.export ) {
                        if( !exportFolderPath ) {
                            return cb( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Bad root smb path. '} ) );
                        }
                        path = sanitize( query.export );
                        if( path ) {
                            path = exportFolderPath + '/' + path;
                            fs.mkdir( path, ( err )=> {
                                if( err ) {
                                    return cb( err );
                                }
                                else {
                                    share( user, path, query.export + 'E', function( err ) {
                                        if( err ) {
                                            reverseCreatingFolder( query );
                                            return cb( err );
                                        }
                                        return cb();
                                    } );
                                }
                            } );
                        }
                        else {
                            return cb( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error. Bad path.'} ) );
                        }
                    } else {
                        return cb( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error. No request query.'} ) );
                    }
                }
                else {
                    return cb( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error smbroot directory is not created.'} ));
                }
            }
            else {
                return cb();
            }
        }

        function removeFolder( query, cb ) {
            var path = '';
            if(  Y.doccirrus.auth.isPRC() ) {
                if( query.import ) {
                    if( !importFolderPath ) {
                        return cb();
                    }
                    path = sanitize( query.import );
                    if( path ) {
                        query = path+'I';
                        path = importFolderPath + '/' + path;
                    }
                } else if( query.export ) {
                    if( !exportFolderPath ) {
                        return cb();
                    }
                    path = sanitize( query.export );
                    if( path ) {
                        query = path+'E';
                        path = exportFolderPath + '/' + path;
                    }
                }
                if( path && query ) {
                    execute('net usershare delete '+ query, ( err )=>{
                        if (err){
                            Y.log('Error while deleting directory. Error: ' + err, 'error', NAME);
                        }
                    });
                    fs.rmdir( path, cb );
                }
                else {
                    return cb( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error. Bad path.'} ) );
                }
            }
            else {
                return cb();
            }
        }

        function reverseCreatingFolder( query ){
            removeFolder( query, function( err ){
                if (err){
                    Y.log( 'Error while reverting sharing folders. Error: ' + err, 'error', NAME );
                }
            } );
        }

        function addUser( username, cb ) {
            if(  Y.doccirrus.auth.isPRC() ) {
                execute( 'sudo useradd --no-create-home --shell /bin/false --gid usershares ' + getUsername( username ), cb );
            }
            else {
                return cb();
            }
        }

        function removeUser( username, cb ) {
            function removeSmbUser(username, callback){
                execute( 'sudo pdbedit -x -u ' + username, callback );
            }
            if ( username ) {
                username = getUsername( username );
                if(  Y.doccirrus.auth.isPRC() ) {
                    execute( 'sudo userdel -r -f ' + username, function( err ){
                        if ( err ){
                            return cb( err );
                        }
                        removeSmbUser( username, cb );
                    } );
                }
                else {
                    return cb();
                }
            }
        }

        function setUserPassword( username, password, cb ) {
            var cmd;
            if(  Y.doccirrus.auth.isPRC() ) {
                if( username && password ) {
                    password = '"' + password.replace(/\\/g,'\\\\' ).replace(/"/g,'\\"' ).replace(/&/g,'\\&' ).replace(/'/g,"\\'") + '"';
                    cmd = '(echo ' + password + '; echo ' + password + ') | sudo pdbedit -a -u ' + getUsername( username );

                    const cmdToLog = `(echo **hidden*pass**; echo **hidden*pass**) | sudo pdbedit -a -u ${getUsername( username )}`;

                    exec( cmd, ( err, res )=>{
                        if (err){
                            Y.log( `setUserPassword: Error while executing command: ${cmdToLog}. Error: ${err}`, 'error', NAME);
                            return cb( err );
                        }
                        return cb(null, res);
                    });

                }
                else {
                    return cb( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Can not create username without username.'} ) );
                }
            }
            else {
                return cb();
            }
        }

        function addUserPassword( /*user,*/ query, callback ) {
            var username = /*user.id  ||*/ defaultUser;
            if(  Y.doccirrus.auth.isPRC() ) {
                if ( fs.existsSync( importFolderPath ) && fs.existsSync( exportFolderPath ) ) {
                    addUser( username, function( err ) {
                        if( err && err.code !== 9 ) {
                            return callback( err );
                        } else {
                            setUserPassword( username, query.password, ( err )=>{
                                if ( err ){
                                    return callback( err );
                                }
                                share( defaultUser, importFolderPath, "smbRootIn", ( err )=>{
                                    if ( err ){
                                        Y.log( 'error sharing smb root directories ' + err, 'error', NAME );
                                        return callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Smb root directory is not shared.'} ));
                                    }
                                    share( defaultUser, exportFolderPath, "smbRootOut", ( err )=>{
                                        if ( err ){
                                            Y.log( 'error sharing smb root directories ' + err, 'error', NAME );
                                            return callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Smb root directory is not shared.'} ));
                                        }
                                        return callback();
                                    } );
                                } );

                            } );
                        }
                    } );
                }
                else {
                    return callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Smb root directory is not created.'} ) );
                }
            }
            else {
                return callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Error. Wrong server type.'} ) );
            }
        }

        function share( user, path, title, cb){
            if ( path[0] !== '/' ){
                path = globalPath + path;
            }

            function netUsershare( path, title, user, cb){
                var cmd = 'net usershare -l add ' + title + ' ' + path + ' "" ' + user + ':f';
                execute( cmd, cb);
            }

            function changeGroup( path, title, user, cb ){
                execute( 'chgrp usershares ' + path, ( err )=>{
                    if (err){
                        Y.log( 'Error while sharing ' + title + '. Error: ' + err, 'error', NAME);
                        return cb(err);
                    }
                    netUsershare( path, title, user, cb );
                });
            }

            function changePermissions( path, title, user, cb ){
                fs.chmod( path, '0775', ( err )=>{
                    if ( err ){
                        Y.log( 'Error while sharing ' + title + '. Error: ' + err, 'error', NAME);
                        return cb(err);
                    }
                    changeGroup( path, title, user, cb );
                });
            }

            if( title && path && user ) {
                changePermissions( path, title, user, cb );
            }
            else {
                return cb( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error, can not share, undefined params.'} ) );
            }
        }

        Y.namespace( 'doccirrus.api' ).smb = {
            /**
             * @property name
             * @type {String}
             * @default file-api
             * @protected
             */
            name: NAME,
            removeUser: function( args ) {
                Y.log('Entering Y.doccirrus.api.smb.removeUser', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.smb.removeUser');
                }
                removeUser( /*args.user.id || */ defaultUser, args.callback );
            },
            addUserPassword: function( args ) {
                Y.log('Entering Y.doccirrus.api.smb.addUserPassword', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.smb.addUserPassword');
                }
                addUserPassword( /*args.user, */args.query, args.callback );
            }
        };

    },
    '0.0.1', {
        requires: []
    }
);

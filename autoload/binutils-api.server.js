/**
 * User: maximilian.kramp
 * Date: 11/4/20  3:28 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'binutils-api', function( Y, NAME ) {

        function Binutils() {
            Y.log( 'Created new binutilsapi Object', 'info', NAME );
            let config;

            try {
                config = require( 'dc-core' ).config.load( `${process.cwd()}/env.json` );
            } catch( e ) {
                console.error( `Could not load env.json ${e.stack || e}` ); // eslint-disable-line no-console
                process.exit( 1 );
            }
            if( !config || !config.binutils ) {
                console.error( 'Could not get environment from env.json' ); // eslint-disable-line no-console
                process.exit( 1 );
            }
            this.config = config.binutils;
        }

        /**
         * Returns available binary utilities.
         * @method getBinUtils
         *
         * @return {Object} binUtils
         */
        Binutils.prototype.getBinUtils = function getBinUtils() {
            return this.config;
        };

        /**
         * Returns path to binary utilities.
         * @method getPathToBinUtil
         *
         * @param {String} bin - Binary.
         *
         * @return {String} pathToBinary - path to binutil
         */
        Binutils.prototype.getPathToBinUtil = function getPathToBinUtil( bin ) {
            let pathToBinary = Object.getOwnPropertyNames( this.config ).find( binutil => binutil === bin );

            if( pathToBinary ) {
                return this.config[pathToBinary];
            }
            //workaround to support commands not listed in env.json
            //this will be replaced with something that checks if a given command is present in process.env...
            return bin;
            // or...
            // throw new Y.doccirrus.commonerrors.DCError( 404, {message: `binutil '${bin}' not found`} );
        };

        /**
         * @method constructShellCommand
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.bin - Binary.
         * @param {Array<String>} args.shellArgs - .
         * @param {Boolean} [args.sudo] - precede command with sudo.
         *
         * @return {String} shellCommand
         */
        Binutils.prototype.constructShellCommand = async function constructShellCommand( args ) {
            let {
                bin,
                shellArgs,
                sudo
            } = args;

            if( !bin ) {
                throw new Y.doccirrus.commonerrors.DCError( 404, {message: `binary not found in arguments`} );
            }
            if( !shellArgs ) {
                throw new Y.doccirrus.commonerrors.DCError( 404, {message: `shellArgs not found in arguments`} );
            }
            if( !Array.isArray( shellArgs ) ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `shellArgs must be an array`} );
            }
            if( !shellArgs.length ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `shellArgs must have elements`} );
            }
            shellArgs = shellArgs.filter( shellArg => {
                if( !shellArg ) {
                    return;
                }
                switch( typeof shellArg ) {
                    case "function":
                    case "object":
                    case "symbol":
                    case "undefined":
                        return;
                }
                //TODO: sanitize input to shell
                return true;
            } );
            if( !shellArgs.length ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `shellArgs must have non empty elements`} );
            }

            let pathToBinary;

            try {
                pathToBinary = this.getPathToBinUtil( bin );
            } catch( e ) {
                throw e;
            }

            shellArgs.splice( 0, 0, pathToBinary );
            if( sudo ) {
                shellArgs.splice( 0, 0, 'sudo' );
            }

            return shellArgs.join( ' ' );
        };

        Y.namespace( 'doccirrus' ).binutilsapi = new Binutils();

    },
    '0.0.1', {
        requires: []
    }
);

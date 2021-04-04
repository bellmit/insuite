/**
 * User: do
 * Date: 27/05/16  18:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */


YUI.add( 'tempdir-manager', function( Y, NAME ) {

        const
            join = require( 'path' ).join,
            baseTmpDir = Y.doccirrus.auth.getTmpDir(),
            tmpDirs = {
                km: join( baseTmpDir, 'kbv-km-tmp' ),
                pm: join( baseTmpDir, 'kbv-pm-tmp' ),
                'pm-dm1': join( baseTmpDir, 'kbv-pm-dm1-tmp' ),
                'pm-dm2': join( baseTmpDir, 'kbv-pm-dm2-tmp' ),
                'pm-bk': join( baseTmpDir, 'kbv-pm-bk-tmp' ),
                'pm-khk': join( baseTmpDir, 'kbv-pm-khk-tmp' ),
                'pm-asthma': join( baseTmpDir, 'kbv-pm-asthma-tmp' ),
                'pm-copd': join( baseTmpDir, 'kbv-pm-copd-tmp' ),
                'pm-ehks': join( baseTmpDir, 'kbv-pm-ehks-tmp' ),
                'pm-hgv': join( baseTmpDir, 'kbv-pm-hgv-tmp' ),
                'pm-ldk': join( baseTmpDir, 'kbv-pm-ldk-tmp' ),
                'edmp-delivery': join( baseTmpDir, 'edmp-delivery' ),
                'kvcaccount': join( baseTmpDir, 'kvcaccount' ),
                'okfe': join( baseTmpDir, 'okfe' ),
                'pm-qdocu': join( baseTmpDir, 'qdocu-tmp'),
                'kimTempDir': join( baseTmpDir, 'kimTempDir' )
            },
            childDirs = {
                'pm-qdocu': 'input'
            },
            Prom = require( 'bluebird' ),
            uuid = require( 'node-uuid' ),
            mkdirp = Prom .promisify( require( 'mkdirp' ) ),
            rimraf = Prom.promisify( require( 'rimraf' ) );

        function TempDir( path ) {
            this.path = path;
        }

        TempDir.prototype.done = function() {
            return rimraf( this.path );
        };

        function getDir( user, type ) {
            return Promise.resolve()
                .then( () => {
                    let baseDir = tmpDirs[type],
                        tmpDirName = user.tenantId + '-' + uuid.v1(),
                        childDir = childDirs[type] || '';

                    if( !baseDir ) {
                        throw Error( 'could not find baseTmpDir for type ' + type );
                    }

                    let path = join( baseDir, tmpDirName, childDir );

                    return mkdirp( path ).then( () => (new TempDir( path )) );
                } );
        }

        Y.namespace( 'doccirrus' ).tempFileManager = {
            name: NAME,
            get: getDir
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'casefolder-schema', 'dcgridfs']}
);


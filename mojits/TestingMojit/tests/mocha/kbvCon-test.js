/* global Y, describe, before, after, it, should, expect */

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    fs = require( 'fs' ),
    path = require( 'path' ),
    mockData = JSON.parse( fs.readFileSync( path.resolve( `${__dirname}/../fixtures/conFiles/kbvLogEntry.example.json/` ), 'utf8' ) );

describe( 'Kbvcon-api.server.js', function() {

    const user = Y.doccirrus.auth.getSUForLocal();
    describe( 'testing merge()', function() {
        describe( '[given] User has a KbvLogEntry a connected valid CONFile in the db and some CON-Files to merge uploaded to the db', function() {
            describe( '[when] User hits merge-button in Frontend. params-values are sent to the merge Function', function() {
                before( async function() {
                    // should insert KbvLogEntry to DB
                    this.kbvLogEntry = mockData.kbvLogEntry;
                    this.params = mockData.params;
                    let [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'kbvlog',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( this.kbvLogEntry )
                        } )
                    );
                    should.not.exist( err );

                    // should upload CON-Files to db.
                    let storeFile = Y.doccirrus.invoicelogutils.storeFile,

                        fs = require( 'fs' ).promises,
                        newfiles = [],
                        filesToUpload = this.params.files;

                    await Promise.all( filesToUpload.map( async file => {
                        let bufferOutputFile = await fs.readFile( file.path );

                        let [errfileId, fileId] = await formatPromiseResult( storeFile(
                            user,
                            file.mediaId,
                            {
                                "metadata": {
                                    "charset": "ISO-8859-1"
                                }
                            },
                            bufferOutputFile ) );
                        should.not.exist( errfileId );
                        file.conFileId = fileId;
                        newfiles.push( file );
                    } ) );
                    this.params.files = newfiles;

                    Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                        if( 'linkedActivityUpdate' !== params.event ) {
                            if( params.msg && params.msg.data && params.msg.data.state === 'finished' ) {
                                const errors = params.msg.data.errors;
                                return expect( errors ).to.be.an( 'array' ).that.is.empty;
                            }
                        }
                    } );

                } );
                after( async function() {
                    Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                } );

                it( '[then] execution of merge() without errors.', async function() {
                    this.timeout( 50000 );

                    await Y.doccirrus.api.kbvConFiles.merge( {
                        user,
                        originalParams: this.params
                    } );
                } );

            } );
        } );
    } );
} );
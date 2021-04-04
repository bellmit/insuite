/**
 * User: do
 * Date: 27/05/16  17:30
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edoc-filewriter', function( Y, NAME ) {
        const
            Iconv = require( 'iconv' ).Iconv,
            iconv = new Iconv( 'utf-8', 'iso-8859-15//TRANSLIT//IGNORE' ),
            Prom = require( 'bluebird' ),
            writeFile = Prom.promisify( require( 'fs' ).writeFile );

        function createFileWriter( args ) {
            let fileWriter = Object.create( {
                write: function( data ) {
                    this.xml += data;
                },
                end: function() {
                    // MOJ-8596
                    Y.doccirrus.edocutils.inspectEdocXML( this.xml,'fileWriter->end generated in utf8', NAME, this.user );

                    let convertedBuffer;

                    if( !args.isUTF8 ) {
                        convertedBuffer = iconv.convert( this.xml );
                        // MOJ-8596
                        let cBuffStr = convertedBuffer.toString( 'latin1' );
                        Y.doccirrus.edocutils.inspectEdocXML( cBuffStr, 'fileWriter->end converted to iso8859', NAME, this.user );
                    } else {
                        convertedBuffer = this.xml;
                    }
                    return writeFile( this.destination, convertedBuffer );

                }
            }, {
                xml: {
                    value: '',
                    writable: true
                },
                destination: {
                    value: args.destination
                },
                user: {
                    value: args.user
                }
            } );

            return fileWriter;
        }

        /* jshint ignore:end */

        Y.namespace( 'doccirrus' ).edocFileWriter = {
            name: NAME,
            createFileWriter: createFileWriter
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'casefolder-schema', 'dcgridfs', 'edoc-utils']}
);


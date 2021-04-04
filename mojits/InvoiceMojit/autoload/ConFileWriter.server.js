/**
 * User: do
 * Date: 11/05/15  15:01
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'ConFileWriter', function( Y ) {

        var Iconv = require( 'iconv' ).Iconv,
            Path = require( 'path' ),
            fs = require( 'fs' ),
            Prom = require( 'bluebird' ),
            readFile = Prom.promisify( fs.readFile ),
            appendFile = Prom.promisify( fs.appendFile ),
            Handlebars = require( 'handlebars' ),
            HandlebarsKBV = require( Path.join( __dirname, '../kbv-handlebars.js' ) ),
            iconv = new Iconv( 'utf-8', 'iso-8859-15//TRANSLIT//IGNORE' ),
            headerTemplate,
            scheinTemplate,
            kbvEnd = '0138000adt9\r\n0138000con9';

        // this should fail fast
        readFile( Path.join( __dirname, '../kbvHeader.tpl' ) ).then( function( kbvHeader ) {
            headerTemplate = kbvHeader;
            return readFile( Path.join( __dirname, '../kbvSchein.tpl' ) );
        } ).then( function( kbvSchein ) {
            scheinTemplate = kbvSchein;
        } );

        function write( filepath, rendered, thisArg ) {
            var converted;
            var len = rendered.length;
            if( '\n' !== rendered[len - 1] && '\r' !== rendered[len - 2] ) {
                rendered += '\r\n';
            }

            converted = iconv.convert( rendered );

            if( !thisArg.buffer ) {
                thisArg.buffer = converted;
            } else {
                thisArg.buffer = Buffer.concat( [thisArg.buffer, converted] );
            }
            return appendFile( filepath, converted );
        }

        function ConFileWriter( args ) {
            var self = this;
            this.now = args.now;
            this.filepath = args.filepath;
            this.lines = [];

            HandlebarsKBV.register( Y, function( line ) {
                self.lines.push( line );
            } );

            try {
                this.compiledHeader = Handlebars.compile( headerTemplate.toString(), {noEscape: true} );
                this.compiledSchein = Handlebars.compile( scheinTemplate.toString(), {noEscape: true} );
            } catch( err ) {
                throw( err );
            }
        }

        ConFileWriter.prototype.write = function( invoiceEntry ) {
            var filepath = this.filepath,
                now = this.now,
                rendered;

            try {
                if( 'header' === invoiceEntry.type ) {
                    invoiceEntry.data.__now = now;
                    // exclude physicians in qualification from being written to BESA block
                    invoiceEntry.data.locations.forEach( location => {
                        location.physicians = location.physicians.filter( physician => !physician.physicianInQualification || !physician.rlvPhysician );
                    } );
                    rendered = this.compiledHeader( invoiceEntry.data );
                } else if( 'schein' === invoiceEntry.type ) {
                    rendered = this.compiledSchein( invoiceEntry.data );
                } else {
                    Y.log( 'unknown invoice entry type' );
                    return Prom.resolve();
                }

                // omit empty lines MOJ-6377
                rendered = rendered.replace(/^009\d{4}(\r\n|\n|\r)/gm, '');
            } catch( err ) {
                return Prom.reject( err );
            }

            return write( filepath, rendered, this );

        };
        ConFileWriter.prototype.end = function() {
            return write( this.filepath, kbvEnd, this );
        };

        Y.namespace( 'doccirrus' ).ConFileWriter = ConFileWriter;

    },
    '0.0.1', {requires: []}
);
/**
 * User: do
 * Date: 15/11/17  17:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'evl', function( Y, NAME ) {

        const
            joinPaths = require( 'path' ).join,
            Promise = require( 'bluebird' ),
            exec = Promise.promisify( require( 'child_process' ).exec );

        let baseEvl,
            evlPath;

        const init = () => {
            const
                envConfig = Y.doccirrus.utils.getConfig( 'env.json' );

            baseEvl = envConfig.directories.evl || '/var/lib/kbv-evl';
            evlPath = joinPaths( baseEvl, 'Q417' ); // only one module included atm
        };

        /**
         * @method
         * From EVL_Modul_Anwenderhandbuch.pdf Q4 2017:
         *
         *  configPath      -c  Das EVL-Modul braucht für den Lauf die Pfadangabe einer XML-Konfigurationsdatei. Hinter dieser Option muss
         *                      die Pfadangabe stehen.
         *  createAck       -b  Das EVL-Modul generiert zusätzlich ein Bestätigungsschreiben. Dieser Übergabeparameter ist optional und nur
         *                      in der Praxisversion verfügbar.
         *                  -h  Das EVL-Modul gibt einen Hilfetext aus und beendet sich anschließend.
         *                  -m  Das EVL-Modul verschiebt verarbeitete DMP-Archive in Abhängigkeit vom Verarbeitungsstatus. Dieser
         *                      Übergabeparameter ist optional.
         *                  -p  Das EVL-Modul generiert zusätzlich eine eVersandliste als PDF-Dokument. Dieser Übergabeparameter ist
         *                      optional.
         *                  -r  Mit dieser Option wird die schon im Archiv vorhandene EVL-Datei überschrieben.
         *                  -v  Das EVL-Modul gibt die Versionsnummer aus und beendet sich anschließend.
         *                  -x  Das EVL-Modul generiert zusätzlich eine eVersandliste im XML-Format. Dieser Übergabeparameter ist optional.
         *  archivePath     -z  Hinter dieser Option sollte die Pfadangabe eines DMPArchivs bzw. eines DMP-Ordners stehen, die vom EVLModul
         *                      bearbeitet wird. Das DMP-Archiv darf nur eDMPDokumentationen enthalten
         *
         */
        const execute = ( args ) => {
            args = args || {};
            return Promise.resolve().then( () => {
                if( !args.cwd ) {
                    throw Error( 'cwd needed' );
                }
                if( !args.configPath ) {
                    throw Error( 'configPath needed' );
                }
                if( !args.archivePath ) {
                    throw Error( 'archivePath needed' );
                }

                let cmd = joinPaths( evlPath, 'dc-pruefung.sh' ) +
                          ` -c ${args.configPath} -z ${args.archivePath}`;

                if( true === args.createAck ) {
                    cmd += ' -b';
                }
                return exec( cmd, {cwd: evlPath} );
            } ).then( result => {
                return result;
            } ).catch( err => {
                Y.log( `error executing kbv-evl ${err}`, 'error', NAME );
                throw err;
            } );

        };

        if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
            setTimeout( () => init(), 5000 );
        }

        Y.namespace( 'doccirrus' ).evl = {

            name: NAME,
            execute
        };
    },
    '0.0.1', {requires: []}
);



/**
 * User: pi
 * Date: 11/10/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
function mockPrinter( Y ) {
    const
        origin = Y.doccirrus.printer,
        EventEmitter = require( 'events' ).EventEmitter;

    function isCUPSInstalled( callback ) {
        callback( null, true );
    }

    function printFile( params, callback ) {
        this.event.emit( 'onPrintFile', params );
        callback();
    }

    Y.doccirrus.printer = {
        mocked: true,
        event: new EventEmitter(),
        getPrinter: origin.getPrinter,
        printFile: printFile,
        isCUPSInstalled: isCUPSInstalled
    };
    return origin;
}

module.exports = mockPrinter;

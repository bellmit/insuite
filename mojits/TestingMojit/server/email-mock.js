/**
 * User: pi
 * Date: 11/10/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

function mockEmail( Y ) {
    const
        EventEmitter = require( 'events' ).EventEmitter,
        original = Y.doccirrus.email;
    Y.doccirrus.email.mocked = true;
    Y.doccirrus.email.event = new EventEmitter();
    Y.doccirrus.email._sendEmail = function( mailObj, callback ) {
        this.event.emit( 'onSendEmail', mailObj.options );
        callback( null, {messageId: 'mocha', response: 'mocha'} );
    };
    return original;
}

module.exports = mockEmail;

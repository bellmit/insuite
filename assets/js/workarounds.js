/**
 * User: pi
 * Date: 23.05.18  16:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Promise:true */
window.bluebirdPromise = Promise;
Promise.config( {
    // Enable cancellation
    cancellation: true
} );
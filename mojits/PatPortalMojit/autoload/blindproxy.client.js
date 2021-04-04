/**
 * User: strix
 * Date: 25.04.14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

/**
 *  This is a client-side helper for the blind PUC proxy, to streamline and collate calls made to
 *  PRCs / VPRC tenants from the PatientPortal.
 *
 *  The roadmap for the Patient Portal is to have client-side encryption of data between the patient's
 *  device and their PRC backend, with the proxy unable to read the content of communications.
 */

YUI.add( 'dcblindproxy', function( Y, NAME ) {

        function getMyKeyPair( user ) {
            user = user || Y.doccirrus.auth.getPatientPortalUser();
            if( user && user.patientId ) {
                return Y.doccirrus.utils.getKeysForDevice( user.patientId );
            } else {
                return null;
            }
        }

        function encryptData( data, skipEncryption ) {
            var

                user = Y.doccirrus.auth.getPatientPortalUser(),
                keyPair = getMyKeyPair( user ),
                prcKey = user && user.prcKey,
                key,
                encrypted,
                hasCorrectKey = keyPair && keyPair.secret && prcKey,
                dataNotEmpty = data.remoteparams && Object.keys( data.remoteparams ).length,
                remoteparams = {
                    pubKeyHash_: keyPair && Y.doccirrus.authpub.generateHash( keyPair.publicKey ),
                    source_: 'patient',
                    id_: user && user.patientId
                };

            if ( data && data.remoteparams && data.remoteparams.patientId ) {
                remoteparams.id_ = data.remoteparams.patientId;
            }

            if( !user ) {
                /**
                 * if user is undefined, only stringify remote params
                 */
                data.remoteparams = JSON.stringify( data.remoteparams );
            } else if( skipEncryption || !dataNotEmpty || !hasCorrectKey ) {
                /**
                 *  If skipEncryption is true or data is empty or patient does not have correct key pair, add params to encrypt data on server side and stringify remote params
                 */
                data.remoteparams = data.remoteparams || {};
                Object.keys( remoteparams ).forEach( function( prop ) {
                    if( remoteparams[ prop ] ) {
                        data.remoteparams[ prop ] = remoteparams[ prop ];
                    }
                } );
                data.remoteparams = JSON.stringify( data.remoteparams );
                Y.log( 'encryptData. Data will not be encrypted. skipEncryption: ' + skipEncryption + ', data is empty: ' + !dataNotEmpty + ', patient has wrong key pair: ' + !hasCorrectKey, 'info', NAME );
            } else if( hasCorrectKey && dataNotEmpty ) {
                /**
                 * If encryption is needed, 'remoteparams' will be replaced with encrypted data.
                 * @type {Array}
                 */
                key = Y.doccirrus.authpub.getSharedSecret( keyPair.secret, prcKey );
                encrypted = Y.doccirrus.authpub.encJSON( key, data.remoteparams );
                remoteparams.content_ = encrypted;
                data.remoteparams = JSON.stringify( remoteparams );
            }

            return data;
        }

        function getCallback( cb ) {
            return function blindProxyCb( error, resp ) {
                var
                    data = resp && resp.data,
                    user = user || Y.doccirrus.auth.getPatientPortalUser(),
                    sharedSecret,
                    myKP;

                if( error && 22004 === error.code && user.patientId ) {
                    Y.doccirrus.utils.localValueSet( user.patientId, null );
                    window.location.reload();
                    return;
                }
                if( data && data.content_ && data.senderPublicKey_ ) {
                    myKP = getMyKeyPair();
                    sharedSecret = Y.doccirrus.authpub.getSharedSecret( myKP.secret, data.senderPublicKey_ );
                    data = Y.doccirrus.authpub.decJSON( sharedSecret, data.content_ );
                    resp.data = data;
                }
                cb( error, resp );
            };
        }

        /**
         *  Make a GET request to a single PRC
         *
         *  @param  patientRegOrId  {String}    Database ID of a patient patientreg record
         *  @param  relUrl          {String}    Relative URL on PRC
         *  @param  params          {Object}    K/V querystring parameters
         *  @param  callback        {Function}  Of the form (fn(err, data)
         */

        function getSingle( patientRegOrId, relUrl, params, callback ) {
            //  if no patientRegId given then assume we need the local VPRC
            //  saves duplicating this logic in callers which use both the PRC and proxy

            if( ('' === patientRegOrId) || (null === patientRegOrId) ) {
                Y.doccirrus.comctl.privateGet( relUrl, params, callback );
                return;
            }

            var postData = {
                'patientregid': patientRegOrId,
                'remoteurl': relUrl,
                'remoteparams': params,
                'remotemethod': 'GET'
            };

            if( patientRegOrId._id ) {
                postData.patientreg = patientRegOrId;
            } else {
                postData.patientregid = patientRegOrId;
            }

            encryptData( postData, true );

            Y.doccirrus.comctl.pucPost( '/1/metaprac/:blindproxy?ann=' + encodeURIComponent( relUrl ), postData, getCallback( callback ) );
        }

        /**
         *  Make a POST request to a single PRC
         *
         *  @param  patientRegOrId   {String}    Database ID of a patient patientreg record or the record itself
         *  @param  relUrl      {String}    Relative URL on PRC
         *  @param  params      {Object}    K/V POST parameters
         *  @param  callback    {Function}  Of the form (fn(err, data)
         */

        function postSingle( patientRegOrId, relUrl, params, callback ) {

            //  if no patientRegId given then assume we need the local VPRC
            //  saves dulicating this logic in callers which use both the PRC and proxy

            if( ('' === patientRegOrId) || (null === patientRegOrId) ) {
                Y.doccirrus.comctl.privateGet( relUrl, params, callback );
                return;
            }

            var postData = {
                'remoteurl': relUrl,
                'remoteparams': params,
                'remotemethod': 'POST'
            };

            if( patientRegOrId._id ) {
                postData.patientreg = patientRegOrId;
            } else {
                postData.patientregid = patientRegOrId;
            }

            encryptData( postData );

            Y.doccirrus.comctl.pucPost( '/1/metaprac/:blindproxy', postData, getCallback( callback ) );
        }

        /**
         *  Make a PUT request to a single PRC
         *
         *  @param  patientRegId   {String}    Database ID of a patient patientreg record
         *  @param  relUrl      {String}    Relative URL on PRC
         *  @param  params      {Object}    K/V POST parameters
         *  @param  callback    {Function}  Of the form (fn(err, data)
         */

        function putSingle( patientRegId, relUrl, params, callback ) {

            //  if no patientRegId given then assume we need the local VPRC
            //  saves dulicating this logic in callers which use both the PRC and proxy

            if( ('' === patientRegId) || (null === patientRegId) ) {
                Y.doccirrus.comctl.privateGet( relUrl, params, callback );
                return;
            }

            var postData = {
                'patientregid': patientRegId,
                'remoteurl': relUrl,
                'remoteparams': params,
                'remotemethod': 'PUT'
            };

            encryptData( postData );

            Y.doccirrus.comctl.pucPost( '/1/metaprac/:blindproxy', postData, getCallback( callback ) );
        }

        /**
         *  Make a DELETE request to a single PRC
         *
         *  @param  patientRegId   {String}    Database ID of a patient patientreg record
         *  @param  relUrl      {String}    Relative URL on PRC
         *  @param  params      {Object}    K/V POST parameters
         *  @param  callback    {Function}  Of the form (fn(err, data)
         */

        function deleteSingle( patientRegId, relUrl, params, callback ) {

            //  if no patientRegId given then assume we need the local VPRC
            //  saves dulicating this logic in callers which use both the PRC and proxy

            if( ('' === patientRegId) || (null === patientRegId) ) {
                Y.doccirrus.comctl.privateGet( relUrl, params, callback );
                return;
            }

            var postData = {
                'patientregid': patientRegId,
                'remoteurl': relUrl,
                'remoteparams': params,
                'remotemethod': 'DELETE'
            };

            encryptData( postData );

            Y.doccirrus.comctl.pucPost( '/1/metaprac/:blindproxy', postData, getCallback( callback ) );
        }

        //  create the blindproxy

        Y.namespace( 'doccirrus' ).blindproxy = {
            'getSingle': getSingle,
            'postSingle': postSingle,
            'putSingle': putSingle,
            'deleteSingle': deleteSingle,
            'encryptData': encryptData,
            'getCallback': getCallback
        };

    },
    '0.0.1',
    {
        requires: [ 'dc-comctl' ]
    }
);

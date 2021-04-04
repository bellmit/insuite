/*jslint anon:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'dccrmanager', function( Y, NAME ) {

    /**
     * @modul crmanager
     */


    /**
     * @property crmanager
     * @for doccirrus
     * @type {doccirrus.crmanager}
     */
    /**
     * @class doccirrus.crmanager
     */
    Y.namespace( 'doccirrus.crmanager' );

    var
//        _ = Y.doccirrus.intl.createTranslator.call( this ),
//        CRManagerError = Y.doccirrus.commonerrors.DCError,
        crManager;

    /**
     * @class CRManager
     * @constructor
     */
    function CRManager() {
        CRManager.superclass.constructor.apply( this, arguments );
    }

    CRManager.NAME = NAME;
    /**
     * DatatableModel for select patient
     * @constructor
     */

    var getFromCRM = function( action, options, cbSuccess, cbFail ) {
        var
            url = '/1/crManager/:' + action;
        Y.log('Making call to card reader manager.','debug',NAME);
        Y.doccirrus.comctl.privateGet( url, options, function( err, result ) {
            if( err ) {
                cbFail( err );
            }
            else {
                cbSuccess( result );
            }
        } );
    };

    Y.extend( CRManager, Y.Base, {

        /**
         *
         * @method getCardData
         * @param {Object} options
         * @param {Function} callbackSuccess
         * @param {Function} callbackFail
         */
        getCardData: function( options, callbackSuccess, callbackFail ) {
            getFromCRM( 'getCardData', options, callbackSuccess, callbackFail );
        },

        /**
         *
         * @method getLastDevice
         * @param {Function} callbackSuccess
         * @param {Function} callbackFail
         */
        getLastDevice: function( callbackSuccess, callbackFail  ) {
            getFromCRM( 'getLastDevice', null, callbackSuccess, callbackFail );
        },

        /**
         *
         * @method getDeviceList
         * @param {Object} options
         * @param {Function} callbackSuccess
         * @param {Function} callbackFail
         */
        getDeviceList: function( options, callbackSuccess, callbackFail ){
            getFromCRM( 'getDeviceList', options, callbackSuccess, callbackFail );
        }

    } );

    // instantiate...
    crManager = new CRManager();
    Y.doccirrus.crmanager = crManager;



}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'oop',
        'dc-comctl',
        'DCWindow'
    ]
} );

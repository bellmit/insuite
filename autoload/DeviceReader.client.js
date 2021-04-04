/*jslint anon:true, nomen:true*/
/*global YUI, jQuery */
YUI.add( 'DeviceReader', function( Y, NAME ) {
    'use strict';

    /**
     * @modul DeviceReader
     */

    /**
     * @property DeviceReader
     * @for doccirrus
     * @type {doccirrus.DeviceReader}
     */
    /**
     * @class doccirrus.DeviceReader
     */
    Y.namespace( 'doccirrus.DeviceReader' );

    var
        i18n = Y.doccirrus.i18n;

    /**
     * @class DeviceReader
     * @constructor
     */
    function DeviceReader() {
        DeviceReader.superclass.constructor.apply( this, arguments );
    }

    DeviceReader.NAME = "DeviceReader";
    DeviceReader.TYPES = {
        // Tonometry
        NCT: { id: 'NCT' },
        PASCAL: { id: 'PASCAL' },
        GOLDMANN: { id: 'GOLDMANN' },
        ICARE: { id: 'ICARE' },
        // Refraction
        REFRACTOMETER_READ: { id: 'REFRACTOMETER_READ' },
        REFRACTOMETER_WRITE: { id: 'REFRACTOMETER_WRITE' }
    };

    DeviceReader.ATTRS = {
        baseURL: {
            value: "http://127.0.0.1:8888/DeviceReader/"
        }
    };

    /**
     * Fires when a device sends data
     * @event DeviceReader:sendData
     * @for doccirrus.DeviceReader
     * @param {Event} event The Event
     * @type Event.Custom
     */
    Y.publish( 'DeviceReader:sendData', { preventable: false } );

    /**
     * fires the 'sendData'-Event with provided data
     * @method sendData
     * @param {Object} data
     * @for doccirrus.DeviceReader
     * @static
     */
    DeviceReader.sendData = function( data ) {
        Y.fire( 'DeviceReader:sendData', { sendData: data } );
    };

    /**
     * creates a DeviceReader instance
     * @method createInstance
     * @param {Object} [config]
     * @for doccirrus.DeviceReader
     * @return {DeviceReader}
     */
    Y.doccirrus.DeviceReader.createInstance = function createInstance( config ) {
        config = config || {};
        var
            reader = new DeviceReader( config );

        Y.log( 'created DeviceReader', 'log', NAME );

        return reader;
    };

    // TODO: remove example:
    var
        example = false,
        dummyData = {
            OPHTHALMOLOGY_TONOMETRY: {
                "otIL2": 1,
                "otIL1": 1,
                "otIR2": 1,
                "otIR1": 1,
                "otIRead": "2014-12-01T23:00:00.000Z",
                "otGL2": null,
                "otGL1": null,
                "otGR2": null,
                "otGR1": null,
                "otGRead": null,
                "otPL4": 1,
                "otPL3": 1,
                "otPL2": 1,
                "otPL1": 1,
                "otPR4": 1,
                "otPR3": 1,
                "otPR2": 1,
                "otPR1": 1,
                "otPRead": "2014-12-01T23:00:00.000Z",
                "otNFacL": 1,
                "otNCCTL": 500,
                "otNL4": 1,
                "otNL3": 1,
                "otNL2": 1,
                "otNL1": 1,
                "otNFacR": 1,
                "otNCCTR": 500,
                "otNR4": 1,
                "otNR3": 1,
                "otNR2": 1,
                "otNR1": 1,
                "otNRead": "2014-12-01T23:00:00.000Z"
            },
            OPHTHALMOLOGY_REFRACTION: {
                "orHSA": 10,
                "orPD": 65,
                "orNearB": 0,
                "orNearR": 0,
                "orNearL": 0,
                "orFarB": 0,
                "orFarR": 0,
                "orFarL": 0,
                "orVisAcuTyp": "OG",
                "orAdd2R": 0,
                "orAdd2L": 0,
                "orBasR": "INSIDE",
                "orBasL": "OUTSIDE",
                "orPsmR": 10,
                "orPsmL": 10,
                "orAddR": 0,
                "orAddL": 0,
                "orAxsR": 90,
                "orAxsL": 90,
                "orCylR": 0,
                "orCylL": 0,
                "orSphR": 0,
                "orSphL": 0,
                "orRead": "2014-12-01T23:00:00.000Z",
                "orType": "REF"
            }
        };

    Y.extend( DeviceReader, Y.Base, {
        /**
         * get available DeviceReader type constants
         * @method getTypes
         * @for doccirrus.DeviceReader
         * @return {Object}
         */
        getTypes: function() {
            return DeviceReader.TYPES;
        },
        /**
         * fetch device list for configuration
         * @method fetchDeviceListFor
         * @param {Object} parameters configuration
         * @param {Object} parameters.type a reference to DeviceReader.TYPES
         * @for doccirrus.DeviceReader
         * @return {jQuery.Deferred}
         */
        fetchDeviceListFor: function( parameters ) {
            var
                type = parameters.type,
                $deferred = jQuery.Deferred();

            // TODO: implement algorithm for example:
            if( example ) {
                setTimeout( function() {

                    Y.log( 'fetchDeviceListFor' + type.id, 'log', NAME );

                    switch( type ) {
                        case DeviceReader.TYPES.NCT:
                            $deferred.resolve( [
                                { val: 'Tonometer1', i18n: i18n( 'DeviceReader.deviceNames.TONOMETER1' ) }
                            ] );
                            break;
                        case DeviceReader.TYPES.PASCAL:
                            $deferred.resolve( [
                                { val: 'Tonometer2', i18n: i18n( 'DeviceReader.deviceNames.TONOMETER2' ) }
                            ] );
                            break;
                        case DeviceReader.TYPES.GOLDMANN:
                            $deferred.reject( [
                                new Error( 'Example for DeviceReader.TYPES.GOLDMANN' )
                            ] );
                            break;
                        case DeviceReader.TYPES.ICARE:
                            $deferred.resolve( [
                                { val: 'Tonometer4', i18n: i18n( 'DeviceReader.deviceNames.TONOMETER4' ) }
                            ] );
                            break;
                        case DeviceReader.TYPES.REFRACTOMETER_READ:
                            $deferred.resolve( [
                                { val: 'Refrakto1', i18n: i18n( 'DeviceReader.deviceNames.REFRAKTO1' ) }
                            ] );
                            break;
                        case DeviceReader.TYPES.REFRACTOMETER_WRITE:
                            $deferred.resolve( [
                                { val: 'Phoropter1', i18n: i18n( 'DeviceReader.deviceNames.PHOROPTER1' ) },
                                { val: 'Vis1', i18n: i18n( 'DeviceReader.deviceNames.VIS1' ) }
                            ] );
                            break;
                    }

                }, 50 );
            }

            return $deferred;
        },
        /**
         * read data from device
         * @method fetchDeviceListFor
         * @param {Object} parameters configuration
         * @param {String} parameters.id a device id
         * @for doccirrus.DeviceReader
         * @return {jQuery.Deferred}
         */
        readDataFromDeviceId: function( parameters ) {
            var
                id = parameters.id,
                $deferred = jQuery.Deferred();

            // TODO: implement algorithm for example:
            if( example ) {
                setTimeout( function() {
                    switch( id ) {
                        case 'Refrakto1':
                            $deferred.resolve( dummyData.OPHTHALMOLOGY_REFRACTION );
                            break;
                        default:
                            $deferred.resolve( dummyData.OPHTHALMOLOGY_TONOMETRY );
                            break;
                    }
                }, 50 );
            }

            return $deferred;
        },
        /**
         * write data to device
         * @method writeDataToDeviceId
         * @param {Object} parameters configuration
         * @param {String} parameters.id a device id
         * @for doccirrus.DeviceReader
         * @return {jQuery.Deferred}
         */
        writeDataToDeviceId: function( parameters ) {
            var
                id = parameters.id,
                data = parameters.data,
                $deferred = jQuery.Deferred();

            if( !Y.Lang.isObject( data ) ) {
                Y.log( 'writeDataToDeviceId: no data supplied', 'error', NAME );
                $deferred.reject( [ new Error( 'writeDataToDeviceId: no data supplied' ) ] );
                return $deferred;
            }

            // TODO: implement algorithm for example:
            if( example ) {
                console.warn( '[DeviceReader.client.js] DeviceReader.writeDataToDeviceId :', {
                    "arguments": arguments,
                    'this': this
                } );
                setTimeout( function() {
                    switch( id ) {
                        default:
                            $deferred.reject( [
                                new Error( 'Ooops on writing' )
                            ] );
                            break;
                    }
                }, 50 );
            }

            return $deferred;
        }
    } );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',

        'DCWindow',
        'DCSystemMessages'
    ]
} );

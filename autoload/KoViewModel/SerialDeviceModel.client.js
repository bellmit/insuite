/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'SerialDeviceModel', function( Y/*, NAME */ ) {
        /**
         * @module SerialDeviceModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class SerialDeviceModel
         * @constructor
         * @extends KoViewModel
         */
        function SerialDeviceModel( config ) {
            SerialDeviceModel.superclass.constructor.call( this, config );
        }

        SerialDeviceModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            /**
             * @attribute availableSerialPath
             * @type {Array}
             */
            availableSerialPath: {
                value: [],
                lazyAdd: false
            }
        };
        Y.extend( SerialDeviceModel, KoViewModel.getBase(), {
            initializer: function SerialDeviceModel_initializer( config ) {
                var self = this;
                self.initSerialDevice( config && config.data );
            },
            destructor: function SerialDeviceModel_destructor() {
            },
            /**
             * initializes address model
             */
            initSerialDevice: function SerialDeviceModel_initSerialDevice( config ) {
                var
                    self = this;
                self.availableSerialPath = self.get( 'availableSerialPath' );
                if( config.serialPath ) {
                    self.availableSerialPath.push( self.serialPathToSelect2( config.serialPath ) );
                }

                self.initSelect2SerialPath();

                self.configureDevice = function() {
                    Y.doccirrus.modals.inportModal.showDialog( {}, function( data ) {
                        self.serialPath( data.path );
                    } );
                };
            },
            serialPathToSelect2: function( serialPath ) {
                if( !serialPath ) {
                    return serialPath;
                }
                return {
                    id: serialPath,
                    text: serialPath
                };
            },
            /**
             * @method getName
             * @returns {string}
             */
            getName: function SerialDeviceModel_getName() {
                var
                    resourceTypes = Y.doccirrus.schemas.v_flowsource.types.ResourceType_E.list,
                    result = '';
                resourceTypes.some( function( resourceType ) {
                    if( Y.doccirrus.schemas.v_flowsource.resourceTypes.XDTSERIAL === resourceType.val ) {
                        result = resourceType.i18n;
                        return true;
                    }
                    return false;
                } );
                return result;
            },
            initSelect2SerialPath: function SerialDeviceModel_initSelect2SerialPath() {
                var
                    self = this;
                self.select2SerialPath = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                serialPath = ko.unwrap( self.serialPath );
                            return self.serialPathToSelect2( serialPath );
                        },
                        write: function( $event ) {
                            self.serialPath( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        query: function( query ) {
                            function done( data ) {
                                query.callback( {
                                    results: data.map( function( device ) {
                                        return self.serialPathToSelect2( device.path );
                                    } )
                                } );
                            }

                            Y.doccirrus.jsonrpc.api.device.getConfiguredDevice( {
                                query: {
                                    term: query.term
                                }
                            } ).done( function( response ) {
                                var
                                    data = response.data;
                                done( data );
                            } ).fail( function() {
                                done( [self.availableSerialPath] );
                            } );
                        }
                    }
                };

            }
        }, {
            schemaName: 'serialdevice',
            NAME: 'SerialDeviceModel'
        } );
        KoViewModel.registerConstructor( SerialDeviceModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_flowsource-schema',
            'serialdevice-schema',
            'flow-schema'
        ]
    }
);
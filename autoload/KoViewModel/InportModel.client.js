/**
 * User: pi
 * Date: 10/09/15  11:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InportModel', function( Y/*, NAME */ ) {
        /**
         * @module InportModel
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
        function InportModel( config ) {
            InportModel.superclass.constructor.call( this, config );
        }

        InportModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            /**
             * @attribute parityList
             * @type {Array}
             */
            parityList: {
                value: [ "none", "even", "odd", "mark", "space" ],
                lazyAdd: false
            },
            /**
             * @attribute baudrateList
             * @type {Array}
             */
            baudrateList: {
                value: [ 50, 75, 110, 134, 150, 200, 300, 600, 1200, 1800, 2400, 4800, 9600, 19200, 38400, 57600, 115200 ],
                lazyAdd: false
            },
            /**
             * @attribute databitsList
             * @type {Array}
             */
            databitsList: {
                value: [ 5, 6, 7, 8 ],
                lazyAdd: false
            },
            /**
             * @attribute stopbitsList
             * @type {Array}
             */
            stopbitsList: {
                value: [ 1, 1.5, 2 ],
                lazyAdd: false
            }
        };
        Y.extend( InportModel, KoViewModel.getBase(), {
                initializer: function InportModel_initializer() {
                    var self = this;
                    self.initInport();
                },
                destructor: function InportModel_destructor() {
                },
                /**
                 * Initializes address model
                 */
                initInport: function InportModel_initInport() {
                    var
                        self = this;

                    self.initSelect2Path();
                    self.initSelect2Parity();
                    self.initSelect2Baudrate();
                    self.initSelect2Databits();
                    self.initSelect2Stopbits();

                },
                /**
                 * Updates device config
                 * @method update
                 */
                update: function InportModel_update() {
                    var
                        self = this,
                        data = self.toJSON(),
                        promise,
                        inportId = data._id;
                    delete data._id;
                    data.configured = true;
                    data.fields_ = Object.keys( data );
                    promise = Y.doccirrus.jsonrpc.api.inport.update( {
                        query: {
                            _id: inportId
                        },
                        data: data
                    } );
                    return promise;
                },
                /**
                 * Convert string to select2 object
                 * @param path
                 * @method stringToSelect2
                 */
                stringToSelect2: function InportModel_stringToSelect2( path ) {
                    if( !path ) {
                        return path;
                    }
                    return {
                        id: path,
                        text: path
                    };
                },
                deviceToSelect2: function InportModel_deviceToSelect2( device ) {
                    if( !device ) {
                        return device;
                    }
                    return {
                        id: device.path,
                        text: device.path,
                        data: device
                    };
                },
                /**
                 * Initializes autocompleter for path
                 * @method initSelect2Path
                 */
                initSelect2Path: function InportModel_initSelect2Path() {
                    var
                        self = this;
                    self.select2Path = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    path = ko.unwrap( self.path );
                                return self.stringToSelect2( path );
                            },
                            write: function( $event ) {
                                if( $event.added && $event.added.data ) {
                                    self.set( 'data', $event.added.data );
                                    self.setNotModified();
                                } else {
                                    self.path( $event.val );
                                }
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            query: function( query ) {
                                function done( data ) {
                                    query.callback( {
                                        results: data.map( self.deviceToSelect2 )
                                    } );
                                }

                                Y.doccirrus.jsonrpc.api.device.getNotConfiguredDevice( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                    var
                                        data = response.data;
                                    done( data );
                                } ).fail( function() {
                                    done( [] );
                                } );
                            }
                        }
                    };

                },
                /**
                 * Initializes autocompleter for parity
                 * @method initSelect2Parity
                 */
                initSelect2Parity: function InportModel_initSelect2Parity() {
                    var
                        self = this;
                    self.select2Parity = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    parity = ko.unwrap( self.parity );
                                return parity;
                            },
                            write: function( $event ) {
                                self.parity( $event.val );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            data: self.get( 'parityList' ).map( function( val ) {
                                return {
                                    id: val,
                                    text: val
                                };
                            } )
                        }
                    };

                },
                /**
                 * Initializes autocompleter for baudrate
                 * @method initSelect2Baudrate
                 */
                initSelect2Baudrate: function InportModel_initSelect2Baudrate() {
                    var
                        self = this;
                    self.select2Baudrate = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    baudrate = ko.unwrap( self.baudrate );
                                return baudrate;
                            },
                            write: function( $event ) {
                                self.baudrate( $event.added && $event.added.id );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            data: self.get( 'baudrateList' ).map( function( val ) {
                                return {
                                    id: val,
                                    text: val.toString()
                                };
                            } )
                        }
                    };

                },
                /**
                 * Initializes autocompleter for databits
                 * @method initSelect2Databits
                 */
                initSelect2Databits: function InportModel_initSelect2Databits() {
                    var
                        self = this;
                    self.select2Databits = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    databits = ko.unwrap( self.databits );
                                return databits;
                            },
                            write: function( $event ) {
                                self.databits( $event.added && $event.added.id );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            data: self.get( 'databitsList' ).map( function( val ) {
                                return {
                                    id: val,
                                    text: val.toString()
                                };
                            } )
                        }
                    };

                },
                /**
                 * Initializes autocompleter for stopbits
                 * @method initSelect2Stopbits
                 */
                initSelect2Stopbits: function InportModel_initSelect2Stopbits() {
                    var
                        self = this;
                    self.select2Stopbits = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    stopbits = ko.unwrap( self.stopbits );
                                return stopbits;
                            },
                            write: function( $event ) {
                                self.stopbits( $event.added && $event.added.id );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            data: self.get( 'stopbitsList' ).map( function( val ) {
                                return {
                                    id: val,
                                    text: val.toString()
                                };
                            } )
                        }
                    };

                }
            },
            {
                schemaName: 'inport',
                NAME: 'InportModel'
            }
        );
        KoViewModel.registerConstructor( InportModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'inport-schema'
        ]
    }
)
;
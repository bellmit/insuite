/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'FlowModel', function( Y/*, NAME */ ) {
        /**
         * @module FlowModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class FlowSourceSerialDeviceModel
         * @constructor
         * @extends SerialDeviceModel
         */
        function FlowSourceSerialDeviceModel( config ) {
            FlowSourceSerialDeviceModel.superclass.constructor.call( this, config );
        }

        FlowSourceSerialDeviceModel.ATTRS = {};
        Y.extend( FlowSourceSerialDeviceModel, KoViewModel.constructors.SerialDeviceModel, {
            initializer: function FlowSourceSerialDeviceModel_initializer() {
                var self = this;
                self.initFlowSourceSerialDevice();
            },
            destructor: function FlowSourceSerialDeviceModel_destructor() {
            },
            /**
             * initializes FlowSourceSerialDeviceModel model
             */
            initFlowSourceSerialDevice: function FlowSourceSerialDeviceModel_initFlowSourceSerialDevice() {
            },
            /**
             * Shows modal to configure serial device source
             * @method configure
             * @param {Object} serialDeviceModel serial device koViewModel
             */
            configure: function FlowSourceSerialDeviceModel_configure( serialDeviceModel ) {
                Y.doccirrus.modals.sourceConfigModal.showModal( serialDeviceModel.toJSON(), 'FlowSourceSerialDeviceModel', function( data ) {
                    serialDeviceModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'serialdevice',
            NAME: 'FlowSourceSerialDeviceModel'
        } );
        KoViewModel.registerConstructor( FlowSourceSerialDeviceModel );

        /**
         * @class FlowSourceFileModel
         * @constructor
         * @extends FileModel
         */
        function FlowSourceFileModel( config ) {
            FlowSourceFileModel.superclass.constructor.call( this, config );
        }

        FlowSourceFileModel.ATTRS = {};
        Y.extend( FlowSourceFileModel, KoViewModel.constructors.FileModel, {
            initializer: function FlowSourceFileModel_initializer() {
                var self = this;
                self.initFlowSourceFile();
            },
            destructor: function FlowSourceFileModel_destructor() {
            },
            /**
             * initializes FlowSourceFileModel model
             */
            initFlowSourceFile: function FlowSourceFileModel_initFlowSourceFile() {

            },
            /**
             * Shows modal to configure file source
             * @method configure
             * @param {Object} fileModel file koViewModel
             */
            configure: function FlowSourceFileModel_configure( fileModel ) {
                Y.doccirrus.modals.sourceConfigModal.showModal( fileModel.toJSON(), 'FlowSourceFileModel', function( data ) {
                    fileModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'file',
            NAME: 'FlowSourceFileModel'
        } );
        KoViewModel.registerConstructor( FlowSourceFileModel );

        /**
         * @class FlowSourceDatabaseModel
         * @constructor
         * @extends DatabaseModel
         */
        function FlowSourceDatabaseModel( config ) {
            FlowSourceDatabaseModel.superclass.constructor.call( this, config );
        }

        FlowSourceDatabaseModel.ATTRS = {};
        Y.extend( FlowSourceDatabaseModel, KoViewModel.constructors.DatabaseModel, {
            initializer: function FlowSourceDatabaseModel_initializer() {
                var self = this;
                self.initFlowSourceDatabase();
            },
            destructor: function FlowSourceDatabaseModel_destructor() {
            },
            /**
             * initializes FlowSourceDatabaseModel model
             */
            initFlowSourceDatabase: function FlowSourceDatabaseModel_initFlowSourceDatabase() {

            },
            /**
             * Shows modal to configure database source
             * @method configure
             * @param {Object} databaseModel database koViewModel
             */
            configure: function FlowSourceDatabaseModel_configure( databaseModel ) {
                Y.doccirrus.modals.sourceConfigModal.showModal( databaseModel.toJSON(), 'FlowSourceDatabaseModel', function( data ) {
                    databaseModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'database',
            NAME: 'FlowSourceDatabaseModel'
        } );
        KoViewModel.registerConstructor( FlowSourceDatabaseModel );

        /**
         * @class FlowSinkSerialDeviceModel
         * @constructor
         * @extends SerialDeviceModel
         */
        function FlowSinkSerialDeviceModel( config ) {
            FlowSinkSerialDeviceModel.superclass.constructor.call( this, config );
        }

        FlowSinkSerialDeviceModel.ATTRS = {};
        Y.extend( FlowSinkSerialDeviceModel, KoViewModel.constructors.SerialDeviceModel, {
            initializer: function FlowSinkSerialDeviceModel_initializer() {
                var self = this;
                self.initFlowSinkSerialDevice();
            },
            destructor: function FlowSinkSerialDeviceModel_destructor() {
            },
            /**
             * initializes FlowSinkSerialDeviceModel model
             */
            initFlowSinkSerialDevice: function FlowSinkSerialDeviceModel_initFlowSinkSerialDevice() {
            },
            /**
             * Shows modal to configure serial device sink
             * @method configure
             * @param {Object} serialDeviceModel serial device koViewModel
             */
            configure: function FlowSinkSerialDeviceModel_configure( serialDeviceModel ) {
                Y.doccirrus.modals.sinkConfigModal.showModal( serialDeviceModel.toJSON(), 'FlowSinkSerialDeviceModel', function( data ) {
                    serialDeviceModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'serialdevice',
            NAME: 'FlowSinkSerialDeviceModel'
        } );
        KoViewModel.registerConstructor( FlowSinkSerialDeviceModel );

        /**
         * @class FlowSinkFileModel
         * @constructor
         * @extends FileModel
         */
        function FlowSinkFileModel( config ) {
            FlowSinkFileModel.superclass.constructor.call( this, config );
        }

        FlowSinkFileModel.ATTRS = {};
        Y.extend( FlowSinkFileModel, KoViewModel.constructors.FileModel, {
            initializer: function FlowSinkFileModel_initializer() {
                var self = this;
                self.initFlowSinkFile();
            },
            destructor: function FlowSinkFileModel_destructor() {
            },
            /**
             * initializes FlowSinkFileModel model
             */
            initFlowSinkFile: function FlowSinkFileModel_initFlowSinkFile() {
                var
                    self = this;
                self.initSelect2ExecuteClient();
                self._initValidateDependencies();
            },
            /**
             * validate those dependencies
             */
            _initValidateDependencies: function FileModel__initValidateDependencies() {
                var
                    self = this;
                self.addDisposable( ko.computed( function() {
                    self.executeApp();
                    self.executeClient.validate();
                    self.executePath.validate();
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
            },
            /**
             * Shows modal to configure file sink
             * @method configure
             * @param {Object} fileModel file koViewModel
             */
            configure: function FlowSinkFileModel_configure( fileModel ) {
                Y.doccirrus.modals.sinkConfigModal.showModal( fileModel.toJSON(), 'FlowSinkFileModel', function( data ) {
                    fileModel.set( 'data', data );
                } );
            },
            /**
             * Initializes select2 for executeClient
             * @method initSelect2ExecuteClient
             */
            initSelect2ExecuteClient: function FileModel_initSelect2ExecuteClient() {
                var
                    self = this,
                    clientList = [],
                    initExecuteClient = ko.utils.peekObservable( self.executeClient );
                if( initExecuteClient ) {
                    clientList = [{id: initExecuteClient, text: initExecuteClient}];
                }
                Y.doccirrus.jsonrpc.api.device.getS2eClients()
                    .done( function( response ) {
                        var
                            data = response.data || [];
                        clientList.length = 0;
                        data.forEach( function( client ) {
                            clientList.push( self.stringToSelect2Object( client ) );
                        } );
                    } );
                self.select2ExecuteClient = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var executeClient = ko.unwrap( self.executeClient );
                            return executeClient;
                        },
                        write: function( $event ) {
                            self.executeClient( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: function() {
                            return {
                                results: clientList
                            };
                        }
                    }
                };

            }
        }, {
            schemaName: 'file',
            NAME: 'FlowSinkFileModel'
        } );
        KoViewModel.registerConstructor( FlowSinkFileModel );

        function FlowSinkMediportModel( config ) {
            FlowSinkMediportModel.superclass.constructor.call( this, config );
        }

        FlowSinkMediportModel.ATTRS = {};
        Y.extend( FlowSinkMediportModel, KoViewModel.constructors.MediportModel, {
            initializer: function FlowSinkMediportModel_initializer() {
                var self = this;
                self.initFlowSinkMediport();
            },
            destructor: function FlowSinkMediportModel_destructor() {
            },
            initFlowSinkMediport: function FlowSinkMediportModel_initFlowSinkMediport() {
            },
            configure: function FlowSinkMediportModel_configure( mediportModel ) {
                Y.doccirrus.modals.sinkConfigModal.showModal( mediportModel.toJSON(), 'FlowSinkMediportModel', function() {
                } );
            }
        }, {
            schemaName: 'mediport',
            NAME: 'FlowSinkMediportModel'
        } );
        KoViewModel.registerConstructor( FlowSinkMediportModel );

        /**
         * @class FlowSinkDatabaseModel
         * @constructor
         * @extends FileModel
         */
        function FlowSinkDatabaseModel( config ) {
            FlowSinkDatabaseModel.superclass.constructor.call( this, config );
        }

        FlowSinkDatabaseModel.ATTRS = {
            dbOperationsType: {
                value: 'write',
                lazyAdd: false
            },
            availableCollectionList: {
                value: [
                    'activity',
                    'cardio'
                ],
                lazyAdd: false
            }
        };
        Y.extend( FlowSinkDatabaseModel, KoViewModel.constructors.DatabaseModel, {
            initializer: function FlowSinkDatabaseModel_initializer() {
                var self = this;
                self.initFlowSinkDatabase();
            },
            destructor: function FlowSinkDatabaseModel_destructor() {
            },
            /**
             * initializes FlowSinkDatabaseModel model
             */
            initFlowSinkDatabase: function FlowSinkDatabaseModel_initFlowSinkDatabase() {

            },
            /**
             * Shows modal to configure database sink
             * @method configure
             * @param {Object} databaseModel database koViewModel
             */
            configure: function FlowSinkDatabaseModel_configure( databaseModel ) {
                Y.doccirrus.modals.sinkConfigModal.showModal( databaseModel.toJSON(), 'FlowSinkDatabaseModel', function( data ) {
                    databaseModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'database',
            NAME: 'FlowSinkDatabaseModel'
        } );
        KoViewModel.registerConstructor( FlowSinkDatabaseModel );

        /**
         * @class FlowSinkEventModel
         * @constructor
         * @extends EventModel
         */
        function FlowSinkEventModel( config ) {
            FlowSinkEventModel.superclass.constructor.call( this, config );
        }

        FlowSinkEventModel.ATTRS = {};
        Y.extend( FlowSinkEventModel, KoViewModel.constructors.EventModel, {
            initializer: function FlowSinkEventModel_initializer() {
                var self = this;
                self.initFlowSinkEventModel();
            },
            destructor: function FlowSinkEventModel_destructor() {
            },
            /**
             * initializes FlowSinkEventModel model
             */
            initFlowSinkEventModel: function FlowSinkEventModel_initFlowSinkEventModel() {

            },
            /**
             * Shows modal to configure event sink
             * @method configure
             * @param {Object} eventModel event koViewModel
             */
            configure: function FlowSinkEventModel_configure( eventModel ) {
                Y.doccirrus.modals.sinkConfigModal.showModal( eventModel.toJSON(), 'FlowSinkEventModel', function( data ) {
                    eventModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'v_event',
            NAME: 'FlowSinkEventModel'
        } );
        KoViewModel.registerConstructor( FlowSinkEventModel );

        /**
         * @class FlowTransformerModel
         * @constructor
         * @extends TransformerModel
         */
        function FlowTransformerModel( config ) {
            FlowTransformerModel.superclass.constructor.call( this, config );
        }

        FlowTransformerModel.ATTRS = {};
        Y.extend( FlowTransformerModel, KoViewModel.constructors.TransformerModel, {
            initializer: function FlowTransformerModel_initializer() {
                var self = this;
                self.initFlowTransformer();
            },
            destructor: function FlowTransformerModel_destructor() {
            },
            /**
             * initializes flowTransformer model
             */
            initFlowTransformer: function FlowTransformerModel_initTransformer() {
            },
            /**
             * Shows modal to configure transformer
             * @method configure
             * @param {Object} transformerModel transformer koViewModel
             */
            configure: function FlowTransformerModel_configure( transformerModel ) {
                var
                    modelData = transformerModel.toJSON();
                modelData.gdtVersions = transformerModel.gdtVersions;
                Y.doccirrus.modals.transformerConfigModal.showModal( modelData, 'FlowTransformerModel', function( data ) {
                    transformerModel.set( 'data', data );
                } );
            }
        }, {
            schemaName: 'flow.transformers',
            NAME: 'FlowTransformerModel'
        } );
        KoViewModel.registerConstructor( FlowTransformerModel );

        /**
         * @class FlowModel
         * @constructor
         * @extends KoViewModel
         */
        function FlowModel( config ) {
            FlowModel.superclass.constructor.call( this, config );
        }

        FlowModel.ATTRS = {
            /**
             * @attribute availableFlowTypeList
             * @type {Array}
             * @default Y.doccirrus.schemas.flow.types.FlowType_E.list
             */
            availableFlowTypeList: {
                value: Y.doccirrus.schemas.flow.types.FlowType_E.list,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( FlowModel, KoViewModel.getBase(), {
            initializer: function FlowModel_initializer( config ) {
                var self = this;
                self.initFlow( config && config.data );
            },
            destructor: function FlowModel_destructor() {
            },
            /**
             * Defines active flow
             * @property active
             * @type {ko.observable}
             */
            active: null,
            /**
             * flowType select2 auto complete configuration
             * @property select2FlowType
             * @type {Object}
             */
            select2FlowType: null,
            /**
             * initializes FlowModel model
             */
            initFlow: function FlowModel_initFlow( config ) {
                var self = this;

                self.availableFlowTypeList = self.get( 'availableFlowTypeList' );
                self.active = ko.observable( false );
                self.initRemoveHandling();
                self.initSelect2FlowType();
                if( !config.flowType && self.availableFlowTypeList && self.availableFlowTypeList.length ) {
                    self.flowType( self.availableFlowTypeList[0] && self.availableFlowTypeList[0].val );
                }
                self.flowTypeI18n = ko.computed( function() {
                    var
                        flowType = self.flowType(),
                        result = '';
                    self.availableFlowTypeList.some( function( typeDesc ) {
                        if( flowType === typeDesc.val ) {
                            result = typeDesc.i18n;
                            return true;
                        }
                        return false;
                    } );
                    return result;
                } );
            },
            /**
             * initializes flowType select2 autocompleter
             * @method initSelect2FlowType
             */
            initSelect2FlowType: function() {
                var self = this;
                self.select2FlowType = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var flowType = ko.unwrap( self.flowType );
                            return flowType;
                        },
                        write: function( $event ) {
                            self.flowType( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: (function() {
                            return self.availableFlowTypeList.map( function( flowType ) {
                                return {
                                    id: flowType.val,
                                    text: flowType.i18n
                                };
                            } );
                        })()
                    }
                };
            },
            /**
             * Initializes remove handlers for source, transformer, sink
             * @method initRemoveHandling
             */
            initRemoveHandling: function FlowModel_initRemoveHandling() {
                var
                    self = this;
                self.removeSource = function( data ) {
                    self.sources( data );
                };
                self.removeTransformer = function( data ) {
                    self.transformers.remove( data );
                };
                self.removeSink = function( data ) {
                    self.sinks.remove( data );
                };
            },
            /**
             * Saves current flow
             * @method save
             */
            save: function FlowModel_save() {
                var
                    self = this,
                    flowId = self._id && ko.utils.peekObservable( self._id ),
                    data = self.toJSON(),
                    promise;

                if( flowId ) {
                    promise = Y.doccirrus.jsonrpc.api.flow.update( {
                        query: {
                            _id: flowId
                        },
                        data: data,
                        fields: Object.keys( data ),
                        options: {
                            pureLog: true
                        }
                    } );
                } else {
                    promise = Y.doccirrus.jsonrpc.api.flow.create( {
                        data: data,
                        options: {
                            pureLog: true
                        }
                    } );
                }
                return promise;

            },
            /**
             * Deletes current flow
             * @method remove
             */
            remove: function FlowModel_remove() {
                var
                    self = this,
                    promise;
                promise = Y.doccirrus.jsonrpc.api.flow.delete( {query: {_id: self._id()}} );
                return promise;
            },
            /**
             * Tests current flow
             * @method test
             */
            test: function FlowModel_test() {
                var
                    self = this,
                    promise,
                    interval,
                    sinks = ko.utils.peekObservable( self.sinks );

                if( sinks[0] && Y.doccirrus.schemas.v_flowsource.resourceTypes.EVENT === ko.utils.peekObservable( sinks[0].resourceType ) ) {
                    promise = $.Deferred();
                    Y.doccirrus.communication.once( {
                        event: ko.utils.peekObservable( sinks[0].eventName ),
                        socket: Y.doccirrus.communication.getSocket( '/' ),
                        handlerId: 'testFlow',
                        done: function() {
                            clearTimeout( interval );
                            promise.resolve.apply( this, arguments );
                        },
                        fail: function() {
                            clearTimeout( interval );
                            promise.reject.apply( this, arguments );
                        }
                    } );
                    Y.doccirrus.jsonrpc.api.flow.testFlow( {
                        data: self.toJSON()
                    } )
                        .fail( function() {
                            clearTimeout( interval );
                            promise.reject.apply( this, arguments );
                        } );
                    interval = setTimeout( function() {
                        promise.reject.apply( this, [new Y.doccirrus.commonerrors.DCError( 20401 )] );
                    }, 5000 );

                } else {
                    promise = Y.doccirrus.jsonrpc.api.flow.testFlow( {
                        data: self.toJSON()
                    } );
                }
                return promise;
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             */
            getTypeName: function FlowModel_getTypeName() {
                var result = FlowModel.superclass.getTypeName.apply( this, arguments );
                switch( result ) {
                    case 'TransformerModel':
                        result = 'FlowTransformerModel';
                        break;
                }
                return result;
            },
            /**
             * see {{#crossLink "KoViewModel/getPolyTypeName:method"}}{{/crossLink}}
             * @method getPolyTypeName
             */
            getPolyTypeName: function FlowModel_getPolyTypeName() {

                var result = FlowModel.superclass.getPolyTypeName.apply( this, arguments );
                switch( result ) {
                    case 'SourceSerialdeviceModel':
                        result = 'FlowSourceSerialDeviceModel';
                        break;
                    case 'SourceFileModel':
                        result = 'FlowSourceFileModel';
                        break;
                    case 'SourceDatabaseModel':
                        result = 'FlowSourceDatabaseModel';
                        break;
                    case 'SinkSerialdeviceModel':
                        result = 'FlowSinkSerialDeviceModel';
                        break;
                    case 'SinkFileModel':
                        result = 'FlowSinkFileModel';
                        break;
                    case 'SinkDatabaseModel':
                        result = 'FlowSinkDatabaseModel';
                        break;
                    case 'SinkV_eventModel':
                        result = 'FlowSinkEventModel';
                        break;
                    case 'SinkMediportModel':
                        result = 'FlowSinkMediportModel';
                        break;

                }
                return result;
            }

        }, {
            schemaName: 'flow',
            NAME: 'FlowModel'
        } );
        KoViewModel.registerConstructor( FlowModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_flowsource-schema',
            'flow-schema',
            'SerialDeviceModel',
            'FileModel',
            'MediportModel',
            'TransformerModel',
            'DatabaseModel',
            'EventModel',
            'dccommunication-client',
            'dccommonerrors',
            'cardio-schema'
        ]
    }
);
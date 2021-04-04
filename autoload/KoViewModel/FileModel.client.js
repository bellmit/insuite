/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'FileModel', function( Y/*, NAME */ ) {
        /**
         * @module FileModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class FileModel
         * @constructor
         * @extends KoViewModel
         */
        function FileModel( config ) {
            FileModel.superclass.constructor.call( this, config );
        }

        FileModel.ATTRS = {
            /**
             * @attribute availableFileTypeList
             * @type {Array}
             * @default Y.doccirrus.schemas.file.types.FileType_E.list
             */
            availableFileTypeList: {
                value: Y.doccirrus.schemas.file.types.FileType_E.list,
                lazyAdd: false
            },
            /**
             * @attribute availableFileTypes
             * @type {Array}
             * @default Y.doccirrus.schemas.file.fileTypes
             */
            availableFileTypes: {
                value: Y.doccirrus.schemas.file.fileTypes,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( FileModel, KoViewModel.getBase(), {
            initializer: function FileModel_initializer( config ) {
                var self = this;
                self.initFile( config && config.data );
            },
            destructor: function FileModel_destructor() {
            },
            /**
             * initializes file model
             */
            initFile: function FileModel_initFile( config ) {
                var
                    self = this;
                self.availableFileTypeList = self.get( 'availableFileTypeList' );
                self.availableFileTypes = self.get( 'availableFileTypes' );
                self.initSelect2FileType();
                if( (!config || !config.fileType) && self.availableFileTypeList && self.availableFileTypeList.length ) {
                    self.fileType( self.availableFileTypeList[0] && self.availableFileTypeList[0].val );
                }
                self.initSelect2MultiDeviceServer();
                self.initValidateDependencies();
            },
            /**
             * validate those dependencies
             */
            initValidateDependencies: function FileModel_initValidateDependencies() {
                var
                    self = this;
                self.addDisposable( ko.computed( function() {
                    self.fileType();
                    self.smbUser.validate();
                    self.smbPw.validate();
                    self.smbShare.validate();
                    self.deviceServers.validate();
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
            },
            /**
             * Initializes select2 for fileType
             * @method initSelect2FileType
             */
            initSelect2FileType: function FileModel_initSelect2FileType() {
                var
                    self = this;
                self.select2FileType = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var fileType = ko.unwrap( self.fileType );
                            return fileType;
                        },
                        write: function( $event ) {
                            self.fileType( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: (function() {
                            return self.availableFileTypeList.map( function( collection ) {
                                return {
                                    id: collection.val,
                                    text: collection.i18n
                                };
                            } );
                        })()
                    }
                };

            },
            /**
             * Coverts string to selec2 object
             * @method stringToSelect2Object
             * @param {String} text
             * @returns {Object}
             */
            stringToSelect2Object: function( text ) {
                if( !text ) {
                    return text;
                }
                return {
                    id: text,
                    text: text
                };
            },
            /**
             * Initializes select2 for device server
             * @method initSelect2DeviceServer
             */
            initSelect2MultiDeviceServer: function() {
                var
                    self = this,
                    select2MDSConfig = self.select2MDSConfig;

                self.selectedDeviceServers = ko.observableArray( [] );
                self.select2MultiDeviceServer = select2MDSConfig.call( self );
            },


            select2MDSConfig: function() {

                var
                    self = this,
                    deviceServers = [],
                    initDeviceServer = ko.utils.peekObservable( self.deviceServer );
                if( initDeviceServer ) {
                    deviceServers = [{id: initDeviceServer, text: initDeviceServer}];
                }

                function select2LabDatesRead() {
                    return ko.unwrap( self.deviceServers ).map( function(e){ return { id: e, text: e }; } );
                }

                function select2LabDatesWrite( $event ) {
                    self.deviceServers( $event.val );
                }

                return {
                    data: ko.computed( {
                        read: select2LabDatesRead,
                        write: select2LabDatesWrite
                    }, self ),
                    select2: {
                        minimumInputLength: 0,
                        allowClear: true,
                        maximumInputLength: 100,
                        placeholder: "Empfang, Sono, ...",
                        multiple: true,
                        query: function(query) {
                            Y.doccirrus.jsonrpc.api.device.getS2eClients()
                                .done( function( response ) {
                                    var
                                        data = response.data || [];
                                    deviceServers.length = 0;
                                    data.forEach( function( client ) {
                                        deviceServers.push( self.stringToSelect2Object( client ) );
                                    } );
                                    query.callback( {results: deviceServers} );
                                } );
                        }
                    }
                };
            }, // end select2PrintersConfig
            /**
             * @method getName
             * @returns {string}
             */
            getName: function FileModel_getName() {
                var
                    resourceTypes = Y.doccirrus.schemas.v_flowsource.types.ResourceType_E.list,
                    result = '';
                resourceTypes.some( function( resourceType ) {
                    if( Y.doccirrus.schemas.v_flowsource.resourceTypes.FILE === resourceType.val ) {
                        result = resourceType.i18n;
                        return true;
                    }
                    return false;
                } );
                return result;
            },
            checkKeepFiles: function fileModel_checkKeepFiles() {
                var self = this;
                if (!self.triggerManually()) {
                    self.keepFiles(false);
                }
                return true;
            }
        }, {
            schemaName: 'file',
            NAME: 'FileModel'
        } );
        KoViewModel.registerConstructor( FileModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'file-schema',
            'v_flowsource-schema'
        ]
    }
);

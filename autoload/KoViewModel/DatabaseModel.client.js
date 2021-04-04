/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DatabaseModel', function( Y/*, NAME */ ) {
        /**
         * @module DatabaseModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class DatabaseModel
         * @constructor
         * @extends KoViewModel
         */
        function DatabaseModel( config ) {
            DatabaseModel.superclass.constructor.call( this, config );
        }

        DatabaseModel.ATTRS = {
            /**
             * @attribute availableCollectionList
             * @type {Array}
             */
            availableCollectionList: {
                value: [
                    'patient',
                    'activity',
                    'gridFS'
                ],
                lazyAdd: false
            },
            /**
             * @attribute availableApiMethodList
             * @type {Array}
             */
            availableApiMethodList: {
                value: [],
                lazyAdd: false
            },
            /**
             * Filters db operations for source(read) and sink(write)
             * @attribute dbOperationsType
             * @type {String}
             * @default 'read'
             */
            dbOperationsType: {
                value: 'read',
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( DatabaseModel, KoViewModel.getBase(), {
                initializer: function DatabaseModel_initializer( config ) {
                    var self = this;
                    self.initDatabase( config && config.data );
                    self.readOnly = "gridFS" === config.data.collectionName;
                },
                destructor: function DatabaseModel_destructor() {
                },
                /**
                 * collection select2 auto complete configuration
                 * @property select2Collection
                 * @type {Object}
                 */
                select2Collection: null,
                /**
                 * apiMethod select2 auto complete configuration
                 * @property select2ApiMethod
                 * @type {Object}
                 */
                select2ApiMethod: null,
                /**
                 * Methods available for select2ApiMethod
                 * @property select2ApiMethods
                 * @type {Array}
                 */
                select2ApiMethods: null,
                /**
                 * initializes database model
                 */
                initDatabase: function DatabaseModel_initDatabase( config ) {
                    var
                        self = this;
                    self.availableCollectionList = self.get( 'availableCollectionList' );
                    self.availableApiMethodList = self.get( 'availableApiMethodList' );
                    self.select2ApiMethods = [];
                    self.initSelect2Collection();
                    self.initSelect2ApiMethod();
                    self.addDisposable( self.collectionName.subscribe( function() {
                        self.updateAvailableApiMethodList();
                        if(self.select2ApiMethods && self.select2ApiMethods.length){
                            self.apiMethod( self.select2ApiMethods[0].id );
                        }
                    } ) );
                    if( !config.collectionName && self.availableCollectionList && self.availableCollectionList.length ) {
                        self.collectionName( self.availableCollectionList[0] );
                    }

                    self.updateAvailableApiMethodList();
                    if( !config.apiMethod && self.select2ApiMethods && self.select2ApiMethods.length ) {
                        self.apiMethod( self.select2ApiMethods[0].id );
                    }

                },
                /**
                 * Initializes select2 for collection
                 * @method initSelect2Collection
                 */
                initSelect2Collection: function DatabaseModel_initSelect2Collection() {
                    var
                        self = this;
                    self.select2Collection = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var collectionName = ko.unwrap( self.collectionName );
                                return collectionName;
                            },
                            write: function( $event ) {
                                self.collectionName( $event.val );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            data: (function() {
                                return self.availableCollectionList.map( function( collection ) {
                                    return {
                                        id: collection,
                                        text: collection
                                    };
                                } );
                            })()
                        }
                    };

                },
                /**
                 * @method updateAvailableApiMethodList
                 */
                updateAvailableApiMethodList: function() {
                    var
                        self = this,
                        collectionName = ko.utils.peekObservable( self.collectionName );
                    if( collectionName ) {
                        if( Y.doccirrus.schemas[collectionName] && Y.doccirrus.schemas[collectionName].apiMethods ) {
                            self.availableApiMethodList = Y.doccirrus.schemas[collectionName].apiMethods;
                            self.updateSelect2ApiMethods();
                        } else if ( collectionName === 'gridFS' ) {
                            self.availableApiMethodList = [ {
                                name: 'getMediportXML',
                                operationType: 'read'
                            } ];
                            self.updateSelect2ApiMethods();
                        }
                    }
                },
                /**
                 * Udaptes data for select2ApiMethod
                 * @method updateSelect2ApiMethods
                 */
                updateSelect2ApiMethods: function() {
                    var
                        self = this,
                        dbOperationsType = self.get('dbOperationsType');
                    self.select2ApiMethods.length = 0;
                    self.availableApiMethodList.forEach( function( apiMeta ) {

                        if( dbOperationsType === apiMeta.operationType ) {
                            self.select2ApiMethods.push( {
                                id: apiMeta.name,
                                text: apiMeta.name
                            } );
                        }
                    } );
                },
                /**
                 * Initializes select2 for apiMethod
                 * @method initSelect2ApiMethod
                 */
                initSelect2ApiMethod: function DatabaseModel_initSelect2ApiMethod() {
                    var
                        self = this;

                    self.select2ApiMethod = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var apiMethod = ko.unwrap( self.apiMethod );
                                return apiMethod;
                            },
                            write: function( $event ) {
                                self.apiMethod( $event.val );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            data: self.select2ApiMethods
                        }
                    };

                },
                /**
                 * @method getName
                 * @returns {string}
                 */
                getName: function DatabaseModel_getName() {
                    var
                        resourceTypes = Y.doccirrus.schemas.v_flowsource.types.ResourceType_E.list,
                        result = '';
                    resourceTypes.some( function( resourceType ) {
                        if( Y.doccirrus.schemas.v_flowsource.resourceTypes.DATABASE === resourceType.val ) {
                            result = resourceType.i18n;
                            return true;
                        }
                        return false;
                    } );
                    return result;
                }
            },
            {
                schemaName: 'database',
                NAME: 'DatabaseModel'
            }
        )
        ;
        KoViewModel.registerConstructor( DatabaseModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'database-schema',
            'patient-schema',
            'v_flowsource-schema'
        ]
    }
);
/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, moment */

'use strict';

YUI.add( 'BGScheinEditorModel', function( Y, NAME ) {
        /**
         * @module BGScheinEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ScheinEditorModel = KoViewModel.getConstructor( 'ScheinEditorModel' ),
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        /**
         * @class BGScheinEditorModel
         * @constructor
         * @extends ScheinEditorModel
         */
        function BGScheinEditorModel( config ) {
            BGScheinEditorModel.superclass.constructor.call( this, config );
        }

        BGScheinEditorModel.ATTRS = {
            whiteList: {
                value: ScheinEditorModel.ATTRS.whiteList.value.concat( Y.doccirrus.schemas.activity.getAllFieldsFromSchemaPath( 'BGSchein_T' ), [
                    'status',
                    'dayOfAccident',
                    'uvGoaeType'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: ScheinEditorModel.ATTRS.subModelsDesc.value.concat( [] ),
                lazyAdd: false
            }
        };

        Y.extend( BGScheinEditorModel, ScheinEditorModel, {
                initializer: function BGScheinEditorModel_initializer() {
                    var
                        self = this;
                    self.initBGScheinEditorModel();

                },
                destructor: function BGScheinEditorModel_destructor() {
                },
                initBGScheinEditorModel: function BGScheinEditorModel_initBGScheinEditorModel() {
                    var
                        self = this;

                    self.invoiceTypeI18n = i18n( 'InCaseMojit.casefile_detail.label.INVOICE_TYPE' );
                    self.uvGoaETypeI18n = i18n( 'InCaseMojit.casefile_detail.label.UVGOAETYPE' );
                    self.groupRemittorI18n = i18n( 'InCaseMojit.casefile_detail.group.REMITTOR' );
                    self.labelBSNRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.labelLANRI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.labelDSICDI18n = i18n( 'InCaseMojit.casefile_detail.label.D_S_ICD' );
                    self.beilligteLeistungenI18n = i18n( 'InCaseMojit.casefile_detail.group.BEWILLIGTE_LEISTUNGEN' );
                    self.recalculateI18n = i18n( 'InCaseMojit.casefile_detail.button.RECALCULATE' );
                    self.accPsyPrivateI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.ACC_PSY_PRIVATE' );
                    self.groupOperationI18n = i18n( 'InCaseMojit.casefile_detail.group.OPERATION' );

                    self._treatmentTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.TreatmentType_E.list );
                    self._uvGoaeTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.UvGoaeType_E.list );
                    self.cities = [];
                    self.initSelect2Zip();
                    self.initSelect2City();
                    self.initBGScheinRef();
                    self._initPhysicianSetters();

                },
                initBGScheinRef: function() {
                    var self = this;

                    self.bgScheinRefList = ko.observableArray();

                    self.showAssignBgScheinSelect = ko.computed( function() {
                        return -1 !== ['CREATED', 'VALID'].indexOf( unwrap( self.status ) );
                    } );

                    if( !peek( self.showAssignBgScheinSelect ) ) {
                        return;
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                        query: {
                            actType: 'BGSCHEIN',
                            status: {$in: ['VALID', 'APPROVED', 'BILLED']},
                            patientId: peek( self.patientId ),
                            caseFolderId: peek( self.caseFolderId )
                        },
                        options: {
                            sort: {timestamp: -1},
                            limit: 20
                        }
                    } ) ).then( function( response ) {
                        var newList = (response && response.data || []).map( function( schein ) {
                            var text = [
                                schein.content,
                                'Unfalltag: ',
                                moment( schein.dayOfAccident ).format( 'DD.MM.YYYY' )
                            ].join( ' ' );

                            return {
                                id: schein._id,
                                text: text,
                                data: schein
                            };
                        } );

                        self.bgScheinRefList( newList );

                        self.addDisposable( ko.computed( function() {
                            var currentActivity = peek( self.get( 'currentActivity' ) ),
                                assignedBgScheinRef = self.assignedBgScheinRef(),
                                selectedBgScheinRef = assignedBgScheinRef && self.bgScheinRefList().find( function( bgScheinRef ) {
                                    return bgScheinRef.id === assignedBgScheinRef;
                                } );

                            if( ko.computedContext.isInitial() ) {
                                return;
                            }

                            currentActivity.assignOldBgSchein( selectedBgScheinRef && selectedBgScheinRef.data );
                        } ) );

                    } ).catch( function( err ) {
                        Y.log( 'could not get last bgscheins: ' + err, 'warn', NAME );
                    } );

                },
                initSelect2Zip: function BGScheinEditorModel_initSelect2Zip() {
                    var
                        self = this;
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._zipCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    accidentCompanyPLZ = unwrap( self.accidentCompanyPLZ );

                                if( accidentCompanyPLZ ) {
                                    return {id: accidentCompanyPLZ, text: accidentCompanyPLZ};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                if( $event.val && null !== Y.doccirrus.catalogmap.getCatalogZip() ) {
                                    Y.doccirrus.jsonrpc.api.catalog.read( {
                                            query: {
                                                catalog: Y.doccirrus.catalogmap.getCatalogZip().filename,
                                                zip: $event.val,
                                                sign: 'D'
                                            },
                                            options: {
                                                limit: 1
                                            }
                                        } )
                                        .done( function( response ) {
                                            self.setCities( response.data );
                                            if( response.data.length && response.data[0].city ) {
                                                jQuery( '#cityAutoComplete' ).select2( 'open' );
                                                self.accidentCompanyCity( response.data[0].city );
                                            } else {
                                                self.accidentCompanyCity( '' );
                                            }

                                        } );
                                }
                                self.accidentCompanyPLZ( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            maximumInputLength: 10,
                            query: function( query ) {

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    if( 0 === results.length ) {
                                        results[0] = {plz: query.term};
                                    }
                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.plz, text: item.plz};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDPLZ() ) {
                                    done( [] );
                                }
                                else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
                                                itemsPerPage: 10,
                                                term: query.term
                                            }
                                        } )
                                        .done( done )
                                        .fail( function() {
                                            done( [] );
                                        } );
                                }

                            }
                        }
                    };

                },
                setCities: function BGScheinEditorModel_setCities( data ) {
                    var
                        self = this;
                    self.cities.length = 0;
                    data.forEach( function( cityData ) {
                        self.cities.push( {id: cityData.city, text: cityData.city} );
                    } );
                },
                initSelect2City: function BGScheinEditorModel_initSelect2City() {
                    var
                        self = this;
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._cityCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    accidentCompanyCity = self.accidentCompanyCity();

                                if( accidentCompanyCity ) {
                                    return {id: accidentCompanyCity, text: accidentCompanyCity};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.accidentCompanyCity( $event.val );
                            }
                        } ) ),
                        select2: {
                            allowClear: true,
                            maximumInputLength: 15,
                            data: self.cities,
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };
                },
                selectAccidentCompany: function() {
                    var self = this;
                    Y.doccirrus.modals.selectContacts.show( {
                        checkMode: 'single',
                        onSelected: function( formTableDef, contacts ) {
                            var contact = contacts && contacts[0];
                            if( contact ) {
                                self.accidentCompany( contact.content || self.accidentCompany.peek() );
                                self.accidentCompanyStreet( contact.street || self.accidentCompanyStreet.peek() );
                                self.accidentCompanyHouseno( contact.houseno || self.accidentCompanyHouseno.peek() );
                                self.accidentCompanyPLZ( contact.zip || self.accidentCompanyPLZ.peek() );
                                self.accidentCompanyCity( contact.city || self.accidentCompanyCity.peek() );
                            }
                        }
                    } );

                },
            /** @private **/
            _initPhysicianSetters: function() {
                var
                    self = this;

                self.selectPhysicianRemittor = self._buildPhysicianSetter( {
                    bsnr: 'scheinEstablishment',
                    lanr: 'scheinRemittor',
                    substitute: 'fk4219'
                } );

            }
            }, {
                NAME: 'BGScheinEditorModel'
            }
        );
        KoViewModel.registerConstructor( BGScheinEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinEditorModel',
            'FKEditorModels',
            'activity-schema',
            'dccatalogmap',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'DcSelectContactsModal'
        ]
    }
);

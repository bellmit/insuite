/**
 * User: pi
 * Date: 24/11/16  14:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'AddMedicationModal', function( Y ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            unwrap = ko.unwrap,
            APPLY = i18n( 'InCaseMojit.medication_modalJS.button.APPLY' ),
            peek = ko.utils.peekObservable,
            lodash = _;

        /**
         * AddMedicationModel model
         * @constructor
         */
        function AddMedicationModel() {
            AddMedicationModel.superclass.constructor.apply( this, arguments );
        }

        function setBG( meta, str ) {
            if( meta.row && meta.row.patImportId ) {
                return '<span style="background-color: lightgrey;">'+str+'</span>';
            }
            return str;
        }

        Y.extend( AddMedicationModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function( config ) {
                var
                    self = this;
                self.initAddMedicationModel( config );

            },
            /** @protected */
            destructor: function() {
            },
            /** @protected */
            initAddMedicationModel: function( config ) {
                var
                    self = this;

                self.onItemSelected = config.onItemSelected;
                self.selectedItems = ko.observableArray();
                self.isValid = ko.computed( function() {
                    var
                        selectedItems = unwrap( self.selectedItems );
                    return Boolean( selectedItems.length );
                } );
                self.initTitles();
                self.initButtons();
                self.initCatalogUsageKoTable();
                self.initPatientMedicationKoTable();
            },
            initTitles: function() {
                var
                    self = this;
                self.searchTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MMI_SEARCH' );
                self.catalogUsageTableTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CATALOG_USAGE_TABLE' );
                self.patientMedicationTableTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PATIENT_MEDICATIONS_TABLE' );
                self.selectedItemsTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.SELECTED_ITEMS_TITLE' );

            },
            initButtons: function() {
                var
                    self = this;
                self._openMedicationSearch = function( focusInput ) {
                    var
                        currentActivity = self.get( 'currentActivity' ),
                        currentPatient = self.get( 'currentPatient' ),
                        defaultMappings = self.get( 'defaultMappings' );
                    Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                            activity: Object.assign( {}, currentActivity, {caseFolder: currentPatient && currentPatient.caseFolderCollection && currentPatient.caseFolderCollection.getActiveTab()} ),
                            patient: currentPatient,
                            focusInput: focusInput,
                            multiSelect: true
                        }, function( err, selectedItems ) {
                            if( err ) {
                                return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                            Promise.mapSeries( selectedItems, function( selected ) {
                                return new Promise( function( resolve ) {
                                    var isOTC,
                                        patientAge,
                                        isOver12,
                                        isChild,
                                        phPatPay,
                                        phPatPayHint,
                                        phPriceSale,
                                        phFixedPay,
                                        canBePatPayFree;

                                    if( selected && selected.package && selected.package.originalData && selected.product && selected.product.originalData ) {

                                        // adjust phPatPay and phPatPayHint
                                        isOTC = selected.product.originalData.phOTC;
                                        patientAge = currentPatient.age();
                                        isOver12 = 12 < patientAge;
                                        isChild = 18 >= patientAge;
                                        phPatPay = selected.package.originalData.phPatPay;
                                        phPatPayHint = selected.package.originalData.phPatPayHint;
                                        phPriceSale = selected.package.originalData.phPriceSale;
                                        phFixedPay = selected.package.originalData.phFixedPay;
                                        canBePatPayFree = true;

                                        // AVP must be less than FIXED less 30% to be free of payment
                                        if( phPriceSale && phFixedPay && (phPriceSale > phFixedPay - (phFixedPay / 100 * 30)) ) {
                                            canBePatPayFree = false;
                                        }

                                        if( canBePatPayFree && isOTC && isChild && isOver12 ) {
                                            phPatPay = null;
                                            phPatPayHint = null;
                                        } else if( canBePatPayFree && isChild ) {
                                            phPatPay = 0;
                                            phPatPayHint = 'zuzahlungsfrei';
                                        }

                                        Y.doccirrus.schemas.activity._setActivityData( {
                                            initData: {
                                                actType: 'MEDICATION',
                                                catalogShort: 'MMI',
                                                locationId: currentActivity.locationId
                                            },
                                            entry: {
                                                code: '',
                                                title: selected.product.originalData.title,
                                                phTer: selected.product.originalData.phTer,
                                                phTrans: selected.product.originalData.phTrans,
                                                phImport: selected.product.originalData.phImport,
                                                phNegative: selected.product.originalData.phNegative,
                                                phLifeStyle: selected.product.originalData.phLifeStyle,
                                                phLifeStyleCond: selected.product.originalData.phLifeStyleCond,
                                                phGBA: selected.product.originalData.phGBA,
                                                phGBATherapyHintName: selected.product.originalData.phGBATherapyHintName,
                                                phDisAgr: selected.product.originalData.phDisAgr,
                                                phDisAgrAlt: selected.product.originalData.phDisAgrAlt,
                                                phMed: selected.product.originalData.phMed,
                                                phPrescMed: selected.product.originalData.phPrescMed,
                                                phCompany: selected.product.originalData.phCompany,
                                                phOnly: selected.product.originalData.phOnly,
                                                phRecipeOnly: selected.product.originalData.phRecipeOnly,
                                                phBTM: selected.product.originalData.phBTM,
                                                phContraceptive: selected.product.originalData.phContraceptive,
                                                phOTC: selected.product.originalData.phOTC,
                                                phOTX: selected.product.originalData.phOTX,
                                                phAMR: selected.product.originalData.phAMR,
                                                phAMRContent: selected.product.originalData.phAMRText,
                                                phAtc: selected.product.originalData.phAtc,
                                                phIngr: selected.product.originalData.phIngr,
                                                phForm: selected.product.originalData.phForm,
                                                phFormCode: selected.package.originalData.phFormCode,

                                                phPriceSale: selected.package.originalData.phPriceSale,
                                                phRefundAmount: selected.package.originalData.phRefundAmount,
                                                phPriceRecommended: selected.package.originalData.phPriceRecommended,
                                                phPatPay: phPatPay,
                                                phPatPayHint: phPatPayHint,
                                                phFixedPay: selected.package.originalData.phFixedPay,
                                                phCheaperPkg: selected.package.originalData.phCheaperPkg,

                                                phNLabel: selected.package.originalData.phNLabel,

                                                phPZN: selected.package.originalData.phPZN,
                                                phPackSize: selected.package.originalData.phPackSize,
                                                phPackQuantity: selected.package.originalData.phPackQuantity,
                                                phARV: selected.package.originalData.phARV,
                                                phARVContent: selected.package.originalData.phARVText
                                            },
                                            user: null
                                        }, function( err, data ) {
                                            if( err ) {
                                                Y.log( 'can never happen in client #0003' );
                                            }
                                            resolve( data );
                                        } );
                                    }
                                } );
                            } )
                                .then( function( data ) {
                                    self.onItemSelected( data );
                                } );
                        }
                    );
                };

                self.searchButton = Y.doccirrus.MMISearchButton.create( {
                    onClick: function( focusInput ) {
                        self._openMedicationSearch( focusInput );
                        self.get( 'modal' ).close();
                    },
                    disabled: function() {
                        return false;
                    }
                } );

                self.unSelectItemButton = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'deleteItem',
                        icon: 'TRASH_O',
                        click: function( button, event, $context ) {
                            self.selectedItems.remove( $context.$parent );
                        }
                    }
                } );
            },
            initCatalogUsageKoTable: function() {
                var
                    self = this,
                    currentActivity = self.get( 'currentActivity' );
                self.catalogUsageKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-AddMedicationModal-catalogUsageTable',
                        states: [ 'limit' ],
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getDistinct,
                        baseParams: {
                            data: {
                                modelName: 'catalogusage',
                                matches: [
                                    {
                                        catalogShort: 'MMI',
                                        locationId: currentActivity && peek( currentActivity.locationId )
                                    }
                                ],
                                groupFields: [ 'seq' ]
                            },

                            fields: lodash.assign( {
                                seq: 1,
                                title: 1
                            }, self.get( 'selectFields' ) )

                        },
                        limit: 5,
                        limitList: [ 5, 10, 20 ],
                        columns: [
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                forPropertyName: 'seq',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                forPropertyName: 'phNLabel',
                                width: "70%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                title: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                forPropertyName: 'phForm',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            if( self.catalogUsageKoTable.isSelected( row ) ) {
                                Y.doccirrus.schemas.activity._setActivityData( {
                                    initData: {
                                        actType: 'MEDICATION',
                                        catalogShort: 'MMI',
                                        locationId: currentActivity.locationId
                                    },
                                    entry: row,
                                    user: null
                                }, function( err, data ) {
                                    if( err ) { Y.log( 'can never happen in client #0004' ); }
                                    self.unselectItem( data );
                                } );
                            } else {
                                Y.doccirrus.schemas.activity._setActivityData( {
                                    initData: {
                                        actType: 'MEDICATION',
                                        catalogShort: 'MMI',
                                        locationId: currentActivity.locationId
                                    },
                                    entry: row,
                                    user: null
                                }, function( err, data ) {
                                    if( err ) { Y.log( 'can never happen in client #0006' ); }
                                    self.selectItem( data );
                                } );
                            }
                        }
                    }
                } );
            },
            initPatientMedicationKoTable: function() {
                var
                    self = this,
                    currentPatient = self.get( 'currentPatient' );
                self.patientMedicationKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-AddMedicationModal-catalogUsageTable',
                        states: [ 'limit' ],
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getDistinct,
                        baseParams: {
                            data: {
                                matches: [
                                    { patientId: peek( currentPatient._id ) },
                                    { actType: 'MEDICATION' },
                                    { status: {$ne: 'LOCKED'} }
                                ],
                                groupFields: [ 'code' ]
                            },

                            fields: lodash.assign( {
                                code: 1,
                                userContent: 1,
                                catalogShort: 1,
                                actType: 1,
                                timestamp: 1,
                                patImportId: 1,
                                content: 1
                            }, self.get( 'selectFields' ) )

                        },
                        limit: 5,
                        limitList: [ 5, 10, 20 ],
                        columns: [
                            {
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                forPropertyName: 'timestamp',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        result,
                                        timestamp = peek( meta.value );

                                    if( timestamp ) {
                                        result = moment( timestamp ).format( TIMESTAMP_FORMAT );
                                    } else {
                                        result = '';
                                    }
                                    return setBG( meta, result );
                                }
                            },
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                forPropertyName: 'code',
                                width: "15%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                forPropertyName: 'phNLabel',
                                width: "55%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                title: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                forPropertyName: 'phForm',
                                width: "15%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            }

                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            if( self.patientMedicationKoTable.isSelected( row ) ) {
                                self.unselectItem( row );
                            } else {
                                self.selectItem( row );
                            }

                        }

                    }
                } );
            },
            selectItem: function( data ) {
                var
                    self = this,
                    selectedItems = peek( self.selectedItems );
                if( selectedItems.every( function( item ) {
                        return item.code !== data.code;
                    } ) ) {
                    self.selectedItems.push( data );
                }

            },
            unselectItem: function( data ) {
                var
                    self = this;
                self.selectedItems.remove( function( item ) {
                    return item.code === data.code;
                } );
            },
            toJSON: function() {
                var
                    self = this;
                return ( peek( self.selectedItems ) || [] ).map( function(item) {
                    delete item._id;
                    return item;
                });
            }
        }, {
            NAME: 'AddMedicationModel',
            ATTRS: {
                currentPatient: {
                    value: null,
                    lazyAdd: false
                },
                currentActivity: {
                    value: null,
                    lazyAdd: false
                },
                defaultMappings: {
                    value: null,
                    lazyAdd: false
                },
                modal: {
                    value: null,
                    lazyAdd: false
                },
                medicationFields: {
                    value: Object.keys( Y.doccirrus.schemas.activity.types.Medication_T ),
                    lazyAdd: false
                },
                selectFields: {
                    valueFn: function() {
                        var
                            medicationFields = this.get( 'medicationFields' );
                        return medicationFields.reduce( function( obj, key ) {
                            obj[ key ] = 1;
                            return obj;
                        }, {} );
                    },
                    lazyAdd: false
                }
            }
        } );

        function AddMedicationModal() {
        }

        AddMedicationModal.prototype.show = function( config ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/add_medication_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            addMedicationModel;

                        modal = new Y.doccirrus.DCWindow( {
                            id: 'add_medication_modal',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MODAL_TITLE' ),
                            width: '95%',
                            height: '85%',
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: APPLY,
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            resolve( addMedicationModel.toJSON() );

                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    addMedicationModel.destroy();
                                }
                            }
                        } );

                        addMedicationModel = new AddMedicationModel( {
                            currentActivity: config.currentActivity,
                            currentPatient: config.currentPatient,
                            defaultMappings: config.defaultMappings,
                            modal: modal,
                            onItemSelected: function( data ) {
                                resolve( data );
                            }

                        } );
                        ko.applyBindings( addMedicationModel, bodyContent.getDOMNode() );

                        addMedicationModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( addMedicationModel.isValid ),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                    } );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).addMedicationModal = new AddMedicationModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoUI-all',
            'KoViewModel',
            'dcmedicationmodal',
            'MMISearchButton'
        ]
    }
);

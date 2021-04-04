/**
 * User: do
 * Date: 01/02/18  17:13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'CardReadHistoryModel', function( Y, NAME ) {
        /**
         * @module CardReadHistoryModel
         */

        var
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function CardReadHistoryModel( config ) {
            CardReadHistoryModel.superclass.constructor.call( this, config );
        }

        Y.extend( CardReadHistoryModel, KoViewModel.getBase(), {
                initializer: function CardReadHistoryModel_initializer(conf) {
                    var self = this;
                    self.selectedCrLogId = ko.observable( null );
                    self.crlogs = ko.observableArray();

                    self.readIds = ko.observableArray( Array.isArray( conf.data.ids ) ? conf.data.ids : [] );
                    self.errors = Array.isArray(conf.data.errors) ? ko.observableArray(conf.data.errors) : ko.observableArray([]);
                    self.typeOfRead = ko.observable(conf.data.typeOfRead);

                    self.initErrorButtons();

                    self.selectedCrLog = ko.computed( function() {
                        var selectedCrLogId = unwrap( self.selectedCrLogId ),
                            crlogs = unwrap( self.crlogs ),
                            result = null;
                        if( selectedCrLogId ) {
                            crlogs.some( function( crlogModel ) {
                                if( selectedCrLogId === crlogModel._id ) {
                                    result = KoViewModel.createViewModel( {
                                        NAME: 'CRLogModel',
                                        config: {data: crlogModel, parent: self}
                                    } );
                                    return true;
                                }
                            } );
                        }
                        return result;
                    } );

                    self.initCrLogStatusChangeHandler();
                    self.getHistory();
                    self.createDataTable();

                    self.addDisposable(ko.computed(function() {
                        var selected = unwrap( self.selectedCrLogId );
                        self.cardreaderTable.rows().forEach( function( row ) {
                            if (selected === row._id) {
                                self.cardreaderTable.selectRow( { row: row } );
                            }
                        } );
                    }));

                    self.addDisposable(ko.computed(function() {
                        var errors = unwrap( self.errors );
                        if (0 === errors.length) {
                            self.showAll();
                        }
                    }));
                },
                initCrLogStatusChangeHandler: function() {
                    var self = this;
                    Y.doccirrus.communication.on( {
                        event: 'crLogStatusChange',
                        done: function( message ) {
                            var data = message && message.data && message.data[0];
                            if( data ) {
                                self.updateCrLogModel( data );
                            }
                        },
                        handlerId: 'crLogStatusChange'
                    } );

                },
                updateCrLogModel: function( data ) {
                    var self = this,
                        selected = peek( self.selectedCrLog );

                    // reload whole table if changed crlog is currently shown in table and status has changed
                    peek( self.crlogs ).some( function( crlog ) {
                        if( peek( crlog._id ) === data._id && peek( crlog.status ) !== data.status ) {
                            self.cardreaderTable.reload();
                        }
                    } );

                    // updated current selection
                    if( selected && peek( selected._id ) === data._id && peek( selected.status ) !== data.status ) {
                        selected.set( 'data', data );
                    }
                },
                selectCrlog: function( crLog ) {
                    var self = this;
                    self.selectedCrLogId( crLog ? crLog._id : null );
                },
                getHistory: function() {
                    var self = this,
                        readIds = peek( self.readIds ),
                        params = (readIds.length) ? {query: {_id: readIds}, options: {sort: {_id: -1}}} : {query: {}, options: {sort: {_id: -1}}};
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.crlog.getHistory( params ) )
                        .then( function( response ) {
                            var result = response.data || [];
                            self.crlogs( result );
                            self.selectedCrLogId( result && result[0] && result[0] && result[0]._id || null );
                        } )
                        .catch( function( err ) {
                            Y.log( 'could not get crlog history ' + err, 'error', NAME );
                        } );
                },
                showAll: function() {
                    var self = this;
                    self.readIds( [] );
                    self.getHistory();
                },
                initErrorButtons: function () {
                    var
                        self = this;

                    unwrap(self.errors).forEach(function(error) {
                        error.message = !Y.doccirrus.errorTable.hasCode( error.code ) && error.message ? error.message : Y.doccirrus.errorTable.getMessage( {code: error.code} );
                        error.actions.forEach(function(action) {
                            self[action.name] = KoComponentManager.createComponent( {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: action.name,
                                    option: 'PRIMARY',
                                    size: 'SMALL',
                                    text: action.text,//i18n( 'general.button.SAVE' ),
                                    click: function() {
                                        switch (this.name()) {
                                            case 'tryAgainBtn110001':
                                                self.errors([]);

                                                Y.doccirrus.jsonrpc.api.dscrmanager[unwrap(self.typeOfRead)]( {
                                                    data: {
                                                        callID: '',
                                                        port: error.meta.port,
                                                        driver: error.meta.driver,
                                                        mobile: error.meta.mobile,
                                                        name: error.meta.name,
                                                        deviceServerName: error.meta.deviceServerName,
                                                        deviceServers: error.meta.deviceServers
                                                    }
                                                } )
                                                    .done( function(res) {
                                                        self.readIds( res.data.ids );

                                                        res.data.errors.forEach(function(err) {
                                                            self.errors.push(err);
                                                        });

                                                        self.initErrorButtons();
                                                        self.getHistory();
                                                    });
                                                break;
                                            case 'skipBtn110001':
                                                self.errors([]);
                                                Y.doccirrus.jsonrpc.api.sdManager.getDeviceServerNames()
                                                .done(function(res){
                                                    Y.doccirrus.jsonrpc.api.dscrmanager.deleteCard( {
                                                        data: {
                                                            action: 'deleteCard',
                                                            callID: '',
                                                            port: error.meta.port,
                                                            driver: error.meta.driver,
                                                            deviceServerName: error.meta.deviceServerName,
                                                            deviceServers: res.deviceServers
                                                        }
                                                    } )
                                                        .done( function() {
                                                            Y.doccirrus.communication.apiCall( {
                                                                method: 'dscrmanager.readCardBatch',
                                                                data: {
                                                                    callID: '',
                                                                    port: error.meta.port,
                                                                    driver: error.meta.driver,
                                                                    mobile: error.meta.mobile,
                                                                    name: error.meta.name,
                                                                    deviceServerName: error.meta.deviceServerName,
                                                                    deviceServers: error.meta.deviceServers
                                                                }
                                                            }, function( err, res ) {
                                                                if( err ) {
                                                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                                                        content: i18n('DeviceMojit.tab_cardreader.errors.readCardBatchError'),
                                                                        level: 'ERROR'
                                                                    } );
                                                                    Y.log("dscrmanager.readCardBatch: Error in response "+ err, "error", NAME);
                                                                    return;
                                                                }

                                                                self.readIds( res.data.ids );

                                                                res.data.errors.forEach(function(err) {
                                                                    self.errors.push(err);
                                                                });

                                                                self.initErrorButtons();
                                                                self.getHistory();
                                                            } );
                                                        });
                                                });
                                                break;
                                            case 'verifySMCBPinBtn':
                                                Y.doccirrus.modals.pinOperationModal.show({
                                                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.verifyPin' ).i18n,
                                                    methodToCall: 'VerifyPin',
                                                    context: error.meta.context,
                                                    CtId: error.meta.CtId,
                                                    CardHandle: error.meta.CardHandle
                                                });
                                                self.closeModal();
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            });
                        });
                    });
                },
                closeModal: function() {
                    var self = this,
                        data = self.get( 'data' ),
                        close = data && data.close;

                    if( 'function' === typeof close ) {
                        close();
                    }
                },
                switchToCopyModal: function( diff ) {
                    var self = this;

                    function getTemplate() {
                        return Y.doccirrus.jsonrpc.api.jade
                            .renderFile( {path: 'CardreaderMojit/views/patientdiff-window'} )
                            .then( function( response ) {
                                return response.data;
                            } );
                    }

                    if( !diff ) {
                        return;
                    }

                    self.closeModal();

                    Promise.resolve( getTemplate() ).then( function( template ) {
                        var bodyContent = Y.Node.create( template ),
                            dcWindow,
                            patientDiffModel = KoViewModel.createViewModel( {
                                NAME: 'PatientDiffModel',
                                config: {data: {diff: diff}}
                            } );

                        dcWindow = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-PatientDiffModal',
                            bodyContent: bodyContent,
                            title: 'Kartendaten',
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            width: 'xlarge',
                            height: 600,
                            centered: true,
                            modal: false,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                        isDefault: true,
                                        action: function() {
                                            dcWindow.close();
                                        }
                                    } )
                                ]
                            }
                        } );
                        try {

                            ko.applyBindings( patientDiffModel, bodyContent.getDOMNode() );
                        } catch( err ) {
                            Y.log( 'could not get patientdiff-window modal ' + err, 'error', NAME );
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not get template for patient diff window: ' + err, 'error', NAME );
                    } );

                },
                createDataTable: function CardReadHistoryModel_createDataTable() {
                    var self = this,
                    cardreaderTableColors = {
                        'success': '#dff0d8',
                        'warning': '#fcf8e3',
                        'danger': '#f2dede'
                    };
                    self.cardreaderTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            striped: false,
                            states: ['limit', 'usageShortcutsVisible'],
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.crlog.getHistory,
                            baseParams: {},
                            limit: 20,
                            limitList: [10, 20, 30, 40, 50],
                            sortersLimit: 1,
                            responsive: false,
                            columns: [
                                {
                                    forPropertyName: 'parsedPatient.firstname',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                    title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                    width: '15%',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    forPropertyName: 'parsedPatient.lastname',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                    title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                    width: '15%',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    forPropertyName: 'parsedPatient.dob',
                                    label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                    title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                    width: '10%',
                                    isSortable: true,
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                                    filterField: {
                                        componentType: 'KoSchemaValue',
                                        componentConfig: {
                                            fieldType: 'DateRange',
                                            showLabel: false,
                                            isOnForm: false,
                                            required: false,
                                            placeholder: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                            autoCompleteDateRange: true
                                        }
                                    },
                                    renderer: function( meta ) {
                                        var
                                            data = meta.row,
                                            parsedPatient = data.parsedPatient;

                                        if( !parsedPatient ) {
                                            return '';
                                        }

                                        if( parsedPatient.kbvDob ) {
                                            return parsedPatient.kbvDob;
                                        }
                                        return moment.utc( parsedPatient.dob ).local().format('DD.MM.YYYY');
                                    }
                                },
                                {
                                    forPropertyName: 'parsedPatient.title',
                                    label:  i18n( 'person-schema.Person_T.title.i18n' ),
                                    title:  i18n( 'person-schema.Person_T.title.i18n' ),
                                    width: '15%',
                                    isSortable: true,
                                    isFilterable: true,
                                    visible: false
                                },
                                {
                                    forPropertyName: '_id',
                                    label: i18n( 'person-schema.InsuranceStatus_T.cardSwipe' ),
                                    title: i18n( 'person-schema.InsuranceStatus_T.cardSwipe' ),
                                    width: '10%',
                                    isSortable: true,
                                    isFilterable: true,
                                    sortInitialIndex: 0,
                                    direction: 'DESC',
                                    renderer: function( meta ) {
                                        var
                                            data = meta.row,
                                            cardSwipe = data.cardSwipe || data.initiatedAt;
                                        return moment.utc( cardSwipe ).local().format('DD.MM.YYYY');
                                    },
                                    queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                                    filterField: {
                                        componentType: 'KoSchemaValue',
                                        componentConfig: {
                                            fieldType: 'DateRange',
                                            showLabel: false,
                                            isOnForm: false,
                                            required: false,
                                            placeholder: i18n( 'person-schema.InsuranceStatus_T.cardSwipe' ),
                                            autoCompleteDateRange: true
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'initiator',
                                    label: i18n( 'InvoiceMojit.gkv_browserJS.label.USER' ),
                                    title: i18n( 'InvoiceMojit.gkv_browserJS.label.USER' ),
                                    width: '15%',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    forPropertyName: 'status',
                                    label: i18n( 'InvoiceMojit.gkv_browserJS.label.STATUS' ),
                                    title: i18n( 'InvoiceMojit.gkv_browserJS.label.STATUS' ),
                                    width: '15%',
                                    isSortable: true,
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                    renderer: function( meta ) {
                                        var
                                            data = meta.row;
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'crlog', 'Status_E', data.status, 'i18n', '' );
                                    },
                                    filterField: {
                                        componentType: 'KoFieldSelect',
                                        options: Y.doccirrus.schemas.crlog.types.Status_E.list,
                                        optionsCaption: '',
                                        optionsText: 'i18n',
                                        optionsValue: 'val'
                                    }
                                },
                                {
                                    forPropertyName: 'mergedPatient.patientNo',
                                    label:  i18n( 'patient-schema.Patient_T.patientNumber.i18n' ),
                                    title:  i18n( 'patient-schema.Patient_T.patientNumber.i18n' ),
                                    width: '20%',
                                    isSortable: true,
                                    isFilterable: true,
                                    visible: false
                                }
                            ],
                            onRowClick: function( meta ) {
                                var
                                    row = meta.row;
                                self.selectCrlog(row);
                            },
                            getStyleRow: function getStyleRow( data ) {
                                var
                                    result = '',
                                    displayStatus;

                                switch( data.status ) {
                                    case 'READ':
                                    case 'MATCHED':
                                    case 'MATCHING':
                                    case 'PARSED':
                                        displayStatus = 'warning';
                                        break;
                                    case 'APPLIED':
                                        displayStatus = 'success';
                                        break;
                                    case 'CANCELLED':
                                        displayStatus = 'danger';
                                        break;
                                }

                                if( displayStatus && cardreaderTableColors[displayStatus] ) {
                                    result = 'background-color:' + cardreaderTableColors[displayStatus];
                                }

                                return result;
                            }
                        }
                    } );
                },
                destructor: function CardReadHistoryModel_destructor() {
                }
            },
            {
                NAME: 'CardReadHistoryModel'
            }
        );
        KoViewModel.registerConstructor( CardReadHistoryModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'KoUI-all',
            'KoSchemaValue',
            'JsonRpcReflection-doccirrus',
            'DCWindow',
            'JsonRpc',
            'CRLogModel',
            'PatientDiffModel',
            'PinOperationModal',
            'doccirrus',
            'crlog-schema'
        ]
    }
)
;
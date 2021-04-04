/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'MirrorPatientBrowserViewModel', function( Y/*, NAME */ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        SEARCH_CARD_READER = i18n( 'InCaseMojit.patient_browserJS.button.SEARCH_CARD_READER' ),
        PLEASE_SELECT = i18n( 'InCaseMojit.patient_browserJS.button.PLEASE_SELECT' ),
        NO_CARD_READER = i18n( 'InCaseMojit.patient_browserJS.button.NO_CARD_READER' ),
        PATIENT_UPDATED = i18n( 'InCaseMojit.patient_browserJS.batchread.PATIENT_UPDATED' ),
        PATIENT_NEW = i18n( 'InCaseMojit.patient_browserJS.batchread.PATIENT_NEW' ),
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),

        MirrorPatientMojitViewModel = KoViewModel.getConstructor( 'MirrorPatientMojitViewModel' ),

        getCardReader = function getCardReader() {
            if( getCardReader.instance ) {
                return getCardReader.instance;
            }
            getCardReader.instance = Y.doccirrus.cardreader.createInstance();
            return getCardReader.instance;
        };

    //quick random ID gen for call
    function base64Gen( len ) {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", rtn = "",
            i;
        for( i = 1; i < len; i++ ) {
            rtn += alphabet[Math.floor( Math.random() * alphabet.length )];
        }
        return rtn;
    }

    /**
     * @constructor
     * @class MirrorPatientBrowserViewModel
     * @extends MirrorPatientMojitViewModel
     */
    function MirrorPatientBrowserViewModel() {
        MirrorPatientBrowserViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorPatientBrowserViewModel, MirrorPatientMojitViewModel, {
        templateName: 'MirrorPatientBrowserViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorPatientBrowserViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;
            self.destroyHotKeys();
        },
        initMirrorPatientBrowserViewModel: function() {
            var
                self = this;

            self.initPatientTable();
            self.initGenerateIdDialog();
            self.initCardreaderButton();
            //self.initComputedIsCurrentView();
        },
        initComputedIsCurrentView: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    isCurrentView = unwrap( self.isCurrentView );
                ignoreDependencies( function() {
                    if( isCurrentView ) {
                        self.initHotKeys();
                    }
                    else {
                        self.destroyHotKeys();
                    }
                } );
            } ) );
        },
        initHotKeys: function() {
            var
                self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'PatientBrowserViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+e', 'Neuen Patient', function() {
                    var
                        binder = self.get( 'binder' );
                    binder.navigateToNewPatient();
                } )
                .on( 'ctrl+t', 'springt zu Kalender ', function() {
                    var
                        binder = self.get( 'binder' );
                    binder.navigateToCalendar();
                } );

        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+e' )
                    .un( 'ctrl+t' );
                self.hotKeysGroup = null;
            }
        },
        /**
         * @property patientTable
         * @type {null|KoTable}
         */
        patientTable: null,

        createPatientId: null,

        /** @protected */
        initPatientTable: function() {
            var
                self = this,
                userFilter = Y.doccirrus.utils.getFilter(),
                filterQuery = userFilter && userFilter.location && { "insuranceStatus.locationId": userFilter.location },
                patientTable,
                isDoquvide = Y.doccirrus.auth.isDOQUVIDE(),
                prcDispatches = ko.observable( [] );

            if( isDoquvide ) {
                Y.doccirrus.jsonrpc.api.prcdispatch.read( {
                    query: {}
                } ).done( function( prcdres ) {
                    prcDispatches( prcdres && prcdres.data );
                } );
            }

            self.patientTable = patientTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-patientTable',
                    states: ['limit', 'usageShortcutsVisible'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.mirrorpatient.read,
                    baseParams: {
                        query: filterQuery,
                        data: {
                            isDSCK: isDoquvide
                        }
                    },
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false,
                            visible: !self.isDoquvide()
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '35%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            width: '35%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '142px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data.kbvDob ) {
                                    return data.kbvDob;
                                }
                                return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'partner1',
                            label: i18n( isDoquvide ? 'InCaseMojit.cardio.label.doquvideIdSmall' : 'InCaseMojit.patient_browserJS.placeholder.PATIENT_ID' ),
                            title: i18n( isDoquvide ? 'InCaseMojit.cardio.label.doquvideIdSmall' : 'InCaseMojit.patient_browserJS.placeholder.PATIENT_ID' ),
                            width: '45%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    displayText,
                                    disabledStatus,
                                    dispatch;

                                if( isDoquvide ){
                                    displayText = Y.doccirrus.schemas.patient.getGHDPartnerId( data, Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE );
                                    disabledStatus = Y.doccirrus.schemas.patient.getGHDDisabledStatus( data, Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE );
                                    dispatch = prcDispatches().filter( function( prc ) {
                                            return prc.prcCustomerNo === data.prcCustomerNo;
                                        } )[0] || {};
                                    if( disabledStatus || !dispatch.activeState ){
                                        displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                            displayText: displayText,
                                            displayTextClass: 'text-danger'
                                        } );
                                    }
                                } else {
                                    displayText = Y.doccirrus.schemas.patient.getGHDPartnerId(data, null);
                                }
                                return displayText;
                            }
                        },
                        isDoquvide ?
                        {
                            forPropertyName: 'partner2',
                            label: i18n( 'InCaseMojit.cardio.label.dqsIdSmall' ),
                            title: i18n( 'InCaseMojit.cardio.label.dqsIdSmall' ),
                            width: '45%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    displayText;

                                displayText = Y.doccirrus.schemas.patient.getGHDPartnerId(data, Y.doccirrus.schemas.casefolder.additionalTypes.DQS);
                                var
                                    disabledStatus = Y.doccirrus.schemas.patient.getGHDDisabledStatus(data, Y.doccirrus.schemas.casefolder.additionalTypes.DQS),
                                    dispatch = prcDispatches().filter( function( prc ){ return prc.prcCustomerNo === data.prcCustomerNo; } )[0] || {};
                                if( disabledStatus || !dispatch.activeState ){
                                    displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                        displayText: displayText,
                                        displayTextClass: 'text-danger'
                                    } );
                                }
                                return displayText;
                            }
                        } : null,
                        {
                            forPropertyName: 'prcCoName',
                            width: '25%',
                            label: i18n( 'basecontact-schema.BaseContactType_E.INSTITUTION.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'gender',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                            width: '60px',
                            renderer: function( meta ) {
                                var gender = meta.value;

                                switch( gender ) {
                                    case 'MALE':
                                        return 'm';
                                    case 'FEMALE':
                                        return 'w';
                                    case 'UNDEFINED':
                                        return 'x';
                                    case 'VARIOUS':
                                        return 'd';
                                    default:
                                        return 'u';
                                }

                            },
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect',
                                options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                    return Boolean( item.val );
                                } ).map( function( item ) {
                                    var gender = item.val;

                                    switch( gender ) {
                                        case 'MALE':
                                            return { val: gender, i18n: 'm' };
                                        case 'FEMALE':
                                            return { val: gender, i18n: 'w' };
                                        case 'UNDEFINED':
                                            return { val: gender, i18n: 'x' };
                                        case 'VARIOUS':
                                            return { val: gender, i18n: 'd' };
                                        default:
                                            return { val: gender, i18n: 'u' };
                                    }
                                } ),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.type',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                            width: '136px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    insuranceStatus = data.insuranceStatus;

                                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                    return insuranceStatus.map( function( entry ) {
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                    } ).join( ', ' );
                                }

                                return '';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
                            width: '30%',
                            isSortable: true,
                            visible: false,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications;

                                if( Array.isArray( value ) ) {
                                    value = value.map( function( communication ) {
                                        return communication.value;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        Y.doccirrus.auth.isINCARE() ?
                        {
                            forPropertyName: 'patientNo',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            collation: { locale: 'de', numericOrdering: true }
                        } : null,
                        {
                            forPropertyName: 'age',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.AGE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.AGE' ),
                            width: '60px',
                            visible: false,
                            isSortable: true,
                            renderer: function( meta ) {
                                var dob = meta.row.dob,
                                    dod = meta.row.dateOfDeath;
                                return Y.doccirrus.schemas.patient.ageFromDob( dob, dod );
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.insuranceName',
                            label: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                            title: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.insuranceStatus;

                                if( Array.isArray( value ) ) {
                                    value = value.filter( function( communication ) {
                                        return Boolean( communication.insuranceName );
                                    } ).map( function( communication ) {
                                        return communication.insuranceName;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.street',
                            label: i18n( 'person-schema.Address_T.street' ),
                            title: i18n( 'person-schema.Address_T.street' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].street;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.houseno',
                            label: i18n( 'person-schema.Address_T.houseno' ),
                            title: i18n( 'person-schema.Address_T.houseno' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].houseno;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.zip',
                            label: i18n( 'person-schema.Address_T.zip' ),
                            title: i18n( 'person-schema.Address_T.zip' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].zip;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.postbox',
                            label: i18n( 'person-schema.Address_T.postbox' ),
                            title: i18n( 'person-schema.Address_T.postbox' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].postbox;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.city',
                            label: i18n( 'person-schema.Address_T.city' ),
                            title: i18n( 'person-schema.Address_T.city' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].city;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.country',
                            label: i18n( 'person-schema.Address_T.country' ),
                            title: i18n( 'person-schema.Address_T.country' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].country;
                                }

                                return '';
                            }
                        }
                    ].filter( function( item ){
                        return Boolean(item);
                    }),
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = patientTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

                        // only "tableMinWidth" when those columns are visible
                        if( !Y.Array.find( visibleColumns, function( col ) {
                                if( col.forPropertyName === 'age' ||
                                    col.forPropertyName === 'insuranceStatus.insuranceName' ||
                                    col.forPropertyName === 'addresses.street' ||
                                    col.forPropertyName === 'addresses.houseno' ||
                                    col.forPropertyName === 'addresses.zip' ||
                                    col.forPropertyName === 'addresses.postbox' ||
                                    col.forPropertyName === 'addresses.city' ||
                                    col.forPropertyName === 'addresses.country'
                                ) {
                                    return true;
                                }
                                return false;
                            } ) ) {
                            patientTable.responsive( true );
                            return '';
                        }
                        else {
                            patientTable.responsive( false );
                        }

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            }
                            else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, { deferEvaluation: true } ).extend( { rateLimit: 0 } ),
                    onRowClick: function( meta/*, $event*/ ) {
                        var
                            binder = self.get( 'binder' );

                        binder.navigateToCaseFileBrowser( { patientId: meta.row._id } );

                        return false;
                    },
                    onRowContextMenu: function( meta, $event ) {
                        var
                            contextMenu;
                        if( !meta.isLink ) {
                                contextMenu = new Y.doccirrus.DCContextMenu( {
                                    menu: [
                                        new Y.doccirrus.DCContextMenuItem( {
                                            text: i18n( 'InCaseMojit.patient_browserJS.menu.openPatientInTab.text' ),
                                            href: '#/patient/' + meta.row._id + '/tab/casefile_browser',
                                            target: '#/patient/' + meta.row._id + '/tab/casefile_browser',
                                            click: function() {
                                                window.open( this.href, this.target );
                                                contextMenu.close();
                                            }
                                        } )
                                    ]
                                } );

                            contextMenu.showAt( $event.pageX, $event.pageY );
                            $event.preventDefault();

                            return false;
                        }
                    }
                }
            } );

        },
        isDoquvide: function() {
            return Y.doccirrus.auth.isDOQUVIDE();
        },
        initCardreaderButton: function() {
            var self = this,
                callID = base64Gen( 16 ),
                handler_returnDeviceList = function( msg ) {
                    //doublechecking if this is actually our call
                    if( msg.data.callID === callID ) {
                        self.cardreaderList( self.cardreaderList().concat( Y.Array.map( msg.data.devList, function( item ) {
                            return { host: item.host, text: item.text, source: item.source };
                        } ) ) );
                    }
                },
                handler_returnClientList = function( msg ) {
                    //doublechecking if this is actually our call
                    if( msg.data.callID === callID ) {
                        if( msg.data.clients ) {
                            if( Y.config.debug ) {
                                Y.log( "checking cardreader socket.io clients: " + JSON.stringify( msg.data.clients ) );
                            }
                        }
                    }
                },
                handler_lastDeviceFound = function( msg ) {
                    //doublechecking if this is actually our call
                    if( msg.data.callID === callID ) {
                        self.lastDeviceList( self.lastDeviceList().concat( {
                            text: msg.data.text,
                            source: msg.data.source
                        } ) );
                        self.emptyMessage( '' );
                    }
                },
                handler_doneListing = function( msg ) {
                    //doublechecking if this is actually our call
                    if( msg.data.callID === callID ) {
                        if( SEARCH_CARD_READER === self.emptyMessage() ) {
                            self.emptyMessage( PLEASE_SELECT );
                        }
                        if( 0 === self.cardreaderList().length ) {
                            self.emptyMessage( NO_CARD_READER );
                        }
                        self.loadingCR( false );
                    }
                };

            this.emptyMessage = ko.observable( SEARCH_CARD_READER );
            this.loadingCR = ko.observable( true );
            this.lastDeviceList = ko.observableArray();
            this.cardreaderList = ko.observableArray();

            //set listener for incoming devicelist
            Y.doccirrus.communication.on( {
                event: "cr.returnDeviceList",
                done: handler_returnDeviceList
            } );

            //set listener for incoming clientlist
            Y.doccirrus.communication.on( {
                event: "cr.returnClientList",
                done: handler_returnClientList
            } );

            //listener for the event that the PRCS has a last-used device stored for this user
            Y.doccirrus.communication.on( {
                event: "cr.lastDeviceFound",
                done: handler_lastDeviceFound
            } );

            //listener for when prcs is of the opinion that listing is done
            Y.doccirrus.communication.on( {
                event: "cr.doneListing",
                done: handler_doneListing
            } );

            //ask PRCS for devicelist
            Y.doccirrus.communication.emit( "cr.getDeviceList", { callID: callID } );

            Y.doccirrus.communication.emit( "cr.getClientList", { callID: callID } );

        },
        createPatientManualHandler: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            binder.navigateToNewPatient();
        },
        newPatientFromCard: function( viewModel, event ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                text,
                incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                _source = event.target.dataset.source,
                cardReader = getCardReader();

            if( "prc" !== _source ) {
                text = _source.match( /^\/?.*?\/(.*)/ )[1];
                if( 2 < text.split( "::" ).length ) {
                    text = text.split( "::" )[2];
                }
                else if( 2 === text.split( "::" ).length ) {
                    text = text.split( "::" )[0] + " - " + text.split( "::" )[1];
                }
                self.lastDeviceList( [{ text: text, source: _source }] );
                self.emptyMessage( "" );
                cardReader.set( "dataSource", _source );
            } else {
                self.lastDeviceList( [{ text: "Datensafe", source: _source }] );
                self.emptyMessage( "" );
                cardReader.set( "dataSource", _source );
            }

            cardReader.getPatient( {incaseConfig: incaseConfig}, function getPatientHandler( error, data ) {
                if( error ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        title: 'Fehler beim Lesen der Karte',
                        message: error.message
                    } );
                }
                else {
                    self.navigateToPatientAfterCardRead( data.patient );
                }
            } );
        },
        newBatchPatientFromCard: function( viewModel, event, prevPatients ) {
            if( !prevPatients ) {
                prevPatients = "";
            }

            var
                self = this,
                binder = self.get( 'binder' ),
                text,
                incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                _source = event.target.dataset.source,
                cardReader = getCardReader();

            if( "prc" !== _source ) {
                text = _source.match( /^\/?.*?\/(.*)/ )[1];
                if( 2 < text.split( "::" ).length ) {
                    text = text.split( "::" )[2];
                }
                else if( 2 === text.split( "::" ).length ) {
                    text = text.split( "::" )[0] + " - " + text.split( "::" )[1];
                }
                self.lastDeviceList( [{ text: text, source: _source }] );
                self.emptyMessage( "" );
                cardReader.set( "dataSource", _source );
            } else {
                self.lastDeviceList( [{ text: "Datensafe", source: _source }] );
                self.emptyMessage( "" );
                cardReader.set( "dataSource", _source );
            }

            cardReader.getPatient( {incaseConfig: incaseConfig}, function( error, data ) {
                var terminalType,
                    patient;
                if( error ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        title: 'Fehler beim Lesen der Karte',
                        message: error.message
                    } );
                }
                else {
                    if( "fixed" === data.terminalType ) {
                        self.navigateToPatientAfterCardRead( data.patient );
                    } else {
                            terminalType = data.terminalType || "";
                            patient = new PatientModel( { data: data.patient } );

                        patient.save().then( function( data ) {

                            prevPatients += "<tr><td>" + unwrap( patient.lastname ) + ", " + unwrap( patient.firstname ) + "</td><td>" + (unwrap( data._id ) ? PATIENT_UPDATED : PATIENT_NEW) + "</td></tr>";

                            if( Y.doccirrus.uam.loadhelper.get( 'carddata_crc' ) && 'mobile' === terminalType ) {
                                Y.doccirrus.cardreader.deleteCardData( function() {
                                    self.newBatchPatientFromCard( viewModel, event, prevPatients );
                                } );
                            } else {
                                self.newBatchPatientFromCard( viewModel, event, prevPatients );
                            }

                        }, function( data ) {
                            Y.log( "failure data: " );
                            Y.log( data );
                            patient.destroy();
                            self.navigateToPatientAfterCardRead( data.patient );
                        } );
                    }
                }
            }, prevPatients );
        },
        navigateToPatientAfterCardRead: function( patient ) {
            var
                self = this,
                binder = self.get( 'binder' );

            if( patient._id ) {
                binder.navigateToPatientDetail( { updatePatientConfig: { data: patient } } );
            } else {
                binder.navigateToNewPatient( { newPatientConfig: { data: patient } } );
            }

        },
        initGenerateIdDialog: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager;

            self.createPatientId = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE_PATIENT_ID',
                    text: i18n( 'MirrorPatientMojit.tab_patients.button.GENERATE_ID' ),
                    click: function() {
                        var
                            patient,
                            componentColumnCheckbox = self.patientTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();

                        if( checked && checked.length ) {
                            patient = checked[0];

                            Y.doccirrus.modals.generateIdMirrorPatient.show( { patient: patient }, function() {
                                self.patientTable.reload();
                            } );
                        }
                    }
                }
            } );
        }

    }, {
        NAME: 'MirrorPatientBrowserViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( MirrorPatientBrowserViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'MirrorPatientMojitViewModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'dcquery',
        'dcutils',
        'dcschemaloader',
        'person-schema',
        'mirrorpatient-schema',
        'cardreader',
        'dcgenerateidmirrorpatient'
    ]
} );

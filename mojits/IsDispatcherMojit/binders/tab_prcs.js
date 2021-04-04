/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, YUI, moment */
/*exported fun */
fun = function _fn( Y ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        viewModel = null,
        VIEW_STATE_INITIAL = null,
        VIEW_STATE_OVERVIEW = 'overview',
        VIEW_STATE_DETAIL = 'detail',
        KoViewModel = Y.doccirrus.KoViewModel;

    function getRequestById( id ) {
        return Y.doccirrus.jsonrpc.api.prcdispatch.read( {
            query: {
                _id: id
            }
        } );
    }

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }
    }

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {

        details: null,
        prcIdDialog: null,
        prcRestoreDialog: null,
        prcsTable: null,
        employeeWindow: null,
        detailsWindow: null,

        initializer: function() {
            var self = this;
            self.details = ko.observable( null );
            self.initStateListener();
        },

        initialisedOverview: false,
        initStateListener: function() {
            var self = this;
            self.view = ko.observable( VIEW_STATE_INITIAL );
            self.eventStateListener = Y.after( 'tab_prcs-state', self.eventStateListenerHandler, self );
        },

        isOverviewInitialised: function() {
            var self = this;
            return Boolean( self.initialisedOverview );
        },

        initOverview: function() {
            var
                self = this;

            if( !self.isPrcsTableInitialized() ) {
                self.initPrcsTable();
            }

            // if( !self.prcIdDialog ) {
            //     self.initPrcIdDialog();
            // }
            //
            // if( !self.prcRestoreDialog ) {
            //     self.initPrcRestoreDialog();
            // }

            if( self.isSupportUser() && !self.deleteSystem ) {
                self.initDeleteSystem();
            }

            self.initialisedOverview = true;
        },

        eventStateListenerHandler: function( yEvent, state ) {
            var
                self = this,
                id = state.params.id;

            switch( state.view ) {
                case VIEW_STATE_OVERVIEW:
                    if( !self.isOverviewInitialised() ) {
                        self.initOverview();
                    }
                    break;
                case VIEW_STATE_DETAIL:
                    if( id ) {
                        if( !self.isOverviewInitialised() ) {
                            self.initOverview();
                        }
                        self.showPrcDetails( id );
                    }
                    break;
            }

            self.view( state.view );
        },

        isPrcsTableInitialized: function() {
            var
                self = this;

            return Boolean( self.prcsTable );
        },

        initPrcsTable: function() {
            var
                self = this,
                isDoquvide = Y.doccirrus.auth.isDOQUVIDE(),
                baseParams = {
                    sort: {
                        prcCustomerNo: 1
                    }
                };

            if( isDoquvide ) {
                baseParams.query = {$and: [{activeState: true}]};
            }

            function getAddressField( address, fieldName ) {
                if( Array.isArray( address ) && address.length ) {
                    return address[0][fieldName] || '';
                }
                return '';
            }

            self.prcsTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'dc-dispatcherprc-table',
                    states: ['limit'],
                    striped: true,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.prcdispatch.read,
                    baseParams: baseParams,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false,
                            visible: self.isSupportUser()
                        },
                        {
                            forPropertyName: 'prcCustomerNo',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.prcCustomerNo' ),
                            isFilterable: true,
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC'
                        },
                        {
                            forPropertyName: 'hostname',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.hostname' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'customerIdOnSystem',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.customerId' ),
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                if( isDoquvide ) {
                                    return meta.row && meta.row.customerNo || '';
                                } else {
                                    return meta.row && meta.row.customerId || '';
                                }

                            }
                        },
                        {
                            forPropertyName: 'coname',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.coname' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'patientsCount',
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.patientCount' ),
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                if( meta.row && meta.row.patientId ) {
                                    return meta.row.patientId && meta.row.patientId.length || 0;
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'centralContact.talk',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.informal' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'centralContact.firstname',
                            label: i18n( 'general.title.FIRSTNAME' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'centralContact.lastname',
                            label: i18n( 'general.title.LASTNAME' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'centralContact.title',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.title' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.email' ),
                            isFilterable: true,
                            visible: false,
                            isSortable: true,
                            renderer: function( meta ) {
                                return self.getCommunicationFieldValue( meta.row.communications, 'EMAILJOB' );
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.url' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return self.getCommunicationFieldValue( meta.row.communications, 'URL' );
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.telephone' ),
                            isFilterable: true,
                            visible: false,
                            isSortable: true,
                            renderer: function( meta ) {
                                return self.getCommunicationFieldValue( meta.row.communications, 'PHONEJOB' );
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.fax' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return self.getCommunicationFieldValue( meta.row.communications, 'FAXJOB' );
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.mobile' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return self.getCommunicationFieldValue( meta.row.communications, 'MOBILEJOB' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.houseno',
                            label: i18n( 'person-schema.Address_T.houseno' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'houseno' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.zip',
                            label: i18n( 'person-schema.Address_T.zip' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'zip' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.city',
                            label: i18n( 'person-schema.Address_T.city' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'city' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.postbox',
                            label: i18n( 'person-schema.Address_T.postbox' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'postbox' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.addon',
                            label: i18n( 'person-schema.Address_T.addon' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'addon' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.country',
                            label: i18n( 'person-schema.Address_T.country' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return getAddressField( meta.row.addresses, 'country' );
                            }
                        },
                        {
                            forPropertyName: 'activeState',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.activeState' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                return i18n( 'IsDispatcherMojit.tab_prc.active_label.' + meta.value );
                            }
                        },
                        {
                            forPropertyName: 'lastOnline',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.lastOnline' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            renderer: function( data ) {
                                var prcDispatch = data.row;
                                return prcDispatch.lastOnline ? moment.utc( prcDispatch.lastOnline ).local().format( 'DD.MM.YYYY' ) : '';
                            }
                        },
                        {
                            forPropertyName: 'activeState',
                            label: i18n( 'IsDispatcherMojit.tab_prc.table.online' ),
                            width: '80px',
                            isFilterable: !isDoquvide,
                            isSortable: !isDoquvide,
                            renderer: function( meta ) {
                                var
                                    value = meta.value;
                                if( value ) {
                                    return '<i class="fa fa-check"></i>';
                                } else {
                                    return '<i class="fa fa-ban"></i>';
                                }
                            }
                        },
                        {
                            forPropertyName: 'version',
                            label: i18n( 'prcdispatch-schema.PRCDispatch_T.version' ),
                            width: '100px',
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: '',
                            width: '71px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function() {
                                return '<button class="btn btn-xs btn-link">Details</button>';
                            },
                            onCellClick: function( meta ) {
                                self.showEmployeeTable( meta.row );
                                return false;
                            }
                        }
                    ],
                    onRowClick: function( meta ) {
                        self.showPrcDetails( meta.row._id );
                        return false;
                    }
                }
            } );
        },

        getCommunicationFieldValue: function( source, type ) {
            var communications = source,
                email;
            if( communications && communications.length > 0 ) {
                email = communications.filter( function( comm ) {
                    return comm.type === type;
                } );
                if( email && email.length > 0 ) {
                    return email[0].value;
                }
            }
            return '';
        },

        showPrcDetails: function( id ) {

            var
                self = this;

            getRequestById( id ).done( function( response ) {
                var data = response.data && response.data[0];
                if( !data ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' ),
                        callback: function() {
                        }
                    } );
                    return;
                }

                var node = Y.Node.create( '<div></div>' );

                data.telephone = self.getCommunicationFieldValue( data.communications, 'PHONEJOB' );

                data.formattedLocationStructure = function() {
                    var locations = [],
                        locationStructure = data.locationsStructure,
                        locationsModel;
                    if( locationStructure && Array.isArray( locationStructure ) ) {
                        locationStructure.forEach( function( location ) {
                            if( location.id && location.id.name ) {
                                locationsModel = {
                                    name: location.id.name,
                                    employee: [],
                                    bsnr: '(BSNR -)'
                                };

                                if( location.id && location.id.bsnr ) {
                                    locationsModel.bsnr = locationsModel.bsnr.replace( '-', location.id.bsnr );
                                }

                                if( location.employee && Array.isArray( location.employee ) ) {

                                    location.employee.forEach( function( employee ) {
                                        var employeeModel = {
                                            title: 'Dr. ',
                                            lanr: '(LANR -)'
                                        };

                                        employeeModel.title += (employee.firstname + ' ' + employee.lastname);
                                        if( employee.lanr ) {
                                            employeeModel.lanr = employeeModel.lanr.replace( '-', employee.lanr );
                                        }

                                        locationsModel.employee.push( employeeModel );

                                    } );
                                }

                                locations.push( locationsModel );
                            }
                        } );
                    }
                    return locations;
                };

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'tab_prcs_details',
                    'IsDispatcherMojit',
                    {},
                    node,
                    function templateLoaded() {
                        data.labelUrlI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.url');
                        data.labelDcIdI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.dc_id');
                        data.labelPracticeI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.practice');
                        data.labelDisciplinesI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.disciplines');
                        data.labelPatientsI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.patients');
                        data.labelIdI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.id');
                        data.labelContactI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.contact');
                        data.labelTelephoneI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.telephone');
                        data.labelEmployeesI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.employees');
                        data.employeeHeadlineI18n = i18n('IsDispatcherMojit.tab_prc.details.dialog.label.employeeHeadline');

                        ko.applyBindings( data, node.getDOMNode() );
                    }
                );

                this.employeeWindow = new Y.doccirrus.DCWindow( {
                    bodyContent: node,
                    title: i18n( 'IsDispatcherMojit.tab_prc.details.dialog.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: 640,
                    height: 665,
                    minHeight: 400,
                    minWidth: 640,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                        ]
                    }
                } );

            } ).fail( fail );
        },

        isDoquvide: function(){
            return Y.doccirrus.auth.isDOQUVIDE();
        },

        isSupportUser: function() {
            return Y.doccirrus.auth.memberOf( 'SUPPORT');
        },

        showEmployeeTable: function( data ) {

            var node = Y.Node.create( '<div></div>' ),
                self = this,
                employeeTableViewModel = {
                    prcEmployeesTable: KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            stateId: 'dc-dispatchermirroremployee-table',
                            states: ['limit'],
                            striped: false,
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.mirroremployee.read,
                            sortersLimit: 2,
                            baseParams: {
                                query: {
                                    prcCustomerNo: data.prcCustomerNo,
                                    isActive: true
                                }
                            },
                            columns: [
                                {
                                    forPropertyName: 'type',
                                    label: i18n( 'employee-schema.Employee_T.type' ),
                                    width: '80px',
                                    renderer: function( meta ) {
                                        var
                                            value = meta.value;

                                        if( !value ) {
                                            return '';
                                        }

                                        return Y.doccirrus.schemaloader.translateEnumValue( '-de', value, Y.doccirrus.schemas.employee.types.Employee_E.list, value );
                                    },
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                    filterField: {
                                        componentType: 'KoFieldSelect2',
                                        options: Y.Array.filter( Y.doccirrus.schemas.employee.types.Employee_E.list, function( type ) {
                                            // backend seems only to support "PHYSICIAN" & "PRACTICENURSE"
                                            switch( type.val ) {
                                                case 'PHYSICIAN' :
                                                case 'PRACTICENURSE' :
                                                    return true;
                                                default:
                                                    return false;
                                            }
                                        } ),
                                        optionsText: 'i18n',
                                        optionsValue: 'val'
                                    }
                                },
                                {
                                    forPropertyName: 'title',
                                    label: i18n( 'IsDispatcherMojit.tab_prc.table.title' ),
                                    isFilterable: true,
                                    isSortable: true
                                },
                                {
                                    forPropertyName: 'officialNo',
                                    label: i18n( 'EmployeeModel.officialNo.placeholder' ),
                                    isFilterable: true,
                                    isSortable: true
                                },
                                {
                                    forPropertyName: 'lastname',
                                    sortInitialIndex: 0,
                                    label: i18n( 'general.title.LASTNAME' ),
                                    isFilterable: true,
                                    isSortable: true
                                },
                                {
                                    forPropertyName: 'firstname',
                                    sortInitialIndex: 1,
                                    label: i18n( 'general.title.FIRSTNAME' ),
                                    isFilterable: true,
                                    isSortable: true
                                },
                                {
                                    forPropertyName: 'roles',
                                    label: i18n( 'role-schema.Role_T.value.i18n' ),
                                    isFilterable: true,
                                    isSortable: true,
                                    renderer: function( meta ) {
                                        var
                                            roles = meta.value;

                                        if( !(Array.isArray( roles ) && roles.length) ) {
                                            return '';
                                        }

                                        return roles.join( ', ' );
                                    }
                                },
                                {
                                    forPropertyName: 'locations.0.commercialNo',
                                    label: i18n( 'location-schema.Location_T.commercialNo.placeholder' ),
                                    isFilterable: false,
                                    isSortable: false,
                                    renderer: function( meta ) {
                                        var locations = meta.row.locations;
                                        if( !(Array.isArray( locations ) && locations.length) ) {
                                            return '';
                                        }

                                        return locations.map( function( location ) {
                                            return location.commercialNo;
                                        } ).join( ', ' );
                                    }
                                },
                                {
                                    forPropertyName: 'locations.0.locname',
                                    label: i18n( 'IsDispatcherMojit.tab_prc.table.bsName' ),
                                    isFilterable: true,
                                    isSortable: true
                                },
                                {
                                    forPropertyName: 'communications.0',
                                    label: i18n( 'IsDispatcherMojit.tab_prc.table.email' ),
                                    isFilterable: true,
                                    isSortable: true,
                                    renderer: function( meta ) {
                                        return self.getCommunicationFieldValue( meta.row.communications, 'EMAILJOB' );
                                    }
                                },

                                {
                                    forPropertyName: 'communications.1',
                                    label: i18n( 'IsDispatcherMojit.tab_prc.table.telephone' ),
                                    isFilterable: true,
                                    isSortable: true,
                                    renderer: function( meta ) {
                                        return self.getCommunicationFieldValue( meta.row.communications, 'PHONEJOB' );
                                    }
                                }
                            ]
                        }
                    } )
                };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'prc_employees_table',
                'IsDispatcherMojit',
                {},
                node,
                function templateLoaded() {
                    ko.applyBindings( employeeTableViewModel, node.getDOMNode() );
                }
            );

            this.employeeWindow = new Y.doccirrus.DCWindow( {
                bodyContent: node,
                title: i18n( 'IsDispatcherMojit.PrcDetailsWindow.headline' ).replace( '$systemName$', data.coname ),
                icon: Y.doccirrus.DCWindow.ICON_WARN,
                width: 1024,
                height: 665,
                minHeight: 400,
                minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                    ]
                }
            } );
        },

        initPrcIdDialog: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager;

            self.createPrcId = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE_PRC_ID',
                    text: i18n( 'IsDispatcherMojit.tab_prc.button.GENERATE_ID' ),
                    click: function() {
                        var
                            componentColumnCheckbox = self.prcsTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            dialogModel,
                            buttons,
                            prc,
                            node,
                            modal;

                        if( checked && checked.length ) {

                            prc = checked[0];
                            node = Y.Node.create( '<div></div>' );
                            modal = null;

                            dialogModel = {
                                prcCustomerNo: prc.prcCustomerNo,
                                practice: prc.coname,
                                customerId: ko.observable( prc.customerId ),
                                genNewCustomerId: function() {
                                    this.customerId( (new Y.doccirrus.mongo.ObjectId()).toString() );
                                }
                            };
                            buttons = [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function( e ) {
                                        prc.customerId = dialogModel.customerId();

                                        Y.doccirrus.jsonrpc.api.prcdispatch
                                            .update( {
                                                query: {
                                                    _id: prc._id
                                                },
                                                data: prc,
                                                fields: ['customerId']
                                            } )
                                            .done( function() {
                                                modal.close( e );
                                                self.prcsTable.reload();
                                            } )
                                            .fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );
                                    }
                                } )
                            ];

                            YUI.dcJadeRepository.loadNodeFromTemplate(
                                'prc_id_dialog',
                                'IsDispatcherMojit',
                                {},
                                node,
                                function templateLoaded() {
                                    modal = new Y.doccirrus.DCWindow( {// jshint ignore:line
                                        className: 'DCWindow-tab_roles',
                                        bodyContent: node,
                                        title: i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.title' ),
                                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                        height: Y.doccirrus.DCWindow.SIZE_SMALL,
                                        minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                                        minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                        centered: true,
                                        modal: true,
                                        render: document.body,
                                        buttons: {
                                            header: ['close'],
                                            footer: buttons
                                        }
                                    } );

                                    dialogModel.labelMainI18n = i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.label.main' );
                                    dialogModel.labelDcIdI18n = i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.label.dc_id' );
                                    dialogModel.labelPracticeI18n = i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.label.practice' );
                                    dialogModel.labelIdI18n =i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.label.id' );
                                    dialogModel.buttonGenerateI18n = i18n( 'IsDispatcherMojit.tab_prc.generate_id.dialog.button.GENERATE' );

                                    ko.applyBindings( dialogModel, node.getDOMNode() );
                                } );
                        }
                    }
                }
            } );
        },

        initPrcRestoreDialog: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager;

            self.prcRestoreDialog = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE_PRC_ID',
                    text: i18n( 'IsDispatcherMojit.tab_prc.button.RESTORE' ),
                    click: function() {
                        var
                            componentColumnCheckbox = self.prcsTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            prcdispatch;

                        if( checked && checked.length ) {
                            prcdispatch = checked[0];
                            Y.doccirrus.DCWindow.confirm( {
                                title: i18n( 'IsDispatcherMojit.tab_prc.restore.dialog.title' ),
                                message: i18n( 'IsDispatcherMojit.tab_prc.restore.dialog.text' ),
                                callback: function( dialog ) {
                                    if( dialog.success ) {
                                        Y.doccirrus.jsonrpc.api
                                            .prcdispatch.restorePRCData( {
                                            data: {
                                                prcCustomerNo: prcdispatch.prcCustomerNo
                                            }
                                        } ).then( function( response ) {
                                            if( response ) {
                                                return response.data || null;
                                            }
                                            return null;
                                        } )
                                            .done( function( data ) {
                                                if( data && data > 0 ) {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        message: i18n( 'IsDispatcherMojit.tab_prc.restore_success_dialog.text' )
                                                    } );
                                                } else {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'error',
                                                        message: i18n( 'IsDispatcherMojit.tab_prc.restore_failed_dialog.text' )
                                                    } );
                                                }
                                            } )
                                            .fail( fail );
                                    }
                                },
                                window: {
                                    width: 'medium'
                                }
                            } );
                        }
                    }
                }
            } );

        },

        initDeleteSystem: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                systemDetails,
                activityCount = i18n( 'IsDispatcherMojit.tab_prc.delete.activityCount' );

            self.deleteSystem = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_MODIFY_SYSTEM',
                    text: i18n( 'IsDispatcherMojit.tab_prc.button.REMOVE' ),
                    click: function() {
                        var
                            prcsTable = self.prcsTable,
                            componentColumnCheckbox = prcsTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();

                        if(!checked || !checked[0]){
                            return;
                        }
                        systemDetails = i18n( 'IsDispatcherMojit.tab_prc.delete.detail', { data: { number: checked[0].prcCustomerNo, name: checked[0].coname } } );
                        Y.doccirrus.DCWindow.confirm( {
                            title: i18n( 'IsDispatcherMojit.tab_prc.delete.confirm.title' ),
                            message: i18n( 'IsDispatcherMojit.tab_prc.delete.confirm.text', { data: { systemDetails: systemDetails} } ),
                            window: { width: 'medium' },
                            callback: function( dialog ) {
                                if( dialog.success ) {
                                    this.close();
                                    Y.doccirrus.jsonrpc.api.prcdispatch.delete( {
                                        query: {
                                            _id: checked[0]._id
                                        }
                                    } ).done( function( result ) {
                                        if(result && result.data && 1 === result.data.ok ){
                                            Y.doccirrus.DCWindow.confirm( {
                                                title: i18n( 'IsDispatcherMojit.tab_prc.delete.confirm_activity.title' ),
                                                message: i18n( 'IsDispatcherMojit.tab_prc.delete.confirm_activity.text', { data: {
                                                    patientsCount: result.data.patients.length,
                                                    patientsList: (result.data.patients || []).map( function(el){return ' - '+el.name+' ('+activityCount+': '+el.activitiesCount+')';} ).join('<br/>'),
                                                    systemDetails: systemDetails
                                                } }  ),

                                                //`There are ${result.data.activitiesCount} synchronized activities. Remove All synced activities, dispatcher and all related collections`,
                                                window: {width: 'medium'},
                                                callback: function( dialog ) {
                                                    if( dialog.success ) {
                                                        this.close();
                                                        Y.doccirrus.jsonrpc.api.prcdispatch.delete( {
                                                            query: {
                                                                _id: checked[0]._id
                                                            },
                                                            data: {
                                                                forceDelete: true
                                                            }
                                                        } ).done( function( result ) {
                                                            if(result && result.data && 0 === result.data.ok && prcsTable && 'function' === typeof prcsTable.reload ){
                                                                prcsTable.reload();
                                                            }
                                                        } ).fail( fail );
                                                    }
                                                }
                                            } );
                                        }
                                        if(result && result.data && 0 === result.data.ok && prcsTable && 'function' === typeof prcsTable.reload ){
                                            prcsTable.reload();
                                        }
                                    } ).fail( fail );
                                }
                            }
                        } );


                    }
                }
            } );
        }
    } );

    return {
        registerNode: function( node ) {
            // set viewModel
            viewModel = new ViewModel( {
                node: function() {
                    // for some weirdness this have to be a function
                    return node.getDOMNode();
                }
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );

        }
    };
};
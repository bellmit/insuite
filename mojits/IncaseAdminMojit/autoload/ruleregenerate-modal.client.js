/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $, _, moment*/

YUI.add( 'dcruleregeneratemodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        WARNING_MESSAGE = i18n('IncaseAdminMojit.rules.tree.regenerate_days_warning' );

    function RuleRegenerateModalModel( config ) {
        RuleRegenerateModalModel.superclass.constructor.call( this, config );
    }

    function mapActStatusEntry( entry ) {
        return {id: entry.val, text: entry.i18n};
    }

    function personToSelect2Object( person ) {
        if( !person ) {
            return person;
        }
        return {
            id: person._id,
            text: Y.doccirrus.schemas.person.personDisplay( person ),
            data: {
                kbvDob: person.kbvDob,
                dob: person.dob
            }
        };
    }

    function getSelect2( property, propertyList ){
        return {
            val: ko.computed( {
                read: function() {
                    var value = property();
                    var list = propertyList.filter( function( entry ) {
                        return _.includes( value, entry.id );
                    } ).map( function( entry ) {
                        return entry.id;
                    } );
                    return list;
                },
                write: function( $event ) {
                    var value = $event.val;
                    property( value );
                }
            } ),
            select2: {
                placeholder: '',
                multiple: true,
                query: function( options ) {
                    return options.callback( {results: propertyList.filter(function( el ){
                        return ('' === options.term) || -1 !== el.text.toLowerCase().indexOf( options.term.toLowerCase() ); })} );
                },
                initSelection: function( element, callback ) {
                    var list = property();
                    if( !list.length ) {
                        return callback( [] );
                    }
                    var data = propertyList.filter( function( entry ) {
                        return _.includes( list, entry.id );
                    } );

                    return callback( data );
                }
            }
        };
    }

    function getCaseFolderList(countryMode) {
        var
            list = [],
            hasCardioLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ),
            hasDOQUVIDELicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE );
        list = JSON.parse(JSON.stringify(Y.doccirrus.schemas.person.types.Insurance_E.list));
        list = list.filter(function (item) {
            return item.countryMode.some( function( mode ) {
                return countryMode.includes( mode );
            } );
        });
        if(hasCardioLicense ) {
            list.push( {
                val: 'CARDIO',
                i18n: i18n( 'casefolder-schema.Additional_E.CARDIO.i18n' )
            } );
            list.push( {
                val: 'CARDIACFAILURE',
                i18n: i18n( 'casefolder-schema.Additional_E.CARDIACFAILURE.i18n' )
            } );
            list.push( {
                val: 'STROKE',
                i18n: i18n( 'casefolder-schema.Additional_E.STROKE.i18n' )
            } );
        }
        if(hasDOQUVIDELicense ) {
            list.push( {
                val: 'DOQUVIDE',
                i18n: i18n( 'casefolder-schema.Additional_E.DOQUVIDE.i18n' )
            } );
        }

        list = list.map( function(entry){
            return {
                id: entry.val,
                text: entry.i18n
            };
        } );

        return list;
    }


    Y.extend( RuleRegenerateModalModel, KoViewModel.getDisposable(), {

        initializer: function RuleRegenerateModalModel_initializer( config ) {
            var
                self = this;

            self.info_rule_log = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_clear_log1' ) );
            self.info_acttypes = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_acttypes' ) );
            self.info_casefolders = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_casefolders' ) );
            self.info_patients = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_patients' ) );
            self.info_status = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_status' ) );
            self.info_location = ko.observable( i18n('IncaseAdminMojit.rules.tree.regenerate_info_location' ) );
            self.regenerateLogI18n = i18n('IncaseAdminMojit.rules.tree.regenerate_log');
            self.regenerateRulesTitleI18n = i18n('IncaseAdminMojit.rules.tree.regenerate_rules_title');
            self.entryTypesI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.entryTypes');
            self.statusI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.status');
            self.patientsI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.patients');
            self.caseTypesI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.caseFolders');
            self.tenantsI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.tenants');
            self.locationsI18n = i18n('IncaseAdminMojit.rules.regenerateRulesDialog.locations');
            self.countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
            self.initValues( config );
            self.initSelect2Patient();
            self.initSelect2Locations();
        },

        initValues: function( config ) {
            var self = this,
                caseFolderList = getCaseFolderList(self.countryMode),
                actTypeList = Y.doccirrus.ruleutils.getActTypeList(),
                actStatusList = Y.doccirrus.schemas.activity.types.ActStatus_E.list,
                tenantList = [];

            this.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            this.message = i18n( 'IncaseAdminMojit.rules.tree.regenerate_confirm' ).replace( new RegExp( '\n', 'g' ), '<br/>' );    //eslint-disable-line no-control-regex
            this.cb = config.callback;

            this.dateSelector = KoComponentManager.createComponent( {
                componentType: 'KoDateRangeSelector',
                componentConfig: {
                    switchMode: 'month',
                    restrictMinYears: 1
                }
            } );

            this.actType = ko.observable( ['TREATMENT', 'DIAGNOSIS'] );
            this.deletingLogStrategyList = ko.observableArray( [
                {val: 1, text: i18n( 'IncaseAdminMojit.rules.tree.regenerate_log_rule' )},
                {val: 2, text: i18n( 'IncaseAdminMojit.rules.tree.regenerate_log_quarter' )}
            ] );
            this.deletingLogStrategy = ko.observable( 2 );

            if( Y.doccirrus.auth.memberOf( 'SUPPORT' ) ){
                this.deletingLogStrategyList.push( {val:3, text: i18n( 'IncaseAdminMojit.rules.tree.regenerate_log_all' )} );
                this.info_rule_log( this.info_rule_log() + i18n('IncaseAdminMojit.rules.tree.regenerate_info_clear_log2' ) );
            }

            this.actTypeAutocomplete = getSelect2(this.actType, actTypeList);
            this.actType.hasError = ko.pureComputed( function() {
                return Boolean( !self.actType().length );
            } );

            this.actStatus = ko.observable( ['VALID', 'APPROVED'] );
            this.actStatusAutocomplete = getSelect2(this.actStatus, actStatusList.map( mapActStatusEntry ));
            this.actStatus.hasError = ko.pureComputed( function() {
                return Boolean( !self.actStatus().length );
            } );

            this.caseFolderType = ko.observable();

            if( this.isSwiss ) {
                this.caseFolderType( ['PRIVATE_CH'] );
            } else {
                this.caseFolderType( ['PUBLIC', 'PRIVATE'] );
            }
            this.caseFolderAutocomplete = getSelect2(this.caseFolderType, caseFolderList);
            this.caseFolderType.hasError = ko.pureComputed( function() {
                return Boolean( !self.caseFolderType().length );
            } );

            this.tenantsReady = ko.observable( false );
            this.tenants = ko.observable( [] );
            this.tenants.hasError = ko.pureComputed( function() {
                return Boolean( Y.doccirrus.auth.isVPRC() && !self.tenants().length);
            } );
            if( Y.doccirrus.auth.isVPRC() ){
                Y.doccirrus.jsonrpc.api.ruleimportexport.getActiveTenants()
                    .done( function( response ) {
                        self.tenants( response.data.map( function( entry ){
                            return entry.commercialNo;
                        } ) );

                        tenantList = response.data.map( function( entry ){
                            return {
                                id: entry.commercialNo,
                                text: entry.coname
                            };
                        } );
                        self.tenantsAutocomplete = getSelect2(self.tenants, tenantList);
                        self.tenantsReady( true );
                    } );
            }

            this.updateMessage = ko.observable( '' );
            Y.doccirrus.jsonrpc.api.ruleimportexport.getImportFile()
                .done( function( response ) {
                    if( response && response.data && response.data.file ){
                       if(response.data.wasImported) {
                           self.updateMessage( i18n( 'IncaseAdminMojit.rules.tree.regenerate_was' ) );
                       } else {
                           self.updateMessage(
                               Y.Lang.sub( i18n( 'IncaseAdminMojit.rules.tree.regenerate_new' ), {
                                   date: response.data.modifyDate
                               } )
                           );
                       }
                    }
                } );

            this.addDisposable( ko.computed( function() {
                var
                    startDate = ko.unwrap( self.dateSelector.startDate ),
                    endDate = ko.unwrap( self.dateSelector.endDate ),
                    diff = moment( endDate ).diff(startDate, 'days');

                if( 90 < diff ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: WARNING_MESSAGE,
                        window: { width: 'medium' }
                    } );
                }
            }).extend( {rateLimit: 200} ));
        },
        /**
         * Initializes select2 for patient
         * @method initSelect2Patient
         */
        initSelect2Patient: function() {
            var
                self = this;
            self.patientId = ko.observableArray( [] );

            self.select2Patient = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( self.patientId );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.patientId.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.patientId.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                placeholder: ko.observable( "\u00A0" ),
                select2: {
                    allowClear: true,
                    width: '100%',
                    multiple: true,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.patient.getPatients( {
                            query: {
                                isStub: {$ne: true},
                                term: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                                    onlyRegExp: true,
                                    noRegexEscape: true
                                } )
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( patient ) {
                                        return personToSelect2Object( patient );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    },
                    formatResult: function( obj ) {
                        var
                            person = obj.data,
                            dob = (person.dob && ' [' + person.kbvDob + ']') || '';
                        return obj.text + dob;
                    }

                }
            };

        },
        /**
         * Initializes select2 for location
         * @method initSelect2Locations
         */
        initSelect2Locations: function() {
            var
                self = this;

            self.locationId = ko.observableArray( [] );
            self.select2Locations = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( self.locationId );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.locationId.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.locationId.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    placeholder: '',
                    width: '100%',
                    multiple: true,
                    allowClear: true,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.location.read( {
                            query: {
                                locname: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( location ) {
                                        return {
                                            id: location._id,
                                            text: location.locname
                                        };
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    }
                }
            };
        },
        formValid: function(){
            return !( this.caseFolderType.hasError() || this.actType.hasError() || this.tenants.hasError() );
        }

    }, {
        NAME: 'RuleLogModalModel'
    } );

    KoViewModel.registerConstructor( RuleRegenerateModalModel );

    function show( data ) {
        /* jshint unused:false */
        var
            self = this,    //eslint-disable-line no-unused-vars
            node = Y.Node.create( '<div></div>' ),
            modal,
            viewModel = new RuleRegenerateModalModel( data );

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'ruleregenerate-modal',
            'IncaseAdminMojit',
            {},
            node,
            function() {

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-RuleRegenerate',
                    bodyContent: node,
                    title: i18n( 'IncaseAdminMojit.rules.tree.regenerate_title' ),
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,

                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                disabled: true,
                                label: i18n( 'IncaseAdminMojit.rules.tree.regenerate_start' ),
                                action: function() {
                                    this.close();
                                    viewModel.cb( null, {
                                        action: 'start',
                                        caseFolders: viewModel.caseFolderType(),
                                        deletingLogStrategy: viewModel.deletingLogStrategy(),
                                        actTypes: viewModel.actType(),
                                        tenants: viewModel.tenants(),
                                        actStatus: viewModel.actStatus(),
                                        patientId: viewModel.patientId().map( function( item ) {
                                            return item.id;
                                        }),
                                        timestamp: {
                                            endOf: viewModel.dateSelector.endDate(),
                                            startOf: viewModel.dateSelector.startDate()
                                        },
                                        locationId: viewModel.locationId().map( function( item ) {
                                            return item.id;
                                        })
                                    });
                                }
                            } )
                        ]
                    }
                } );

                ko.computed( function() {
                    var
                        allValid = viewModel.formValid();

                    if( allValid ) {
                        modal.getButton( 'OK' ).button.enable();
                    } else {
                        modal.getButton( 'OK' ).button.disable();
                    }
                } );

                ko.applyBindings( viewModel, node.getDOMNode() );
                $('[data-toggle="popover"]').popover();
            }
        );
    }


    Y.namespace( 'doccirrus.modals' ).ruleRegenerateModal = {
        show: show
    };

}, '0.0.1', {
    requires: [
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'rulelog-schema',
        'dcRuleSetEditor'
    ]
} );

/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _*/

YUI.add( 'dcruleloggmodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel;

    function RuleOperator( type, data, rule, ruleSet ) {
        var self = this;

        this.type = ko.observable( type );
        this.content = ko.observableArray().extend( { rateLimit: 100 } );

        this.operatorName = ko.computed( function() {
            var type = self.type();
            return Y.doccirrus.ruleutils.translate( type );
        } );

        if( !Array.isArray( data ) ) {
            throw Error( 'content must be an array' );
        }

        data.forEach( function( entry ) {
            var operator = findOperator( entry, rule, ruleSet );

            if( operator ) {
                operator.parent = self;
                self.content.push( operator );
            } else {
                self.addValidation( entry, rule, ruleSet );
            }
        } );
    }

    RuleOperator.prototype.addValidation = function( validationData, rule, ruleSet ) {
        var
            validation = new RuleValidation( validationData, rule, ruleSet );

        validation.parent = this;
        this.content.push( validation );
    };

    function isArea( ruleSet, area ){
        return  'ENTRY' === ruleSet.referenceArea && _.includes( ruleSet.caseFolderType, area );
    }

    function RuleValidation( data, rule, ruleSet ) {
        var
            criteria = data.criteria || {},
            isCaseFolder = isArea( ruleSet, 'CASEFOLDER' ),
            isPatient = isArea( ruleSet, 'PATIENT' ),
            isTask = isArea( ruleSet, 'TASK' ),
            parsedCriteria = Y.doccirrus.ruleutils.parseCriteria( criteria, isCaseFolder, isPatient, isTask );
        this.isActivity = ko.observable( !isCaseFolder && !isPatient );
        this.type = ko.observable( 'validation' );
        this.content = ko.observable( parsedCriteria );
    }

    function findOperator( data, rule, ruleSet ) {
        var operatorType, operatorContent;

        if( Array.isArray( data ) && data.length > 1 ) {
            operatorType = 'and';
            operatorContent = data;
        } else if( data.$and ) {
            operatorType = 'and';
            operatorContent = data.$and;
        } else if( data.$or ) {
            operatorType = 'or';
            operatorContent = data.$or;
        } else if( data.$not ) {
            operatorType = 'not';
            operatorContent = data.$not;
        } else if( Array.isArray( data ) && data.length === 1 ){
            if( data[0] && data[0].criteria ){
                operatorType = 'and';
                operatorContent = data;
            } else {
                return findOperator( data[0], rule, ruleSet );
            }
        }
        if( !operatorContent || !operatorType ) {
            return;
        }
        return new RuleOperator( operatorType, operatorContent, rule, ruleSet );
    }

    function RuleLogModalModel( config ) {
        RuleLogModalModel.superclass.constructor.call( this, config );
    }

    var TabModel = function( name, title, selected ) {
        this.name = name;
        this.isSelected = ko.pureComputed( function() {
            return this === selected();
        }, this );
        this.title = title;
    };

    Y.extend( RuleLogModalModel, KoViewModel.getDisposable(), {

        errors: [],
        warnings: [],
        activities: [],
        selectedRuleSet: null,

        initializer: function RuleLogModalModel_initializer( config ) {
            var
                self = this;

            self.initValues();
            self.initEvents();

            self.selectedTab = ko.observable();

            self.tabs = ko.observableArray( [] );

            config.forEach( function( entry ) {
                if( !entry.factId ) {
                    entry.factId = null;
                }
                if( !entry.ruleSetId ) {
                    entry.ruleSetId = null;
                }
                if( !entry.ruleId ) {
                    entry.ruleId = null;
                }
                if( 'ERROR' === entry.ruleLogType ) {
                    self.errors.push( entry );
                } else if( 'WARNING' === entry.ruleLogType ) {
                    self.warnings.push( entry );
                } else if( 'ACTIVITY' === entry.ruleLogType ) {
                    self.activities.push( entry );
                }
            } );

            self.activities.forEach( function( actEntry ) {
                ( actEntry.activitiesToCreate || [] ).forEach( function( act ) {
                    act.selected = ko.observable( false );
                } );
            } );

            if( self.errors.length ) {
                self.tabs.push( new TabModel( 'errors', 'Fehler' + ' (' + self.errors.length + ')', self.selectedTab ) );
            }

            if( self.warnings.length ) {
                self.tabs.push( new TabModel( 'warnings', 'Warnungen' + ' (' + self.warnings.length + ')', self.selectedTab ) );
            }

            if( self.activities.length ) {
                self.tabs.push( new TabModel( 'activities', 'Akteneinträge' + ' (' + self.activities.length + ')', self.selectedTab ) );
            }

            self.selectedTab( self.tabs()[0] );
        },

        initValues: function() {
            this.errors = [];
            this.warnings = [];
            this.activities = [];
            this.selectedRuleSet = ko.observable();
        },

        initEvents: function() {
            this.events = new Y.EventTarget();
            this.events.publish( 'closeEntry', {
                preventable: false
            } );
        },

        showActivityDescription: function( template ) {
            return Y.doccirrus.schemas.rulelog.getActivityToCreateDescription( template );
        },

        loadRuleSetPreview: function( ruleSetId, ruleId ) {

            var
                self = this;

            Y.doccirrus.jsonrpc.api.rule.read( {
                query: {
                    _id: ruleSetId
                }
            } ).done( function( response ) {

                var
                    ruleSet = response && response.data && response.data[0] || {},
                    operator;

                ruleSet.rules = ( ruleSet && ruleSet.rules || [] ).filter( function(entry){
                    return !ruleId || !entry.ruleId || ruleId === entry.ruleId;
                });

                ruleSet.rules = Y.doccirrus.schemautils.recoverKey( ruleSet.rules );

                ruleSet.rules.forEach( function( entry ) {
                    if( entry.validations ) {
                        entry.content = ko.observableArray();
                        operator = findOperator( entry.validations, entry, ruleSet );
                        if( !operator ) {
                            throw Error( 'no operator found' );
                        }
                        entry.content( [operator] );
                    }
                } );

                self.selectedRuleSet( ruleSet );
            } );
        },

        hideRuleSetPreview: function() {
            this.selectedRuleSet( null );
        },

        displayAction: function( action ) {
            return Y.doccirrus.ruleutils.translate( ko.unwrap( action.type ) );
        },

        isTask: function( entry ){
            return entry.caseFolderType && _.includes( entry.caseFolderType, 'TASK' );
        },

        displayTaskDetails: function( taskId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                query: {
                    _id: taskId
                }
            } )
                .done( function( response ) {
                    var
                        _data = response.data && response.data[0];
                    self.events.fire( 'closeEntry' );
                    Y.doccirrus.modals.taskModal.showDialog( _data, function() {
                        self.reloadTableData();
                    } );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },

        getPath: function( entry ) {
            if( entry.factId === entry.caseFolderId ) {
                return 'incase#/patient/' + entry.patientId + '/tab/casefile_browser/casefolder/' + entry.factId;
            }
            if( entry.factId === entry.patientId ) {
                return 'incase#/patient/' + entry.patientId;
            }
            return 'incase#/activity/' + entry.factId;
        },

        removeEntry: function( entry ) {
            var
                self = this;

            if( !entry ) {
                return;
            }
            Y.doccirrus.jsonrpc.api.rulelog.removeEntriesAndUpdateCaseFolderStats( entry ).done( function() {
                self.events.fire( 'closeEntry' );
            } );
        },

        createActivities: function( entry ) {
            var
                self = this;
            if( !entry ) {
                return;
            }

            var anySelected = false;
            var cleanedEntry = JSON.parse( JSON.stringify( entry ) );

            cleanedEntry.activitiesToCreate = [];

            ( entry.activitiesToCreate || [] ).forEach( function( el ) {
                if( el.selected() ) {
                    anySelected = true;
                }
                var cleanedEl = JSON.parse( JSON.stringify( el ) );
                cleanedEl.selected = el.selected();
                cleanedEntry.activitiesToCreate.push( cleanedEl );
            } );

            if( !anySelected ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.rule.createRuleActivities( cleanedEntry ).done( function() {
                self.events.fire( 'closeEntry' );
            } );
        }
    }, {
        NAME: 'RuleLogModalModel'
    } );

    KoViewModel.registerConstructor( RuleLogModalModel );

    function show( data ) {
        var node = Y.Node.create( '<div></div>' ),
            modal,
            viewModel = new RuleLogModalModel( data ),
            previewComputed;

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'rulelog-modal',
            'IncaseAdminMojit',
            {},
            node,
            function() {

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-RuleLog',
                    bodyContent: node,
                    title: (viewModel.activities.length) ? 'Fehler, Warnungen und Akteneinträge' : 'Fehler und Warnungen',
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'BACK', {
                                action: function() {
                                    viewModel.hideRuleSetPreview();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                label: 'Bestätigen',
                                action: function() {
                                    this.close();
                                    previewComputed.dispose();
                                }
                            } )
                        ]
                    }
                } );

                viewModel.events.on( 'closeEntry', function() {
                    modal.close();
                } );

                previewComputed = ko.computed( function() {
                    var
                        isPreviewVisible = ko.unwrap( viewModel.selectedRuleSet ),
                        okButton = modal.getButton( 'BACK' ).button;
                    if( isPreviewVisible ) {
                        okButton.enable();
                    } else {
                        okButton.disable();
                    }
                } );

                modal.getButton( 'BACK' ).button.disable();

                ko.applyBindings( viewModel, node.one( '#ruleLog' ).getDOMNode() );
            }
        );
    }

    function mapAndShow( results, callback ) {
        show( results, callback );
    }

    function showDialog( args ) {
        var callback = args.callback,
            query = args.query,
            data = args.data;

        if( query ) {
            Y.doccirrus.jsonrpc.api.rulelog.read( {
                query: query
            } ).done( function( response ) {
                mapAndShow( (response.data || []), callback );
            } );
        } else {
            mapAndShow( (data || []), callback );
        }
    }

    Y.namespace( 'doccirrus.modals' ).ruleLogModal = {
        show: showDialog
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

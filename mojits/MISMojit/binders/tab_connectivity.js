/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, _, moment */
/*exported fun */
'use strict';
fun = function _fn( Y, NAME ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        DCPRC = i18n( 'MISMojit.tab_connectivity.text.DCPRC' ),
        PUC = i18n( 'MISMojit.tab_connectivity.text.PUC' ),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        lang = 'i18n',
        fields = Y.doccirrus.schemas.audit.types.root,
        viewModel,
        GOOD_SPEED = 900,
        NORMAL_SPEED = 400,
        RETEST_INTERVAL = 1000,
        AJAX_DIFF = 400,
        MAX_ITERATION = 15,
        ANIMATION_MAX = 4;

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.initLoadMask();
            self.initAuditTable();
        },
        destructor: function() {
        },
        initViewModel: function() {
            var
                self = this;
            self.pending = ko.observable( false );
            self.intervals = [];
            self.serverTest = ko.observable();
            self.pucTest = ko.observable();
            self.dcprcTest = ko.observable();
            self.animate = ko.observable();
            self.running = ko.observable();
            self.title = i18n( 'InTimeAdminMojit.tab_partner-calendar.text.TITLE' );
            self.serverTestI18n = i18n( 'MISMojit.tab_connectivity.label.SERVER_TEST' );
            self.pucTestI18n = i18n( 'MISMojit.tab_connectivity.label.PUC_TEST' );
            self.dcprcTestI18n = i18n( 'MISMojit.tab_connectivity.label.DCPRC_TEST' );
            self.auditTableI18n = i18n( 'MISMojit.tab_connectivity.text.AUDIT_TABLE' );

            self.initDCPRCTest();
            self.initPUCTest();
            self.initAjaxSpeedTest();
            self.startIntervals();
        },
        initAuditTable: function() {
            var self = this;

            self.auditLogTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'InSuiteAdminMojit.tab_auditlog.pdfTitle' ),
                    stateId: 'dc-audit-table',
                    striped: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.audit.getForAuditBrowser,
                    baseParams: {
                        sort: {
                            _id: -1
                        },
                        query: {
                            $and: [
                                {
                                    model: {$in: ['dcprcconnection', 'pucconnection']}
                                }
                            ]
                        },
                        connectivityLog: true
                    },
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: fields.timestamp[lang],
                            width: '30%',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            renderer: function( item ) {
                                return moment( item.value ).format( 'DD.MM.YYYY (HH:mm:ss)' );
                            }
                        },
                        {
                            forPropertyName: 'model',
                            label: fields.model[lang],
                            width: '30%',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.audit.types.ModelMeta_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true,
                            renderer: function( item ) {
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', item.value, 'i18n', 'Unbekannter Typ' );
                            }
                        },
                        {
                            forPropertyName: 'descr',
                            label: fields.descr[lang],
                            width: '30%',
                            isFilterable: false,
                            renderer: function( item ) {
                                var description = '';
                                switch( item.row.model ) {
                                    case 'dcprcconnection':
                                        description += DCPRC;
                                        break;
                                    case 'pucconnection':
                                        description += PUC;
                                        break;
                                }
                                return description + Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'Status_E', item.value, 'i18n', '' );
                            }
                        }
                    ]
                }
            } );
        },
        auditLogTable: null,
        intervals: null,
        serverSpeedStatistics: null,
        const: {
            GOOD_CONNECTION: 1,
            NORMAL_CONNECTION: 0,
            BAD_CONNECTION: -1,
            BECOMING_CONNECTED: 1
        },
        getAvaregeSpeed: function( stats ) {
            var average = 0;
            stats.forEach( function( speed ) {
                average += speed;
            } );
            average = average / MAX_ITERATION;
            return average;

        },
        mapSpeed: function( speed, isAjax ) {
            var self = this,
                good = GOOD_SPEED,
                normal = NORMAL_SPEED;
            if( isAjax ) {
                good = good - AJAX_DIFF;
                normal = normal - (AJAX_DIFF / 2);
            }
            if( good <= speed ) {
                return self.const.GOOD_CONNECTION;
            } else if( normal <= speed ) {
                return self.const.NORMAL_CONNECTION;
            } else {
                return self.const.BAD_CONNECTION;
            }
        },
        loadAuditEntry: function( server, model ) {
            Y.doccirrus.jsonrpc.api.audit.get(
                {
                    query: {"model": model, serverTest: true},
                    options: {
                        itemsPerPage: 1,
                        sort: {
                            _id: -1
                        }
                    }
                } )
                .done( function( result ) {
                    if( result && result.data && Array.isArray( result.data ) ) {
                        server( result.data[0] && +result.data[0].descr );
                    } else {
                        server( 0 );
                    }
                } );
        },
        initAjaxSpeedTest: function() {
            var self = this;
            self.ajaxStatistics = {
                server: []
            };
            self.addInterval( {
                intervalFunc: self.ajaxSpeedTestFunc,
                stats: self.ajaxStatistics
            } );
        },
        initDCPRCTest: function() {
            var self = this;
            self.loadAuditEntry( self.dcprcTest, 'dcprcconnection' );
        },
        initPUCTest: function() {
            var self = this;
            self.loadAuditEntry( self.pucTest, 'pucconnection' );
        },
        ajaxSpeedTestFunc: function( isLast ) {
            var self = this;
            Y.doccirrus.comctl.testSpeed( function( err, speed ) {
                if( err ) {
                    Y.log( 'Error during speed test: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue anyway, best effort
                }
                self.ajaxStatistics.server.push( speed );
                if( isLast ) {
                    self.serverTest( self.mapSpeed( self.getAvaregeSpeed( self.ajaxStatistics.server ), true ) );
                } else {
                    self.serverTest( self.mapSpeed( speed, true ) );
                }
            } );
        },
        addInterval: function( config ) {
            var self = this,
                intervalId = config.intervalId,
                intervalFunc = config.intervalFunc,
                stats = config.stats || {};

            self.intervals.push( {
                id: intervalId,
                func: intervalFunc,
                stats: stats
            } );
        },
        clearIntervals: function() {
            this.intervals.forEach( function( interval ) {
                clearInterval( interval.id );
            } );
        },
        startIntervals: function() {
            var self = this;
            self.animate( true );
            self.running( true );
            self.intervals.forEach( function( interval ) {
                var iterationNumber = 0;
                _.forIn( interval.stats, function( stat ) {
                    stat.length = 0;
                } );
                interval.id = setInterval( function() {
                    iterationNumber++;
                    if( ANIMATION_MAX === iterationNumber ) {
                        self.animate( false );
                    }
                    if( 'function' === typeof interval.func ) {
                        interval.func.call( self, MAX_ITERATION === iterationNumber );
                    }
                    if( MAX_ITERATION <= iterationNumber ) {
                        clearInterval( interval.id );
                        iterationNumber = 0;
                        self.running( false );
                    }
                }, RETEST_INTERVAL );
            } );
        },
        restartIntervals: function() {
            var self = this;
            self.clearIntervals();
            self.startIntervals();
        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                } else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( {node: node.getDOMNode()} );

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};

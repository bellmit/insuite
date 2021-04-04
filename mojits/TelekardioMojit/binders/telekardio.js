/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment*/

YUI.add( 'TelekardioMojitBinder', function( Y, NAME ) {

    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' );

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    /**
     *  Gather all pdf links into array
     *
     * @param {Object} meta     - KoTable Meta
     * @returns {Array}         - Array of all links
     */
    function generateReportLinks( meta ) {
        var
            links = [],
            dataset = meta.value.dataset,
            reports =
                dataset.BIO &&
                dataset.BIO.REQUEST &&
                dataset.BIO.REQUEST.REPORTS;

        if( reports ) {
            if( reports.STATUS_REPORT ) {
                if( !Array.isArray( reports.STATUS_REPORT ) ) {
                    reports.STATUS_REPORT = [reports.STATUS_REPORT];
                }
                reports.STATUS_REPORT.forEach( function( report ) {
                    links.push( report.url );
                } );
            }
            if( reports.EPISODE_REPORT ) {
                if( !Array.isArray( reports.EPISODE_REPORT ) ) {
                    reports.EPISODE_REPORT = [reports.EPISODE_REPORT];
                }
                reports.EPISODE_REPORT.forEach( function( report ) {
                    links.push( report.url );
                } );
            }
        }

        return links;
    }

    Y.extend( BinderViewModel, Disposable, {

        subNavigation: null,
        overviewTable: ko.observable( null ),
        router: null,
        viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n,
        tableRefreshI18n: i18n( 'TelekardioMojit.labels.TableRefresh' ),
        tableHeadlineI18n: i18n( 'TelekardioMojit.labels.TableHeadline' ),
        assignText: i18n( 'TelekardioMojit.labels.Assign' ),

        initializer: function BinderViewModel_initializer() {

            var
                self = this;

            self.router = new Y.doccirrus.DCRouter( {
                root: Y.doccirrus.utils.getUrl( 'telecardio' ),
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            {
                                self.initOverviewTable( (req.query && req.query.serialNumber) ? { serialNumber: req.query.serialNumber } : {} );
                            }
                        }
                    }]
            } );

            var routeTo = location.href.split( 'telecardio#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            self.router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = self.router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

            self.paitnetSavedEvent = Y.doccirrus.communication.on( {
                event: "patientPartnersHasChanged",
                handlerId: 'reloadCardioTable',
                done: function() {
                    var overviewTable = ko.unwrap( self.overviewTable );
                    if( overviewTable ) {
                        overviewTable.reload();
                    }
                }
            } );
        },

        /** @protected */
        destructor: function() {
            this.paitnetSavedEvent.removeEventListener();
        },

        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },

        initOverviewTable: function TabOverviewViewModel_initOverviewTable( queryFilter ) {
            var self = this;

            self.overviewTable( KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'TelekardioMojit.pdfTitle' ),
                    stateId: 'TelekardioMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.cardio.read,
                    selectMode: 'none',
                    exportCsvConfiguration: {
                        columns: [
                            {
                                forPropertyName: 'patientName',
                                renderer: function( meta ) {
                                    return meta.value || '';
                                }
                            },
                            {
                                forPropertyName: 'data',
                                renderer: function( meta ) {
                                    var links = generateReportLinks( meta );
                                    if( links.length > 0 ) {
                                        return links.join( ' ' );
                                    } else {
                                        return 'Nicht vorhanden';
                                    }
                                }
                            }
                        ]
                    },
                    columns: [
                        {
                            forPropertyName: 'serialNumber',
                            label: i18n( 'casefolder-schema.Cardio_T.serialNumber.i18n' ),
                            title: i18n( 'casefolder-schema.Cardio_T.serialNumber.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoField',
                                value: queryFilter.serialNumber ? (queryFilter.serialNumber + '') : ''
                            }
                        },
                        {
                            forPropertyName: 'type',
                            label: i18n( 'casefolder-schema.Cardio_T.type.i18n' ),
                            title: i18n( 'casefolder-schema.Cardio_T.type.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;

                                return (actType) ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', actType, Y.doccirrus.schemas.activity.types.Activity_E.list, 'k.A.' ) : '';
                            }
                        },
                        {
                            forPropertyName: 'subType',
                            label: i18n( 'casefolder-schema.Cardio_T.eventMessage.i18n' ),
                            title: i18n( 'casefolder-schema.Cardio_T.eventMessage.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'catalog',
                            label: i18n( 'casefolder-schema.Cardio_T.catalog.i18n' ),
                            title: i18n( 'casefolder-schema.Cardio_T.catalog.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'exportDate',
                            label: i18n( 'TelekardioMojit.labels.TableExportDate' ),
                            title: i18n( 'TelekardioMojit.labels.TableExportDate' ),
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'TelekardioMojit.labels.TableExportDate' )
                                }
                            },
                            renderer: function( meta ) {
                                return moment( new Date( meta.value ) ).format( TIMESTAMP_FORMAT_LONG );
                            }
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'TelekardioMojit.labels.TableName' ),
                            title: i18n( 'TelekardioMojit.labels.TableName' ),
                            isSortable: true,
                            isFilterable: true,
                            onCellClick: self.assignPatient.bind( self ),
                            renderer: function( meta ) {
                                var value = meta.value;
                                if( value ) {
                                    return Y.Lang.sub( '<a href="/incase#/patient/{patientId}/tab/casefile_browser" target="_blank">{value}</a>',
                                        { patientId: meta.row.patientId, value: value } );
                                } else {
                                    return '<button name="assignPatient" type="button" class="btn btn-default btn-xs">' + self.assignText + '</button>';
                                }
                            }
                        },
                        {
                            forPropertyName: 'data',
                            label: i18n( 'TelekardioMojit.labels.TableAttachment' ),
                            title: i18n( 'TelekardioMojit.labels.TableAttachment' ),
                            interceptRenderOutput: function( meta, value, isTitle ) {
                                if( isTitle ) {
                                    const links = generateReportLinks( value );
                                    if( links.length > 0 ) {
                                        return links.map( function() {
                                            return 'PDF';
                                        } ).join( ', ' );
                                    } else {
                                        return 'Nicht vorhanden';
                                    }
                                } else {
                                    return meta;
                                }
                            },
                            renderer: function( meta ) {
                                var links = generateReportLinks( meta );
                                if( links.length > 0 ) {
                                    return links.map( function( reportUrl ) {
                                        return Y.Lang.sub( '<a href="{reportUrl}" target="_blank">PDF</a>', { reportUrl: reportUrl } );
                                    } ).join( ', ' );
                                } else {
                                    return 'Nicht vorhanden';
                                }
                            }
                        }
                    ],
                    onRowClick: function TabOverviewViewModel_overviewTable_onRowClick() {

                    },
                    responsive: false
                }
            } ) );
        },
        assignPatient: function FileTableRecord_assignPatient( $data, $event ) {

            var
                serialNumber = $data.row.serialNumber;

            $event.stopPropagation();

            if( "BUTTON" !== $event.originalEvent.target.tagName ) {
                return;
            }

            Y.doccirrus.utils.selectPatient( {
                buttonSelectConfig: {
                    label: i18n( 'LabLogMojit.tab_file.fileTable.column.assign.assignPatient.dialog.buttonSelectConfig.label' )
                },
                getWithoutSerialNumber: true
            } ).after( {
                select: function FileTableRecord_selectPatient_after( yEvent, patientId ) {
                    var location = Y.Lang.sub( "/incase#/patient/{patientId}/section/care?serialNumber={serialNumber}", {
                        patientId: patientId,
                        serialNumber: serialNumber
                    } );
                    window.open( location, '_blank' );

                }
            } );
        },
        test: function() {
            var self = this;

            Y.doccirrus.jsonrpc.api.cardio.checkCardioServer( {} ).done( function() {
                var overviewTable = ko.unwrap( self.overviewTable );
                if( overviewTable ) {
                    overviewTable.reload();
                }
            } ).fail( function( response ) {
                var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
                Y.doccirrus.DCWindow.notice( {
                    title: 'Fehler',
                    message: i18n( 'TelekardioMojit.labels.TableError' ) + "\n\n" + errors,
                    callback: function() {
                    },
                    window: { width: 'medium' }
                } );
            } );
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function TelekardioMojitBinder_init( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function TelekardioMojitBinder_bind( node ) {
            var self = this;

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'telekardio' );

            self.binderViewModel = new BinderViewModel();

            ko.applyBindings( self.binderViewModel, node.getDOMNode() );

            Y.doccirrus.DCBinder.initToggleFullScreen();
        }
    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'oop',
        'NavBarHeader',
        'KoSchemaValue',
        'mojito-client',
        'doccirrus',
        'dccommonutils',
        'dcutils',
        'dcutils-uam',
        'dcauth',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoViewModel',
        'KoUI-all',
        'dcschemaloader',
        'person-schema'
    ]
} );

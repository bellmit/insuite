/*global fun:true, ko, $, moment */
/*exported fun */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var i18n = Y.doccirrus.i18n;
    var viewModel;
    var Disposable = Y.doccirrus.KoViewModel.getDisposable();
    var KoUI = Y.doccirrus.KoUI;
    var KoComponentManager = KoUI.KoComponentManager;
    
    var clearBlacklistText = i18n('DeviceMojit.tab_flowlog.btnClearBlackList');
    var spinner = ' <i class="fa fa-spinner fa-spin"></i>';
    var checkMark = ' <i class="fa fa-check"></i>';
    var errorMark = ' <i class="fa fa-fa-times"></i>';

    var occurrenceLimit = 10;
    
    function TabOverviewViewModel( config ) {
        TabOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabOverviewViewModel, Disposable, {
        initializer: function TabOverviewViewModel_initializer() {
            this.initOverviewTable();
        },
        btnClearBlacklistText: ko.observable( clearBlacklistText ),
        /**
         * @property addConfig
         * @type {Function}
         */
        resetBlacklist: null,
        /**
         * @type {null|KoTable}
         */
        overviewTable: null,
        initOverviewTable: function TabOverviewViewModel_initOverviewTable() {
            var
                self = this;

            self.flowLogTitleI18n = i18n( 'DeviceMojit.tab_flowlog.title' );
            self.flowLogHintI18n = i18n('DeviceMojit.tab_flowlog.hint');

            self.resetBlacklist = function() {
                self.btnClearBlacklistText( clearBlacklistText + spinner );
                Y.doccirrus.jsonrpc.api.flow.clearBlacklist().done(function() {
                    self.btnClearBlacklistText( clearBlacklistText + checkMark );
                }).fail(function() {
                    self.btnClearBlacklistText( clearBlacklistText + errorMark );
                });
            };
            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'LabLogMojit.tab_overview.pdfTitle' ),
                    pdfFile: i18n( 'LabLogMojit.tab_overview.pdfTitle' ),
                    stateId: 'LabLogMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.flowlog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'flowName',
                            label: i18n( 'flowlog-schema.Flowlog_T.flowName.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.flowName.i18n' ),
                            width: '100px',
                            isFilterable: true,
                            renderer: function ( meta ) {
                                return meta.value;
                            }
                        },
                        {
                            forPropertyName: 'flowComponentName',
                            label: i18n( 'flowlog-schema.Flowlog_T.flowComponentName.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.flowComponentName.i18n' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'msg',
                            label: i18n( 'flowlog-schema.Flowlog_T.msg.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.msg.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'latestOccurrence',
                            label: i18n( 'flowlog-schema.Flowlog_T.latestOccurrence.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.latestOccurrence.i18n' ),
                            width: '150px',
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: "DESC",
                            renderer: function ( meta ) {
                                return moment(meta.value).format(' DD.MM.YYYY HH:mm:ss ');
                            }
                        },
                        {
                            forPropertyName: 'timesOccurred',
                            label: i18n( 'flowlog-schema.Flowlog_T.timesOccurred.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.timesOccurred.i18n' ),
                            width: '150px',
                            isSortable: true,
                            renderer: function ( meta ) {
                                var lenString = meta.value.length<=occurrenceLimit ? meta.value.length : occurrenceLimit+"+";
                                var times = "<table class='clearTable'>";
                                var i;
                                for (i = 0; i < meta.value.length && i < occurrenceLimit; i++) {
                                    let rowString = "<tr><td>";
                                    rowString += moment(meta.value[i]).format(' DD.MM.YYYY </td><td> HH:mm:ss ');
                                    rowString += "</td></tr>";
                                    times += rowString;
                                }
                                if (meta.value.length > occurrenceLimit) {
                                    times+="<tr><td>...</td></tr>";
                                }
                                times += "</table>";
                                return '<span class="badge" style="cursor: pointer;" data-toggle="popover" data-html="true" rel="popover" data-placement="auto right" data-trigger="hover" data-content="'+times+'">' +
                                    lenString +
                                    "</span> " +
                                    i18n( 'flowlog-schema.Flowlog_T.timesOccurred.unit' );
                            }
                        },
                        {
                            forPropertyName: 'fileDownloadUrl',
                            label: i18n( 'flowlog-schema.Flowlog_T.fileDownloadUrl.i18n' ),
                            title: i18n( 'flowlog-schema.Flowlog_T.fileDownloadUrl.i18n' ),
                            isFilterable: false,
                            isSortable: false,
                            width: '33%',
                            renderer: function( meta ) {
                                var
                                    fileDownloadUrl = meta.value;

                                if( fileDownloadUrl ) {
                                    return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                        text: i18n( 'GdtLogMojit.tabGdtOverview.downloadText' ),
                                        href: fileDownloadUrl
                                    });
                                } else {
                                    return '';
                                }
                            }
                        }
                    ],
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = self.overviewTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

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
                    }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} )
                }
            } );
            self.overviewTable.data.subscribe( function() {
                setTimeout(function() { $('[data-toggle="popover"]').popover(); },500);
            } );
        }
    } );

    viewModel = new TabOverviewViewModel();
    
    return {

        registerNode: function( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};

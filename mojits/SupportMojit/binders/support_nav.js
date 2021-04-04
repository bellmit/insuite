/**
 * User: dcdev
 * Date: 10/31/18  12:32 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment*/

YUI.add( 'SupportNavBinderIndex', function( Y, NAME ) {
    'use strict';
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        ACCEPT = i18n( 'SupportMojit.support_nav.text.ACCEPT' );

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, Disposable, {

        subNavigation: null,
        requestsTable: ko.observable( null ),

        initializer: function BinderViewModel_initializer() {

            var
                self = this;

            self.initRequestsTable();
        },

        /** @protected */
        destructor: function() {
        },

        viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n,
        tableHeadlineI18n: i18n( 'SupportMojit.support_nav.text.SUPPORT_REQUESTS' ),
        toggleFullScreenHandler () {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },

        initRequestsTable: function TabRequestsViewModel_initRequestsTable() {
            var self = this;

            self.requestsTable( KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'TelekardioMojit.pdfTitle' ),
                    stateId: 'TelekardioMojit-tab_requests-requestsTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.supportrequest.getRequestsForTable,
                    baseParams: {
                        query: {
                            isPartnerRequest: Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.PARTNER ) || undefined
                        }
                    },
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timestamp' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timestamp' ),
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
                                    placeholder: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timestamp' )
                                }
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return moment( new Date( meta.value ) ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'supportDuration',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.supportDuration' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.supportDuration' ),
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.supportrequest.types.SupportDuration_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'supportrequest', 'SupportDuration_E', meta.value, 'i18n', '' );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'coname',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.coname' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.coname' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    val = meta.value;

                                return val || "";
                            }
                        },
                        {
                            forPropertyName: 'sendingEmployeeName',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.sendingEmployeeName' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.sendingEmployeeName' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'receivingEmployeeName',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.receivingEmployeeName' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.receivingEmployeeName' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'timeReceived',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timeReceived' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timeReceived' ),
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
                                    placeholder: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timeReceived' )
                                }
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return moment( new Date( meta.value ) ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';

                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.status' ),
                            title: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.status' ),
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.supportrequest.types.Status_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'supportrequest', 'Status_E', meta.value, 'i18n', '' );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'loginLink',
                            label: ACCEPT,
                            title: ACCEPT,
                            onCellClick: self.acceptRequest.bind( self ),
                            renderer: function( meta ) {
                                if( meta.row.receivingEmployeeName || meta.row.timeReceived ||
                                    Y.doccirrus.schemas.supportrequest.statuses.ACTIVE !== meta.row.status ) {
                                    return '';
                                }
                                return '<button name="acceptRequest" type="button" class="btn btn-primary btn-xs">' + ACCEPT + '</button>';
                            }
                        }
                    ]
                }
            } ) );
        },
        acceptRequest: function( $data, $event ) {

            var self = this,
                requestId = $data.row._id,
                loginLink = $data.row.loginLink,
                loginToken = $data.row.loginToken,
                prcTab = window.open( '', '_blank' );

            $event.stopPropagation();

            if( "BUTTON" !== $event.originalEvent.target.tagName ) {
                return;
            }
            //need timeout to call acceptRequest before create new login token
            setTimeout( function() {
                prcTab.location.href = loginLink + '&loginToken=' + encodeURIComponent( loginToken );
            }, 2000 );

            Y.doccirrus.jsonrpc.api.supportrequest.acceptRequest( { query: { _id: requestId } } ).done( function() {
                self.requestsTable().reload();
            } ).fail( function fail( response ) {
                var
                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                if( errors.length ) {
                    Y.Array.invoke( errors, 'display' );
                }
            } );

        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function bind( node ) {
            var
                self = this;
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'support_nav' );

            self.binderViewModel = new BinderViewModel();

            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
            Y.doccirrus.DCBinder.initToggleFullScreen();
        }
    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'mojito-client',
        'NavBarHeader',
        'doccirrus',
        'dcschemaloader',
        'dcvalidations',
        'dcauth',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoViewModel',
        'KoUI-all',
        'ItemsTabFactory'
    ]
} );

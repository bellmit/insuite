/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcrequestchangesmodal', function( Y/*,NAME*/ ) {

        var
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' );

        function buildColumnDateHeader( label, data, key ) {
            return data[key] ? label + ': ' + moment( data[key] ).format( TIMESTAMP_FORMAT_LONG ) : label;
        }

        Y.namespace( 'doccirrus.modals' ).dispatchRequestChanges = {
            show: function( settings ) {

                Y.doccirrus.jsonrpc.api.dispatchrequest.getDetails( {
                    query: {_id: settings.dispatchRequestId}
                } ).then( function( response ) {
                    var
                        data = response.data[0],
                        binding = {
                            rows: [],
                            activities: [],
                            text: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.dialogNothingToShowText' ),
                            columnKeyLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnKeyLabel' ),
                            columnValueNewLabel: buildColumnDateHeader( i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueNewLabel' ), data.is, 'dateConfirmed' ),
                            columnValueOldLabel: buildColumnDateHeader( i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueOldLabel' ), data.was, 'createdDate' )
                        },
                        skipFields = ['dispatchActivities', '_id', 'dateConfirmed', 'createdDate'];

                    if( data && data.was && data.is ) {

                        Object.keys( data.was ).filter( function( key ) {
                            return skipFields.indexOf( key ) === -1;
                        } ).forEach( function( key ) {
                            binding.rows.push( {
                                property: i18n( 'dispatchrequest-schema.DispatchRequest_T.' + key ) || i18n( 'IsDispatcherMojit.tab_requests.details.dialog.label.' + key ),
                                oldValue: JSON.stringify( data.was[key] || '' ),
                                newValue: JSON.stringify( data.is[key] || '' )
                            } );
                        } );

                        var skipActivitiesFields = ['_id', 'activityId', 'valid'];

                        data.is.dispatchActivities[0].activities.forEach( function( activity ) {
                            var oldActivity = data.was.dispatchActivities[0].activities.filter( function( oldActivity ) {
                                return oldActivity._id === activity._id;
                            } )[0];

                            Object.keys( activity ).filter( function( key ) {
                                return skipActivitiesFields.indexOf( key ) === -1;
                            } ).forEach( function( key ) {
                                binding.activities.push( {
                                    property: i18n( 'IsDispatcherMojit.tab_requests.details.dialog.label.' + key ),
                                    oldValue: oldActivity ? JSON.stringify( oldActivity[key] || '' ) : '',
                                    newValue: JSON.stringify( activity[key] || '' ),
                                    splitter: false
                                } );
                            } );

                            binding.activities.push( {
                                splitter: true
                            } );

                        } );
                    }

                    Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {path: 'IsDispatcherMojit/views/request_diff'} )
                        .then( function( response ) {
                            return response.data;
                        } )
                        .done( function( template ) {
                            // create Window to show diff table
                            var
                                bodyContent = Y.Node.create( template ),
                                aDCWindow = Y.doccirrus.DCWindow.create( {
                                    className: 'DCWindow-DiffAudit',
                                    bodyContent: bodyContent,
                                    title: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.dialogtitle' ),
                                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                                    height: 400,
                                    minHeight: 400,
                                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                                    centered: true,
                                    modal: true,
                                    render: document.body,
                                    buttons: {
                                        header: ['close', 'maximize'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CLOSE' )
                                        ]
                                    },
                                    after: {
                                        visibleChange: function( yEvent ) {
                                            // also captures cancel for e.g.: ESC
                                            if( !yEvent.newVal ) {
                                                ko.cleanNode( bodyContent.getDOMNode() );
                                            }
                                        }
                                    }
                                } );

                            aDCWindow.resizeMaximized.set( 'maximized', true );

                            ko.applyBindings( binding, bodyContent.getDOMNode() );

                        } );
                } );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
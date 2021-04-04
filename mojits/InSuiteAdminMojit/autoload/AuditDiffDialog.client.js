/**
 * User: do
 * Date: 07/09/15  20:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, moment, ko */

YUI.add( 'auditDiffDialog', function( Y/*, NAME*/ ) {

    'use strict';

    var
        i18n = Y.doccirrus.i18n;

    function renderRelatedActivities( data ) {
        var
            html = '';

        Y.Array.each( data.relatedActivities, function( item ) {
            html += Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="Zur Patienten Akte springen" target="_blank">{text}</a>', {
                text: item.text,
                href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + item.id
            } );
            html += ' ';
        } );

        return html;
    }

    function showAuditDiffDialog( data ) {

        var
            binding = {data: []};

        data.forEach( function( data ) {
            var tempBinding = {
                rows: null,
                text: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.dialogNothingToShowText' ),
                columnKeyLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnKeyLabel' ),
                columnValueNewLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueNewLabel' ),
                columnValueOldLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueOldLabel' ),

                timestampLabel: Y.doccirrus.schemas.audit.types.root.timestamp.i18n,
                timestampValue: moment( data.timestamp ).format( 'DD.MM.YYYY (HH:mm:ss)' ),
                userLabel: Y.doccirrus.schemas.audit.types.root.user.i18n,
                userValue: data.user,
                actionLabel: Y.doccirrus.schemas.audit.types.root.action.i18n,
                actionValue: Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'Action_E', data.action, 'i18n', 'Unbekannter Typ' ),
                modelLabel: Y.doccirrus.schemas.audit.types.root.model.i18n,
                modelValue: Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', data.model, 'i18n', 'Unbekannter Typ' ) + ' (' + data.model + ')',
                modelIdLabel: i18n( 'audit-schema.root.objId' ),
                modelIdValue: data.objId,
                descrLabel: Y.doccirrus.schemas.audit.types.root.descr.i18n,
                descValue: (function() {
                    if( data.relatedActivities && data.relatedActivities[0] ) {
                        return data.descr + ', ' + renderRelatedActivities( data );
                    } else {
                        return data.descr;
                    }
                })(),
                ipLabel: i18n( 'auth-schema.root.ip' ),
                ipValue: data.ip,
                entryIdLabel: i18n( 'audit-schema.root._id.i18n' ),
                entryIdValue: data._id
            };

            if( Array.isArray( data.diff ) ) {
                tempBinding.rows = data.diff.map( function( item ) {
                    var
                        oldValue = item.diff.oldValue,
                        newValue = item.diff.newValue;

                    if( 'Zieldatum' === item.path ){
                        newValue = newValue && moment( newValue ).format( 'DD.MM.YYYY (HH:mm:ss)' );
                        oldValue = oldValue && moment( oldValue ).format( 'DD.MM.YYYY (HH:mm:ss)' );
                    }
                    if( !Y.Lang.isString( oldValue ) ) {
                        oldValue = JSON.stringify( item.diff.oldValue );
                    }
                    if( !Y.Lang.isString( newValue ) ) {
                        newValue = JSON.stringify( item.diff.newValue );
                    }

                    return {
                        property: item.path,
                        oldValue: oldValue,
                        newValue: newValue
                    };
                } );
            }
            else if( Y.Lang.isString( data.diff ) ) {
                tempBinding.text = data.diff;
            }

            binding.data.push( tempBinding );
        } );

        Y.doccirrus.jsonrpc.api.jade
            .renderFile( {path: 'DocCirrus/views/showAuditDiffDialog'} )
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
    }

    function show( data ) {
        showAuditDiffDialog( !Array.isArray( data ) ? [data] : data );
    }

    Y.namespace( 'doccirrus.modals' ).auditDiffDialog = {
        show: show,
        renderRelatedActivities: renderRelatedActivities
    };

}, '0.0.1', {
    requires: [
        'dcschemaloader',
        'doccirrus',
        'audit-schema'
    ]
} );

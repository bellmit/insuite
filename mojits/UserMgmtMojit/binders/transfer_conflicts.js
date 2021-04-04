/**
 * User: md
 * Date: 28/03/19  13:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global ko, fun:true, _ */
/*exported fun */

fun = function _fn( Y ) {
    'use strict';

    return {
        registerNode: function() {
            var conflictTable = Y.doccirrus.tables.createConflictTable( {onRowClick: onRowClick} ),
                schema;

            function onRowClick( data ) {
                if( data && data.row && data.row.status === 2 ) {
                    schema = Y.doccirrus.schemas[data.row.entityName] && Y.doccirrus.schemas[data.row.entityName].schema || {};
                    Y.doccirrus.jsonrpc.api.audit.renderDiffToTextClient( {
                        diff: data.row.diff,
                        path: '',
                        schema: schema
                    } ).done( function( result ) {
                        Y.doccirrus.modals.auditDiffDialog.show( Object.assign( {}, data.row, {
                            diff: result && result.data || [],
                            objId: data.row.entryId,
                            action: ( data.row.onDelete ? 'delete' : 'upsert' ),
                            model: data.row.entityName
                        }) );
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                }
                return false;
            }

            ko.applyBindings( conflictTable, document.querySelector( '#conflictTable' ) );
        }
    };
};
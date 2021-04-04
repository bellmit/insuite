/*global YUI */


YUI.add( 'inpacsworklist-process', function( Y, NAME ) {

    NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

    function updateNameTags( user, worklist, callback ) {

        let
            oldTags = worklist.originalData_ && worklist.originalData_.workListData && worklist.originalData_.workListData.map( item => item.name ) || [],
            currentTags = worklist.workListData.map( item => item.name ) || [];

        if( worklist.wasNew ) {
            oldTags = [];
        }

        Y.doccirrus.api.tag.updateTags( {
            user,
            data: {
                type: Y.doccirrus.schemas.tag.tagTypes.INPACSNAME,
                oldTags: oldTags,
                documentId: worklist._id.toString(),
                currentTags: currentTags
            },
            callback: function( err ) {
                callback( err, worklist );
            }
        } );
    }

    function updateNameTagsOnDelete( user, worklist, callback ) {
        let
            oldTags = worklist.workListData && worklist.workListData.map( item => item.name ) || [],
            currentTags = [];

        Y.doccirrus.api.tag.updateTags( {
            user,
            data: {
                type: Y.doccirrus.schemas.tag.tagTypes.INPACSNAME,
                oldTags: oldTags,
                documentId: worklist._id.toString(),
                currentTags: currentTags
            },
            callback: function( err ) {
                callback( err, worklist );
            }
        } );
    }

    Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

        pre: [
            {
                run: [
                    updateNameTags
                ], forAction: 'write'
            },
            {
                run: [
                    updateNameTagsOnDelete
                ], forAction: 'delete'
            }
        ],

        name: NAME
    };

}, '0.0.1', {
    requires: [
        'tag-schema'
    ]
} );

/**
 *  Replicate forms and their dependencies from master tenant MOJ-6839
 *
 *  @author: strix
 *  @date: 2017 January
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-replicationutils', function( Y , NAME ) {


        var async = require( 'async' );

        /**
         *  Replicate forms to each tenant
         *
         *  @param  user
         *  @param  tenantList
         *  @param  callback
         */

        function replicateAllTenants( user, tenantList, callback ) {
            Y.log( 'Replicating forms to all tenants: ' + JSON.stringify( tenantList ), 'debug', NAME );

            async.eachSeries( tenantList, forEachTenant, callback );

            function forEachTenant( tenantId, itcb ) {
                var tenantUser = Y.doccirrus.auth.getSUForTenant( tenantId );
                Y.log( 'Replicating forms for single tenant: ' + tenantId, 'debug', NAME );
                replicateSingleTenant( tenantId, user, tenantUser, itcb );
            }
        }

        /**
         *  Replicate forms and versions fro this instance to all client tenants
         *
         *  Overall process
         *
         *      --> Stream from local formtemplates
         *      --> Foreach formtemplate
         *          --> copy canonical to client tenant
         *          --> copy each version to client tenant
         *
         *  We do not update the version history on the tenants, but retain version numbering of the master
         *  Changes on the canonical form are overwritten on the client, but any custom versions
         *
         *  @param  localUser
         *  @param  tenantUser
         *  @param  callback
         */

        function replicateSingleTenant( tenantId, localUser, tenantUser, callback ) {

            var
                formTemplateModelLocal,
                formVersionModelLocal,
                formTemplateModelTenant,
                formVersionModelTenant,
                formStream,
                formCount = 0;

            async.series(
                [
                    createDbModels,
                    streamFormTemplates
                ],
                onTenantDone
            );

            function createDbModels( itcb ) {
                async.parallel(
                    [
                        function( itcb ) { Y.doccirrus.mongodb.getModel( localUser, 'formtemplate', false, itcb ); },
                        function( itcb ) { Y.doccirrus.mongodb.getModel( localUser, 'formtemplateversion', false, itcb ); },
                        function( itcb ) { Y.doccirrus.mongodb.getModel( tenantUser, 'formtemplate', false, itcb ); },
                        function( itcb ) { Y.doccirrus.mongodb.getModel( tenantUser, 'formtemplateversion', false, itcb ); }
                    ],
                    onModelsCreated
                );

                function onModelsCreated( err, result ) {

                    if ( err ) {
                        Y.log( 'Problem creating database models: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    formTemplateModelLocal = result[0];
                    formVersionModelLocal = result[1];
                    formTemplateModelTenant = result[2];
                    formVersionModelTenant = result[3];

                    itcb( null );
                }
            }

            function streamFormTemplates( itcb ) {
                formStream = formTemplateModelLocal.mongoose
                        .find( {}, {}, { timeout: true } )
                        .stream()
                        .on( 'data', onStreamData )
                        .on( 'end', onStreamEnd )
                        .on( 'error', onStreamError );

                function onStreamData( data ) {
                    var formObjId = data._id;
                    formStream.pause();
                    data = JSON.parse( JSON.stringify( data ) );
                    copySingleForm( formObjId, data, onCopySingle );
                    function onCopySingle( err) {
                        if ( err ) {
                            Y.log( 'Problem copying form to tenant: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        Y.log( 'Replicated form ' + data._id + ' to tenant: ' + tenantId, 'debug', NAME );
                        formStream.resume();
                    }
                }

                function onStreamEnd( ) {
                    Y.log( 'Completed streaming ' + formCount + ' form templates for tenant: ' + tenantId, 'debug', NAME);
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( 'Error while streaming form templates: ' + JSON.stringify( err ), 'warn', NAME );
                    itcb( err );
                }

            }

            function copySingleForm( formObjId, formTemplateObj, formCb ) {

                var
                    canonicalExists = false;

                Y.log( 'Replicating single form: ' + formObjId + ' to tenant: ' + tenantId, 'debug', NAME );

                async.series(
                    [
                        checkExtantOnTenant,
                        putOrPostForm,
                        copyAllVersions
                    ],
                    formCb
                );

                function checkExtantOnTenant( itcb ) {
                    formTemplateModelTenant.mongoose.findById( formObjId, onFindOne );
                    function onFindOne( err, result ) {
                        if ( err ) { return itcb( err ); }
                        if ( result ) {
                            Y.log( 'Canonical form template ' + formTemplateObj._id + ' exists in tenant database: ' + tenantId , 'debug', NAME );
                            canonicalExists = true;
                        } else {
                            Y.log( 'Canonical form template ' + formTemplateObj._id + ' does not exist in tenant database: ' + tenantId, 'debug', NAME );
                            canonicalExists = false;
                        }
                        itcb( null );
                    }
                }

                function putOrPostForm( itcb ) {
                    if ( canonicalExists ) {
                        delete formTemplateObj._id;
                        formTemplateModelTenant.mongoose.update( { _id: formObjId }, formTemplateObj, onSaveFormTemplate );
                    } else {
                        formTemplateModelTenant.mongoose.create( formTemplateObj, onSaveFormTemplate );
                    }

                    function onSaveFormTemplate( err ) {
                        if ( err ) {
                            Y.log( 'Error saving form template: ' + JSON.stringify( err ), 'debug', NAME );
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                function copyAllVersions( itcb ) {
                    formVersionModelLocal.mongoose.find( { canonicalId: formTemplateObj._id + '' }, onFindVersions );
                    function onFindVersions( err, result ) {
                        if ( err ) { return itcb( err ); }
                        async.eachSeries( result, putOrPostFormVersion, itcb );
                    }
                }

                function putOrPostFormVersion( formVersionObj, itcb ) {
                    var versionId, plainVersionObj;
                    Y.log( 'Replicating form version: ' + versionId + ' to tenant: ' + tenantId, 'debug', NAME );

                    formVersionModelTenant.mongoose.findById( formVersionObj._id, onCheckExtantVersion );
                    function onCheckExtantVersion( err, result ) {
                        if ( err ) { return itcb( err ); }
                        if ( result ) {
                            //  already exists, update
                            versionId = formVersionObj._id;
                            delete formVersionObj._id;
                            plainVersionObj = JSON.parse( JSON.stringify( formVersionObj ) );
                            formVersionModelTenant.mongoose.update( { _id: versionId }, plainVersionObj, onVersionSaved );
                        } else {
                            //  does not exist, add
                            formVersionModelTenant.mongoose.create( formVersionObj, onVersionSaved );
                        }
                    }

                    function onVersionSaved( err ) {
                        itcb( err );
                    }
                }

            }

            function onTenantDone( err ) {
                if ( err ) {
                    Y.log( 'Error replicating forms to tenant db ' + tenantId + ': ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null );
            }

        }

       /*
        *  Share this with the rest of mojito
        */

        Y.namespace( 'doccirrus.forms' ).replicate = {
            'allTenants': replicateAllTenants,
            'singleTenant': replicateSingleTenant
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcforms-roles' ]}
);
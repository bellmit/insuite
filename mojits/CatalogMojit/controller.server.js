/*global YUI, require, __dirname */

/**
 * @module CatalogMojit
 */
YUI.add( 'CatalogMojit', function( Y, NAME ) {
    

    //========================  PUBLIC ============================

    Y.namespace( 'mojito.controllers' )[NAME] = {

        //========================  REST ============================

        /**
         * REST call to query current catalogs.
         *
         * if  params.catname  exists, then the query will return the
         * catalog named (if found) or an error.
         *
         * otherwise the call will return a list of catalogs for the
         * country specified in   params.country  (or all catalogs).
         * additionally in one can specify which type of catalog (i.e.
         * for TREATMENTS, or for MEDICATION, etc.) on wishes to see.
         *
         * @method
         * @param   {Object}          ac
         */
        catapi: function( ac ) {
            var
                readFile = require( 'fs' ).readFile,
                callback = this._getCallback( ac ),
                params = ac.rest.originalparams,
                user = ac.rest.user,
                catname = params.catname || '',
                countryCode = Y.doccirrus.auth.getCountryCode( user );

            // return all catalogs descriptor if catname wasn't passed
            if( catname === '' ) {
                callback( null,
                    Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                        {
                            actType: params.acttype || '',
                            country: countryCode || 'D'
                        } )
                );
            } else {
                // read the catalog JSON
                readFile( __dirname + '/assets/catalogs/' + catname, 'utf8', function( err, data ) {
                    var meta;

                    if( err ) {
                        meta = {
                            'http': {
                                'reasonPhrase': 'Katalog wurde nicht gefunden!',
                                'code': 403
                            }
                        };
                        Y.log( 'ERROR: ' + meta.http.code + ' ' + meta.http.reasonPhrase + ', ' + err, 'error', NAME );
                        ac.error( meta.http );
                    } else {
                        callback( null, JSON.parse( data ) );
                    }
                } );
            }
        },

        cataloginsert: function( ac ) {
            var
                callback = this._getCallback( ac );
            // run insert test
            Y.doccirrus.catalogindex.test( callback );
        },
        /**
         * REST call to search current catalogs.
         * Read dccatalogindex for further information.
         *
         * @method catsearch
         * @param   {Object}          ac
         */
        catsearch: function( ac ) {
            var
                callback = this._getCallback( ac );
            Y.doccirrus.catalogindex.search( ac, callback );
        },

        /**
         * REST call to get catalog tables.
         * Read dccatalogindex for further information.
         *
         * @method getTables
         * @param   {Object}          ac
         */
        getTables: function( ac ) {
            var
                callback = this._getCallback( ac );
            //
            Y.doccirrus.catalogindex.getFromTables( {
                restUser: ac.rest.user,
                locationId: ac.rest.originalparams.locationId,
                costCarrierBillingSection: ac.rest.originalparams.costCarrierBillingSection,
                costCarrierBillingGroup: ac.rest.originalparams.costCarrierBillingGroup,
                patientId: ac.rest.originalparams.patientId,
                scheinSubgroup: ac.rest.originalparams.scheinSubgroup,
                catalog: ac.rest.originalparams.catalog,
                table: ac.rest.originalparams.table,
                key: ac.rest.originalparams.key,
                term: ac.rest.originalparams.term
            }, callback );
        },
        /**
         * Public route to search for countries.
         * @param   {Object}          ac
         */
        countries: function( ac ) {
            var
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptor(
                    {
                        actType: '_CUSTOM',
                        short: 'SDCOUNTRIES',
                        country: 'D'
                    }, true ),
                callback = this._getCallback( ac );
            ac.rest.originalparams.catalog = catalog.filename;
            Y.doccirrus.catalogindex.search( ac, callback );
        },

        /**
         * REST call to check if a KT (from card) is valid. If not try to find a responsible KT through 'fusion' process.
         * This means we search a valid KT in case the attribute existenzbeendigung_vk is given.
         * If no valid KT is found, the card is invalid and false is returned.
         *
         * REST-Paramter:
         *  catalog: name of the catalog (required)
         *  ik: iknr number (required)
         *  ktab: ktab id (required)
         *  lq: Leistungs Quartal  (optional)
         *  lqFormat: Format to parse lq (default JSON date, optional)
         *
         * @method verifyKT
         * @param   {Object}          ac
         */
        verifyKT: function( ac ) {
            Y.doccirrus.api.catalog.verifyKT( {
                user: ac.rest.user,
                callback: this._getCallback( ac ),
                originalParams: ac.rest.originalparams
            } );
        },

        /**
         * attaches existing markers to an existing patient
         * rest params:
         * * patient: a patient id
         * * marker: an array of marker ids
         *
         * accepts only POSTs
         * TODO fails in case of non-existing entities or misc errors
         *
         * @method
         * @param   {Object}          ac
         */
        addMarkers: function( ac ) {
            Y.doccirrus.api.patient.addMarkers( {
                user: ac.rest.user,
                callback: this._getCallback( ac ),
                originalParams: ac.rest.originalparams
            } );
        },

        /**
         * removes a marker from an existing patient
         * rest params:
         * * patient: a patient id
         * * marker: an array of marker ids
         *
         * accepts only POSTs
         * TODO fails in case of non-existing entities or misc errors
         *
         * @method
         * @param   {Object}          ac
         */
        removeMarkers: function( ac ) {
            Y.doccirrus.api.patient.removeMarkers( {
                user: ac.rest.user,
                callback: this._getCallback( ac ),
                originalParams: ac.rest.originalparams
            } );
        },
        catalogs: function( ac ) {
            var
                meta = {http: {}, title: Y.doccirrus.i18n('general.PAGE_TITLE.CATALOG_VIEWER')},
                request = ac.http.getRequest();
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'CatalogMojit.catalogs' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            }
            else {
                ac.done( {}, meta );
            }
        }

    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-http-addon',
    'mojito-assets-addon',
    'mojito-params-addon',
    'mojito-models-addon',
    'mojito-intl-addon',
    'patient-api',
    'activity-api',
    'catalog-api',
    'dcauth',
    'dccommonutils'
]} );

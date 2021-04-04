/**
 * User: do
 * Date: 31/03/14  15:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'InvoiceMojit', function( Y, NAME ) {

    /**
     * module wide variables and constants
     * @module InvoiceMojit
     */

    const
        { masterDCFormTenant } = Y.doccirrus.utils.getConfig( 'env.json' );

    Y.namespace( 'mojito.controllers' )[NAME] = {

        invoice_nav: function( ac ) {
            var
                user = ac.http.getRequest() && ac.http.getRequest().user,
                meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.INVOICE' ), view: {id: 'InVoiceNavBinder'} },
                req = ac.http.getRequest(),
                catalogDescriptors,
                countryCode = Y.doccirrus.auth.getCountryCode( req.user );

            ac.assets.addCss( './css/InvoiceMojit.css' );
            Y.doccirrus.forms.assethelper( ac );

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.ASV ) && !Y.doccirrus.auth.hasModuleAccess( user, NAME ) ) {
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }

            if( !Y.doccirrus.auth.hasSectionAccess( user, 'InvoiceMojit.invoice_nav' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {

                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                    {
                        actType: '',
                        country: countryCode || 'D'
                    } );

                // MOJ-3453: if country has no catalogs fall back to german catalogs
                if( Y.Object.isEmpty( catalogDescriptors ) ) {
                    catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                        actType: '',
                        country: 'D'
                    } );
                }

                ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

                ac.done( {}, meta );
            }
        },
        invoiceAdmin_nav: function( ac ) {
            var
                user = ac.http.getRequest() && ac.http.getRequest().user,
                meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.CONFIGURATION' ) },
                req = ac.http.getRequest(),
                catalogDescriptors,
                countryCode = Y.doccirrus.auth.getCountryCode( req.user );

            ac.assets.addCss( './css/InvoiceMojit.css' );
            ac.assets.addJs( './js/knockout_dragdrop.js' );
            Y.doccirrus.forms.assethelper( ac );

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.ASV ) && !Y.doccirrus.auth.hasModuleAccess( user, NAME ) ) {
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }

            if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest() && ac.http.getRequest().user, 'InvoiceMojit.invoiceAdmin_nav' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {

                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                    {
                        actType: '',
                        country: countryCode || 'D'
                    } );

                // MOJ-3453: if country has no catalogs fall back to german catalogs
                if( Y.Object.isEmpty( catalogDescriptors ) ) {
                    catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                        actType: '',
                        country: 'D'
                    } );
                }

                ac.pageData.set( 'catalog-descriptors', catalogDescriptors );
                ac.pageData.set( 'masterDCFormTenant', masterDCFormTenant );

                ac.done( {}, meta );
            }
        },
        invoicefactors: function( ac ) {
            var
                callback = this._getCallback( ac ),
                user = ac.rest.user;

            function configCb( err, result ) {
                if( err || !result.length ) {
                    callback( err || 'No Configuration Found' );
                    return;
                }
                callback( null, result[0].invoicefactors );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'invoiceconfiguration',
                options: {
                    limit: 1
                }
            }, configCb );
        },
        invoicefactor: function( ac ) {
            var
                date,
                moment = require( 'moment' ),
                params = ac.rest.originalparams,
                callback = this._getCallback( ac ),
                user = ac.rest.user;

            if( !params.timestamp ) {
                callback( new Error( 'Missing Paramter: timestamp' ) );
                return;
            }

            date = moment( params.timestamp );
            if( !date || !date.isValid ) {
                callback( new Error( 'Invalid Timestamp' ) );
                return;
            }

            function configCb( err, result ) {
                var idx = null, i, start, end, factor, factor2, factors;
                if( err || !result.length ) {
                    callback( err || 'No Configuration Found' );
                    return;
                }
                factors = result[0].invoicefactors;
                factors.sort( function( a, b ) {
                    if( a.year === b.year ) {
                        if( a.quarter === b.quarter ) {
                            return 0;
                        } else {
                            return a.quarter < b.quarter ? -1 : 1;
                        }
                    } else {
                        return a.year < b.year ? -1 : 1;
                    }
                } );

                for( i = 0; i < factors.length; i++ ) {
                    factor = factors[i];
                    start = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );
                    if( factors[i + 1] ) {
                        factor2 = factors[i + 1];
                        // end of quarter before the next invoice factor quarter/year
                        end = moment( factor2.year, 'YYYY' ).quarter( +factor2.quarter ).endOf( 'quarter' ).subtract( 1, 'quarters' ).hour( 23 ).minutes( 59 ).seconds( 59 );
                    } else {
                        // end of time
                        end = null;
                    }
                    if( date.isSame( start ) || date.isAfter( start ) && (null !== end ? date.isSame( end ) || date.isBefore( end ) : true) ) {
                        idx = i;
                        break;
                    }
                }

                callback( null, idx !== null ? [factors[idx]] : [] );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'invoiceconfiguration',
                options: {
                    limit: 1
                }
            }, configCb );
        },
        getModelName: function() {
            return 'invoiceconfiguration';
        }
    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-models-addon',
        'mojito-intl-addon',
        'mojito-data-addon',
        'dcauth',
        'invoiceconfiguration-schema',
        'gkv_deliverysettings-schema',
        'catalog-api',
        'location-api',
        'gkv_deliverysettings-api',
        'gkv_deliverysettings-process'
    ]
} );

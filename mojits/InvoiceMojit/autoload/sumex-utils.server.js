/**
 * User: oliversieweke
 * Date: 29.11.18  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'sumex-utils', function( Y, NAME ) {

        const {formatPromiseResult} = require( 'dc-core' ).utils;

    // addSumexOperation -----------------------------------------------------------------------------------------------
        function addSumexOperation( method, parameters = [] ) {
            this.operations.push( {
                [method]: Object.entries( parameters ).map( entry => ({[entry[0]]: entry[1]}) )
            } );
        }

    // getSumexSolPort -------------------------------------------------------------------------------------------------
        async function getSumexSolPort( tarmedlogId ) {
            let err, result;
            let hasAccess, appCurrentPort;

            [err, result] = await formatPromiseResult( Y.doccirrus.api.appreg.get( {
                query: {appName: 'sumex'}
            } ) );

            if( err ) {
                Y.log( `SUMEX: getSumexSolPort(): error in getting Sumex appreg entry from DB - impossible to send operations for tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                throw Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
            }

            if( Array.isArray( result ) && result.length ) {
                ({hasAccess, appCurrentPort} = result[0]);
                if( !hasAccess ) {
                    err = Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
                    Y.log( `SUMEX: getSumexSolPort(): no access to the sumex sol - impossible to send operations for tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }
                if( !appCurrentPort ) {
                    err = Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
                    Y.log( `SUMEX: getSumexSolPort(): no solport found on the sumex appreg entry - impossible to send operations for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                    throw err;
                }
            } else {
                err = Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
                Y.log( `SUMEX: getSumexSolPort(): no sumex appreg entry found - impossible to send operations for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                throw err;
            }

            return appCurrentPort;
        }

        function getStaticSumexIpAndPort() {
            try {
                let {appCurrentPort, appCurrentIP} = require( `${process.cwd()}/sumex.json` );
                return { appCurrentPort, appCurrentIP };
            } catch(e) {
                // fail-safe, sumex.json not mandatory
                return {};
            }
        }

        Y.namespace( 'doccirrus' ).sumexUtils = {
            name: NAME,
            addSumexOperation,
            getSumexSolPort,
            getStaticSumexIpAndPort
        };
    },
    '0.0.1', {
        requires: ['appreg-api']
    }
);
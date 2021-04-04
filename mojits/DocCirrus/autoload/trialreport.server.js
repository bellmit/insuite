/**
 *
 * Report on the trial logins -- only on VPRC, not MVPRC
 *
 */

/*global YUI*/



YUI.add( 'dctrialreport', function( Y, NAME ) {

        const NOT_A_TRIAL = 9999;

        /**
         * trialDaysLeft
         *
         * @param {Object}  company the company (mongoose or not) document definig a company.
         * @returns {Number} the number of days left in the trial (positive number).  Can be a negative number (expired) or NOT_A_TRIAL constant.
         */
        function trialDaysLeft( company ) {
            var
                moment = require( 'moment' ),
                now = moment(),
                trialDates,
                daysLeft;

            trialDates = Y.doccirrus.schemas.company.getTrialDates( company );
            if( !trialDates.trialBegin ) {
                return NOT_A_TRIAL;
            }
            daysLeft = moment( trialDates.trialExpire ).diff( now, 'hours' ) / 24;
            daysLeft = daysLeft > 1 ? Math.floor( daysLeft ) : daysLeft; // we don't want something like 1.6 days! But like 0.5 is OK (to display in hours)
            return daysLeft;
        }

        function vprcTrialReport() {

            if( !Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isMVPRC() ) {
                // do nothing
                return;
            }

            var
                user,
                Prom = require( 'bluebird' ),
                moment = require( 'moment' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                getActiveTrialCustomers = Prom.promisify( Y.doccirrus.licmgr.getActiveTrialCustomers ),
                date = new Date().toJSON(),
                dd = date.substring(0,11)+'00:00:00.000Z',
                reportEmails = [],
                reportExpiring = [];
                //tenantEmailCache = {};

            Y.log('Generating trial report.');

            getActiveTrialCustomers().reduce( function createEmailText( prev, current ) {
                // first check the tenantId is valid
                if( /^([\da-f]){8,15}$|^0$/.exec( current.tenantId ) ) {
                    user = Y.doccirrus.auth.getSUForTenant( current.tenantId );
                    let email = (Y.doccirrus.schemas.patient.getCommunicationByType( current, 'EMAILPRIV')||Y.doccirrus.schemas.patient.getCommunicationByType( current, 'EMAILJOB'));
                    email = (email && email.value)? email.value: '~Altdaten~';
                    let daysLeft = Math.round( Number( trialDaysLeft( current ) )).toFixed(1);
                    reportEmails.push( email + '\t' + daysLeft + '\tTenant: ' + current.tenantId );
                    if( 5 >= daysLeft ) {
                        reportExpiring.push( daysLeft + ' \t' + email );
                    }
                    //tenantEmailCache[current.tenantId] = email;
                    return runDb( {
                        user: user,
                        model: 'audit',
                        query: {
                            timestamp: {$gt: new Date( dd )},
                            model: 'auth'
                        }
                    } ).then( function makeTextFromLogins( audits ) {
                        if( audits && audits.length ) {
                            let times = audits.map( function( audit ) {
                                return audit.timestamp.getHours() + ':' + audit.timestamp.getMinutes();
                            } );
                            times = times && times.join && times.join();
                            prev = prev + '\n' + email + '\t' + audits.length + ' ( ' + times + ' )';
                        }
                        return prev;
                    } );
                }
                else {
                    return prev;
                }
            }, '' ).then(
                function emailTrialReport( messageContent ) {

                    var
                        messageParams;
                    reportEmails.sort();
                    reportExpiring.sort( );
                    messageParams = {
                        serviceName: 'dcInfoService_trial',
                        user: Y.doccirrus.auth.getSUForLocal(),
                        subject: 'Trialreport ' + moment( date ).format( 'DD.MM.YYYY' ),
                        text: 'Trial Report ' + moment( date ).format( 'DD.MM.YYYY hh:mm:ss' ) + '\nLOGINS\n' + messageContent +
                              '\n\nAKTIV, IN. 5T ABLAUFEND\n  ' + reportExpiring.join( '\n' ) +
                              '\n\nAKTIV SORTIERT NACH EMAIL\n  ' + reportEmails.join( '\n' )
                    };

                    if( !messageContent ) {
                        Y.log("no audit messages found for report.", 'warn', NAME);
                        return;
                    }

                    return Y.doccirrus.email.sendEmail( messageParams );
                }
            ).then( function final() {
                    Y.log( 'Successfully sent VPRC Trial Report. ', 'info', NAME );
                }
            ).catch(function( err ){
                Y.log( 'Error in VPRC Trial Report: ' + err.toString(), 'warn', NAME );
            });
        }

        Y.namespace( 'doccirrus.monitoring' ).vprcTrialReport = vprcTrialReport;

    },
    '0.0.1', {requires: ['dcauth', 'company-schema']}
);
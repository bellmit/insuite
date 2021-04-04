/*global YUI */


YUI.add( 'jira-api', function( Y, NAME ) {
        const
            moment = require( 'moment' ),
            {formatPromiseResult} = require( 'dc-core' ).utils,
            promisify = require('util').promisify,
            needle = require( 'needle' ),
            post = promisify( needle.post ),
            dcauth = require( 'dc-core' ).auth;

        let
            config;

        /**
         * get current prc dcCustomerNo and proxy call to dcprc.searchJira
         * @param {Object} user
         * @param {Object} data
         * @param {Function} callback
         */
        async function search( {user, data, callback} ){
            Y.log('Entering Y.doccirrus.api.jira.search', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.jira.search');
            }
            if( dcauth.isDCPRC() || dcauth.isPUC() ) {
                return callback( Y.doccirrus.errors.rest( 'jiraError_01', undefined, true ) );
            }

            let [err, dcCustomerNo] = await formatPromiseResult(
                Y.doccirrus.api.practice.getDCCustomerNo( user )
            );
            if( err ) {
                Y.log(`search: Error getting dcCustomerNo: ${err.stack || err}`, 'error', NAME);
                return callback( Y.doccirrus.errors.rest( 'jiraError_02', undefined, true ) );
            }

            Y.doccirrus.https.externalPost(
                Y.doccirrus.auth.getAdminUrl( '/1/jira/:searchJira' ),
                {...data, dcCustomerNo},
                {...Y.doccirrus.auth.setInternalAccessOptions(), errDataCallback: true},
                (err, data ) => {
                    if( err ) {
                        Y.log( `search: error from DCPRC. Message: ${err}. Trace: ${err.stack}. `, 'error', NAME );

                        if( err instanceof Y.doccirrus.commonerrors.DCError ) {
                            return callback( err );
                        } else if( Y.doccirrus.errorTable.hasCode(err.code) ) {
                            return callback( {message: Y.doccirrus.errorTable.getMessage( {code: err.code, data: err.data} ), code: err.code, data: err.data} );
                        } else if( err.message ) {
                            let
                                message = "";

                            if( err.code ) {
                                message = `Error code: ${err.code}.`;
                            }

                            message += ` Error message received at datensafe: ${err.message}`;

                            return callback( {message, code: err.code, data: err.data} );
                        } else {
                            return callback({message: `Error occurred -> ${err}`});
                        }
                    }
                    //body = body && body.data ? body.data : body;
                    callback( null, data );
                }
            );
        }

        /**
         * execute searchJira from DCPRC
         * @param {Object} user
         * @param {Object} data
         * @param {Function} callback
         */
        async function searchJira( {user, data, callback} ){
            Y.log('Entering Y.doccirrus.api.jira.searchJira', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.jira.searchJira');
            }
            if( !dcauth.isDCPRC() ){
                return callback( Y.doccirrus.errors.rest( 'jiraError_03', undefined, true ) );
            }

            if(!config){
                try {
                    config = require( process.cwd() + '/jira.json' );
                } catch( e ) {
                    Y.log( `searchJira: Failed to load jira.json: ${e.stack || e}`, 'error', NAME );

                    let
                        errorMessage;

                    /**
                     * Two possible errors could occur while loading a JSON file on Node.js
                     * 1] Either a syntax error
                     * 2] Json not found at the path
                     *
                     * In first case we do not want to expose the Json file path and second error
                     * should ideally not happen
                     */
                    if( e.message ) {
                        /**
                         * If there is a syntax error in jira.json (which was the case in the past) then
                         * e.message = "/server/path/of/the/file: error message"
                         * We do not want to expose the server path and so we are extracting only the error message.
                         */
                        errorMessage = e.message.split(":")[1];

                        if( errorMessage ) {
                            errorMessage = errorMessage.trim();
                        }  else {
                            errorMessage = e.message;
                        }
                    } else {
                        errorMessage = "jira.json not found";
                    }

                    return callback( Y.doccirrus.errors.rest( 'jiraError_04', {$jiraError: errorMessage}, true ) );
                }
            }

            if( !config.url ) {
                return callback( Y.doccirrus.errors.rest( 'jiraError_04', {$jiraError: `missing 'url' key`}, true ) );
            }

            if( !config.token ) {
                return callback( Y.doccirrus.errors.rest( 'jiraError_04', {$jiraError: `missing 'token' key`}, true ) );
            }

            Y.log(`searchJira: Getting TicketLabel for ${data.dcCustomerNo}`, 'debug', NAME);
            let err, companies;
            [err, companies] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'company',
                    action: 'get',
                    query: {
                        dcCustomerNo: data.dcCustomerNo
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                })
            );
            if( err ) {
                Y.log(`searchJira: Error getting company record from DB for dcCustomerNo: ${err.stack || err}`, 'error', NAME);
                return callback( Y.doccirrus.errors.rest( 'jiraError_05', {$dcCustomerNo: data.dcCustomerNo}, true ) );
            }

            if(!companies || companies.length !== 1){
                return callback( Y.doccirrus.errors.rest( 'jiraError_06', {$dcCustomerNo: data.dcCustomerNo}, true ) );
            }
            let ticketLabel = companies[0].ticketLabel;

            //do not allow query jira without Ticket label
            if(!ticketLabel){
                Y.log(`searchJira: 'ticketLabel' not found in database for for dcCustomerNo: ${data.dcCustomerNo}`, 'warn', NAME);
                return callback( Y.doccirrus.errors.rest( 'jiraError_11', {$dcCustomerNo: data.dcCustomerNo}, true ) );
            }

            const
                space = Array.isArray( config.space ) ? config.space.join(', ') : config.space,
                projectQuery = `project in (${space || 'SUP, DCC'})`,
                organizationQuery = `labels = ${ticketLabel}`,
                typeQuery = `(labels in ("Kundenfehler", "Kundenwunsch", "Kundenservice", "Kundenauftrag") OR issuetype in ("Bug", "Kundenwunsch", "Support", "Task", "Service", "Kundenauftrag"))`;

            switch( data.queryType ){
                case 'open':
                    data.jql = `status != Closed AND ${projectQuery} AND ${organizationQuery} AND ${typeQuery}`;
                    break;
                case 'last14':
                    data.jql = `resolutiondate >= -14d AND ${projectQuery} AND ${organizationQuery} AND ${typeQuery}`;
                    break;
                default:
                    Y.log(`unknown jira query type: ${data.queryType}`, 'error', NAME);
                    return callback( Y.doccirrus.errors.rest( 'jiraError_07', {$jiraQueryType: data.queryType}, true ) );
            }

            //todo: in dev only
            //data.jql = data.jql && data.jql.replace('project = SUP', 'project = EXTMOJ');

            delete data.dcCustomerNo;
            delete data.queryType;
            delete data[0]; //remove method name - '0': 'jira/:search'

            let finalResult;

            [err, finalResult] = await formatPromiseResult( collectIssuesRecursively( config, data ) );

            if( err ) {
                Y.log(`searchJira: Error in method collectIssuesRecursively. Error: ${err}`, "error", NAME);
                return callback(err);
            }

            /**
             * Replacing
             * finalResult[index].fields.created = "YYYY-MM-DDTHH:MM:SS.SSS+0100"
             * finalResult[index].fields.updated = "YYYY-MM-DDTHH:MM:SS.SSS+0100"
             *
             * to
             * finalResult[index].fields.created = number (new Date("YYYY-MM-DDTHH:MM:SS.SSS+0100").getTime() equivalent)
             * finalResult[index].fields.updated = number
             * finalResult[index].fields.createdOrig = "YYYY-MM-DDTHH:MM:SS.SSS+0100"
             * finalResult[index].fields.updatedOrig = "YYYY-MM-DDTHH:MM:SS.SSS+0100"
             *
             * This is because safari has a bug wherein it cannot parse date with the above mentioned format (i.e. new Date(format) === NaN)
             *
             * So, to get a consistent results and become browser agnostic we are returning the getTime() equivalent so that all the
             * browsers are able to parse new Date(no of milliseconds) correctly
             */
            if( Array.isArray(finalResult) && finalResult.length ) {
                for( const issueObj of finalResult ) {
                    if( issueObj && issueObj.fields ) {
                        if( issueObj.fields.created && typeof issueObj.fields.created === "string" ) {
                            const createdDate = moment(issueObj.fields.created);

                            if( createdDate.isValid() ) {
                                issueObj.fields.createdOrig = issueObj.fields.created; // Keeping original for debugging if any issue arise
                                issueObj.fields.created = +createdDate;
                            }
                        }

                        if( issueObj.fields.updated && typeof issueObj.fields.updated === "string" ) {
                            const updatedDate = moment(issueObj.fields.updated);

                            if( updatedDate.isValid() ) {
                                issueObj.fields.updatedOrig = issueObj.fields.updated; // Keeping original for debugging if any issue arise
                                issueObj.fields.updated = +updatedDate;
                            }
                        }
                    }
                }
            }

            callback( null, { issues: finalResult } );
        }

        /**
         * According to the issue -> https://jira.atlassian.com/browse/JRACLOUD-67570.
         * Jira API has a limit of tickets that can be found via api call. To handle this
         * issue, you need to specify startAt parameter and pagination api (if you adding UI changes).
         * This function will collect recursively all issues that was found during query execution (actual number in body.total)
         *
         * It has limit, if more that 1000 tickets will be found - function won't return more.
         * @param {Object} config - Jira config (credentials, url)
         * @param {Object} data - JQL data to receive issues
         * @param {Number} attempts - number of attempts, increment on every call. If 200 - return from function (one call - max 50 issues)
         * @param {Array} finalResult - final results with the tickets
         * @returns {Promise.<Array>} in case of success, status code in case of error
         */
        async function collectIssuesRecursively( config, data, attempts = 0, finalResult = [] ) {
            let [err, results] = await formatPromiseResult(
                post(config.url, data, {
                    headers: {
                        Authorization: `Bearer ${config.token}`
                    },
                    json: true
                })
            );

            if( err ) {
                Y.log(`collectIssuesRecursively: Error while fetching posting data on attempt = ${attempts+1} to jira api server. Error message: ${err}. Error stack: ${err.stack}`, "error", NAME);
                throw Y.doccirrus.errors.rest( 'jiraError_10', {$jiraServerError: err.message, $attempt: attempts+1}, true );
            }

            if( !results ) {
                Y.log(`collectIssuesRecursively: Empty result received on posting to URL: ${config.url} on attempt = ${attempts+1}. Expected response`, "warn", NAME);
                throw Y.doccirrus.errors.rest( 'jiraError_09', {$attempt: attempts+1}, true );
            }

            if ( results.statusCode === 200 ) {
                let body = results.body;
                finalResult.push( ...body.issues );
                if ( ( body.total || 0 ) > finalResult.length || attempts > 200 ) {
                    /**
                     * Note: No need to use formatPromiseResult as the calling function has that protection to handle
                     * exception being thrown by this await and we do not want to handle error here anyway because of recursion
                     */
                    await collectIssuesRecursively( config, { ...data, startAt: body.issues.length }, ++attempts, finalResult );
                }
                if ( body.total !== finalResult.length ) {
                    Y.log( `We expected to receive ${body.total}, but we received only ${finalResult.length}. Number of attempts (call to Jira API) ${attempts}`, 'warn', NAME );
                }
                return finalResult;
            } else {
                /**
                 * In case of error scenarios it is observer that generally JIRA server responds as below:
                 *
                 * results.statusCode = <error code>
                 * results.body = {
                 *     errorMessages: ["error message."],
                 *     warningMessages: ["warning message"]
                 * }
                 *
                 * But this is inconsistent as for some errors (especially 401) it directly responds with HTML
                 * string in results.body so it is difficult to predict. In cases where a HTML string is sent as a response
                 * then set a generic error message with error code received from JIRA server so that we atleast know on the UI
                 * why the server rejected the request
                 */

                let
                    jiraServerError = `statusCode = ${results.statusCode}.`;

                if( results.body && typeof results.body === "object" ) {
                    Y.log(`collectIssuesRecursively: received error as object from JIRA api server`, "warn", NAME);

                    if( Array.isArray(results.body.errorMessages) && results.body.errorMessages.length ) {
                        jiraServerError += ` errorMessage = ${results.body.errorMessages.join(",")}`;
                    }

                    if( Array.isArray(results.body.warningMessages) && results.body.warningMessages.length ) {
                        jiraServerError += ` warningMessage = ${results.body.warningMessages.join(",")}`;
                    }
                } else if( results.body && typeof results.body === "string" ) {
                    if( results.headers && results.headers["x-seraph-loginreason"] ) {
                        jiraServerError += ` Error reason: ${results.headers["x-seraph-loginreason"]}`;
                        Y.log(`collectIssuesRecursively: HTML error received from JIRA server. Error reason = ${results.headers["x-seraph-loginreason"]}`, "warn", NAME);
                    } else {
                        Y.log(`collectIssuesRecursively: HTML error received from JIRA server.`, "warn", NAME);
                    }
                }

                Y.log(`collectIssuesRecursively: received error response from POST URL: ${config.url}. error message = ${jiraServerError}`, "warn", NAME);
                throw Y.doccirrus.errors.rest( 'jiraError_08', {$jiraServerError: jiraServerError}, true );
            }
        }

        Y.namespace( 'doccirrus.api' ).jira = {
            name: NAME,
            search,
            searchJira
        };
    },
    '0.0.1',
    {
        requires: [
            'dccommunication'
        ]
    }
);
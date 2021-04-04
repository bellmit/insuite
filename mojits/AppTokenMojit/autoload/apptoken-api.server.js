/**
 * User: pi
 * Date: 18/01/2018  11:25
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'apptoken-api', function( Y, NAME ) {

        const
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            { sortArrayOfObjectsByKey, convertMongoRegExpToJsRegExp } = Y.doccirrus.commonutils;

        /**
         * @module apptoken-api
         */

        /**
         * Handles the "Entering..." and "Exiting..." logs
         * @param {Object} args
         * @param {Function} args.callback
         * @param {String} functionName
         * @returns {Function} callback
         */
        function logEntryAndExit( args, functionName ) {
            let {callback} = args || {};
            Y.log(`Entering Y.doccirrus.api.apptoken.${functionName}`, 'info', NAME);
            return require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, `Exiting Y.doccirrus.api.apptoken.${functionName}`);
        }

        /**
         * Logs the execution of a function
         * @param {String} functionName e.g. order_66
         * @param {String} level i.e. 'info', 'debug', 'warn' or 'error'
         */
        function logExecution(functionName, level = 'info') {
            Y.log(`Executing Y.doccirrus.api.apptoken.${functionName}`, level, NAME);
        }

        /**
         * @method get
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.apptoken
         *
         * @return {Promise}
         */
        function getEntry( args ) {
            const
                {user, query, options} = args,
                command = {
                    action: 'get',
                    model: 'apptoken',
                    user,
                    query,
                    options
                };
            if( args.callback ) {
                const callback = logEntryAndExit( args, 'getEntry' );
                Y.doccirrus.mongodb.runDb( command, callback );
            } else {
                logExecution( 'getEntry' );
                return Y.doccirrus.mongodb.runDb( command );
            }
        }

        /**
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.apptoken
         */
        function post( args ) {
            Y.log('Entering Y.doccirrus.api.apptoken.post', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.apptoken.post');
            }
            const
                { user, options, callback, data } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'apptoken',
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( data ),
                options: options
            }, callback );
        }

        /**
         * @method put
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.query
         * @param {Object} [args.fields]
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.apptoken
         */
        function put( args ) {
            Y.log('Entering Y.doccirrus.api.apptoken.put', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.apptoken.put');
            }
            const
                { user, query, options, callback, fields, data } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'apptoken',
                user: user,
                query: query,
                fields: fields || Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data ),
                options: options
            }, callback );
        }

        /**
         * @method delete
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.apptoken
         */
        function deleteEntry( args ) {
            const
                { user, query, options, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'apptoken',
                user: user,
                query: query,
                options: options
            }, callback );
        }

        function getAppTokens( args ) {
            Y.log('Entering Y.doccirrus.api.apptoken.getAppTokens', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.apptoken.getAppTokens');
            }
            const
                { user, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'apptoken',
                user
            }, callback );
        }

        async function checkTokenEntry( callback ) {  //jshint ignore:line

            let error,
                result,
                builtinAppNames = Y.doccirrus.schemas.apptoken.builtinAppNames,
                builtinType = Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN,
                appNameArr = Object.values( builtinAppNames );

            [ error, result ] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'apptoken',
                    query: { appName: { $in: appNameArr } },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );
            if( error ) {
                Y.log( `checkTokenEntry: Error while querying appToken for "BUILTIN" token type. Error: ${error} `, "error", NAME );
                return callback();
            }

            if( result ) {
                let postData = [];

                Object.keys( builtinAppNames ).forEach( key => {

                    let data = result.some( res => {
                        return res.appName === builtinAppNames[ key ];
                    } );

                    if( !data ) {
                        postData.push( {
                            "appName": builtinAppNames[ key ],
                            "type": builtinType,
                            "token": Y.doccirrus.comctl.getRandomString( 64, '#aA' )
                        } );
                    }
                } );

                if( postData && postData.length ) {

                    Y.doccirrus.filters.setSkipCheck( postData, true );

                    [ error, result ] = await formatPromiseResult( //jshint ignore:line
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'apptoken',
                            user: Y.doccirrus.auth.getSUForLocal(),
                            data: postData
                        } )
                    );
                    if( error ) {
                        Y.log( `checkTokenEntry: Error while creating appToken for "BUILTIN" token type. Error: ${error} `, "error", NAME );
                        return callback();
                    }

                    if( result && result.length ) {
                        Y.log( `checkTokenEntry: Created ${result.length} tokens of type "BUILTIN".`, "info", NAME );
                    }
                }
            }
            callback();
        }

        /**
         * Populates tokens with:
         *  1. usedByCompanies
         * @method getPopulatedAppTokens
         * @for Y.doccirrus.api.apptoken
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback - when successful returns e.g.
            {
                count: 4,
                query: {},
                result: [
                    {
                        _id: '#####',
                        type: 'BUILTIN',
                        appName: 'app',
                        token: '$$$$#',
                        title: 'App'
                    }
                ]
            }
         */
        function getPopulatedAppTokens( args ) {
            Y.log('Entering Y.doccirrus.api.apptoken.getPopulatedAppTokens', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.apptoken.getPopulatedAppTokens');
            }
            const
                { user, query, options, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.apptoken.get( {
                        user,
                        query,
                        options,
                        callback: next
                    } );
                },
                function( results, next ) {
                    const
                        appTokens = results.result ? results.result : results;
                    if( appTokens && appTokens.length ) {
                        return Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'company',
                            action: 'get',
                            query: {
                                'licenseScope.solutions': { $in: appTokens.map( item => item.appName ) }
                            },
                            options: {
                                select: {
                                    coname: 1,
                                    dcCustomerNo: 1,
                                    licenseScope: 1
                                }
                            }
                        }, ( err, companies ) => {
                            const
                                appTokensMap = new Map();
                            if( err ) {
                                return next( err );
                            }
                            appTokens.forEach( item => {
                                appTokensMap.set( item.appName, item );
                            } );
                            companies.forEach( company => {
                                company.licenseScope.forEach( licenseScope => {
                                    licenseScope.solutions.forEach( solution => {
                                        const
                                            appToken = appTokensMap.get( solution );
                                        if( appToken ) {
                                            appToken.usedByCompanies = appToken.usedByCompanies || [];
                                            appToken.usedByCompanies.push( {
                                                _id: company._id.toString(),
                                                coname: company.coname,
                                                dcCustomerNo: company.dcCustomerNo
                                            } );
                                        }
                                    } );
                                } );
                            } );
                            next( null, results );
                        } );
                    }
                    return setImmediate( next, null, results );
                }
            ], callback );

        }

        /**
         * Cleans the data and creates rows for each company
         * with the license to use the sol
         *
         * @private
         * @param   {Object}            args
         * @param   {Array}             args.appTokens
         * @param   {Object}            args.companies
         *
         * @return {Array}
         */
        function _createAppTokenTableData( args ) {
            // create Map for easier access in the main loop
            const
                {appTokens, companies, appNames} = args,
                rows = [],
                appNamesAdded = new Set(),
                appTokensMap = new Map();

            appTokens.forEach( ( item ) => {
                appTokensMap.set( item.appName, item );
            } );

            // main loop to create the rows
            for( let {licenseScope, coname, dcCustomerNo, appsMetaData, ...company} of companies ) {
                let licenseScopeObj = licenseScope.find( ( item ) => item.solutions && item.solutions.length );

                if( !licenseScopeObj ) {
                    continue;
                }

                for( let appName of licenseScopeObj.solutions ) {
                    let
                        appTokenObj = appTokensMap.get( appName ),
                        {version, vendor, latestReleaseDate} = appsMetaData.find( ( appObj ) => appObj.appName === appName ) || {};

                    if( appTokenObj ) {
                        appNamesAdded.add( appName );
                        rows.push( {
                            _id: appTokenObj._id.toString(),
                            appName: appTokenObj.appName || '',
                            title: appTokenObj.title || '',
                            description: appTokenObj.description || '',
                            companyData: {
                                _id: company._id.toString(),
                                coname,
                                dcCustomerNo
                            },
                            activatedOn: company.systemId,
                            version: version || '-',
                            vendor: vendor || '-',
                            latestReleaseDate: latestReleaseDate || '',
                            token: appTokenObj.token
                        } );
                    }
                }
            }

            // add tokens without an associated company
            const appNamesDifference = appNames.filter( ( appName ) => !appNamesAdded.has( appName ) );

            if( appNamesDifference.length ) {
                for( let appName of appNamesDifference ) {
                    let appTokenObj = appTokensMap.get( appName );
                    rows.push( {
                        appName: appTokenObj.appName || '',
                        title: appTokenObj.title || '',
                        description: appTokenObj.description || '',
                        companyData: {},
                        activatedOn: '',
                        version: '',
                        vendor: '',
                        latestReleaseDate: '',
                        token: appTokenObj.token
                    } );
                }
            }

            return rows;
        }

        /**
         * Returns a list of object keys safely
         * @param {Object} obj
         *
         * @return {Array}
         * @private
         */
        function _getObjectKeys( obj ) {
            if( typeof obj === 'object' && obj !== null ) {
                return Object.keys( obj );
            }
            return [];
        }

        /**
         * Removes the query filters that are NOT in the "apptoken" schema
         * @param {Object} query
         * @param {Array} schemaFields
         * @returns {Object}
         * @private
         */
        function _removeNonSchemaFields( query, schemaFields ) {
            query = {...query};
            let queryFields = _getObjectKeys( query );
            for( let field of queryFields ) {
                if( !schemaFields.includes( field ) ) {
                    delete query[field];
                }
            }
            return query;
        }

        /**
         * Returns the query filter names that are NOT in the "apptoken" schema
         *
         * @param {Object} query
         * @param {Array} schemaFields
         * @returns {Array}
         * @private
         */
        function _getNonAppTokenSchemaFields(query, schemaFields) {
            query = {...query};
            const nonAppTokenFields = [];
            let queryFields = _getObjectKeys( query );
            for( let field of queryFields ) {
                if( !schemaFields.includes( field ) ) {
                    nonAppTokenFields.push(field);
                }
            }
            return nonAppTokenFields;
        }

        /**
         * Filters the table rows by companyData.coname or companyData.dcCustomerNo
         * @param {Array} tableRows
         * @param {Object} companyDataFilter
         * @returns {Array}
         * @private
         */
        function _filterRowsByCompanyData( {tableRows, companyDataFilter} ) {
            logExecution( '_filterRowsByCompanyData', 'debug' );
            let regExp = convertMongoRegExpToJsRegExp( companyDataFilter.toJSON() );
            return tableRows.filter( function _filterByCompanyName( row ) {
                let match = regExp.test( row.companyData.coname );
                if( !match ) {
                    match = regExp.test( row.companyData.dcCustomerNo );
                }
                return match;
            } );
        }

        /**
         * Filters the table rows by the fields that are not included
         * in the apptoken schema i.e. could not be filtered by db call
         * @param {Array} tableRows
         * @param {String} filterField
         * @param {Object} regex
         * @returns {Array}
         * @private
         */
        function _filterRowsByNonAppTokenField( {tableRows, filterField, regex} ) {
            logExecution( '_filterRowsByNonAppTokenField', 'debug' );
            let regExp = convertMongoRegExpToJsRegExp( regex.toJSON() );
            return tableRows.filter( function _filterByCompanyName( row ) {
                return regExp.test( row[filterField] );
            } );
        }

        /**
         * Handles populating the DCPRC app token management table
         *
         * Note: when companyData filter is applied the filtering
         * happens after all the data is retrieved from the database,
         * making it a little bit slower while maintaining the UI
         *
         * @method getPopulatedAppTokensByCompany
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Object} args.callback
         * @returns {Promise<Object|callback|*>}
         */
        async function getPopulatedAppTokensByCompany( args ) {
            Y.log( 'Entering Y.doccirrus.api.apptoken.getPopulatedAppTokensByCompany', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.apptoken.getPopulatedAppTokensByCompany' );
            }

            const
                {user, query, options: {limit, skip, ...options}, callback} = args,
                companyDataName = 'companyData',
                apptokenSchemaFields = _getObjectKeys( Y.doccirrus.schemas.apptoken.types.AppToken_T ),
                nonAppTokenFilterFields = _getNonAppTokenSchemaFields( query, apptokenSchemaFields );

            let error, result, tableRows;

            Y.log( `getPopulatedAppTokensByCompany called with query: ${JSON.stringify( query )} and options: ${JSON.stringify( options )}`, 'debug', NAME );

            [error, result] = await formatPromiseResult(
                Y.doccirrus.api.apptoken.get( {
                    user,
                    query: _removeNonSchemaFields( query, apptokenSchemaFields ),
                    options
                } )
            );

            if( error ) {
                Y.log( 'Error getting apptoken data to populate App Token table', 'error', NAME );
                return handleResult( error, result, callback );
            }

            const appTokens = result.result || result;

            if( !appTokens || !appTokens.length ) {
                Y.log( 'No app tokens found', 'info', NAME );
                return handleResult( error, [], callback );
            }

            const
                appNames = appTokens.map( item => item.appName ),
                command = {
                    user,
                    model: 'company',
                    action: 'get',
                    query: {
                        'licenseScope.solutions': {$in: appNames}
                    },
                    options: {
                        select: {
                            coname: 1,
                            dcCustomerNo: 1,
                            licenseScope: 1,
                            systemId: 1,
                            appsMetaData: 1
                        }
                    }
                };

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( command )
            );

            if( error ) {
                Y.log( 'Error getting company data to populate App Token table', 'error', NAME );
                return handleResult( error, result, callback );
            }

            tableRows = _createAppTokenTableData( {appTokens, companies: result, appNames} );

            const count = tableRows.length;

            // custom filter for fields not filtered by db call
            if( nonAppTokenFilterFields.length ) {
                let filterField, companyDataFilter, regex;

                for( filterField of nonAppTokenFilterFields ) {
                    if( filterField === companyDataName ) {
                        // filters table by company name if present
                        companyDataFilter = query[filterField].$regex;
                        tableRows = _filterRowsByCompanyData( {tableRows, companyDataFilter} );
                        continue;
                    }

                    regex = query[filterField].$regex;
                    tableRows = _filterRowsByNonAppTokenField( {tableRows, filterField, regex} );
                }
            }

            // sorts table
            if( options.sort ) {
                let keyName = Object.keys( options.sort ).shift();
                let reversed = (options.sort[keyName] < 0);
                if( keyName === companyDataName ) {
                    tableRows = sortArrayOfObjectsByKey( {
                        array: tableRows,
                        keyName: 'coname',
                        reversed,
                        childOf: companyDataName
                    } );
                } else {
                    tableRows = sortArrayOfObjectsByKey( {array: tableRows, keyName, reversed} );
                }
            }

            // custom paging
            if( limit && skip ) {
                Y.log( `getPopulatedAppTokensByCompany: custom paging with limit ${limit} and skip ${skip}`, 'debug', NAME );
                tableRows = tableRows.slice( skip, (limit + skip) );
            }

            return handleResult( error, {
                count,
                query,
                result: tableRows
            }, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class apptoken
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).apptoken = {

            name: NAME,
            get: getEntry,
            put,
            post,
            "delete": deleteEntry,
            getAppTokens,
            getPopulatedAppTokens,
            getPopulatedAppTokensByCompany,
            runOnStart: checkTokenEntry

        };

    },
    '0.0.1', { requires: [] }
);

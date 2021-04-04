/**
 * User: do
 * Date: 16/01/18  13:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


'use strict';

YUI.add( 'compareutils', function( Y/*, NAME*/ ) {

        var
            _ = Y.doccirrus.commonutils.getLodash(),
            moment = Y.doccirrus.commonutils.getMoment(),
            getObject = Y.doccirrus.commonutils.getObject,
            types = {
                'String': [String, 'String', 'string'],
                'Date': [Date, 'Date', 'date'],
                'Number': [String, 'Number', 'number'],
                'Boolean': [String, 'Boolean', 'boolean']
            };

        function getComparator( args ) {
            var
                pathsToCompare = [],
                schema = args.schema,
                whiteList = args.whiteList,
                blackList = args.blackList;

            function concatPath() {
                var args = [].slice.call( arguments ).filter( Boolean );
                return args.join( '.' );
            }

            function addPath( path, type, parentPath, label, isEnum ) {
                pathsToCompare.push( {
                    type: type,
                    path: path,
                    parentPath: parentPath,
                    label: label,
                    isEnum: isEnum
                } );
            }

            function getConstructorFromType( type ) {
                if( 0 === type.indexOf( '[' ) ) {
                    type = type.substring( 1, type.length - 1 );
                }
                return types[type] && types[type][0];
            }

            function getTestTypeArray( type ) {
                var testArr;

                testArr = types[type];

                return testArr;
            }

            function isArrayOf( config, type ) {
                var configType = config && config.type && config.type[0],
                    testArr;

                if( 'COMPLEX' === type.toUpperCase() && Array.isArray( config ) && config.dctype ) {
                    return true;
                }

                testArr = getTestTypeArray( type );

                return testArr && -1 !== testArr.indexOf( configType );
            }

            function is( config, type ) {
                var configType = config && config.type,
                    testArr = getTestTypeArray( type );

                return -1 !== testArr.indexOf( configType );
            }

            function checkPath( path, parentPath ) {
                var config = getObject( path, schema );

                parentPath = parentPath || null;

                if( isArrayOf( config, 'String' ) ) {
                    addPath( path, '[String]', parentPath, config.i18n, Boolean( config.enum ) );

                } else if( isArrayOf( config, 'Number' ) ) {

                    addPath( path, '[Number]', parentPath, config.i18n );

                } else if( isArrayOf( config, 'Boolean' ) ) {

                    addPath( path, '[Boolean]', parentPath, config.i18n );

                } else if( isArrayOf( config, 'COMPLEX' ) ) {
                    iterateSchemaPath( concatPath( path, '0' ), path );

                } else if( is( config, 'String' ) ) {

                    addPath( path, 'String', parentPath, config.i18n, Boolean( config.enum ) );

                } else if( is( config, 'Date' ) ) {

                    addPath( path, 'Date', parentPath, config.i18n );

                } else if( is( config, 'Number' ) ) {

                    addPath( path, 'Number', parentPath, config.i18n );

                } else if( is( config, 'Boolean' ) ) {

                    addPath( path, 'Boolean', parentPath, config.i18n );

                } else if( config && config.type === 'any' ) {

                    addPath( path, 'any', parentPath, config.i18n );

                }
            }

            function isValidPath( path ) {
                if( blackList && blackList.length ) {
                    return !blackList.some( function( bPath ) {
                        return 0 === bPath.indexOf( path );
                    } );
                } else if( whiteList && whiteList.length ) {
                    return whiteList.some( function( wPath ) {
                        return 0 === wPath.indexOf( path );
                    } );
                }
                return true;
            }

            function iterateSchemaPath( path, parentPath ) {
                var schemaPart = path ? getObject( path, schema ) : schema;

                Object.keys( schemaPart ).filter( function( key ) {
                    var p = concatPath( path, key );
                    return isValidPath( p );
                } ).forEach( function( key ) {
                    checkPath( concatPath( path, key ), parentPath );
                } );

            }

            function compareArray( aArr, bArr, type ) {

                var intersection,
                    Constructor = getConstructorFromType( type );

                aArr = aArr || [];
                bArr = bArr || [];

                aArr = aArr.map( Constructor );
                bArr = bArr.map( Constructor );
                intersection = _.intersection( aArr, bArr ).length;
                return intersection === aArr.length === bArr.length;
            }

            function compareDate( aVal, bVal ) {
                var
                    aDate = aVal ? moment( aVal ) : null,
                    bDate = bVal ? moment( bVal ) : null;

                if( !aDate && !bDate ) {
                    return true;
                }

                if( (!aDate && bDate) || (aDate && !bDate) ) {
                    return false;
                }

                return aDate.isSame( bDate );
            }

            function compareValue( aVal, bVal, type ) {
                var Constructor = getConstructorFromType( type );
                if( 'Date' === type ) {
                    return compareDate( aVal, bVal );
                }

                if( 'String' === type ) {
                    return Constructor( aVal ).trim() === Constructor( bVal ).trim();
                }

                return Constructor( aVal ) === Constructor( bVal );
            }

            iterateSchemaPath();

            return {
                pathsToCompare: pathsToCompare,
                compare: function( a, b ) {
                    // TODO: not working for nested complex arrays

                    var pathsToCompare = this.pathsToCompare,
                        arrayPaths = {},
                        results = {values: [], nDiffs: 0};

                    pathsToCompare.forEach( function( pathToCompare ) {
                        var parentPath = pathToCompare.parentPath,
                            isEnum = pathToCompare.isEnum,
                            arrayPath, i, rightSideOfPath, refinedComplexPath;

                        function check( refinedPath, arrayIndex ) {
                            var path = refinedPath || pathToCompare.path,
                                aVal = getObject( path, a ) || null,
                                bVal = getObject( path, b ) || null,
                                changed,
                                label = pathToCompare.label,
                                type = pathToCompare.type;

                            if( 0 === type.indexOf( '[' ) ) {
                                changed = !compareArray( aVal, bVal, type );
                            } else {
                                changed = !compareValue( aVal, bVal, type );
                            }

                            if( changed ) {
                                results.nDiffs++;
                            }

                            results.values.push( {
                                aVal: aVal,
                                bVal: bVal,
                                type: type,
                                changed: changed,
                                label: label,
                                path: path,
                                parentPath: parentPath,
                                index: arrayIndex,
                                isEnum: isEnum
                            } );
                        }

                        if( parentPath ) {
                            if( !arrayPaths[parentPath] ) {
                                // TODO: add option to modify array to make sure that array contents of specific types are on similar index
                                arrayPath = arrayPaths[parentPath] = {
                                    aLen: getObject( parentPath, a ),
                                    bLen: getObject( parentPath, b )
                                };
                                arrayPath.aLen = arrayPath.aLen && arrayPath.aLen.length || 0;
                                arrayPath.bLen = arrayPath.bLen && arrayPath.bLen.length || 0;
                                arrayPath.maxLen = arrayPath.aLen > arrayPath.bLen ? arrayPath.aLen : arrayPath.bLen;
                            } else {
                                arrayPath = arrayPaths[parentPath];
                            }

                            rightSideOfPath = pathToCompare.path.substring( parentPath.length, pathToCompare.path.length ).replace( /\.(\d+)\./, '' );
                            for( i = 0; i < arrayPath.maxLen; i++ ) {
                                refinedComplexPath = (parentPath + '.' + i + '.' + rightSideOfPath);
                                check( refinedComplexPath, i );
                            }
                        } else {

                            check();
                        }

                    } );

                    return results;

                },
                toString: function() {
                    var str = '';
                    this.pathsToCompare.forEach( function( path ) {
                        str += ([path.path, path.parentPath, path.type].join( ' :: ' ) + '\n');
                    } );
                    return '\n' + str;
                }
            };

        }

        function rearrangeArrayByType( aObj, bObj, arrayAttrName, typeAttrName, allowedTypes ) {
            const
                indices = {},
                newArray = [],
                bObjArray = bObj[arrayAttrName] || [];

            let aObjArray = (aObj[arrayAttrName] || []);

            if( allowedTypes && allowedTypes.length ) {
                aObjArray = aObjArray.filter( arrayItem => {
                    return -1 !== allowedTypes.indexOf( arrayItem[typeAttrName] );
                } );
            }

            bObjArray.forEach( ( arrayItem, idx ) => {
                indices[arrayItem[typeAttrName]] = idx;
            } );

            Object.keys( indices ).forEach( ( type, idx ) => {
                aObjArray = aObjArray.filter( ( arrayItem ) => {
                    if( arrayItem[typeAttrName] === type ) {
                        newArray[idx] = arrayItem;
                        return false;
                    }
                    return true;
                } );
            } );
            const bObjArrayLength = bObjArray.length;

            aObjArray.forEach( ( arrayItem, idx ) => {
                newArray[bObjArrayLength + idx] = arrayItem;
            } );

            aObj[arrayAttrName] = newArray;
        }


        Y.namespace( 'doccirrus' ).compareutils = {
            getComparator: getComparator,
            rearrangeArrayByType: rearrangeArrayByType
        };

    },
    '0.0.1', {
        requires: ['dccommonutils']
    }
);

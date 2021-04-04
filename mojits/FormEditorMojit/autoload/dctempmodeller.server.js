/**
 * restructure models automatically
 *
 * dumps output into logs
 *
 * once-off assistant code.
 *
 * @author: rw
 * @date: 2014-02-16
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/



YUI.add( 'dctempmodeller', function( /*Y, NAME*/ ) {

//        var
//            treatedTypes = [],
//            ignoreKeys = ['_lib',
//                'version',
//                'translate' ],
//            PATH = '../assets/schema/';
//
//        /**
//         *
//         * @param obj target object to copy into
//         * @param e  enum object
//         */
//        function translateReducedEnum( obj, e ) {
//            obj.version = e.version;
//            if( e.translate ) {
//                obj.list = [];
//                Y.Object.each( e.translate, function transl( val, key ) {
//                    var
//                        o = {};
//                    o.val = key;
//                    o['-en'] = val.en;
//                    o['-de'] = val.de;
//                    obj.list.push( o );
//                } );
//            }
//            delete obj.enum;
//        }
//
//        function translateEqEnum( obj ) {
//            obj.list = [];
//            // auto translate, creating new structure
//            obj.enum.forEach( function( val ) {
//                var
//                    o = {};
//                o.val = val;
//                o['-en'] = val.toLowerCase();
//                o['-de'] = o['-en'];
//                obj.list.push( o );
//            } );
//            delete obj.enum;
//        }
//
//        function getTranslatedDefn( key, val, target, overlap ) {
//            var o;
//            if( target && 'ext' === target.complex ) {
//                // these pointers do not change
//                return;
//            }
//            if( -1 === ignoreKeys.indexOf( key ) ) {
//                //                    Y.log( 'MAIN SCHEMA: \n' + Y.doccirrus.utils.safeStringify( main ));
//                //                    Y.log( 'REDUCED SCHEMA: \n' + JSON.stringify( val ) );
//
//                // insert the labels directly, if present otherwise note the overlap (new composite field)
//                if( !val || !val.label ) {
//                    target['-en'] = key;
//                    target['-de'] = key;
//                } else if( target ) {
//                    target['-en'] = val.label.en;
//                    target['-de'] = val.label.de;
//                } else {
//                    // overlap list
//                    o = {};
//                    o[key] = Y.merge( {}, val );
//                    o[key]['-en'] = val.label.en;
//                    o[key]['-de'] = val.label.de;
//                    delete o[key].label;
//                    overlap.push( o );
//                }
//            }
//        }
//
//        function analyseModel( file ) {
//            var
//                rt,
//                lib,
//                schema,
//                newReduced,
//                overlap = [],
//                type = file.split( '.' )[0],
//                reduced = require( PATH + file );
//
//            rt = reduced[type];
//            Y.log( 'Checking ' + type + '   in  ' + rt._lib, 'info', NAME );
//
//            if( !rt._lib ) {
//                newReduced = Y.merge( {}, rt );
//                newReduced._version = rt.version;
//                delete newReduced.version;
//                // iterate over the  reduced set
//                Y.Object.each( newReduced, function( val, key ) {
//                    // change to translated defn
//                    getTranslatedDefn( key, val, newReduced[key], [] );
//                    delete newReduced[key].label;
//                } );
//                // clean up
//                Y.log( '\n======================Converted main schema:' + type + '========================' );
//            } else {
//                lib = rt._lib;
//
//                // exceptional circumstance
//                if( 'Event_T' === type ) {
//                    // warning in this case we have two different type names
//                    // - one in the schema and one in the reduced schema
//                    lib = 'calendar';
//                    type = 'Repetition_T';
//                }
//                schema = Y.doccirrus.schemas[lib].types[type];
//
//                if( !schema ) {
//                    Y.log( type + '  has wrong _lib defined.  ' );
//                    return;
//                }
//
//                if( schema.enum || rt.enum ) {
//                    translateReducedEnum( schema, rt );
//                } else {
//                    newReduced = {};
//                    newReduced._version = rt.version;
//
//                    // iterate over the  reduced set
//                    Y.Object.each( rt, function( val, key ) {
//
//                        getTranslatedDefn( key, val, schema[key], overlap );
//                        // pointer in the new method
//                        if( -1 === ignoreKeys.indexOf( key ) ) {
//                            newReduced[key] = {
//                                schema: lib,
//                                st: type,
//                                path: key,
//                                type: val.type
//                            };
//                            overlap.unshift( newReduced );
//                            newReduced = Y.merge.apply( this, overlap );
//                        }
//                    } );
//                    // finally go through and check for elements without labels in schema and insert them
//                    Y.Object.each( schema, function getUnlabelledElts( val, key ) {
//
//                        if( !val['-en'] ) {
//                            getTranslatedDefn( key, {}, schema[key], [] );
//                        }
//
//                    } );
//                }
//
//                // save in the name of treated schema types
//                treatedTypes.push( lib + '.' + type );
//
//                // do something with the completed schema type
//                Y.log( '\n======================Converted main schema:' + type + '========================\n' +
//                       '{ "' + type + '":\n' +
//                       Y.doccirrus.utils.safeStringify( schema, true, Y.doccirrus.schemas[rt._lib].types ) +
//                       '}\n'
//                );
//            }
//            if( newReduced ) {
//                Y.log( '\n----------------------Converted reduced schema:------------------------\n' +
//                       '{ "' + type + '":\n' +
//                       Y.doccirrus.utils.safeStringify( newReduced, true ) +
//                       '}\n'
//                );
//            }
//
//        }
//
//        //        function convertSchema( types, typeName ) {
//        //            if( -1 === treatedTypes.indexOf( typeName ) ) {
//        //                if( types.enum ) {
//        //                    translateEqEnum( types );
//        //                } else {
//        //                    Y.Object.each( types, function( val, key ) {
//        //                            getTranslatedDefn( key, {}, val, [] );
//        //                        }
//        //                    );
//        //                }
//        //            }
//        //            else {
//        //                Y.log( 'REF -->' + typeName );
//        //            }
//        //        }
//
//        function linkSchema( types, typeName, lib ) {
//            var
//                result = '';
//            if( typeName.indexOf( '_E', typeName.length - 2 ) === -1 ) {
//                if( -1 === treatedTypes.indexOf( typeName ) ) {
//                    Y.Object.each( types, function( val, key ) {
//                            result = result.concat( JSON.stringify(
//                             {
//                                fieldCode: '',
//                                path: key,
//                                schema: lib,
//                                st: typeName,
//                                type: val.type,
//                                ruleIds: []
//                            } ) );
//                            result += ',\n'
//                        }
//                    );
//                } else {
//                    Y.log( 'REF -->' + typeName );
//                }
//            }
//            return result;
//        }
//
//        function analyseModels( /*err, list */ ) {
//            Y.log( analyseModel );
//            //            var i;
//            //            if( err ) {
//            //                Y.log( 'Oops:  ' + err );
//            //                return;
//            //            }
//            //            for( i = 0; i < list.length; i++ ) {
//            //                analyseModel( list[i] );
//            //            }
//            //
//            //            Y.log( 'Treated: ' + JSON.stringify( treatedTypes ) );
//            // convert Remaining Schemata
//            Y.Object.each( [
//                Y.doccirrus.schemas.person,
//                Y.doccirrus.schemas.patient,
//                Y.doccirrus.schemas.practice,
//                Y.doccirrus.schemas.activity,
//                Y.doccirrus.schemas.employee
//            ], function( val, key ) {
//                    var
//                        libName = val.name,
//                        result = '';
//                    Y.Object.each( val.types, function( val, key ) {
//                        result = result.concat( linkSchema( val, key, libName ) );
//                        result += ',\n';
//                    } );
//                    Y.log( '\n//======================' + libName.toUpperCase() + '========================\n' +
//                           result
//                    );
//                }
//            );
//
//            process.exit();
//
//        }
//
//        analyseModels();

        //        var
        //            otf = analyseModels;
        //
        //        function getReducedSchemata() {
        //            var fs = require( 'fs' );
        //
        //            fs.readdir( __dirname + '/' + PATH, otf );
        //            otf = function blockRepeat() {
        //                Y.log( 'BLOCKING REPEAT CALL: One time function' );
        //            };
        //        }
        //
        //        getReducedSchemata();
    },
    '0.0.1', {requires: [ 'calendar-schema' ]}
);
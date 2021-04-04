/**
 * User: do
 * Date: 27/02/18  13:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, moment, _ */

'use strict';

YUI.add( 'PatientDiffModel', function( Y, NAME ) {
        /**
         * @module PatientDiffModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            getObject = Y.doccirrus.commonutils.getObject,
            i18n = Y.doccirrus.i18n;

        // TODO: MOJ-9352 generalize patient diff dialog -> lablog

        function PatientDiffModel( config ) {
            PatientDiffModel.superclass.constructor.call( this, config );
        }

        Y.extend( PatientDiffModel, KoViewModel.getBase(), {
                initializer: function PatientDiffModel_initializer( config ) {

                    var
                        self = this,
                        diff = JSON.parse( JSON.stringify( config.data.diff ) ),
                        schema = Y.doccirrus.schemas.patient.schema,
                        DATE_FORMAT = 'DD.MM.YYYY',
                        categories = [
                            {pathPart: '', title: 'Stammdaten'},
                            {pathPart: 'insuranceStatus', title: 'Kostenträger'},
                            {pathPart: 'addresses', title: 'Adressen'}
                        ],
                        catSeparator = {separator: true},
                        tableCategories, sortedPatientDiffValues;

                    self.selPatientI18n = i18n( 'InCaseMojit.cardreader_diffpatient.label.SEL_PATIENT' );
                    self.newPatientI18n = i18n( 'InCaseMojit.cardreader_diffpatient.label.NEW_PATIENT' );

                    self.showCardInsuranceIgnoredHint = config.data.showCardInsuranceIgnoredHint;
                    self.showCardInsuranceCardSwipeIgnoredHint = config.data.showCardInsuranceCardSwipeIgnoredHint;

                    function resolveEnum( path, val ) {

                        var schemaPath = path.replace( /\.(\d+)\./, '.0.' ),
                            schemaEntry = getObject( schemaPath, schema ),
                            schemaEntryList = schemaEntry && schemaEntry.list,
                            translation;

                        if( schemaEntryList ) {
                            schemaEntryList.some( function( listEntry ) {
                                if( listEntry.val === val ) {
                                    translation = listEntry.i18n;
                                    return true;
                                }
                            } );
                        }
                        return translation || val;
                    }

                    self.template = {
                        name: 'PatientDiffModel',
                        data: self
                    };

                    if( !diff ) {
                        return;
                    }

                    sortedPatientDiffValues = _.sortBy( diff.values, 'path' ).map( function( diff ) {
                        if( 'Date' === diff.type ) {
                            if( diff.aVal ) {
                                diff.aVal = moment( diff.aVal ).format( DATE_FORMAT );
                            }
                            if( diff.bVal ) {
                                diff.bVal = moment( diff.bVal ).format( DATE_FORMAT );
                            }
                        } else if( 'Boolean' === diff.type ) {
                            diff.aVal = diff.aVal ? 'An' : 'Aus';
                            diff.bVal = diff.bVal ? 'An' : 'Aus';
                        } else if( diff.isEnum && 'String' === diff.type ) {
                            diff.aVal = resolveEnum( diff.path, diff.aVal );
                            diff.bVal = resolveEnum( diff.path, diff.bVal );
                        } else if( diff.isEnum && '[String]' === diff.type ) {
                            if( Array.isArray( diff.aVal ) ) {
                                diff.aVal = diff.aVal.map( function( str ) {
                                    return resolveEnum( diff.path, str );
                                } );
                                diff.bVal = diff.bVal.map( function( str ) {
                                    return resolveEnum( diff.path, str );
                                } );
                            }
                        }
                        diff.separator = false;
                        return diff;
                    } );

                    tableCategories = categories.map( function( cat ) {
                        cat.data = [];
                        sortedPatientDiffValues.forEach( function( diff, idx, arr ) {
                            var pathParts = diff.path.split( '.' ),
                                lastDiff;

                            if( !cat.pathPart && 1 === pathParts.length ) {
                                cat.data.push( diff );
                            } else if( 1 <= pathParts.length && pathParts[0] === cat.pathPart ) {
                                lastDiff = arr[idx - 1];
                                if( lastDiff && lastDiff.parentPath === diff.parentPath && lastDiff.index !== diff.index ) {
                                    cat.data.push( catSeparator );
                                }
                                cat.data.push( diff );
                            } else {
                                Y.log( 'could not find matching category for ' + JSON.stringify( diff ), 'error', NAME );
                            }
                        } );
                        return cat;
                    } );

                    self.categories = tableCategories;
                },
                destructor: function PatientDiffModel_destructor() {
                }
            },
            {
                NAME: 'PatientDiffModel'
            }
        );

        KoViewModel.registerConstructor( PatientDiffModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'dccommonutils',
            'patient-schema'
        ]
    }
);
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'KoTableNamedRenderers', function( Y ) {

    /**
     * @module KoNav
     */
    Y.namespace( 'doccirrus.KoUI' );

    var moment = Y.doccirrus.commonutils.getMoment(),
        i18n = Y.doccirrus.i18n;

    // map
    // model name - pattern
    var linkMap = {
        urlPatterns: {
            patient: '/incase#/patient/{{id}}/tab/casefile_browser',
            //casefolder: '/incase#/casefolder/{{id}}',
            activity: '/incase#/activity/{{id}}',
            location: '/admin/insuite#/location/{{id}}',
            employee: '/admin/insuite#/employee/{{id}}',
            physician: '/contacts#/{{id}}',
            task: '/tasks#/details/{{id}}',
            schedule: '/calendar#/schedule/{{id}}'
        },
        urlPatternsDSCK: {
            patient: '/iscd/patients#/patient/{{id}}/tab/casefile_browser',
            activity: '/iscd/patients#/activity/{{id}}',
            location: '/iscd/manage#/location/{{id}}',
            employee: '/admin/insuite#/employee/{{id}}',
            physician: '/contacts#/{{id}}',
            task: '/tasks#/details/{{id}}',
            schedule: '/calendar#/schedule/{{id}}'
        },
        idFields: {
            patient: 'patientDbId',
            activity: 'activityId',
            location: 'locId',
            employee: 'employeeId',
            physician: 'basecontactId',
            task: 'taskId',
            //casefolder: 'caseFolderId',
            schedule: 'scheduleId'
        }
    };
    // ==========

    function translateList( val, list ){
        var
            translatedEnumValue = list.find( function( listItem ) {
                return listItem.val === val;
            } );
        return translatedEnumValue ? translatedEnumValue.i18n : val;
    }

    function basicRenderer( meta, colDef ) {
        var val = meta.value,
            cleanCollection;

        if( meta.value && colDef.list ) {
            if( val.constructor === Array ) {
                val = val.map( function( value ){
                    return translateList( value, colDef.list );
                } );
            } else {
                val = translateList( meta.value, colDef.list );
            }
        }

        if( val ) {
            if( val.constructor === Array ) {
                cleanCollection = _cleanArray( val );
                if( colDef && 'Date' === colDef.type ) {
                    cleanCollection = cleanCollection.map( function( val ) {
                        return _dateFormat( val, colDef.dateFormat );
                    } );
                }

                val = cleanCollection.join( ', ' );
            } else if( colDef && 'Date' === colDef.type ) {
                if( typeof val === "number" ) {
                    return val; //Means if it is a count and not date then no need to parse it
                }
                val = _dateFormat( val, colDef.dateFormat );
            }
        }

        return val;
    }

    function boolYesOrNo( meta ) {
        return meta.value ? i18n( 'general.text.YES' ) : i18n( 'general.text.NO' );
    }

    function dateTimeFormat( meta, format ) {
        var dateObj, parts, i;

        if ( !meta.value ) { return ''; }

        //  Value may be array when aggregation includes a 'group by', MOJ-9914
        if ( Array.isArray( meta.value ) ) {
            parts = [];
            for ( i = 0; i < meta.value.length; i++ ) {
                parts[i] = dateTimeFormat( { 'value': meta.value[i] }, format );
            }
            return parts.join( ', ' );
        }

        dateObj = meta.value && moment( meta.value );
        return dateObj && dateObj.isValid() ? moment( meta.value ).format( format ) : '';
    }

    function dateFormat( meta, format ) {
        return _dateFormat( meta.value, format );
    }

    function currencyFormat( meta ) {
        var res = meta.value,
            parsed = parseFloat( meta.value ),
            locale = Y.doccirrus.comctl.getUserLang();

        if( !isNaN( parsed ) && isFinite( parsed ) ) {
            res = parsed.toFixed( 2 ).toString();
            // dot is CH and EN decimal divider
            if( 'de' === locale ) {
                res = res.replace( '.', ',' );
            }
        }

        return res;
    }

    function patientIdLink( meta ) {
        return _genPatientLink( meta.row.patientDbId, meta.value );
    }

    // TODO EXTMOJ-272: consolidate this function with the one above
    function patientDetails( meta ) {
        return _genPatientLink( meta.row.patientDbId, meta.value );
    }

    function detailsLinkByModel( meta, colDef ) {
        var res = '',
            modelName = colDef.model,
            idField = linkMap.idFields[modelName],
            urlPattern,
            translatedEnumValue;

        if( Y.doccirrus.auth.isDOQUVIDE() ){
            urlPattern = linkMap.urlPatternsDSCK[modelName];
        } else {
            urlPattern = linkMap.urlPatterns[modelName];
        }

        if( meta.value && 'Date' === colDef.type ) {
            meta.value = _dateFormat( meta.value );
        }

        if( meta.value && 'DateTime' === colDef.type ) {
            meta.value = dateTimeFormat( meta, 'DD.MM.YYYY HH:mm' );
        }

        if( meta.value && colDef.list ) {
            translatedEnumValue = colDef.list.find( function( listItem ) {
                return listItem.val === meta.value;
            } );

            meta.value = translatedEnumValue ? translatedEnumValue.i18n : meta.value;
        }

        if( meta.value && idField && urlPattern && meta.row[idField] ) {
            res = _genLink( {
                id: meta.row[idField],
                pattern: urlPattern,
                label: meta.value
            } );
        } else {
            res = meta.value;
        }

        return res;
    }

    function diagnoseCodeList( meta ) {
        var result = "<table class='nested-list'>",
            diagnosis = meta.row.diagnosis;

        if( diagnosis && diagnosis.length ) {
            diagnosis.forEach( function( diagnose ) {
                result += '<tr><td>' + diagnose.code + '</td><td>(' + diagnose.catalogShort + ')</td></tr>';
            } );
        }

        result += "</table>";

        return result;
    }

    function treatmentCodeList( meta ) {
        var result = "<table class='nested-list'>",
            treatments = meta.row.treatments;

        if( treatments && treatments.length ) {
            treatments.forEach( function( treatment ) {
                result += '<tr><td>' + treatment.code + '</td><td>(' + treatment.catalogShort + ')</td></tr>';
            } );
        }

        result += "</table>";

        return result;
    }

    function pztDisplay( meta ) {
        var val = meta.value,
            res = '';

        if( typeof val !== 'number' ) {
            val = parseFloat( val );
        }

        if( !isNaN( val ) && val > 720 ) {
            res += '<span class="text-danger">' + val + '</span>';
        } else {
            res += val;
        }

        return res;
    }

    function pzqDisplay( meta ) {
        var val = meta.value,
            res = '';

        if( typeof val !== 'number' ) {
            val = parseFloat( val );
        }

        if( !isNaN( val ) && val > 46800 ) {
            res += '<span class="text-danger">' + val + '</span>';
        } else {
            res += val;
        }

        return res;
    }

    // ===========

    function _genPatientLink( id, label ) {
        var result = '';

        if( id ) {
            result += '<a target="_blank" href="/incase#/patient/' + id + '/tab/casefile_browser">';
        }

        if( label ) {
            result += label;
        }

        if( id ) {
            result += '</a>';
        }

        return result;
    }

    function _genLink( opts ) {
        var result = '',
            href = opts.pattern.replace( '{{id}}', opts.id ),
            label = opts.label || opts.id;

        result += '<a target="_blank" href="' + href + '">';
        result += label;
        result += '</a>';

        return result;
    }

    function _dateFormat( value, format ) {
        var dateObj = moment( value, format );
        dateObj = dateObj.isValid() ? dateObj : moment( value );
        if( !moment( value ).isValid() ) {
            return null;
        }
        return dateObj.format( 'DD.MM.YYYY' );
    }

    /**
     * Clean array, remove empty values
     * @method cleanArray
     * @param {Array} arr array to clean
     * @private
     * @returns {Array}
     * */
    function _cleanArray( arr ) {

        if( !Array.isArray( arr ) ) {
            throw new Error( 'The argument should be of an array type!' );
        }

        return arr.filter( function( val ) {
            return val !== null && val !== '' && val !== undefined;
        } );
    }

    Y.namespace( 'doccirrus.KoUI' ).namedRenderers = {
        diagnoseCodeList: diagnoseCodeList,
        treatmentCodeList: treatmentCodeList,
        patientDetails: patientDetails,
        patientIdLink: patientIdLink,
        currencyFormat: currencyFormat,
        dateFormat: dateFormat,
        dateTimeFormat: dateTimeFormat,
        pztDisplay: pztDisplay,
        pzqDisplay: pzqDisplay,
        detailsLinkByModel: detailsLinkByModel,
        boolYesOrNo: boolYesOrNo,
        basicRenderer: basicRenderer
    };

}, '3.16.0', {
    requires: []
} );

/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  YUI module to render insight reports into a PDF table
 *
 *  Note that this is intended to run only on the server, and assumes that the mapper has added a date range to
 *  the form:
 *
 *      template.report.startDate
 *      template.report.endDate
 */

/*jslint anon:true, sloppy:true, nomen:true*/

//  Allowing late definitions for readability - lets us put the callback chains is execution order from top to bottom

/*eslint prefer-template:0, strict:0 */

/*global YUI */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-element-reporttable',

    /* Module code */
    function( Y, NAME ) {


        /**
         *  Extend YUI object with a method to instantiate these
         */

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.elements ) {
            Y.dcforms.elements = {};
        }

        Y.log( 'Adding renderer for dcforms reporttable types.', 'debug', NAME );

        /**
         *  Factory method for table element renderers
         *
         *  This differs from the previous table renderer in overflowing onto next page.  Controls to add and
         *  remove rows have been removed from this version due to lack of use - tables are trypically bound
         *  rather than filled by the user.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeReportTableRenderer = function( element, creationCallback ) {

            var
                moment = Y.doccirrus.commonutils.getMoment(),

                dataset = [],                               //_ set of objects to be mapped / displayed [array:object]

                userLang = element.page.form.userLang,      //_ language code as if first render [string]
                presetId = element.defaultValue[userLang],  //_ report preset / insight2 _id from editor [string]
                dcCols = null,                              //_ table definition, parsed [object]

                userDefinedFields = null,                   //_ loaded on server to get column types, names for custom/own reports

                preset = null,                              //_ insight2 preset database object
                report = null,                              //  eslint-disable-line no-unused-vars
                startDate = null,                           //_ supplied by mapper
                endDate = null,                             //_ supplied by mapper

                padOffset = -0.5,                           //_ shift cell borders slightly to avoid text
                padHardCols = 3,                            //_ A little margin for cols which should not be crushed on table overflow

                //_ Report tables have a maximum size - 200 pages:
                isOverflown = false,                        //  eslint-disable-line no-unused-vars
                overflowAt = -1,                            //_ px height at overflow limit

                pubMethods,
                isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();

            /**
             *  The reports table is unusual in that its data comes from the reporting API, not from the mapped
             *  context or from a document.
             *
             *  This will only run on the server, the columns and datasets are loaded before the element is rendered.
             */

            function init() {
                if( !element.extra ) {
                    element.extra = '';
                }

                //  MOJ-6188 limit size of generated report tables
                overflowAt = ( element.page.form.paper.height * Y.dcforms.MAX_PAGES );

                //  if no preset _id, try query request
                if ( !presetId || '' === presetId ) {
                    if ( element.page.form.report && element.page.form.report.bindId ) {
                        presetId = element.page.form.report.bindId;
                        Y.log( 'Set report _id from request: ' + presetId, 'debug', NAME );
                    }
                    if ( element.page.form.report && element.page.form.report.presetId ) {
                        presetId = element.page.form.report.presetId;
                        Y.log( 'Set report _id from request: ' + presetId, 'debug', NAME );
                    }
                }

                Y.dcforms.runInSeries( [ loadPreset, loadReport ], onAllDone );

                //  return to the form initialization
                function onAllDone( err ) {
                    if( err ) {
                        Y.log( 'Error loading insight2 preset ' + presetId + ': ' + JSON.stringify( err ), 'warn', NAME );
                    }
                    creationCallback( err, pubMethods );
                }
            }

            /**
             *  Get insight2 report configuration from database/server and translate to table columns
             *
             *  TODO: move these to utility methods
             *
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function loadPreset( callback ) {
                //  no preset to load
                if( !presetId || '' === presetId ) {
                    Y.log( 'No preset _id was defined for this table, inserting placeholder column', 'debug', NAME );
                    dcCols = Y.dcforms.stringToCols( '**Placeholder{newline}*|Placeholder|string|Placeholder' );
                    callback( null );
                    return;
                }

                if( Y.dcforms.isOnServer ) {
                    loadPresetServer( callback );
                } else {
                    loadPresetClient( callback );
                }
            }

            /**
             *  Get insight2 report configuration from server
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function loadPresetClient( callback ) {
                var
                    presets = Y.dcforms.getInsight2PresetList(),
                    preset = null,
                    i, displayFields = [];

                userDefinedFields = [];

                for( i = 0; i < presets.length; i++ ) {
                    if( presets[i]._id === presetId ) {
                        preset = presets[i];
                        dcCols = Y.dcforms.reportToCols( preset, element.page.form.userLang );
                        report = [];
                    }
                }

                //  if preset does not exist in set the clear it and set the placeholder
                if( !preset ) {
                    presetId = '';
                    loadPreset( callback );
                    return;
                }

                ( preset.displayFields || [] ).forEach( function( el ) {
                    if( !el.country || ( el.country && ( ( isSwiss && 'CH' === el.country ) || ( isGermany && 'D' === el.country ) ) ) ) {
                        displayFields.push( el );
                    }
                });

                preset.displayFields = displayFields;

                callback( null );
            }

            /**
             *  Get insight2 report configuration from database
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function loadPresetServer( callback ) {
                var async = require( 'async' );

                async.series( [ loadUserDefinedFields, loadPresetFromDb, expandPresetForTable ], callback );

                function loadUserDefinedFields( itcb ) {
                    //  skip this if already loaded
                    if ( userDefinedFields ) {
                        Y.log( 'Skipping duplicate load of custom reporting fields.', 'debug', NAME );
                        return itcb( null );
                    }

                    Y.doccirrus.formsReportingHelper.getUserReportingFields( {
                        'user': element.page.form.user,
                        'callback': onCustomFieldsLoaded
                     } );

                    function onCustomFieldsLoaded( err, result ) {
                        var customFields, i;

                        if ( err ) { return itcb( err ); }

                        userDefinedFields = [];
                        customFields = result.data ? result.data : result;

                        //  add custom fields to result
                        for ( i = 0; i < customFields.length; i++ ) {
                            userDefinedFields.push( customFields[i] );
                        }

                        itcb( null );
                    }
                }

                function loadPresetFromDb( itcb ) {

                    Y.doccirrus.mongodb.runDb( {
                        'user': element.page.form.user,
                        'model': 'insight2',
                        'query': { '_id': presetId },
                        'callback': onPresetLoaded
                    } );

                    function onPresetLoaded( err, data ) {
                        var displayFields = [];
                        if( !err && !data[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Preset not found in database: ' + presetId, true );
                        }
                        if( err ) {
                            itcb( err );
                            return;
                        }

                        preset = data[0];
                        ( preset.displayFields || [] ).forEach( function( el ) {
                            if( !el.country || ( el.country && ( ( isSwiss && 'CH' === el.country ) || ( isGermany && 'D' === el.country ) ) ) ) {
                                displayFields.push( el );
                            }
                        });

                        preset.displayFields = displayFields;
                        itcb( null );
                    }
                }

                function expandPresetForTable( itcb ) {
                    preset = processPreset( preset );
                    dcCols = Y.dcforms.reportToCols( preset, element.page.form.userLang );

                    //  add optional line numbering to tables
                    if( hasExtra( 'LINENUM' ) ) {
                        dcCols.cols.unshift( {
                            'member': 'lineNo',                                 //  db property name
                            'valueType': 'string',                              //  all strings for now
                            'title': '##',                                      //  column name
                            'align': 'left',                                    //  numbers are right aligned
                            'hard': true
                        } );
                    }

                    itcb( null );
                }
            }

            /**
             *  Request configured report from the reporting API, sort and reformat it as a table dataset
             *
             *  @param  callback    {Function}  Of the form fn( err )
             */

            function loadReport( callback ) {

                //  don't load report to the client
                if( !Y.dcforms.isOnServer ) {
                    report = [];
                    callback( null );
                    return;
                }

                if( !element.page.form.report || !element.page.form.report.startDate || !element.page.form.report.endDate ) {
                    callback( Y.doccirrus.errors.rest( 500, 'Date range not given, can not create report', true ) );
                    return;
                }

                startDate = element.page.form.report.startDate;
                endDate = element.page.form.report.endDate;

                var
                    sortField = getSortField(),
                    koParams = element.page.form.reportTableParams || {},
                    reportOptions = {
                        'user': element.page.form.user,
                        'model': 'reporting',
                        'originalParams': {
                            'insightConfigId': presetId,
                            'dates': {
                                'startDate': startDate,
                                'endDate': endDate
                            }
                        },
                        //'query': koParams.query || {},
                        //'options': koParams.options || {},
                        'callback': onReportGenerated
                    }, k;

                if( sortField ) {
                    //Y.log( 'Setting sort field to: ' + JSON.stringify( sortField ), 'debug', NAME );
                    reportOptions.originalParams.sort = sortField;
                    reportOptions.options = { sort: sortField };
                }

                if( koParams.options ) {
                    reportOptions.options = koParams.options;
                }
                if( koParams.query ) {
                    reportOptions.query = koParams.query;
                }

                if( koParams.sort ) {
                    reportOptions.options.sort = koParams.sort;
                }

                //  correct iregex operator
                for( k in koParams.query ) {
                    if( koParams.query.hasOwnProperty( k ) ) {
                        if( koParams.query[k].hasOwnProperty( 'iregex' ) ) {
                            koParams.query[k] = { $regex: new RegExp( koParams.query[k].iregex, 'i' ) };
                        }
                    }
                }

                //  see reporting-api.server.js
                Y.doccirrus.api.reporting.getData( reportOptions );

                function onReportGenerated( err, result ) {
                    if( err ) {
                        Y.log( 'Error generating insight2 report on server: ' + JSON.stringify( err ), 'warn', NAME );
                        callback( err );
                        return;
                    }

                    result = result.result ? result.result : result;

                    //  MOJ-7980 tolerate invalid reports, prevent error on request for invalid report
                    if ( !result || !result[0] ) {
                        Y.log( 'Reporting API called back with empty object: ' + JSON.stringify( result ), 'warn', NAME );
                        result = [];
                    }

                    Y.log( 'Loaded report, ' + result.length + ' table rows', 'info', NAME );

                    result = addMetaLines( result );
                    dataset = formatReport( result, presetId );
                    callback( null );
                }
            }

            /**
             *  Used to add translations for table columns, assume InCase_T for user's custom reports
             */

            function processPreset( rawPreset ) {
                //  assume incase mapper

                var
                    reducedSchema = Y.dcforms.schema.InCase_T,
                    lang = element.page.form.userLang,
                    displayField,
                    userDefinedField,
                    schemaMember,
                    i, j;

                if ( !rawPreset || !rawPreset.displayFields ) { return rawPreset; }

                for ( i = 0; i < rawPreset.displayFields.length; i++ ) {
                    displayField = rawPreset.displayFields[i];

                        //  add from user-defined reporting fields in forms
                    for ( j = 0; j < userDefinedFields.length; j++ ) {

                        userDefinedField = userDefinedFields[j];

                        //  set type if custom field
                        if (
                            userDefinedField.key === displayField.value &&
                            userDefinedField.type &&
                            !displayField.type
                        ) {
                            displayField.type = userDefinedField.type;
                        }

                        //  set label if custom field
                        if (
                            userDefinedField.key === displayField.value &&
                            userDefinedField.label &&
                            !displayField.label
                        ) {
                            displayField.label = userDefinedField.label;

                            if ( 'Date' === userDefinedField.label ) {
                                displayField.rendererName = 'dateFormat';
                            }
                        }
                    }

                    //  add from incase schema
                    if ( displayField.value && reducedSchema.hasOwnProperty( displayField.value ) ) {
                        schemaMember = reducedSchema[ displayField.value ];
                        if ( schemaMember.label && schemaMember.label[ lang ] ) {
                            displayField.label = schemaMember.label;
                        }
                        if ( 'DateTime' === schemaMember.type ) {
                            displayField.rendererName = 'dateTime';
                        }
                    }
                }

                return rawPreset;
            }

            /**
             *  Check the preset for a default sort field
             *
             *  NB: this assumes that the appropriate preset has already been loaded
             */

            function getSortField() {

                var
                    sortBy = null,
                    sortField = {},
                    i;

                for( i = 0; i < preset.displayFields.length; i++ ) {
                    if( 0 === preset.displayFields[i].sortInitialIndex ) {
                        Y.log( 'Preset has a defined sort order: ' + JSON.stringify( sortBy ), 'debug', NAME );
                        sortBy = preset.displayFields[i];
                    }
                }

                if( !sortBy ) {
                    Y.log( 'No default sorting order defined in preset, using first field', 'debug', NAME );
                    sortBy = preset.displayFields[0];
                }

                sortField[sortBy.value] = 1;

                if( sortBy.direction && sortBy.direction !== 'ASC' ) {
                    sortField[sortBy.value] = -1;
                }

                Y.log( 'Sorting on preset display field: ' + JSON.stringify( sortBy ), 'debug', NAME );
                Y.log( 'Created sort field: ' + JSON.stringify( sortField ), 'debug', NAME );

                return sortField;
            }

            /**
             *  Apply column formatting and casting to a preset report
             *
             *  NB: this assumes that the appropriate preset has already been loaded
             *
             *  @param  rpt         {Object}    Array of rows as returned by the reporting API
             *  @param  presetId    {String}    Id of report to format
             */

            function formatReport( rpt, presetId ) {
                var i, j, row, col, cell;

                for( i = 0; i < rpt.length; i++ ) {
                    row = rpt[i];

                    if( !row ) {
                        Y.log( 'formatReport. Report ' + presetId + ' contains null row.', 'warn', NAME );
                        continue;
                    }

                    //  add optional line number column, except on summary lines
                    if ( !row.dcmeta ) {
                        row.lineNo = i + 1;
                    }

                    for( j = 0; j < preset.displayFields.length; j++ ) {
                        col = preset.displayFields[j];
                        cell = row[col.value];


                        row[col.value] = formatReportCell( col, cell );
                    }
                }

                return rpt;
            }

            /**
             *
             *  @param  {Object}    col
             *  @param  {String}    cell
             *  @return {*}
             */

            function formatReportCell( col, cell ) {
                var temp, i, k;

                //  own reports may use a 'groupBy' option which will return arrays of results,
                //  render these individually and concatenate them

                if ( Array.isArray( cell ) ) {
                    temp = [];
                    for ( i = 0; i < cell.length; i++ ) {
                        temp.push( formatReportCell( col, cell[i] ) );
                    }
                    return temp.join( ', ' );
                }

                //  handle miscast dates, MOJ-9851
                if (
                    ( 'object' === typeof cell ) &&
                    ( '[object Date]' === Object.prototype.toString.call( cell ) ) &&
                    ( 'String' === col.type  )
                ) {
                    col.type = 'Date';
                    col.rendererName = 'dateFormat';
                }

                if( col.rendererName && '' !== col.rendererName ) {
                    switch( col.rendererName ) {
                        case 'diagnoseCodeList':
                            //  flatten an array of diagnosis codes and dates
                            temp = '';
                            for( k = 0; k < cell.length; k++ ) {
                                temp = temp + cell[k].code + '  (' + cell[k].catalogShort + ')  \n';
                            }
                            cell = temp;
                            break;

                        case 'treatmentCodeList':
                            //  flatten an array of treatment codes and dates
                            temp = '';
                            for( k = 0; k < cell.length; k++ ) {
                                temp = temp + cell[k].code + '  (' + cell[k].catalogShort + ')  \n';
                            }
                            cell = temp;
                            break;

                        /*  for testing column layout
                         case 'patientDetails':
                         cell = cell + ' DELETEME';
                         cell = cell.replace( new RegExp( ' ', 'g' ), '-' );
                         console.log( 'patientDetails: ', cell );   //jshint ignore:line
                         break;
                         */

                        case 'currencyFormat':
                            if( !cell || '' === cell ) {
                                cell = '0,00';
                            } else {
                                cell = ' ' + parseFloat( cell ).toFixed( 2 ).toString().replace( '.', ',' );
                            }
                            break;

                        case 'dateFormat':
                            if ( !cell || '' === cell || '0' === cell || 0 === cell ) {
                                //  invalid timestamp, happens in summary lines, etc, leave blank rather than
                                //  display the UNIX epoch
                                cell = '';
                            } else {
                                cell = moment( cell ).format( 'DD.MM.YYYY' );
                            }
                            break;

                        case 'dateTime':
                            if ( !cell || '' === cell || '0' === cell || 0 === cell ) {
                                //  invalid timestamp, happens in summary lines, etc, leave blank rather than
                                //  display the UNIX epoch
                                cell = '';
                            } else {
                                cell = moment( cell ).format( 'DD.MM.YY HH:mm' );
                            }
                            break;

                        case 'caseFolderType':      //  EXTMOJ-731
                            switch( cell ) {
                                case 'PRIVATE':     cell = 'PKV';   break;
                                case 'PUBLIC':      cell = 'GKV';   break;
                                case 'BG':          cell = 'BG';    break;
                                case 'SELFPAYER':   cell = 'SZ';    break;
                            }
                            break;

                        case 'separateCommas':      //  EXTMOJ-731
                            //  if string
                            if ( cell && cell + '' === cell ) {
                                cell = cell.replace( new RegExp( ',', 'g' ), ', ' ).replace( new RegExp( ',{2}', 'g' ), ', ' );
                            }
                            // if array
                            if ( Array.isArray( cell ) ) {
                                cell = cell.join( ', ' );
                            }
                            break;

                        case 'activityType':        //  MOJ-7813
                            cell = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', cell, '-de', '' );
                            break;

                        case 'activityStatus':      //  MOJ-7813
                            cell = Y.doccirrus.schemaloader.translateEnumValue( '-de', cell + '', Y.doccirrus.schemas.activity.types.ActStatus_E.list, '' );
                            break;

                    }
                }

                //  MOJ-8031 - legacy breaks in address mapping
                if ( col.type && 'String' === col.type && cell && cell.replace ) {
                    cell = cell.replace( '<br/>', "\n" );
                }

                return cell;
            }

            /**
             *  Add lines to the end of the report to show total, max, min, avg if configured in the table
             *
             *  This assumes that preset has been loaded
             *
             *  @param  rpt     {Object}    Array of report rows
             */

            function addMetaLines( rpt ) {
                var
                    lines = {
                        'LINEMAX': { 'dcmeta': true },
                        'LINEMIN': { 'dcmeta': true },
                        'LINEAVG': { 'dcmeta': true },
                        'LINESUM': { 'dcmeta': true }
                    },
                    firstLine = true,
                    lastLine,
                    row,
                    field,
                    cell,
                    i, j;

                if ( !rpt || !rpt.length || 0 === rpt.length ) {
                    Y.log( 'Could not add meta lines, no lines in report: ' + rpt, 'warn', NAME );
                    return [];
                }

                //  report itself my define a summary line - format it if present
                if ( rpt.length > 0 && rpt[ rpt.length - 1 ] && !rpt[ rpt.length - 1 ]._id ) {
                    lastLine = rpt[ rpt.length - 1 ];
                    lastLine._id = 'SUMMARY';
                    lastLine.dcmeta = true;

                    //  Hide fields in report summary as specified by preset MOJ-8079
                    for( i = 0; i < preset.displayFields.length; i++ ) {
                        field = preset.displayFields[i];
                        if ( field.notVisibleAtSummaryRow ) {
                            lastLine[ field.value ] = '';
                        }
                    }
                }

                for( i = 0; i < preset.displayFields.length; i++ ) {
                    field = preset.displayFields[i];

                    if( field.type && field.type.toLowerCase() === 'number' ) {

                        lines.LINESUM[field.value] = 0;
                        lines.LINEAVG[field.value] = 0;
                        lines.LINEMAX[field.value] = 0;
                        lines.LINEMIN[field.value] = 0;

                        for( j = 0; j < rpt.length; j++ ) {
                            row = rpt[j];

                            //  do not include summary line(s) in totals, averages, etc
                            if( row && row.hasOwnProperty( field.value ) && !row.dcmeta ) {

                                cell = parseFloat( row[field.value] );
                                if( isNaN( cell ) ) {
                                    cell = 0;
                                }

                                //  initialize with first cell in col
                                if( firstLine ) {
                                    lines.LINEMIN[field.value] = cell;
                                    lines.LINEMAX[field.value] = cell;
                                    firstLine = false;
                                }

                                if( cell > lines.LINEMAX[field.value] ) {
                                    lines.LINEMAX[field.value] = cell;
                                }
                                if( cell < lines.LINEMIN[field.value] ) {
                                    lines.LINEMIN[field.value] = cell;
                                }

                                lines.LINESUM[field.value] = lines.LINESUM[field.value] + cell;
                            }
                        }

                        lines.LINEAVG[field.value] = parseFloat( lines.LINESUM[field.value] / rpt.length ).toFixed( 2 ).toString();

                        if( field.rendererName && 'currencyFormat' === field.rendererName ) {
                            lines.LINEMAX[field.value] = parseFloat( lines.LINEMAX[field.value] ).toFixed( 2 ).toString().replace( '.', ',' );
                            lines.LINEMIN[field.value] = parseFloat( lines.LINEMIN[field.value] ).toFixed( 2 ).toString().replace( '.', ',' );
                            lines.LINEAVG[field.value] = parseFloat( lines.LINEAVG[field.value] ).toFixed( 2 ).toString().replace( '.', ',' );
                            lines.LINESUM[field.value] = parseFloat( lines.LINESUM[field.value] ).toFixed( 2 ).toString().replace( '.', ',' );
                        }

                    } else {
                        lines.LINEMAX[field.value] = 'MAX';
                        lines.LINEMIN[field.value] = 'MIN';
                        lines.LINEAVG[field.value] = 'AVG';
                        lines.LINESUM[field.value] = 'SUM';
                    }

                }

                if( hasExtra( 'LINESUM' ) ) {
                    rpt.push( lines.LINESUM );
                }
                if( hasExtra( 'LINEAVG' ) ) {
                    rpt.push( lines.LINEAVG );
                }
                if( hasExtra( 'LINEMIN' ) ) {
                    rpt.push( lines.LINEMIN );
                }
                if( hasExtra( 'LINEMAX' ) ) {
                    rpt.push( lines.LINEMAX );
                }

                return rpt;
            }

            /**
             *  Check whether one of the meta lines is enabled on this table
             *  @param  fieldName   {String}    One of (LINEMAX|LINEMIN|LINEAVG|LINESUM)
             *  @returns            {boolean}   True if enabled
             */

            function hasExtra( fieldName ) {
                if ( !element || !element.extra || 'string' !== typeof element.extra ) { return false; }
                return ( -1 !== element.extra.indexOf( fieldName ) );
            }

            /**
             *  Experimental table column layout for client and server
             *
             *  Approach to deciding on column widths:
             *
             *  (*) Get minimum width of each column (max: width of widest word)
             *  (*) Get total width of all content in column (sum: width of all words)
             *  (*) Subtract from total width of table element to get 'free' width
             *  (*) Assign portion of free width to each column according to square root of total column width
             *
             *  Edge case:
             *
             *  (*) If total min width of columns is greater than width of table element then the largest word in the
             *      table must be broken in half and this process repeated until content fits table.
             *
             *  (*) There should be a minimum width of tables for n columns so that there is not a situation where
             *      table columns are narrower than a singe glyph, or a vertical line of letters.
             *
             *  Considerations:
             *
             *  (*) Performance?
             *  (*) Embedded mapped values / javascript snippets
             *
             *  @return     {Object}    Array of column widths in mm
             */

            function estimateColumnWidths() {
                var
                    pxFontHeight = element.mm.lineHeight * element.page.form.zoom,
                    col,
                    sumSqrt = 0,
                    colWidth = [],
                    widthPx = element.mm.width * element.page.form.zoom,
                    freeWidthPx,
                    minWidthTotal = 0,
                    maxWidthTotal = 0,
                    tableWrap,
                    tableOverflow,
                    metrics,
                    dataRow,
                    dataCell,
                    whitespaceShare,
                    x,
                    y;

                Y.log( 'Estimate col widths, table width ' + widthPx + 'px', 'debug', NAME );

                //  Process column headers
                for( x = 0; x < dcCols.cols.length; x++ ) {
                    col = dcCols.cols[x];
                    metrics = Y.dcforms.measureTextMetrics( col.title, element.font, pxFontHeight );
                    col.minWidth = metrics.max;
                    col.maxWidth = metrics.total;
                    col.totalWidth = metrics.total;
                    //Y.log('Title row metrics ' + x + ': ' + dcCols.cols[x].title + ' - ' + JSON.stringify(metrics), 'debug', NAME);
                }

                //  Process data cells
                for( y = 0; y < dataset.length; y++ ) {
                    dataRow = dataset[y];
                    for( x = 0; x < dcCols.cols.length; x++ ) {
                        col = dcCols.cols[x];

                        dataCell = '';

                        if( dataRow.hasOwnProperty( col.member ) ) {
                            dataCell = dataRow[col.member] || '';
                        }

                        if( '' === dataCell ) {
                            dataCell = '.';     //  for measurement purposes
                        }

                        metrics = Y.dcforms.measureTextMetrics( dataCell, element.font, pxFontHeight );
                        //Y.log('Cell metrics ' + x +',' + y + ': ' + dataCell + ' - ' + JSON.stringify(metrics), 'debug', NAME);

                        if( metrics.max > col.minWidth ) {
                            col.minWidth = metrics.max;

                            if( dcCols.cols[x].hard ) {
                                col.minWidth = col.minWidth + padHardCols;
                            }
                        }

                        if( metrics.total > col.maxWidth ) {
                            col.maxWidth = metrics.total;
                        }

                        col.totalWidth = col.totalWidth + metrics.total;
                    }
                }

                //  expand min width of line number column, persistent visual glitch if not done
                if( hasExtra( 'LINENUM' ) ) {
                    dcCols.cols[0].minWidth = dcCols.cols[0].minWidth * 2;
                }

                //  collect totals and measure table
                //  freeWidthPx = element.mm.width * element.page.form.zoom

                //console.log( 'Estimating column widths: ', dcCols )

                for( x = 0; x < dcCols.cols.length; x++ ) {
                    col = dcCols.cols[x];

                    minWidthTotal = minWidthTotal + col.minWidth;
                    maxWidthTotal = maxWidthTotal + col.maxWidth;

                    //  Take the square root of the content length
                    col.totalSqrt = Math.sqrt( col.totalWidth );
                    //  Sum for assigning free space
                    sumSqrt = sumSqrt + col.totalSqrt;
                }

                tableWrap = ( maxWidthTotal > widthPx );
                tableOverflow = ( minWidthTotal > widthPx );

                freeWidthPx = widthPx - maxWidthTotal;

                if( freeWidthPx < 0 ) {
                    Y.log( 'Table wraps, using min values to calculate column widths', 'debug', NAME );
                    freeWidthPx = widthPx - minWidthTotal;
                }

                /*
                 Y.log(
                 'Col width estimation:\n' +
                 '  total: ' + widthPx + '\n' +
                 '  free: ' + freeWidthPx + '\n' +
                 '  minWidthTotal: ' + minWidthTotal + '\n' +
                 '  maxWidthTotal: ' + maxWidthTotal + '\n' +
                 '  tableWrap: ' + tableWrap.toString() + '\n' +
                 '  overflow: ' + tableOverflow.toString()
                 'debug', NAME );
                 */

                //  make an initial assignment of available space
                for( x = 0; x < dcCols.cols.length; x++ ) {
                    col = dcCols.cols[x];
                    whitespaceShare = ( freeWidthPx * ( col.totalSqrt / sumSqrt ) );
                    //console.log( 'whitespace share ' + x + ': ' + whitespaceShare + ' on min: ' + col.minWidth, col.minWidth + whitespaceShare );

                    if( tableWrap || tableOverflow ) {
                        //  cells wrap on multiple lines or must be compressed
                        col.widthPx = col.minWidth + whitespaceShare;
                    } else {
                        //  enough space that no cell needs to be split into multiple lines
                        col.widthPx = col.maxWidth + whitespaceShare;
                    }
                }

                //  Fix hard columns if there is not enough space

                if( tableWrap || tableOverflow ) {

                    Y.log( 'Table wraps or overflows, setting hard columns to their minimum width', 'info', NAME );
                    freeWidthPx = 0;
                    sumSqrt = 0;

                    //  set hard cols to min width, collect the difference
                    for( x = 0; x < dcCols.cols.length; x++ ) {
                        col = dcCols.cols[x];
                        if( col.hard ) {
                            freeWidthPx = freeWidthPx + ( col.widthPx - col.minWidth );
                            Y.log( 'Fixing hard column width from ' + col.widthPx + ' to ' + col.minWidth + ' frees: ' + ( col.widthPx - col.minWidth ), 'debug', NAME );
                            col.widthPx = col.minWidth;
                        } else {
                            sumSqrt = sumSqrt + col.totalSqrt;
                        }
                    }

                    //  reassign the difference to other cols
                    for( x = 0; x < dcCols.cols.length; x++ ) {
                        col = dcCols.cols[x];
                        if( !col.hard ) {
                            whitespaceShare = ( freeWidthPx * ( col.totalSqrt / sumSqrt ) );
                            col.widthPx = col.widthPx + whitespaceShare;
                        }
                    }

                    //  collect any free space in elastic columns and reassign to squashed colummns
                    //  several iterations

                    for( y = 0; y < 6; y++ ) {

                        freeWidthPx = 0;
                        sumSqrt = 0;

                        for( x = 0; x < dcCols.cols.length; x++ ) {
                            col = dcCols.cols[x];
                            if( !col.hard && col.widthPx > col.minWidth ) {
                                freeWidthPx = freeWidthPx + ( col.widthPx - col.minWidth );
                                col.widthPx = col.minWidth;
                            }
                            if( !col.hard ) {
                                sumSqrt = sumSqrt + col.totalSqrt;
                            }
                        }

                        //  reassign the difference to other cols
                        for( x = 0; x < dcCols.cols.length; x++ ) {
                            col = dcCols.cols[x];
                            if( !col.hard ) {
                                whitespaceShare = ( freeWidthPx * ( col.totalSqrt / sumSqrt ) );
                                col.widthPx = col.widthPx + whitespaceShare;
                            }
                        }

                    }

                } else {
                    Y.log( 'Not wrapping table, widthPx: ' + widthPx, 'debug', NAME );
                }

                //  Convert back to mm for use in layout
                for( x = 0; x < dcCols.cols.length; x++ ) {
                    col = dcCols.cols[x];
                    col.widthMm = ( col.widthPx / element.page.form.zoom);
                    colWidth[x] = col.widthMm;
                }

                //console.log( 'returning column widths: ', colWidth );
                return colWidth;
            }

            /**
             *  Add a row of cells
             *
             *  @param  values      {Object}    Array of strings (text)
             *  @param  colWidths   {Object}    Array of column widths in mm
             *  @param  vOffset     {Number}    Top of row, (in mm from top of table)
             *  @param  rowIdx      {Number}    Index of this row in dataset
             *  @return             {Number}    Base of row, (in mm from top of table)
             */

            function addRow( values, colWidths, vOffset, rowIdx ) {
                var
                    tempElementsCell = [],
                    tempElementsRow = [],
                    tempElementBorder,
                    striped = hasExtra( 'STRIPES' ),
                    cellTxt,
                    bgSe,
                    cursor = 0,
                    lineBase = 0,
                    base = 0,
                    isHard,
                    rowSpacing = 0,
                    x, y, i;

                //  do not add empty lines ro report
                if ( '' === values.join( '' ) ) {
                    //  may in future use this to insert a table divider
                    return vOffset;
                }

                //  independent of row content
                if ( element.table && element.table.rowSpacing ) {
                    rowSpacing = parseFloat( element.table.rowSpacing );
                }

                //  wrap text for all table cells

                for( x = 0; x < colWidths.length; x++ ) {

                    cellTxt = (values[x] || ' ');

                    //  slight padding for hard cols / currency fields MOJ-6241
                    if( 'right' === dcCols.cols[x].align ) {
                        isHard = dcCols.cols[x].hard ? -2 : 0;
                    } else {
                        isHard = dcCols.cols[x].hard ? 2 : 0;
                    }

                    //  text in a single cell may wrap into multiple rows

                    tempElementsCell = Y.dcforms.markdownToSubElements(
                        cellTxt + '',                               //  markdown text
                        element.font,                               //  typeface name
                        element.mm.lineHeight,                      //  line height
                        parseFloat( element.mm.lineSpace ),           //  leading factor
                        cursor + isHard,                            //  x offset (mm)
                        vOffset,                                    //  y offset (mm)
                        dcCols.cols[x].align,                       //  text alignment (left / right / center)
                        colWidths[x],                               //  wrapping width (mm)
                        element.isBold,                             //  make bold
                        element.isItalic,                           //  make italic
                        element.isUnderline                         //  make underline
                    );

                    //Y.log('Adding table cell: ' + cellTxt + ' as ' + tempElementsCell.length + ' subelements.', 'debug', NAME);

                    for( y = 0; y < tempElementsCell.length; y++ ) {

                        //tempElementsCell[y].align = dcCols.cols[x].align;
                        tempElementsCell[y].fgColor = dcCols.cols[x].fgColor;

                        //  used to position editor
                        tempElementsCell[y].tableRow = rowIdx;
                        tempElementsCell[y].tableCol = x;
                        tempElementsCell[y].cellLine = y;
                        tempElementsCell[y].cellWidth = colWidths[x];
                        tempElementsCell[y].rowMember = x;

                        tempElementsRow.push( tempElementsCell[y] );

                        //  base of this text fragment
                        lineBase = tempElementsCell[y].top + tempElementsCell[y].height + rowSpacing;
                        //Y.log('Subelement: ' + tempElementsCell[y].top + ' (top) ' + tempElementsCell[y].height + ' (height) ' + cellTxt, 'debug', NAME);

                        //  base of entire row is max base of the set of all text fragments
                        if( lineBase > base ) {
                            //Y.log('Set row base to: ' + lineBase, 'debug', NAME);
                            base = lineBase;
                        }

                    }

                    //  add a subelement to for the cell border
                    //  NOTE: the -1 is to give a small amount of padding to table cells
                    tempElementBorder = Y.dcforms.createSubElement(
                        cursor + padOffset, vOffset + padOffset,            //  left, top (mm)
                        colWidths[x], 0,                                    //  width, height (mm)
                        element.mm.lineHeight, '', null                     //  not used
                    );

                    if( striped ) {

                        if( rowIdx % 2 === 1 ) {
                            tempElementBorder.bgColor = element.borderColor;
                        }
                        //  slightly wider to prevent intermittent vertical lines in PDF due to rounding
                        tempElementBorder.width = tempElementBorder.width + 2;
                        //  slightly lower
                        tempElementBorder.top = tempElementBorder.top + 0.5;

                    } else {
                        tempElementBorder.borderColor = element.borderColor;
                    }
                    tempElementBorder.isCellBorder = true;
                    tempElementsRow.unshift( tempElementBorder );

                    //  move on to next column
                    cursor = cursor + colWidths[x];
                }

                //  fix height of cell borders
                for( i = 0; i < tempElementsRow.length; i++ ) {
                    if( tempElementsRow[i].isCellBorder ) {
                        tempElementsRow[i].height = ( base - vOffset );
                    }
                }

                //  add a subelement for the header row background
                if( -1 === rowIdx ) {
                    bgSe = Y.dcforms.createSubElement(
                        (padOffset * 2), vOffset + (padOffset * 2),         //  left, top (mm)
                        element.mm.width + 1, (base - vOffset) + 1,         //  width, height (mm)
                        element.mm.lineHeight, '', null                     //  not used
                    );

                    bgSe.special = 'bgse';
                    bgSe.bgColor = element.bgColor;
                    bgSe.noncontent = true;
                    //  bgSe.nopdf = true;

                    //  add all text fragments on top of the background
                    element.subElements.push( bgSe );
                } else {
                    bgSe = Y.dcforms.createSubElement(
                        (padOffset * 2), vOffset + (padOffset * 2),         //  left, top (mm)
                        element.mm.width + 1, (base - vOffset) + 1,         //  width, height (mm)
                        element.mm.lineHeight, '', null                     //  not used
                    );

                    bgSe.special = 'bgse';
                    //bgSe.bgColor = element.bgColor;
                    bgSe.noncontent = true;
                    bgSe.nopdf = true;

                    //  add all text fragments on top of the background
                    element.subElements.push( bgSe );
                }

                for( x = 0; x < tempElementsRow.length; x++ ) {
                    tempElementsRow[x].cellHeight = (base - vOffset) + 1;
                    element.subElements.push( tempElementsRow[x] );
                }

                return base;
            }

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if( true === element.isHiddenBFB ) {
                    element.subElements = [];
                    return;
                }

                var
                    bgSubElem,
                    intSubElem,
                    colWidths = estimateColumnWidths(),
                    dataRow,
                    currentRow = [],
                    x,
                    y,
                    height = 0;

                //Y.log('Table columns: ' + dcCols.cols.length + ' rows: ' + dataset.length + "\n" + JSON.stringify(colWidths), 'debug', NAME);
                //Y.log('Table data: ' + JSON.stringify(dataset, undefined, 2), 'debug', NAME);

                //  Clear any existing subelements
                element.subElements = [];

                //  add a subelement for the table background and border
                bgSubElem = Y.dcforms.createSubElement(
                    padOffset,                                     //  pad cell slightly
                    padOffset,                                     //  pad cell slightly
                    element.mm.width,
                    element.mm.height,
                    element.mm.height,
                    '',
                    ''
                );

                //bgSubElem.bgColor = element.bgColor;
                bgSubElem.borderColor = element.borderColor;
                bgSubElem.noncontent = true;
                bgSubElem.nopdf = true;
                bgSubElem.bindmark = true;                     //  show binding
                element.subElements.unshift( bgSubElem );

                //  Add column headers
                for( x = 0; x < dcCols.cols.length; x++ ) {
                    currentRow[x] = dcCols.cols[x] ? (dcCols.cols[x].title || '') : '';
                }
                height = addRow( currentRow, colWidths, height, -1 );

                //  Add data cells
                for( y = 0; y < dataset.length; y++ ) {
                    dataRow = dataset[y];
                    currentRow = [];
                    for( x = 0; x < colWidths.length; x++ ) {
                        currentRow[x] = (dataRow[dcCols.cols[x].member] || '');

                        //  make all the values **bold** and //italic// in summary rows
                        if ( dataRow.dcmeta && '' !== currentRow[x] ) {
                            currentRow[x] = '//**' + currentRow[x] + '**//';
                        }
                    }
                    height = addRow( currentRow, colWidths, height, y );

                    if( height > overflowAt ) {
                        isOverflown = true;
                        addOverflowRow( height );
                        break;
                    }
                }

                //  add a subelement for interaction in the editor
                if ( 'edit' === element.page.form.mode ) {
                    intSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.width, element.mm.height,
                        element.mm.lineHeight, '', null
                    );

                    //bgSubElem.bgColor = element.bgColor;          // (cell background rules take precedence)
                    //bgSubElem.borderColor = element.borderColor;  // (cell borders are canonical)

                    intSubElem.noncontent = true;
                    intSubElem.nopdf = true;
                    intSubElem.bindmark = true;                      //  show binding
                    intSubElem.interactive = true;
                    element.subElements.push( intSubElem );
                }
            }

            function addOverflowRow( height ) {
                var
                    msgTxt = 'Das Seitenlimit (200) wurde erreicht - Report daher unvollständig',   //  TODO: i18n

                    tempElementsWarn = Y.dcforms.markdownToSubElements(
                        msgTxt + '',                                //  markdown text
                        element.font,                               //  typeface name
                        element.mm.lineHeight,                      //  line height
                        parseFloat( element.mm.lineSpace ),           //  leading factor
                        0,                                          //  x offset (mm)
                        height,                                     //  y offset (mm)
                        element.align,                              //  text alignment (left / right / center)
                        element.mm.width,                           //  wrapping width (mm)
                        element.isBold,                             //  make bold
                        true,                                       //  make italic
                        element.isUnderline                         //  make underline
                    ),
                    i;

                for( i = 0; i < tempElementsWarn.length; i++ ) {
                    element.subElements.push( tempElementsWarn[i] );
                }
            }

            //  PUBLIC METHODS

            /**
             *  Plot subelements onto abstract canvas (all text rows of all cells)
             *
             *  @param  voffset     {Number}    Displacement due to overflow of elements above this one
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function renderAbstract( voffset, callback ) {
                //Y.log('Rendering table on abstract canvas, voffset: ' + voffset + ' subelements: ' + element.subElements.length, 'debug', NAME);

                var
                    ctx = element.page.canvasElastic.getContext( '2d' ),
                    zoom = element.page.form.zoom,
                    subElem,
                    i;

                //  value not set
                if( 0 === element.subElements.length ) {
                    Y.log( 'Rendering table before selected value has been set, or null table', 'warn', NAME );
                }

                /*
                 if (0 === element.subElements[0].width) {
                 Y.log('Rendering table to undisplayed div, column widths will be 0', 'warn', NAME);
                 return;
                 }
                 */

                //  this will clear the set of subelements if element.isHiddenBFB
                generateSubElements();

                for( i = 0; i < element.subElements.length; i++ ) {
                    subElem = element.subElements[i];
                    subElem.fgColor = element.fgColor;
                    subElem.renderToCanvas( ctx, zoom, element.mm.left, element.mm.top, voffset, true, 'abstract' );
                }

                callback( null );

            }

            /**
             *  Table elements no longer support their own edit mode
             *
             *  Tables currently have no mode-specific behavior
             *
             *  @param  newMode     {string}    Form mode name
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode( newMode, callback ) {
                Y.log( 'Table set to mode: ' + newMode, 'debug', NAME );
                generateSubElements();
                callback( null );
            }

            /**
             *  Report tables are not mapped, they draw their data directly from the reporting API
             */

            function map( newValue, callback ) {

                element.page.isDirty = true;

                if( !newValue || '' === newValue || '{}' === newValue || {} === newValue ) {
                    newValue = [];
                }

                if( 'string' === typeof newValue ) {
                    try {
                        newValue = JSON.parse( newValue );
                    } catch( parseErr ) {
                        Y.log( 'Could not parse stored table values: ' + JSON.stringify( parseErr ), 'warn', NAME );
                        Y.log( 'Table Dataset Literal: ' + newValue, 'warn', NAME );
                        newValue = [];
                    }
                }

                //  do not override user-edited fields (MOJ-3160)

                var i, j;

                for( i = 0; i < dataset.length; i++ ) {
                    for( j = 0; j < newValue.length; j++ ) {
                        if( dataset[i].activityId && newValue[j].activityId && dataset[i].activityId === newValue[j].activityId ) {

                            // special case for MOJ-4250
                            if(
                                dataset[i].hasOwnProperty( 'date' ) &&
                                newValue[j].hasOwnProperty( 'date' ) &&
                                (dataset[i].date !== newValue[j].date)
                            ) {
                                //  if date from mapper has changed we need to update it regardless of user edit
                                dataset[i].date = newValue[j].date;
                            }

                            newValue[j] = dataset[i];
                        }
                    }
                }

                //Y.log('setting data: ' + JSON.stringify(newValue, undefined, 2), 'debug', NAME);

                dataset = newValue;

                generateSubElements();

                //  and we're done, mapping call will re-render the page once all elements have been updated
                callback( null );
            }

            function unmap() {
                return dataset;
            }

            /**
             *  Cleanly unsubscribe from any events and free memory
             */

            function destroy() {
                Y.log( 'Destroying table element: ' + element.getDomId(), 'debug', NAME );
            }

            function getValue() {
                return element.value;
            }

            /**
             *  Just sets table column structure in most cases
             */

            function setValue( newValue, callback ) {
                //Y.log('Set table: ' + newValue, 'debug', NAME);

                if( element.value === newValue ) {
                    if( !element.subElements || 0 === element.subElements.length ) {
                        generateSubElements();
                    }
                    callback( null );
                    return;
                }

                element.page.isDirty = true;
                element.value = newValue;
                element.defaultValue[userLang] = newValue;
                presetId = newValue;

                loadPreset( function onPresetChanged() {
                    //  TODO: load the insight2 preset
                    generateSubElements();
                    callback( null );
                } );
            }

            /**
             *  Called after a change to the element, eg, font or background change
             *  @param callback
             */

            function update( callback ) {
                generateSubElements();
                if( callback ) {
                    return callback( null );
                }
            }

            /**
             *  Request value of a single table cell
             *  @param  row     {Number}    Row index in dataset
             *  @param  col     {Number}    Col index in dataset
             *  @returns {String}
             */

            function getCellValue( row, col ) {

                if( !dataset[row] ) {
                    return '';
                }

                var dataRow = dataset[row];

                if( !dcCols.cols[col] || !dcCols.cols[col].member || !dataRow[dcCols.cols[col].member] ) {
                    return '';
                }

                return dataRow[dcCols.cols[col].member];
            }

            /**
             *  Raised by page when user clicks within a table
             *  Used to open a value edit box for table cells if element is editable
             *
             *  @param localized
             */

            function handleClick( localized ) {
                if( !element.canEdit() || !localized || !localized.subElem || element.isHiddenBFB ) {
                    return false;
                }

                function onCellValueChanged( newValue, row, col ) {

                    element.page.isDirty = true;

                    if( !dataset[row] || !dcCols.cols[col] ) {
                        return;
                    }

                    var
                        memberName = dcCols.cols[col].member;

                    dataset[row][memberName] = newValue;
                    element.isDirty = true;
                    element.page.redrawDirty();
                    element.page.form.raise( 'valueChanged', element );
                }

                var selRow = localized.subElem.tableRow;
                var selCol = localized.subElem.tableCol;

                if( -1 === selRow ) {
                    //  clicked on header row, not editable
                    return;
                }

                element.page.form.setSelected( 'fixed', element );
                element.page.form.valueEditor = Y.dcforms.createTableValueEditor( 'fixed', element, selRow, selCol, onCellValueChanged );
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  for tables each cell may be tabbed to / editable
             *
             *  @returns {number}
             */

            function countTabStops() {
                if( !element.canEdit() || !dataset || !dataset.length || !dcCols || !dcCols.cols || element.isHiddenBFB ) {
                    return 0;
                }
                return dataset.length * dcCols.cols.length;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            //initialize();

            pubMethods = {
                'renderAbstract': renderAbstract,
                'handleClick': handleClick,
                'setMode': setMode,
                'destroy': destroy,
                'map': map,
                'unmap': unmap,
                'update': update,
                'getValue': getValue,
                'getCellValue': getCellValue,
                'setValue': setValue,
                'countTabStops': countTabStops
            };

            init();
        };

        Y.dcforms.reportToCols = function( preset, userLang ) {
            var
                newCols = {
                    'schema': 'insight2::' + preset._id,    //  debug only
                    'subform': '',                          //  not used
                    'cols': []                              //  copied from preset
                },
                align,
                field,
                title,
                hard,
                i;

            for( i = 0; i < preset.displayFields.length; i++ ) {
                field = preset.displayFields[i];
                title = ( ( field.label && field.label.de ) ? field.label.de : field.value );

                //  if report column has a different title in PDF
                if ( field.labelPdf && field.labelPdf.de ) {
                    title = field.labelPdf.de;
                }

                //  use English or other translation if requested and available
                if ( 'de' !== userLang && field.label && field.label[userLang] ) {
                    title = field.label[userLang];
                }

                align = ( field.type && 'number' === field.type.toLowerCase() ) ? 'right' : 'left';

                //  hard columns to prevent crushing numbers on table width overflow
                hard = false;
                if( field.rendererName ) {
                    switch( field.rendererName ) {
                        case 'dateFormat':
                            hard = true;
                            break;
                        case 'currencyFormat':
                            hard = true;
                            break;
                    }
                }

                newCols.cols.push( {
                    'member': field.value,                              //  db property name
                    'valueType': 'string',                              //  all strings for now
                    'title': title,                                     //  column name
                    'align': align,                                     //  numbers are right aligned
                    'hard': hard
                } );
            }

            return newCols;
        };

        /**
         *  For testing performance and memory issues with large tables
         */

        Y.dcforms.makeTestReportData = function( preset, numRows ) {
            var i, testData = [];

            for( i = 0; i < numRows; i++ ) {
                testData.push( Y.dcforms.makeTestReportDataRow( preset ) );
            }

            return testData;
        };

        /**
         *  This is for generating very large tables to test report performance MOJ-
         *  @param preset
         *  @return {{}}
         */

        Y.dcforms.makeTestReportDataRow = function( preset ) {
            var testRow = {}, field, i;

            for( i = 0; i < preset.displayFields.length; i++ ) {
                field = preset.displayFields[i];
                testRow[field.value] = 'test';

                switch( field.value ) {
                    case 'doctor':
                        testRow[field.value] = 'Doctor Name';
                        break;
                    case 'patientName':
                        testRow[field.value] = 'Patient ' + parseInt( Math.random() * 10000, 10 );
                        break;
                    case 'activityCount':
                        testRow[field.value] = parseInt( Math.random() * 200, 10 ) + '';
                        break;
                    case 'timestampDate':
                        testRow[field.value] = new Date().toString();
                        break;
                }
            }

            return testRow;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
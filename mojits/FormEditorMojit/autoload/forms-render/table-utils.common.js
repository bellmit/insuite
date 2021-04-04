/*
 *  Copyright DocCirrus GmbH 2017
 *
 *  Utility methods and layout routines common to table element types
 */

/*jslint anon:true, sloppy:true, nomen:true */
/*jshint latedef:false */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-table-utils',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.FILTER_TYPES = [ 'in', 'nin', 'eq', 'exists', 'regex' ];

        /*
         *  Table object should be like
         *
         *  table: {
         *      schema: 'Schema_T',     //  string
         *      striped: true,          //  bool
         *      cols: [
         *          { ... },
         *          { ... }
         *      ],
         *      filters: [
         *          { ... }
         *      ]
         *  }
         *
         *  column objects should be like:
         *
         *  {
         *      title: 'myCol',
         *      member: 'schemaMember',
         *      type: 'string',
         *      width: -1
         *  }
         *
         *  filter objects should be like:
         *
         *  {
         *      member: 'schemaMember',
         *      op: 'in',
         *      value: 'value1,value2,value3'
         *  }
         */

        /**
         *  Mapped table definitions have the following form, one column per line
         *
         *          **schemaName
         *          *#subformId
         *          *|schemaMember|valueType|col1_title
         *          *|schemaMember|valueType|col2_title
         *          *|schemaMember|valueType|col3_title
         *          *!schemaMember|op|value
         *
         *  DEPRECATED: this string serialization is to be replaced with a JSON object for table properties
         *
         *  @param  txtCols {string}    As above
         */

        Y.dcforms.stringToCols = function(txtCols) {

            //  historical data could be delimited in more ways
            txtCols = txtCols.replace(new RegExp("<br/>", 'g'), '{newline}');
            txtCols = txtCols.replace(new RegExp("<br>", 'g'), '{newline}');
            txtCols = txtCols.replace(new RegExp("\n", 'g'), '{newline}');      //  eslint-disable-line no-control-regex
            txtCols = txtCols.replace(new RegExp("\r", 'g'), '');               //  eslint-disable-line no-control-regex
            txtCols = txtCols.replace(new RegExp("\t", 'g'), ' ');              //  eslint-disable-line no-control-regex

            //alert('table serialization: ' + txtCols);

            var
                i,
                currLine,
                lines = txtCols.split('{newline}'),
                parts,

                dcCols = {
                    'schema': '',               //  schema name [string]
                    'subform': '',              //  formId (subform for editing table rows) [string]
                    'cols': [],                 //  column definitions [array {title,member,valueType}]
                    'filters': []               //  filter definitions [array {member,op,value}]
                };

            for (i = 0; i < lines.length; i++) {
                currLine = Y.dcforms.trim(lines[i]);

                if ('' !== currLine) {

                    currLine = Y.dcforms.unescape(currLine);

                    //  get schema name
                    if (0 === currLine.indexOf('**')) {
                        currLine = currLine.substr(2);
                        dcCols.schema = Y.dcforms.trim(currLine);
                        currLine = '';
                    }

                    //  get subform name
                    if (-1 !== currLine.indexOf('*#')) {
                        currLine = currLine.replace('*#', '');
                        dcCols.subform = Y.dcforms.trim(currLine);
                        currLine = '';
                    }

                    if ( '*!' === currLine.substr( 0, 2 ) ) {
                        parts = currLine.substr( 2 ).split( '|' );

                        dcCols.filters.push( {
                            'member': parts[0],
                            'op': parts[1],
                            'value': parts[2]
                        } );
                        currLine = '';
                    }

                    //  get column definitions
                    if (-1 !== currLine.indexOf('*|')) {
                        currLine = currLine.replace('*|', '');
                        parts = currLine.split('|');

                        //  legacy form, no column alignment specified, assume left align
                        if (3 === parts.length) {
                            dcCols.cols.push({
                                'member': parts[0],
                                'valueType': parts[1],
                                'title': parts[2],
                                'align': 'left',
                                'fixWidth': -1,
                                'hard': false
                            });
                            currLine = '';
                        }

                        //  currently, alignment is done on a per-column basis
                        if (4 === parts.length) {
                            dcCols.cols.push({
                                'member': parts[0],
                                'valueType': parts[1],
                                'title': parts[2],
                                'align': parts[3],
                                'fixWidth': -1,
                                'hard': false
                            });
                            currLine = '';
                        }

                        //  columns may have fixed width in percent
                        if (5 === parts.length) {
                            dcCols.cols.push({
                                'member': parts[0],
                                'valueType': parts[1],
                                'title': parts[2],
                                'align': parts[3],
                                'fixWidth': parts[4],
                                'hard': true
                            });
                            currLine = '';
                        }

                    }

                    //  check for parse errors
                    if ('' !== currLine) {
                        Y.log('Error while parsing ' + currLine + ' in ' + txtCols, 'warn', NAME);
                    }
                }
            }

            return dcCols;
        };

        /**
         *  Serialize a dcCols object to a string
         *
         *  DEPRECATED: string serialization to be replaced with simpler JSON object
         *
         *  @param  dcCols {Object}    As produced by method above, has schema and cols array
         */

        Y.dcforms.colsToString = function(dcCols) {
            var
                i,
                txtCols = '**' + dcCols.schema + '\n';

            if (dcCols.hasOwnProperty('subform') && (dcCols.subform !== '')) {
                txtCols = txtCols + '*#' + dcCols.subform + '\n';
            }

            for (i = 0; i < dcCols.cols.length; i++) {
                if ( !dcCols.cols[i].hasOwnProperty( 'fixWidth' ) ) { dcCols.cols[i].fixWidth = -1; }
                txtCols = txtCols +
                    '*|' + dcCols.cols[i].member +
                    '|' + dcCols.cols[i].valueType +
                    '|' + dcCols.cols[i].title +
                    '|' + (dcCols.cols[i].align || 'left') +
                    '|' + dcCols.cols[i].fixWidth + '\n';
            }

            for ( i = 0; i < dcCols.filters.length; i++ ) {
                txtCols = txtCols +
                    '*!' + dcCols.filters[i].member +
                    '|' + dcCols.filters[i].op +
                    '|' + dcCols.filters[i].value;
            }

            return txtCols;
        };

        /**
         *  Form tables can be configured to exclude rows according to simple rules
         *
         *  @param  {Object}    data        Array of table rows, should match table reduced schema
         *  @param  {Object}    filters     Array of filters configured for the table
         *  @return {*}
         */

        Y.dcforms.applyTableFilters = function( data, filters ) {
            var
                filtered = [],
                keepRow,
                i, j;

            //  skip this if there are no filters
            if ( !filters || 0 === filters.length ) {
                return data;
            }

            //  for each row of the mapped data, check that it matches all filters
            for ( i = 0; i < data.length; i++ ) {
                keepRow = true;
                for ( j = 0; j < filters.length; j++ ) {
                    if ( !matchFilter( data[i], filters[j] ) ) {
                        keepRow = false;
                    }
                }
                if ( keepRow ) {
                    filtered.push( data[i] );
                }
            }

            function matchFilter( row, filter ) {
                var
                    hasField = row.hasOwnProperty( filter.member ),
                    parts, rx, i;

                switch( filter.op ) {
                    case 'eq':
                        //  value must match, missing field is considered equal to empty value
                        if ( !hasField ) { return ( '' === filter.value ); }
                        return ( row[ filter.member ].trim() === filter.value.trim() );

                    case 'in':
                        //  value must be in a comma separated list
                        if ( !hasField ) { return false; }
                        parts = filter.value.split( ',' );
                        for ( i = 0; i < parts.length; i++ ) {
                            if ( parts[i].trim() === row[ filter.member ] ) { return true; }
                        }
                        return false;

                    case 'nin':
                        //  value must NOT be in a comma separated list
                        if ( !hasField ) { return true; }
                        parts = filter.value.split( ',' );
                        for ( i = 0; i < parts.length; i++ ) {
                            if ( parts[i].trim() === row[ filter.member ] ) { return false; }
                        }
                        return true;

                    case 'exists':
                        return hasField && '' !== row[ filter.member ].trim();

                    case 'regex':
                        if ( !hasField || '' === row[ filter.member ].trim() ) { return false; }

                        rx = new RegExp( filter.value );
                        parts = row[ filter.member ].match( rx );

                        return ( parts && parts.length > 0 );
                }

                Y.log( 'Unrecognized filter operation: ' + filter.op, 'warn', NAME );
                return false;
            }

            return filtered;
        };

        /**
         *  Serialize a form object's bindings as a serialized table object
         *
         *  DEPRECATED: this string serialization is to be replaced by a JSON structure
         *
         *  @param  jT          {Object}    jsonTemplate for a serialized form
         */

        Y.dcforms.formColsToString = function(jT) {
            var
                i,
                j,
                currElem,
                txtCols = '';

            txtCols = txtCols + '**' + jT.reducedSchema + '\n';
            txtCols = txtCols + '*#' + jT.formId + '\n';

            for (i = 0; i < jT.pages.length; i++) {
                for (j = 0; j < jT.pages[i].elements.length; j++) {

                    currElem = jT.pages[i].elements[j];

                    if (
                        currElem.hasOwnProperty('schemaMember') &&
                        currElem.hasOwnProperty('schemaType') &&
                        ('' !== currElem.schemaMember) &&
                        ('' !== currElem.schemaType)
                    ) {

                        txtCols = txtCols +
                            '*|' + currElem.schemaMember +
                            '|' + currElem.schemaType +
                            '|' + '__auto__' +            //  will be filled/translated when the schema loads
                            '|' + currElem.align +
                            '|' + '-1' + "\n";

                    }
                }
            }

            return txtCols;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
/*
 *  Binder to inspect bulk labdata
 *
 *  Used to look for edge cases / unrecognized labdata entries
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $ */

'use strict';

YUI.add('TestingMojitBinderLabdata', function(Y, NAME) {
        /**
         * The TestingMojitBinderLabdata module.
         *
         * @module TestingMojitBinderLabdata
         */


        Y.log('YUI.add TestingMojitBinderLabdata with NAMEs ' + NAME, 'info');

        var
            LAB_TABLE_FIELDS = {
                '_id': 1,
                'activityId': 1,
                'patientDbId': 1,
                'labResultDisplay': 1,
                'labTestResultVal': 1,
                'labTestResultUnit': 1,
                'labTestResultText': 1,
                'labNormalText': 1,
                'labNormalRanges': 1,
                'labHead': 1,
                'labFullText': 1,
                'labTestLabel': 1,
                'labReqReceived': 1,
                'labTestNotes': 1,
                'labMin': 1,
                'labMax': 1,
                'isPathological': 1
            };

        /**
         * Constructor for the TestingMojitBinderLabdata class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            //  Cached jQuery references
            jq: null,
            rows: [],
            reportings: [],

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                var self = this;

                self.jq = {
                    divLabdataTable: $( '#divLabdataTable' )
                };

                this.node = node;

                Y.doccirrus.jsonrpc.api.reporting
                    .read( {
                        query: {
                            'actType': 'LABDATA'
                        },
                        options: {
                            fields: LAB_TABLE_FIELDS
                        }
                    } )
                    .then( function( data ) {
                        data = data.data ? data.data : data;
                        self.reportings = data;
                        self.convertReportings();
                        self.showLabdataTable();
                    } )
                    .fail( function( err ) {
                        Y.log( 'Could not query reporting collection: ' + JSON.stringify( err ), 'warn', NAME );
                    } );

            },

            /**
             *  Place reportings in table row format used by renderer in inCase
             */

            convertReportings: function() {
                var
                    self = this,
                    activities,
                    item,
                    row,
                    i;

                for (i = 0; i < self.reportings.length; i++ ) {
                    item = self.reportings[i];

                    activities = [];
                    activities.push( {
                        '_id': item._id,
                        'activityId': item.activityId,
                        'labResultDisplay': item.labResultDisplay || '',
                        'labHead': item.labHead || '',
                        'labFullText': item.labFullText || '(missing)',
                        'labTestLabel': item.labTestLabel || '',
                        'labMin': item.labMin || '',
                        'labMax': item.labMax || '',
                        'labTestResultUnit': item.labTestResultUnit || '',
                        'labTestResultVal': item.labTestResultVal || '',
                        'labTestResultText': item.labTestResultText || '',
                        'labNormalText': item.labNormalText || '',
                        'labTestNotes': item.labTestNotes || '',
                        'labReqReceived': item.labReqReceived,
                        'timestamp': item.timestampDate,
                        'isPathological': item.isPathological
                    } );

                    row = {
                        'title': activities[0].title,
                        'type': activities[0].labHead,
                        'labMin': activities[0].labMin + '',
                        'labMax': activities[0].labMax + '',
                        'labNormalText': activities[0].labNormalText,
                        'labTestLabel': activities[0].labTestLabel,
                        'unit': activities[0].labTestResultUnit,
                        'display': activities[0].labResultDisplay,
                        'activityIds': [ item.activityId ],
                        'activities': activities
                    };

                    self.rows.push( row );
                }
            },

            showLabdataTable: function() {
                var
                    self = this,
                    rows = self.rows,
                    row,
                    meta,
                    html = '<h2>Labdata entries: ' + rows.length + '</h2>',
                    reportingUrl,
                    activityUrl,
                    reportingLink,
                    activityLink,
                    i;

                html = html +
                    '<table border="1px">' +
                    '<tr>' +
                    '<td><b>reporting</b></td>' +
                    '<td><b>activity</b></td>' +
                    '<td><b>code</b></td>' +
                    '<td><b>min</b></td>' +
                    '<td><b>max</b></td>' +
                    '<td><b>unit</b></td>' +
                    '<td><b>display</b></td>' +
                    '<td><b>render</b></td>' +
                    '<td><b>text</b></td>' +
                    '</tr>';

                for ( i = 0; i < rows.length; i++ ) {
                    row = rows[i];
                    meta = { 'row': row };

                    activityUrl = Y.doccirrus.infras.getPrivateURL( '/1/activity/' + row.activities[0].activityId );
                    reportingUrl = Y.doccirrus.infras.getPrivateURL( '/1/reporting/' + row.activities[0]._id );

                    activityLink = '' +
                        '<a href="' + activityUrl + '">' + row.activities[0].activityId  + '</a>' +
                        '<br/>' +
                        '<a href="/incase#/activity/' + row.activities[0].activityId + '">[open in inCase]</a>';

                    reportingLink = '<a href="' + reportingUrl + '">' + row.activities[0]._id  + '</a>';

                    html = html + '<tr>';
                    html = html + '<td valign="top">' + reportingLink + '</td>';
                    html = html + '<td valign="top">' + activityLink + '</td>';
                    html = html + '<td valign="top">' + row.activities[0].labHead + '</td>';
                    html = html + '<td valign="top">' + row.labMin + '</td>';
                    html = html + '<td valign="top">' + row.labMax + '</td>';
                    html = html + '<td valign="top">' + row.unit + '</td>';
                    html = html + '<td valign="top">' + row.display + '</td>';
                    html = html + '<td valign="top">' + self.rendererDate( self, meta, 0 ) + '</td>';

                    html = html + '' +
                        '<td valign="top" width="300px">' +
                        '<p style="white-space: pre-wrap;">' +
                        '<small>' + row.activities[0].labFullText + '</small>' +
                        '</p>' +
                        '</td>'; //--

                    html = html + '</tr>';

                    //console.log( '(****) row: ', row );
                }

                html = html + '</table>';

                self.jq.divLabdataTable.html( html );
            },


            /**
             *  Renders cell values of individual findings labdataKoTable
             *
             *  COPIED FROM LABDATATABLE
             *
             *  Note that reporting table will be updated with additional columns depending on 'format'
             *
             *  @method rendererDate
             *  @param  meta            {Object}
             *  @param  meta.format     {String}    Used to display different types of findings
             *  @param  meta.value      {Number}    Float value
             *  @param  meta.row        {Object}
             *  @param  meta.col        {Object}
             *  @param  activityIdx     {String}    Database _id of activity this finding it part of
             *  @returns                {String}    HTML cell contents
             */
            rendererDate: function __rendererDate( self, meta, activityIdx ) {

                var
                    row = meta.row,
                    activityId = row.activityIds[ activityIdx ],
                    html = '',
                    tempVal,
                    item,
                    img,
                    i;

                if ( !activityId ) { return 'n/a'; }

                //  get the reporting entry corresponding to this cell
                for ( i = 0; i < row.activities.length; i++ ) {
                    if ( row.activities[i].activityId === activityId ) {
                        item = row.activities[i];
                    }
                }

                if ( !item ) { return ''; }

                if ( !item.labResultDisplay ) { item.labResultDisplay = 'legacy'; }

                switch( item.labResultDisplay ) {
                    case 'minmaxval':
                        //  quantitative values with normal range
                        img = Y.doccirrus.labdata.utils.createColorBar( 255, 40, item.labMin, item.labMax, item.labTestResultVal );
                        html = '<img src="' + img + '"  width="70%" height="20px" />&nbsp;&nbsp;' + item.labTestResultVal;
                        break;

                    case 'maxvalgt':
                        html = html + item.labTestResultText;
                        break;

                    case 'upperbound':
                        html = item.labTestResultVal + item.labTestResultText;
                        break;

                    case 'label':
                    case 'minmaxtext':
                    case 'text':
                        html = html + '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + item.labTestResultText + '</p>';
                        break;

                    case 'note':
                        //  note is added after other value types
                        break;

                    case 'categorizedquantity':
                        html = html + item.labTestResultVal + '<br/>' +
                            '<p style="white-space: pre-wrap;">' +
                            '<small>' +
                            ( item.labNormalRanges ? item.labNormalRanges + '\n' : '' ) +
                            ( item.labTestResultText ? item.labTestResultText : '' ) +
                            '</small></p>';
                        break;

                    case 'maxval':
                    case 'quantitative':
                        html = html + item.labTestResultVal;
                        break;

                    case 'qualitative':
                        if ( item.labTestResultVal ) {
                            html = html + item.labTestResultVal + '\n';
                        }
                        html = html + item.labTestResultText;
                        break;

                    case 'failed':
                        html = html + item.labTestResultText;
                        break;

                    default:
                        tempVal = item.labFullText; // ---
                        item.labFullText = '[truncated]';
                        html = '' +
                            '<small>' +
                            'type: ' + item.labResultDisplay + '<br/>' +
                            'report: ' + item._id + '<br/>' +
                            'activity: ' + item.activityId +
                            '</small><br/>' +
                            '<pre>' + JSON.stringify( item, undefined, 2 ) + '</pre>';

                        item.labFullText = tempVal;
                        break;
                }

                if ( item.labTestNotes && '' !== item.labTestNotes ) {
                    html = html + '<div><small><i>' + item.labTestNotes + '</i></small></div>';
                }

                if ( item.isPathological ) {
                    //  TODO: const, configuration
                    html = '<div style="background-color: #ff9999; background-size: 110%;">' + html + '</div>';
                }

                html = '<div ko-hover-id="' + item._id + '">' + html + '</div>';
                return html;
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',

            'dcmedia-fonts',

            'JsonRpcReflection-doccirrus',
            'dcutils',
            'labdata-finding-utils'
        ]
    }
);
/**
 *  Common component top interpret and mark up labdata results
 *
 *  These results come in a variety of formats and may be charted and displayed differently depending on the values
 *  received.
 *
 *  User: strix
 *  Date: 20/10/16
 *  (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, $, moment */
'use strict';

YUI.add( 'labdata-finding-utils', function( Y /*, NAME */ ) {

    //var i18n = Y.doccirrus.i18n;

    var
        COLOR_PATHOLOGICAL = '#FF3333',
        PREVIOUS_VERSIONS_MARKER = '<!-- previous versions -->';

    //  TODO: handle case of only min value, or only max value

    /**
     *  Client-side method to generate a small chart of a value within a range
     *
     *  Used to show quantitative findings in labdata tables
     *
     *  @param  width   {Number}    Pixels, integer
     *  @param  height  {Number}    Pixels, integer
     *  @param  min     {Number}    Smallest value in expected range, float
     *  @param  max     {Number}    Largest value in expected range, float
     *  @param  value   {Number}    Laboratory finding, float
     *  @return         {String}    HTML image
     */

    function createColorBar( width, height, min, max, value ) {
        var
            quarterWidth = Math.floor( width / 4 ),
            jqCnv = $( '<canvas width="' + width + '" height="' + height + '"></canvas>' ),
            ctx = jqCnv[0].getContext( '2d' ),
            red, green, blue,
            unit = Math.PI / width,
            range = max - min,

            invalidEntry = (min === max),

            unitMeasure = (width * 0.5) / range,
            valueMeasure = (value - min) * unitMeasure,
            valuePosition = Math.floor( valueMeasure + quarterWidth ),
            extrema = false,
            i;

        //console.log( 'Adding color bar - min: ' + min + ' max: ' + max + ' range: ' + range + ' value: ' + value );
        //console.log( 'unitmeasure: ' + unitMeasure + ' valueMeasure: ' + valueMeasure + ' valuePosition: ' + valuePosition );

        //  show a greyed out bar if no value
        if( invalidEntry ) {
            ctx.fillStyle = 'rgb(230,230,230)';
            ctx.fillRect( 0, 0, width, height );
            ctx.fillStyle = 'rgb(180,180,180)';
            ctx.fillRect( quarterWidth, 0, 1, height );
            ctx.fillRect( (quarterWidth * 3), 0, 1, height );
            return jqCnv[0].toDataURL();
        }

        if( valuePosition < 0 ) {
            valuePosition = 0;
            extrema = true;
        }
        if( valuePosition > width ) {
            valuePosition = width;
            extrema = true;
        }

        for( i = 0; i < width; i++ ) {
            red = Math.floor( Math.abs( width * (Math.sin( unit * i )) ) );

            red = 255 - red;
            green = 255 - red;

            red = 192 + Math.floor( red / 4 );
            green = 192 + Math.floor( green / 4 );

            blue = 100; //

            if( quarterWidth === i || 3 * quarterWidth === i || valuePosition === i ) {
                red = 120;
                green = 120;
                blue = 120;
            }

            if( valuePosition === i ) {
                red = 50;
                green = 50;
                blue = 50;
            }

            ctx.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')';
            ctx.fillRect( i, 0, 1, height );
        }

        red = 50;
        green = 50;
        blue = 50;
        ctx.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')';

        ctx.beginPath();
        ctx.arc( valuePosition, height / 2, 3, 0, 2 * Math.PI );
        ctx.stroke();

        if( extrema ) {
            ctx.beginPath();
            ctx.arc( valuePosition, height / 2, 5, 0, 2 * Math.PI );
            ctx.stroke();
        }

        return jqCnv[0].toDataURL();
    }

    /**
     *  New labdata value graphic following feedback and example from customer
     *
     *  Colors changed from original following feedback as described in MOJ-9780
     *
     *  @param  {Number}    width       Pixels
     *  @param  {Number}    height      Pixels
     *  @param  {Number}    min
     *  @param  {Number}    max
     *  @param  {Number}    value
     *
     *  @return {string|*|String}   DataURI
     */

    function createColorBar2( width, height, min, max, value ) {
        var
            COLOR_GRAY = 'rgb(230,230,230)',
            COLOR_RED = 'rgb(210,0,0)',
            COLOR_GREEN = 'rgb(90,210,90)',
            COLOR_CARET = 'rgb(40,40,40)',

            PILL_RADIUS = 4,
            PILL_TOTAL = 11,
            PILL_GAP = 3,

            cnv = Y.dcforms.makeCanvasObject( width, height ),
            ctx = cnv.getContext( '2d' ),

            invalidEntry = (min === max),
            i;

        //  Draw a blobby 'pill' graphic on the bar
        function addPill( idx, total, radius, color ) {
            var
                pillWidth = width / total,
                pillLeft = (idx * pillWidth) + (PILL_GAP / 2),
                rectWidth = pillWidth - (2 * radius),
                pillRight = ((idx + 1) * pillWidth) - (PILL_GAP / 2),
                midHeight = Math.floor( height / 2 );

            ctx.fillStyle = color;
            ctx.strokeStyle = color;

            ctx.fillRect( pillLeft + radius, midHeight - radius, rectWidth, radius * 2 );

            ctx.beginPath();
            ctx.arc( pillLeft + radius, midHeight, radius, 0.5 * Math.PI, 1.5 * Math.PI );
            ctx.stroke();
            ctx.fill();

            ctx.beginPath();
            ctx.arc( pillRight - radius, midHeight, radius, 1.5 * Math.PI, 0.5 * Math.PI );
            ctx.stroke();
            ctx.fill();

        }

        //  assumes two red pills on either end of the normal range, seven in the range, 11 in total
        function drawCaret( total, bumpers ) {
            var
                normalRange = (parseFloat( max ) - parseFloat( min )),
                normalPills = (total - (bumpers * 2)),
                pillWidth = (width / total),
                pillUnit = (normalRange / normalPills),                   //   how much per bump
                caretProportion = ((value - min) / normalRange),
                caretPosition = ((caretProportion * normalPills * pillWidth) + (bumpers * pillWidth)),
                caretBase = Math.floor( height / 3 ),
                caretSize = 10;

            if( (min - (bumpers * pillUnit)) > value ) {
                //  lower extrema, lock to base of scale
                caretPosition = 0;
            }

            if( value > (max + (bumpers * pillUnit)) ) {
                //  upper extrema, lock to top of scale
                caretPosition = width;
            }

            ctx.fillStyle = COLOR_CARET;
            ctx.beginPath();
            ctx.moveTo( caretPosition, caretBase );
            ctx.lineTo( caretPosition - caretSize, caretBase - caretSize );
            ctx.lineTo( caretPosition + caretSize, caretBase - caretSize );
            ctx.lineTo( caretPosition, caretBase );
            ctx.stroke();
            ctx.fill();
        }

        //console.log( 'Adding color bar - min: ' + min + ' max: ' + max + ' range: ' + range + ' value: ' + value );
        //console.log( 'unitmeasure: ' + unitMeasure + ' valueMeasure: ' + valueMeasure + ' valuePosition: ' + valuePosition );

        //  show a greyed out bar if no value
        if( invalidEntry ) {
            ctx.fillStyle = COLOR_GRAY;

            //ctx.fillStyle = 'rgb(180,180,180)';
            //ctx.fillRect( quarterWidth, 0, 1, height );
            //ctx.fillRect( (quarterWidth * 3), 0, 1, height );

            for( i = 0; i < 11; i++ ) {
                addPill( i, PILL_TOTAL, PILL_RADIUS, 'rgb(230,230,230)' );
            }

            return cnv.toDataURL( 'image/png' );
        }

        addPill( 0, PILL_TOTAL, PILL_RADIUS, COLOR_RED );
        addPill( 1, PILL_TOTAL, PILL_RADIUS, COLOR_RED );
        addPill( 2, PILL_TOTAL, PILL_RADIUS, COLOR_RED );
        addPill( 3, PILL_TOTAL, PILL_RADIUS, COLOR_GREEN );
        addPill( 4, PILL_TOTAL, PILL_RADIUS, COLOR_GREEN );
        addPill( 5, PILL_TOTAL, PILL_RADIUS, COLOR_GREEN );
        addPill( 6, PILL_TOTAL, PILL_RADIUS, COLOR_GREEN );
        addPill( 7, PILL_TOTAL, PILL_RADIUS, COLOR_GREEN );
        addPill( 8, PILL_TOTAL, PILL_RADIUS, COLOR_RED );
        addPill( 9, PILL_TOTAL, PILL_RADIUS, COLOR_RED );
        addPill( 10, PILL_TOTAL, PILL_RADIUS, COLOR_RED );

        drawCaret( 11, 3 );

        return cnv.toDataURL( 'image/png' );
    }

    /**
     *  Create color bar and set as image subelement for labdata table in forms
     *
     *  @param  {Number}    x           top, mm
     *  @param  {Number}    y           left, mm
     *  @param  {Number}    width       width, mm
     *  @param  {Number}    height      height, mm
     *  @param  {Number}    zoom        float, conversion factor from mm to pixels on canvas
     *  @param  {String}    chartDef    Simplified chart definition as mapped into forms
     *  @param  {Function}  callback    Of the form fn( err, subElem )
     *  @return {*}
     */

    function createColorBar2Subelem( x, y, width, height, zoom, chartDef, callback ) {
        var
            parts = chartDef.split( '|' ),
            chartMin = parseFloat( parts[1] ),
            chartMax = parseFloat( parts[2] ),
            chartVal = parseFloat( parts[3] ),
            dataURI = createColorBar2( (width * zoom), (height * zoom), chartMin, chartMax, chartVal ),
            img,
            colorBarElem;

        //  callback immediately if on server
        if( Y.dcforms.isOnServer ) {
            return onDataURILoaded();
        }

        img = new Image();
        img.src = dataURI;
        img.onload = onDataURILoaded;
        img.onerror = onDataURIError;

        function onDataURILoaded() {
            colorBarElem = Y.dcforms.createSubElement(
                x, y,
                width, height,
                height,
                '',
                img
            );

            callback( null, colorBarElem );
        }

        function onDataURIError( err ) {
            callback( err );
        }
    }

    /**
     *  Get LDT version of a LABDATA activity
     *
     *  @param      {Object}    activity                Plain activity or viewModel
     *  @returns    {String}    ('ldt20'||'ldt30')
     */

    function getLdtVersion( activity ) {
        var
            l_version,
            l_version_name = 'ldt20';           //  default, not specified in some old data

        if( activity.l_version ) {

            l_version = ('function' === typeof activity.l_version) ? activity.l_version() : activity.l_version;

            if( l_version.name ) {
                l_version_name = ('function' === typeof l_version.name) ? l_version.name() : l_version.name;
            }

        }

        return l_version_name;
    }

    /**
     *  Create a color bar and save it to a temporary directory on disk
     *  Used on server when adding color bars to PDF
     *
     *  @param {Number}     width
     *  @param {Number}     height
     *  @param {Number}     min
     *  @param {Number}     max
     *  @param {Number}     value
     *  @param {Function}   callback
     */

    function createColorBar2OnDisk( width, height, min, max, value, callback ) {
        var
            CLEANUP_TIMEOUT = 180 * 1000,
            dataURI = createColorBar2( width, height, min, max, value ),
            buffer = Y.doccirrus.media.dataUriToBuffer( dataURI ),
            mediaStub = {'mime': 'IMAGE_PNG', 'transform': 'chart'},
            tempFile = Y.doccirrus.media.getTempFileName( mediaStub ),
            tempDir = Y.doccirrus.media.getTempDir();

        Y.doccirrus.media.writeFile( tempFile, tempDir, buffer, onFileSaved );

        //  in some cases the color bar is not cleaned up, delete it after a few minutes
        setTimeout( function() {
            onCheckCleanup();
        }, CLEANUP_TIMEOUT );

        function onFileSaved( err /*, result */ ) {
            if( err ) {
                return callback( err );
            }
            callback( null, tempFile );
        }

        function onCheckCleanup() {
            Y.doccirrus.media.cleanTempFiles( {'_tempFiles': [tempFile]} );
        }
    }

    function sanitizeFullText( labFullText ) {
        labFullText = labFullText.replace( new RegExp( '"', 'g' ), '&quot;' );
        labFullText = labFullText.replace( new RegExp( '>', 'g' ), '&gt;' );
        labFullText = labFullText.replace( new RegExp( '<', 'g' ), '&lt;' );
        return labFullText;
    }

    /**
     *  Render the contents of a table cell representing one of many ladata value types, full view
     *
     *  @param  {Object}    item                Simplified finding
     *  @param  {Boolean}   markPathological    True if pathological entries are to be marked in red
     *  @param  {Boolean}   [showNotes]         True if additional /explanatory notes should ne included
     *  @param  {Boolean}   [showHighLow]       True if (+) (-) mark should be included for values above/below normal range
     */

    function makeFindingValueCellLdt2( item, markPathological, showNotes, showHighLow ) {
        var
            html = '',
            fullTextSafe,
            img;

        if( !item ) {
            return '';
        }
        if( !item.labResultDisplay ) {
            item.labResultDisplay = 'legacy';
        }

        fullTextSafe = sanitizeFullText( item.labFullText || '' );

        switch( item.labResultDisplay ) {
            case 'minmaxval':
                //  quantitative values with normal range
                img = Y.doccirrus.labdata.utils.createColorBar2( 500, 40, item.labMin, item.labMax, item.labTestResultVal );
                html =
                    '<!-- CHARTMINMAX|' + item.labMin + '|' + item.labMax + '|' + item.labTestResultVal + ' -->\n' +
                    '<img src="' + img + '"  width="70%" height="20px" />' + '&nbsp;&nbsp;' + item.labTestResultVal;
                break;

            case 'minmaxtext':
                //  quantitative values with normal range
                html = item.labTestResultText;
                break;

            case 'upperbound':
                html = item.labTestResultVal + item.labTestResultText;
                break;

            case 'maxvalcolon':
            case 'maxvalgt':
                html = html + item.labTestResultText;
                break;

            case 'label':
            case 'text':
                html = html + '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + item.labTestResultText + '</p>';
                break;

            case 'note':
                //  note is added after other value types
                break;

            case 'minval':
            case 'maxval':
            case 'qualitative':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    html = html + item.labTestResultVal + '\n';
                }
                html = html + item.labTestResultText;
                break;

            case 'quantitative':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    //swiss HL7 workaround
                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                        img = Y.doccirrus.labdata.utils.createColorBar2( 500, 40, item.labMin, item.labMax, item.labTestResultVal );
                        html =
                            '<!-- CHARTMINMAX|' + item.labMin + '|' + item.labMax + '|' + item.labTestResultVal + ' -->\n' +
                            '<img src="' + img + '"  width="70%" height="20px" />' + '&nbsp;&nbsp;' + item.labTestResultVal;
                    } else {
                        html = html + item.labTestResultVal + '\n';
                    }
                }
                html = html + item.labTestResultText;
                break;

            case 'failed':
                html = html + item.labTestResultText;
                break;

            case 'categorizedquantity':
                html = html + item.labTestResultVal + '<br/>' +
                       '<p style="white-space: pre-wrap;">' +
                       '<small>' +
                       (item.labTestResultText ? item.labTestResultText : '') +
                       '</small></p>';
                break;

            default:
                html = html + item.labTestResultVal + '<br/>' +
                       '<p style="white-space: pre-wrap;">' +
                       '<small>' +
                       fullTextSafe +
                       '</small></p>';
                break;

        }

        if( showHighLow ) {
            html = html + getFindingHighLowMarker( item );
        }

        html = html + PREVIOUS_VERSIONS_MARKER;

        if( showNotes && item.labTestNotes && '' !== item.labTestNotes ) {
            html = html + '<div><small><i>' + item.labTestNotes + '</i></small></div>';
        }

        if( item.isPathological && markPathological ) {
            html = '<div style="color: ' + COLOR_PATHOLOGICAL + ';">' + html + '</div>';
        }

        //html = '<small>' + item.labResultDisplay + ':</small><br/>' + html; // <--- debug

        html = '' +
               '<div ' +
               'ko-hover-id="' + item._id + '" ' +
               'data-toggle="tooltip" ' +
               'data-placement="bottom" ' +
               'title="' + fullTextSafe + '"' +
               '>' + html + '</div>';

        return html;
    }

    /**
     *  Render the contents of a table cell representing one of many ladata value types, compact view
     *
     *  @param  {Object}    item                Simplified finding
     *  @param  {Boolean}   markPathological    True if pathological entries are to be marked in red
     *  @param  {Boolean}   showNotes           True if additional /explanatory notes should ne included
     *  @param  {Boolean}   showHighLow         True if (+) (-) mark should be included for values above/below normal range
     */

    function makeFindingValueCompactCellLdt2( item, markPathological, showNotes, showHighLow ) {
        var
            html = '',
            fullTextSafe,
            smallText = '';

        if( !item ) {
            return '';
        }
        if( !item.labResultDisplay ) {
            item.labResultDisplay = 'legacy';
        }

        if( item.labTestResultText ) {
            if( item.labTestResultText.length < 30 ) {
                smallText = item.labTestResultText;
            } else {
                smallText = item.labTestResultText.substr( 0, 20 ) + '...';
            }
        }

        fullTextSafe = sanitizeFullText( item.labFullText || '' );

        switch( item.labResultDisplay ) {
            case 'minmaxval':
                //  quantitative values with normal range
                html = item.labTestResultVal;
                break;

            case 'minmaxtext':
            case 'maxvalcolon':
            case 'maxvalgt':
                html = html + item.labTestResultText;
                break;

            case 'upperbound':
                html = item.labTestResultVal + item.labTestResultText;
                break;

            case 'label':
            case 'text':
                html = html + smallText;
                break;

            case 'note':
                //  note is added after other value types
                break;

            case 'qualitative':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    html = html + item.labTestResultVal + '\n';
                }
                html = html + smallText;
                break;

            case 'minval':
            case 'maxval':
            case 'quantitative':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    html = html + item.labTestResultVal + '\n';
                }

                html = html + smallText;
                break;

            case 'categorizedquantity':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    html = html + item.labTestResultVal + '\n';
                }
                break;

            case 'failed':
                html = html + item.labTestResultText;
                break;

            //  format not recognized
            default:
                html = html + item.labTestResultVal + '<br/>' +
                       '<p style="white-space: pre-wrap;">' +
                       '<small>' +
                       ((fullTextSafe.length > 30) ? fullTextSafe.substr( 0, 30 ) + '...' : fullTextSafe) +
                       '</small></p>';
                break;
        }

        if( showHighLow ) {
            html = html + getFindingHighLowMarker( item );
        }

        html = html + PREVIOUS_VERSIONS_MARKER;

        if( showNotes && item.labTestNotes && '' !== item.labTestNotes ) {
            html = html + '<div><small><i>' + item.labTestNotes + '</i></small></div>';
        }

        if( item.isPathological && markPathological ) {
            //  TODO: const, configuration
            html = '<div style="color: ' + COLOR_PATHOLOGICAL + ';">' + html + '</div>';
        }

        //html = '<small>' + item.labResultDisplay + ':</small><br/>' + html;  //<--- debug

        html = '' +
               '<div ' +
               'ko-hover-id="' + item._id + '" ' +
               'data-toggle="tooltip" ' +
               'data-placement="bottom" ' +
               'title="' + fullTextSafe + '"' +
               '>' + html + '</div>';

        return html;
    }

    function getFindingHighLowMarker( item ) {
        //  if limit indicator specifically sent by lab / Grenzwert-Indikator field MOJ-10824
        if( item.limitIndicator ) {
            return ' (' + item.limitIndicator + ')';
        }

        var marker = item.isPathological ? ' (*)' : '';

        //  not sent by lab, check if value is too high
        if(
            'number' === typeof item.labMax &&
            'number' === typeof item.labTestResultVal &&
            item.labTestResultVal > item.labMax
        ) {
            marker = ' (+)';
        }

        //  not sent by lab, check if value is too low
        if(
            'number' === typeof item.labMin &&
            'number' === typeof item.labTestResultVal &&
            item.labTestResultVal < item.labMin
        ) {
            marker = ' (-)';
        }
        return marker;
    }

    /**
     *  Render the contents of a table cell representing one of many ladata value types, full view for PDF / form table
     *
     *  @param  {Object}    item                Simplified finding
     *  @param  {Boolean}   [markPathological]  True if pathological entries are to be marked in red
     *  @param  {Boolean}   [showNotes]         True if additional /explanatory notes should ne included
     *  @param  {Boolean}   [showHighLow]       True if (+) (-) mark should be included for values above/below normal range
     */

    function makeFindingValuePdfCellLdt2( item, showCharts, showNotes, showHighLow ) {
        var
            html = '',
            textToDisplay = '',
            fullTextSafe;

        if( !item ) {
            return '';
        }
        if( !item.labResultDisplay ) {
            item.labResultDisplay = 'legacy';
        }

        fullTextSafe = sanitizeFullText( item.labFullText || '' );

        switch( item.labResultDisplay ) {
            case 'minmaxval':
                if(item.isPathological && item.labTestResultVal ) {
                    textToDisplay = ' !color=rgba(255,1,1,1) ' +  item.labTestResultVal + ' !color=';
                } else {
                    textToDisplay = item.labTestResultVal;
                }

                //  quantitative values with normal range
                if( showCharts ) {
                    html =
                        'CHARTMINMAX|' + item.labMin + '|' + item.labMax + '|' + item.labTestResultVal + '|' + (item.isPathological ? 'P' : 'X') + '\n' +
                        textToDisplay;
                } else {
                    html = textToDisplay;
                }

                break;

            case 'minmaxtext':
                //  quantitative values with normal range
                html = item.labTestResultText;
                break;

            case 'upperbound':
                html = item.labTestResultVal + item.labTestResultText;
                break;

            case 'maxvalcolon':
            case 'maxvalgt':
                html = html + item.labTestResultText;
                break;

            case 'label':
            case 'text':
                if( item.isPathological && item.labTestResultText ) {
                    textToDisplay = ' !color=rgba(255,1,1,1) ' +  item.labTestResultText + ' !color= ';
                } else {
                    textToDisplay = item.labTestResultText;
                }
                html = html + '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + textToDisplay + '</p>';
                break;

            case 'note':
                //  note is added after other value types
                break;

            case 'minval':
            case 'maxval':
            case 'qualitative':
                if ( item.isPathological ) {
                    if ( item.labTestResultVal || 0 === item.labTestResultVal ) {
                        html = html + ' !color=rgba(255,1,1,1) ' +  item.labTestResultVal + ' !color= ' + '\n';
                    }

                    if ( item.labTestResultText ) {
                        html = html + ' !color=rgba(255,1,1,1) ' +  item.labTestResultText + ' !color= ';
                    }
                } else {

                    if ( item.labTestResultVal || 0 === item.labTestResultVal ) {
                        html = html + item.labTestResultVal + '\n';
                    }

                    html = html + item.labTestResultText;
                }
                break;

            case 'quantitative':
                if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                    html = html + item.labTestResultVal + '\n';
                }
                html = html + item.labTestResultText;
                break;

            case 'failed':
                html = html + item.labTestResultText;
                break;

            case 'categorizedquantity':
                html = html + item.labTestResultVal + '<br/>' +
                       '<p style="white-space: pre-wrap;">' +
                       '<small>' +
                       (item.labTestResultText ? item.labTestResultText : '') +
                       '</small></p>';
                break;

            default:
                html = html + item.labTestResultVal + '<br/>' +
                       '<p style="white-space: pre-wrap;">' +
                       '<small>' +
                       fullTextSafe +
                       '</small></p>';
                break;

        }

        if( showHighLow ) {
            html = html + getFindingHighLowMarker( item );
        }

        if( showNotes && item.labTestNotes && '' !== item.labTestNotes ) {
            html = html + '\n//' + item.labTestNotes + '//';
        }

        return html + '';
    }

    /**
     *  Return array of findings of a (possibly complex) labdata entry (detect LDT version)
     *
     *  @param  {Object}    activity
     *  @param  {String}    activity.actType    Should be LABDATA
     *  @param  {Object}    activity.l_extra    Labdata findings
     *  @return {Array}
     */

    function collapseLExtra( activity ) {
        //  only possible for LABDATA activities
        if( 'LABDATA' !== activity.actType || !activity.l_extra ) {
            return '';
        }

        var ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity );

        if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
            return collapseLExtraLdt3( activity );
        } else {
            return collapseLExtraLdt2( activity );
        }
    }

    /**
     *  Return array of findings of a (possibly complex) labdata entry, LDT2 format and user-created LABDATA activities
     *
     *  @param  {Object}    activity
     *  @param  {Object}    activity.l_extra    Labdata findings
     *  @return {Array}
     */

    function collapseLExtraLdt2( activity ) {
        var
            l_extra = activity.l_extra,
            i, j, k,
            compiled = [],
            //  V are replaced by T, which are replaced by E, etc
            precedence = ['V', 'T', 'E', 'N', 'A'];

        // MOJ-14369
        // the first entries on swiss customer system were falsely created as 'A',
        // but should rather be 'T'. This is a workaround to display the latest value
        // for a test with the faulty data in mind.
        if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
            precedence = ['V', 'T', 'A', 'E', 'N'];
        }

        //  simple/legacy format
        if( !l_extra ) {
            return [];
        }
        var testIds = Y.doccirrus.schemas.lablog.getRecordTests( l_extra );
        if( testIds && Array.isArray( testIds ) ) {
            return testIds;
        }
        if( l_extra.sampleRequests && Array.isArray( l_extra.sampleRequests ) ) {
            return l_extra.sampleRequests;
        } //no abstraction, LDT2 specific

        //  invalid or empty
        if( !Array.isArray( l_extra ) ) {
            return [];
        }

        //  MOJ-7432 Updated - add individual findings according to precedence
        //  MOJ-9261 Updated - count alternative versions of a finding (previous Teilbefund, etc)

        //  replace current finding if found
        function addToCompilation( test, record ) {
            var x;

            //  check if we already have a result of this kind/id (eg, provisional findings)
            for( x = 0; x < compiled.length; x++ ) {
                if( Y.doccirrus.schemas.lablog.getTestId( compiled[x] ) === Y.doccirrus.schemas.lablog.getTestId( test ) ) {
                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                        compiled[x].previousVersions += 1;
                        if( test.testResultVal || test.sampleResultText ) {
                            test.previousVersions = compiled[x].previousVersions;
                            compiled[x] = test;
                        }
                    } else {
                        test.previousVersions = compiled[x].previousVersions + 1;
                        compiled[x] = test;
                    }
                    return;
                }
            }
            //  none found, add it
            test.previousVersions = 0;

            test.labReqReceived = record.labReqReceived;

            //  there may be multiple endbefunde with different dates, MOJ-10521
            compiled.push( test );
        }

        var record, recTestIds;

        for( k in precedence ) {
            if( precedence.hasOwnProperty( k ) ) {

                //  repeatedly filter to finding kind
                for( i = 0; i < l_extra.length; i++ ) {
                    record = l_extra[i];

                    if( precedence[k] === Y.doccirrus.schemas.lablog.getRecordFindingKind( record ) ) {

                        recTestIds = Y.doccirrus.schemas.lablog.getRecordTests( record );

                        //  record individual findings in compilation
                        if( recTestIds && Array.isArray( recTestIds ) ) {
                            for( j = 0; j < recTestIds.length; j++ ) {
                                addToCompilation( recTestIds[j], record );
                            }
                        }
                        if( record.sampleRequests && Array.isArray( record.sampleRequests ) ) { //no abstraction, LDT2 specific
                            for( j = 0; j < record.sampleRequests.length; j++ ) {
                                addToCompilation( record.sampleRequests[j], record );
                            }
                        }
                    }
                }

            }
        }

        return compiled;
    }

    /**
     *  Return array of findings of a (possibly complex) labdata entry, LDT3 format
     *
     *  @param  {Object}    activity
     *  @param  {Object}    activity.l_extra    Labdata findings
     *  @return {Array}
     */

    function collapseLExtraLdt3( activity ) {
        if( !activity.l_extra ) {
            return [];
        }

        var
            l_extra = activity.l_extra,
            findings = [],
            findingsList = Y.doccirrus.schemas.lablog.getRecordTests( l_extra ),
            ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity ),
            testObj,
            i;

        for( i = 0; i < findingsList.length; i++ ) {

            testObj = unwrapFindingObjLdt3( findingsList[i] );

            if( testObj ) {
                findings.push( Y.doccirrus.forms.labdata.expandSingleTestResultLdt3( l_extra, ldtVersion, testObj ) );
            }
        }

        //  Check for 'additional information' section and add to findings table as its own element MOJ-9261
        getAdditionalInfoAsFinding( l_extra, findings );

        return findings;
    }

    /**
     *  Select LDT3 sub-objects which correspond to finding types
     *  @param item
     *  @return {*}
     */

    function unwrapFindingObjLdt3( item ) {
        var findingObj = null;

        if( item.Obj_0055 ) {
            findingObj = item.Obj_0055;
        }    //  "Obj_Transfusionsmedizin/Mutterschaftsvorsorge"
        if( item.Obj_0060 ) {
            findingObj = item.Obj_0060;
        }    //  "Obj_Untersuchungsergebnis Klinische Chemie"
        if( item.Obj_0061 ) {
            findingObj = item.Obj_0061;
        }    //  "Obj_Untersuchungsergebnis Mikrobiologie"
        if( item.Obj_0062 ) {
            findingObj = item.Obj_0062;
        }    //  "Obj_Untersuchungsergebnis Zytologie Krebsvorsorge"
        if( item.Obj_0063 ) {
            findingObj = item.Obj_0063;
        }    //  "Obj_Untersuchungsergebnis Zytologie"

        if( findingObj ) {
            findingObj.parentCategory = item.head;
        }

        return findingObj;
    }

    /**
     *  Check for LDT3 'additional information' text describing this set of findings
     *  @param l_extra
     *  @param findings
     */

    function getAdditionalInfoAsFinding( l_extra, findings ) {
        var additionalText = '';

        if(
            l_extra &&
            l_extra.recordType &&
            l_extra.recordType.obj_0035Attribute &&
            l_extra.recordType.obj_0035Attribute.Obj_0035 &&
            l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute &&
            l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute[0] &&
            l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute[0].Obj_0068 &&
            l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute[0].Obj_0068.text &&
            l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute[0].Obj_0068.text.length
        ) {

            additionalText = l_extra.recordType.obj_0035Attribute.Obj_0035.obj_0068Attribute[0].Obj_0068.text.join( '\n' );

            findings.push( {
                labHead: 'INFO',
                isPathological: false,
                labFullText: additionalText,
                additionalInfo: '',
                labTestLabel: 'Zusaetzliche Informationen',
                labTestResultUnit: '',
                parentCategory: 'UE_Klinische_Chemie',        //  TODO: Checkme
                rawFinding: {
                    additionalInfo: additionalText
                },
                labResults: [
                    {
                        isPathological: false,
                        labMax: null,
                        labMin: null,
                        labNormalText: '',
                        labResultDisplay: 'text',
                        labTestResultText: additionalText,
                        labTestResultUnit: '',
                        labTestResultVal: null,
                        testResultLimitIndicator: ''
                    }
                ]
            } );

        }
    }

    function makeFindingValueCellLdt3( item, markPathological ) {
        var
            html = '',
            fullTextSafe,
            finding,
            style,
            img,
            i;

        fullTextSafe = sanitizeFullText( item.labFullText || '' );

        for( i = 0; i < item.labResults.length; i++ ) {
            finding = item.labResults[i];
            style = (item.isPathological && markPathological) ? ' style="color: ' + COLOR_PATHOLOGICAL + ';"' : '';

            switch( finding.labResultDisplay ) {
                case 'text':
                    if( finding.labTestResultVal && '' !== finding.labTestResultVal ) {
                        html = html + '<p' + style + '>' + finding.labTestResultVal + '</p><br/>';
                    }
                    if( finding.labTestResultText && '' !== finding.labTestResultText ) {
                        html = html + '<p' + style + '>' + finding.labTestResultText + '</p><br/>';
                    }
                    break;

                case 'minmaxval':
                    //  quantitative values with normal range
                    img = Y.doccirrus.labdata.utils.createColorBar2( 500, 40, finding.labMin, finding.labMax, finding.labTestResultVal );
                    html =
                        '<!-- CHARTMINMAX|' + finding.labMin + '|' + finding.labMax + '|' + finding.labTestResultVal + ' -->\n' +
                        '<img src="' + img + '"  width="70%" height="20px" />' + '&nbsp;&nbsp;' + finding.labTestResultVal + '<br/>';

                    if( item.isPathological && markPathological ) {
                        //  TODO: const, configuration
                        html = '<div' + style + '>' + html + '</div>';
                    }

                    break;
            }
        }

        if( item.additionalInfo ) {
            item.additionalInfo = item.additionalInfo.replace( new RegExp( '\"', 'g' ), '&quot;' );
            html = html +
                   '<span style="float: right;">' +
                   '<i class="fa fa-info-circle" data-toggle="tooltip" title="' + item.additionalInfo + '" ></i>' +
                   '</span>';
        }

        html = '' +
               '<div ' +
               'ko-hover-id="' + item._id + '" ' +
               'data-toggle="tooltip" ' +
               'data-placement="bottom" ' +
               'title="' + fullTextSafe + '"' +
               '>' + html + '</div>';

        return html;
    }

    function makeFindingValueCompactCellLdt3( item, markPathological ) {
        var
            html = '',
            finding,
            smallText,
            fullTextSafe,
            style,
            i;

        fullTextSafe = sanitizeFullText( item.labFullText || '' );

        for( i = 0; i < item.labResults.length; i++ ) {
            finding = item.labResults[i];
            style = (item.isPathological && markPathological) ? ' style="color: ' + COLOR_PATHOLOGICAL + ';"' : '';

            switch( finding.labResultDisplay ) {
                case 'text':

                    if( finding.labTestResultVal ) {
                        if( finding.labTestResultVal.length < 30 ) {
                            smallText = finding.labTestResultVal;
                        } else {
                            smallText = finding.labTestResultVal.substr( 0, 20 ) + '...';
                        }
                    }

                    if( finding.labTestResultText ) {
                        if( finding.labTestResultText.length < 30 ) {
                            smallText = finding.labTestResultText;
                        } else {
                            smallText = finding.labTestResultText.substr( 0, 20 ) + '...';
                        }
                    }

                    html = html + '<p' + style + '>' + smallText + '</p><br/>';
                    break;

                case 'minmaxval':
                    //  quantitative values with normal range
                    html = finding.labTestResultVal + '<br/>';

                    if( item.isPathological && markPathological ) {
                        html = '<div' + style + '>' + html + '</div>';
                    }

                    break;
            }
        }

        if( item.additionalInfo ) {
            item.additionalInfo = item.additionalInfo.replace( new RegExp( '\"', 'g' ), '&quot;' );
            html = html +
                   '<span style="float: right;">' +
                   '<i class="fa fa-info-circle" data-toggle="tooltip" title="' + item.additionalInfo + '" ></i>' +
                   '</span>';
        }

        html = '' +
               '<div ' +
               'ko-hover-id="' + item._id + '" ' +
               'data-toggle="tooltip" ' +
               'data-placement="bottom" ' +
               'title="' + fullTextSafe + '"' +
               '>' + html + '</div>';

        return html;
    }

    function makeFindingValuePdfCellLdt3( finding, showCharts ) {
        var
            html = '',
            fullTextSafe,
            item,
            i;

        if( !finding ) {
            return '';
        }
        if( !finding.labResults ) {
            return '';
        }

        for( i = 0; i < finding.labResults.length; i++ ) {

            item = finding.labResults[i];
            fullTextSafe = sanitizeFullText( item.labFullText || '' );

            switch( item.labResultDisplay ) {
                case 'minmaxval':
                    //  quantitative values with normal range
                    if( showCharts ) {
                        html = html +
                               'CHARTMINMAX|' + item.labMin + '|' + item.labMax + '|' + item.labTestResultVal + '|' + (item.isPathological ? 'P' : 'X') + '\n' +
                               item.labTestResultVal + '\n';
                    } else {
                        html = html + item.labTestResultVal + '\n';
                    }

                    break;

                case 'minmaxtext':
                    //  quantitative values with normal range
                    html = html + item.labTestResultText + '\n';
                    break;

                case 'upperbound':
                    html = html + item.labTestResultVal + item.labTestResultText + '\n';
                    break;

                case 'maxvalcolon':
                case 'maxvalgt':
                    html = html + item.labTestResultText + '\n';
                    break;

                case 'label':
                case 'text':
                    if( item.labTestResultVal && '' !== item.labTestResultVal ) {
                        html = html + '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + item.labTestResultVal + '</p>\n';
                    } else {
                        html = html + '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + item.labTestResultText + '</p>\n';
                    }
                    break;

                case 'note':
                    //  note is added after other value types
                    break;

                case 'maxval':
                case 'qualitative':
                    if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                        html = html + item.labTestResultVal + '\n';
                    }
                    html = html + item.labTestResultText + '\n';
                    break;

                case 'quantitative':
                    if( item.labTestResultVal || 0 === item.labTestResultVal ) {
                        html = html + item.labTestResultVal + '\n';
                    }
                    html = html + item.labTestResultText + '\n';
                    break;

                case 'failed':
                    html = html + item.labTestResultText + '\n';
                    break;

                case 'categorizedquantity':
                    html = html + item.labTestResultVal + '<br/>' +
                           '<p style="white-space: pre-wrap;">' +
                           '<small>' +
                           (item.labTestResultText ? item.labTestResultText : '') +
                           '</small></p>';
                    break;

                default:
                    html = html + item.labTestResultVal + '<br/>' +
                           '<p style="white-space: pre-wrap;">' +
                           '<small>' +
                           fullTextSafe +
                           '</small></p>';
                    break;

            }

            if( item.labTestNotes && '' !== item.labTestNotes ) {
                html = html + '\n//' + item.labTestNotes + '//';
            }
        }

        return html + '';
    }

    /**
     *  Extract sections of text corresponding to findings
     *
     *  @param  {Object}    activity    Plain LABDATA activity object
     */

    function splitLabTextLdt2( activity ) {
        var
            transactions = splitTransactionsLdt2( activity ), //[],
            sections = {},
            i, k;

        //  sort transaction by date (ascending)
        transactions.sort( sortTransactionDate );

        function sortTransactionDate( a, b ) {
            if( moment( b.date ).isAfter( a.date ) ) {
                return -1;
            }
            if( moment( a.date ).isAfter( b.date ) ) {
                return 1;
            }
            return 0;
        }

        //  collect text blocks for findings by date
        for( i = 0; i < transactions.length; i++ ) {
            for( k in transactions[i].sections ) {
                if( transactions[i].sections.hasOwnProperty( k ) ) {
                    sections[k] = transactions[i].sections[k];
                }
            }
        }

        return sections;
    }

    /**
     *  Extract sections of labText corresponding to transactions over LDT
     *
     *  @param  {Object}    activity
     *  @return {Array}
     */

    function splitTransactionsLdt2( activity ) {
        var
            TRANSACTION_DELIMITER = '- Labor-Bericht -',
            FINDING_TYPE_LABEL = 'Befundart:',
            TRANSACTION_DATE_LABEL = 'Berichtsdatum:',

            labText = activity.labText || '',
            lines = labText.split( '\n' ),
            transactions = [],
            currentTransaction = makeEmptyTransaction(),
            currentSection = '',
            i;

        function makeEmptyTransaction() {
            return {'lines': [], 'header': [], 'sections': {}, 'type': '', 'date': ''};
        }

        //  split transactions from big block of text
        for( i = 0; i < lines.length; i++ ) {
            if( TRANSACTION_DELIMITER === lines[i].trim() ) {
                if( '' !== currentTransaction.type && '' !== currentTransaction.date ) {
                    transactions.push( currentTransaction );
                }
                currentTransaction = makeEmptyTransaction();
            }

            currentTransaction.lines.push( lines[i] );

            if( FINDING_TYPE_LABEL === lines[i].substr( 0, FINDING_TYPE_LABEL.length ) ) {
                currentTransaction.type = lines[i].replace( FINDING_TYPE_LABEL, '' ).trim();
            }

            if( TRANSACTION_DATE_LABEL === lines[i].substr( 0, TRANSACTION_DATE_LABEL.length ) ) {
                currentTransaction.date = lines[i].replace( TRANSACTION_DATE_LABEL, '' ).trim();
            }

            if( ' ' !== lines[i].substr( 0, 1 ) ) {
                currentTransaction.header.push( lines[i] );
            }

            if( '    ' === lines[i].substr( 0, 4 ) && '     ' !== lines[i].substr( 0, 5 ) ) {
                currentSection = lines[i].trim().replace( ':', '' );
                currentTransaction.sections[currentSection] = '';
            }
            if( '        ' === lines[i].substr( 0, 8 ) ) {
                currentTransaction.sections[currentSection] = currentTransaction.sections[currentSection] + lines[i].substr( 8 ) + '\n';
            }
        }

        if( '' !== currentTransaction.type && '' !== currentTransaction.date ) {
            transactions.push( currentTransaction );
        }

        return transactions;
    }

    /**
     *  Extract sections of text corresponding to findings
     *
     *  @param  {Object}    activity    Plain LABDATA activity object
     *  @param  {Object}    findings    Array of simplified finding objects
     */

    function splitLabTextLdt3( activity, findings ) {
        var
            startMarkers = [
                'Transfusionsmedizin/Mutterschaftsvorsorge:',
                'UE Klinische Chemie:',
                'UE Mikrobiologie:',
                'UE Zytologie Krebs-vorsorg:',
                'UE Zytologie Krebsvorsorge:',
                'UE Zytologie:'
            ],
            labText = activity.labText || '',
            lines = labText.split( '\n' ),
            startIndent = 0,
            currentIndent,
            allHeads = [],
            currentHead = '',
            line,
            buffer = [],
            inFinding = false,
            results = {},
            i;

        //  make an array of all labHeads as they may appear in labText:
        for( i = 0; i < findings.length; i++ ) {
            if( findings[i] && findings[i].labHead ) {
                allHeads.push( findings[i].labHead + ':' );
            }
        }

        for( i = 0; i < lines.length; i++ ) {
            line = lines[i];
            currentIndent = (line.length - line.trimLeft().length);

            //  findings end when indent falls back to or below where we started
            if( inFinding && currentIndent <= startIndent ) {
                addFindingToResults();
            }

            //  collect each line of findings, with initial indent removed
            if( true === inFinding ) {
                buffer.push( line.substr( startIndent ) );
                //  check if this line matches on of the expected labHeads
                if( -1 !== allHeads.indexOf( line.trim() ) ) {
                    currentHead = line.trim().replace( ':', '' );
                }
            }

            //  findings begin with one of four strings, ie startMarkers
            if( -1 !== startMarkers.indexOf( line.trim() ) ) {
                startIndent = currentIndent;
                inFinding = true;
            }
        }

        //  add any leftover buffer
        if( buffer.length > 0 ) {
            addFindingToResults();
        }

        //  add current buffer as a result, reset state
        function addFindingToResults() {
            if( '' !== currentHead ) {
                results[currentHead] = buffer.join( '\n' );
            }
            buffer = [];
            currentHead = '';
            inFinding = false;
        }

        return results;
    }

    /**
     *  Make list of findings on a labdata activity, used for embedding in activity content
     *  @param  {Object}    activity
     */

    function makeFindingText( activity ) {
        //  only possible for LABDATA activities
        if( 'LABDATA' !== activity.actType ) {
            return '';
        }

        var ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity );

        if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
            return makeFindingTextLdt3( activity );
        } else {
            return makeFindingTextLdt2( activity );
        }
    }

    function makeFindingTextLdt2( activity ) {
        var
            findings,
            findingText = '',
            i;

        findings = Y.doccirrus.labdata.utils.collapseLExtraLdt2( activity );

        for( i = 0; i < findings.length; i++ ) {
            if( findings[i] && findings[i].head ) {

                findingText = findingText + findings[i].head + ' ';

                //  numeric values
                if( findings[i].testResultVal ) {
                    findingText = findingText + findings[i].testResultVal;
                    if( findings[i].TestResultUnit ) {
                        findingText = findingText + findings[i].TestResultUnit;
                    }
                }

                //  text values
                if( findings[i].sampleResultText && findings[i].sampleResultText.length > 0 ) {
                    findingText = findingText + findings[i].sampleResultText.join( '\n' );
                }

                findingText = findingText + '\n';
            }
        }

        return findingText;
    }

    function makeFindingTextLdt3( activity ) {
        var
            findings,
            finding,
            findingResult,
            findingText = '',
            i, j;

        findings = Y.doccirrus.labdata.utils.collapseLExtraLdt3( activity );

        for( i = 0; i < findings.length; i++ ) {
            if( findings[i] && findings[i].labHead && findings[i].labResults ) {
                finding = findings[i];
                findingText = findingText + finding.labHead + ' ';

                for( j = 0; j < finding.labResults.length; j++ ) {
                    findingResult = finding.labResults[j];

                    //  numeric values
                    if( findingResult.labTestResultVal ) {
                        findingText = findingText + findingResult.labTestResultVal + ' ';
                        if( finding.labTestResultUnit ) {
                            findingText = findingText + finding.labTestResultUnit;
                        }
                    }

                    //  text values
                    if( finding.sampleResultText && finding.sampleResultText.length > 0 ) {
                        findingText = findingText + finding.sampleResultText.join( '\n' );
                    }
                }

                findingText = findingText + '\n';
            }
        }

        return findingText;
    }

    Y.namespace( 'doccirrus.labdata' ).utils = {
        'PREVIOUS_VERSIONS_MARKER': PREVIOUS_VERSIONS_MARKER,
        createColorBar: createColorBar,
        createColorBar2: createColorBar2,
        createColorBar2OnDisk: createColorBar2OnDisk,
        createColorBar2Subelem: createColorBar2Subelem,
        getLdtVersion: getLdtVersion,
        unwrapFindingObjLdt3: unwrapFindingObjLdt3,
        //  LDT 2
        makeFindingValueCellLdt2: makeFindingValueCellLdt2,
        makeFindingValueCompactCellLdt2: makeFindingValueCompactCellLdt2,
        makeFindingValuePdfCellLdt2: makeFindingValuePdfCellLdt2,
        //  LDT 3
        makeFindingValueCellLdt3: makeFindingValueCellLdt3,
        makeFindingValueCompactCellLdt3: makeFindingValueCompactCellLdt3,
        makeFindingValuePdfCellLdt3: makeFindingValuePdfCellLdt3,
        collapseLExtra: collapseLExtra,
        collapseLExtraLdt2: collapseLExtraLdt2,
        collapseLExtraLdt3: collapseLExtraLdt3,
        splitLabTextLdt2: splitLabTextLdt2,
        splitLabTextLdt3: splitLabTextLdt3,
        splitTransactionsLdt2: splitTransactionsLdt2,
        makeFindingText: makeFindingText
    };

}, '0.0.1', {
    requires: [
        'dcforms-canvas-utils',
        'lablog-schema'
    ]
} );

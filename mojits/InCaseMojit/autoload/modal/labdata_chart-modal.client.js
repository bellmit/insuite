/**
 * User: pi
 * Date: 11/09/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $, d3, nv, moment, async */

'use strict';

YUI.add( 'LabDataChartModal', function( Y, NAME ) {

        var
        //  catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),

            COLOR_VALUE_LINE = '#000000',
            COLOR_CROSSED = '#FF0000',          //  has one or more pathological values
            COLOR_NOT_CROSSED = '#FF0000',      //  no pathological values
            COLOR_INVISBLE = '#FFFFFF';         //  pad Y axis


        function LabDataChartModel( config ) {
            LabDataChartModel.superclass.constructor.call( this, config );
        }

        Y.extend( LabDataChartModel, Y.doccirrus.KoViewModel.getDisposable(), {

            //   may replace with _id
            currentActivity: null,
            chartTitle: '',

            initializer: function( config ) {
                var
                    self = this;

                self.chartData = ko.observable();

                self.chartTitle = config.title || '';
                self.currentActivity = config.activity || null;
                self.onMediaAttached = config.onMediaAttached || null;

                self.formData = config.formData || {};

                self.initChartData( config.data );
                self.initChartBinding();
            },

            initChartData: function( data ) {
                var
                    self = this,
                    maxVal = -1000000,
                    minVal = 1000000,
                    values = data.activities.filter( filterValidItems ).map( mapDateAndValue ),
                    minLine = data.activities.filter( filterHasMin ).map ( mapDateAndMin ),
                    maxLine = data.activities.filter( filterHasMax ).map ( mapDateAndMax ),
                    padLine = [],
                    hasPathological = ( data.activities.filter( filterIsPathological ).length > 0 ),
                    colorBorder = hasPathological ? COLOR_CROSSED : COLOR_NOT_CROSSED;

                function filterValidItems( act ) {
                    if(
                        !act.hasOwnProperty( 'labTestResultVal' ) ||
                        'undefined' === typeof act.labTestResultVal ||
                        '' === act.labTestResultVal
                    ) {
                        Y.log( 'Removed invalid entry from chart: ' + act._id, 'debug', NAME );
                        return false;
                    }
                    return true;
                }

                function filterHasMax( act ) {
                    if(
                        !act.hasOwnProperty( 'labMax' ) ||
                        'undefined' === typeof act.labMax ||
                        '' === act.labMax
                    ) {
                        Y.log( 'Removed invalid entry from max line on chart: ' + act._id, 'debug', NAME );
                        return false;
                    }
                    return true;
                }

                function filterHasMin( act ) {
                    if(
                        !act.hasOwnProperty( 'labMin' ) ||
                        'undefined' === typeof act.labMin ||
                        '' === act.labMin
                    ) {
                        Y.log( 'Removed invalid entry from min line on chart: ' + act._id, 'debug', NAME );
                        return false;
                    }
                    return true;
                }

                function filterIsPathological( act ) {
                    return act.isPathological || false;
                }

                function mapDateAndValue( act ) {

                    if ( act.labTestResultVal > maxVal ) { maxVal = act.labTestResultVal; }
                    if ( act.labTestResultVal < minVal ) { minVal = act.labTestResultVal; }

                    return [ moment( act.labReqReceived ).valueOf(), act.labTestResultVal ];
                }

                function mapDateAndMax( act ) {
                    if ( act.labMax > maxVal ) { maxVal = act.labMax; }
                    if ( act.labMax < minVal ) { minVal = act.labMax; }
                    return [ moment( act.labReqReceived ).valueOf(), act.labMax ];
                }

                function mapDateAndMin( act ) {
                    if ( act.labMin > maxVal ) { maxVal = act.labMin; }
                    if ( act.labMin < minVal ) { minVal = act.labMin; }
                    return [ moment( act.labReqReceived ).valueOf(), act.labMin ];
                }

                if ( !values[0] ) { return; }

                padLine.push( [ values[0][0], ( maxVal * 1.08 ) ] );
                padLine.push( [ values[0][0], ( minVal * 0.9 ) ] );

                self.chartData( {
                    data: [
                        {
                            "key": i18n( 'InCaseMojit.LabDataChartModal.label.DATA' ),
                            "color": COLOR_VALUE_LINE,
                            "values": values
                        },
                        {
                            "key": i18n( 'InCaseMojit.LabDataChartModal.label.MIN_VAL' ),
                            "color": colorBorder,
                            "values": minLine
                        },
                        {
                            "key": i18n( 'InCaseMojit.LabDataChartModal.label.MAX_VAL' ),
                            "color": colorBorder,
                            "values": maxLine
                        },
                        {
                            "key": '',
                            "color": COLOR_INVISBLE,
                            "values": padLine
                        }

                    ]
                } );
            },

            initChartBinding: function() {

                var self = this;

                ko.bindingHandlers.labDataChart = {
                    init: chartInit,
                    update: chartUpdate
                };

                function generateHash() {
                    return Math.random().toString( 36 ).substring( 7 );
                }

                function chartInit( element, valueAccessor, allBindings, viewModel, bindingContext ) {

                    var value = valueAccessor(),
                        valueUnwrapped = ko.unwrap( value ),
                        chartElement = $( element ).children( 'svg' )[0],
                        chartId = 'chart_' + generateHash();

                    $( element ).attr( 'id', chartId );

                    nv.addGraph( function() {

                        var chart = self.getNvInstance();

                        d3.select( chartElement )
                            .datum( valueUnwrapped.data )
                            .transition().duration( 500 )
                            .call( chart );

                        Y.on( 'LabData:UpdateChart', chart.update );
                        bindingContext[chartId] = chart;

                        return chart;
                    } );
                }

                function chartUpdate( element, valueAccessor, allBindings, viewModel, bindingContext ) {

                    var value = valueAccessor(),
                        valueUnwrapped = ko.unwrap( value ),
                        chartId = $( element ).attr( 'id' ),
                        chartElement = $( element ).children( 'svg' )[0],
                        currentNvInstance = bindingContext[chartId];

                    if( currentNvInstance ) {
                        d3.select( chartElement )
                            .datum( valueUnwrapped.data )
                            .call( currentNvInstance );
                    }

                }
            },

            getXTicks: function() {
                var
                    self = this,
                    ticks = self.chartData().data[0].values.map( getDateFromPair );

                function getDateFromPair( d ) { return d[0]; }
                return ticks;
            },

            getYTicks: function() {
                var
                    self = this,
                    chartData = self.chartData(),
                    ticks = chartData.data[0].values.map( getValueFromPair );

                function getValueFromPair( d ) { return d[1]; }

                //  add ticks for initial min and max
                if ( chartData.data[1] && chartData.data[1].values[0] && chartData.data[1].values[0][1] ) {
                    ticks.push( chartData.data[1].values[0][1] );
                }

                if ( chartData.data[2] && chartData.data[2].values[0] && chartData.data[2].values[0][1]) {
                    ticks.push( chartData.data[2].values[0][1] );
                }

                return ticks;
            },

            getNvInstance: function() {

                var
                    self = this,
                    chart = nv.models.lineChart()
                    .y( function( d ) {
                        return d[1];
                    } )
                    .x( function( d ) {
                        return d[0];
                    } )
                    .useInteractiveGuideline( false )
                    .showLegend( false )
                    .showYAxis( true )
                    .showXAxis( true );

                chart.xAxis
                    .tickValues( self.getXTicks() )
                    .tickFormat( function( d ) {
                        return moment( d ).format( TIMESTAMP_FORMAT );
                    } )
                    .rotateLabels( -90 );

                chart.yAxis
                    .tickValues( self.getYTicks() )
                    .tickFormat( d3.format( '.02f' ) );

                return chart;
            },

            /**
             *  Save to server as an image belonging to the current activity (to be added to Ext Dokumente)
             *  @param callback
             */

            saveAsImage: function( callback ) {
                var
                    self = this,
                    currentActivity = self.currentActivity,
                    ownerId = ko.unwrap( currentActivity._id ) || ko.unwrap( currentActivity._randomId );

                if ( !currentActivity || !self.onMediaAttached || !currentActivity._isEditable() ) {
                    return onSaveErr( 'Activity is not editable, or cannot add attachments.' );
                }

                self.getChartAsDataURI( onChartLoaded );

                function onChartLoaded( err, dataURI ) {
                    if ( err ) { return onSaveErr( err ); }
                    Y.doccirrus.jsonrpc.api.media
                        .saveDataURI( {
                            'dataURI': dataURI,
                            'ownerCollection': 'activity',
                            'ownerId': ownerId
                        } )
                        .then( onSaveComplete )
                        .fail( onSaveErr );
                }

                function onSaveComplete( result ) {
                    if ( !self.onMediaAttached ) {
                        onSaveErr( 'Missing callback for attached media.' );
                    }

                    var mediaObj = result.data ? result.data : result;

                    self.onMediaAttached( mediaObj );
                    callback( mediaObj );
                }

                function onSaveErr( err ) {
                    Y.log( 'Could not attach labdata to activity: ' + JSON.stringify( err ), 'warn', NAME );
                    //  TODO: consider popup notice here
                }

            },

            /**
             *  Save to server as a PDF belonging to the current activity (to be added to Ext Dokumente)
             *  @param callback
             */

            saveAsPdf: function( callback ) {
                var
                    self = this,
                    currentActivity = self.currentActivity,
                    ownerId = ko.unwrap( currentActivity._id ) || ko.unwrap( currentActivity._randomId ),
                    jqSvg = $('#svgLabChart'),
                    svgWidth = jqSvg.width(),
                    svgHeight = jqSvg.height() + 50;

                if ( !currentActivity || !self.onMediaAttached || !currentActivity._isEditable() ) {
                    return onSaveErr( 'Activity is not editable, or cannot add attachments.' );
                }

                self.getChartAsDataURI( onChartLoaded );

                function onChartLoaded( err, dataURI ) {
                    if ( err ) { return onSaveErr( err ); }
                    Y.doccirrus.jsonrpc.api.media
                        .saveChartPDF( {
                            'dataURI': dataURI,
                            'ownerCollection': 'activity',
                            'ownerId': ownerId,
                            'formData': self.formData,
                            'saveTo': 'db',
                            'widthPx': svgWidth,
                            'heightPx': svgHeight
                        } )
                        .then( onSaveComplete )
                        .fail( onSaveErr );
                }

                function onSaveComplete( result ) {
                    if ( !self.onMediaAttached ) {
                        onSaveErr( 'Missing callback for attached media.' );
                    }

                    var mediaObj = result.data ? result.data : result;

                    self.onMediaAttached( mediaObj );
                    callback( mediaObj );
                }

                function onSaveErr( err ) {
                    Y.log( 'Could not attach labdata to activity: ' + JSON.stringify( err ), 'warn', NAME );
                    //  TODO: consider popup notice here
                }

            },

            /**
             *  Save to server as a PDF belonging to the current activity (to be added to Ext Dokumente)
             */

            printAsPdf: function( ) {
                var
                    self = this,
                    currentActivity = self.currentActivity,
                    ownerId = ko.unwrap( currentActivity._id ) || ko.unwrap( currentActivity._randomId ),
                    jqSvg = $('#svgLabChart'),
                    svgWidth = parseInt( jqSvg.width(), 10 ),
                    svgHeight = parseInt( jqSvg.height(), 10 ) + 50;

                //  get chart as image
                self.getChartAsDataURI( onChartLoaded );

                //  embed in PDF and save to temp
                function onChartLoaded( err, dataURI ) {
                    if ( err ) { return onSaveErr( err ); }
                    Y.doccirrus.jsonrpc.api.media
                        .saveChartPDF( {
                            'dataURI': dataURI,
                            'ownerCollection': 'activity',
                            'ownerId': ownerId,
                            'formData': self.formData,
                            'saveTo': 'temp',
                            'widthPx': svgWidth,
                            'heightPx': svgHeight
                        } )
                        .then( onSaveComplete )
                        .fail( onSaveErr );
                }

                function onSaveComplete( result ) {
                    if ( !self.onMediaAttached ) {
                        onSaveErr( 'Missing callback for attached media.' );
                    }

                    var
                        tempFile = result.data ? result.data : result,
                        pdfUrl = tempFile.tempId;

                    Y.log( 'Generated PDF: ' + pdfUrl, 'debug', NAME );

                    //  open printing modal
                    Y.doccirrus.modals.printPdfModal.show( {
                        'documentUrl': '/pdf/' + tempFile.documentFileName,
                        'cacheFile': pdfUrl,
                        'documentFileName': tempFile.documentFileName,
                        'formRole': 'labdata-chart'
                    } );

                }

                function onSaveErr( err ) {
                    Y.log( 'Could not attach labdata to activity: ' + JSON.stringify( err ), 'warn', NAME );
                    //  TODO: consider popup notice here
                }

            },

            getChartAsDataURI: function( callback ) {
                var
                    self = this,
                    jqSvg = $('#svgLabChart'),
                    svgWidth = jqSvg.width(),
                    svgHeight = jqSvg.height() + 50,
                    chartCSS,
                    imgObj,
                    cnv, ctx;

                async.series(
                    [
                        loadChartCSS,
                        createSvgImage,
                        drawSvgImageOnCanvas
                    ],
                    onAllDone
                );

                function loadChartCSS( itcb ) {
                    Y.doccirrus.comctl.privateGet( '/static/DocCirrus/assets/css/nvd3min.css', {}, onCSSLoaded );
                    function onCSSLoaded( err, result ) {
                        if ( err ) { return itcb( err ); }
                        chartCSS = result;
                        itcb( null );
                    }
                }

                function createSvgImage( itcb ) {
                    var
                        svgHeader = '' +
                            '<svg ' +
                            'xmlns="http://www.w3.org/2000/svg" ' +
                            'width="' + svgWidth + '" ' +
                            'height="' + svgHeight + '" ' +
                            'viewBox="0 0 ' + svgWidth  + ' ' + svgHeight + '">' +
                            '<style>' + chartCSS + '</style>',

                        svgFooter = '</svg>',

                        svgString = svgHeader + jqSvg.html() + svgFooter,
                        svgDataURI = 'data:image/svg+xml;base64,' + btoa( svgString );

                    imgObj = new Image();

                    imgObj.onload = function( /* evt */ ) {
                        //  for testing only, to show image in modal
                        //$('#divChartImg').append( imgObj );
                        itcb( null );
                    };

                    imgObj.onerror = itcb;
                    imgObj.src = svgDataURI;
                }

                function drawSvgImageOnCanvas( itcb ) {
                    cnv = document.createElement( 'canvas' );
                    cnv.width = svgWidth;
                    cnv.height = svgHeight;
                    ctx = cnv.getContext( '2d' );

                    //ctx.drawImage( imgObj, 0, 0 );

                    //  start with a white canvas, SVG image is transparent
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect( 0, 0, cnv.width, cnv.height );

                    ctx.drawImage(
                        imgObj,                         //  SVG image
                        0, 0,                           //  imgObj x, imgObj y
                        svgWidth, svgHeight,            //  imgObj w, imgObj h
                        0, 0,                           //  cnv x, cnv y
                        svgWidth, svgHeight             //  cnv w, cnv h
                    );

                    ctx.fillStyle = '#000000';
                    ctx.font = "20px Arial";
                    ctx.fillText( self.chartTitle + '', 80, 50);

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem creating Ext Doc: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }

                    callback( null, cnv.toDataURL( 'image/jpeg', 0.98 ) );
                }

            }
        } );

        function LabDataChartModal() {

        }

        LabDataChartModal.prototype.showDialog = function( options ) {

            var
                entries = options.entries,
                labDataChartModel,
                modal,

            //  activity = options.activiy || null,

                aDCWindowResizeEvent,

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'InCaseMojit.LabDataChartModal.BTN_CANCEL' ),
                    isDefault: true,
                    action: onCloseButtonClick
                },

                btnPrintPdf = {
                    name: 'PRINT',
                    label: i18n( 'InCaseMojit.LabDataChartModal.BTN_PRINT_PDF' ),
                    isDefault: true,
                    action: onPrintButtonClick
                },

                btnSaveImage = {
                    name: 'SAVEIMG',
                    label: i18n( 'InCaseMojit.LabDataChartModal.BTN_SAVE_IMAGE' ),
                    isDefault: true,
                    action: onSaveImageButtonClick
                },

                /*
                btnSavePdf = {
                    name: 'SAVEPDF',
                    label: i18n( 'InCaseMojit.LabDataChartModal.BTN_SAVE_PDF' ),
                    isDefault: true,
                    action: onSavePdfButtonClick
                },
                */

                modalOptions = {
                    className: 'DCWindow-labValueChartDialog',
                    bodyContent: null,
                    title: '',
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: '90%',
                    height: '90%',
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [ btnSaveImage, /* btnSavePdf, */ btnPrintPdf, btnCancel ]
                    },
                    after: {
                        render: onModalRender,
                        destroy: onModalDestroy
                    }
                };

            if ( !options.activity || !options.activity._isEditable() ) {
                modalOptions.buttons.footer = [ btnPrintPdf, btnCancel ];
            }

            entries = entries.sort( function( activity1, activity2 ) {
                return new Date( activity1.labReqReceived ) - new Date( activity2.labReqReceived );
            } );

            Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/labValueChartDialog' } )
                .then( onJadeTemplateLoaded );
                //.catch( catchUnhandled );

            //  MODAL EVENTS

            function onJadeTemplateLoaded( jadeTemplate ) {
                var
                    bodyContent = Y.Node.create( jadeTemplate.data ),

                    data = {
                        'activities': entries,
                        'startDate': moment( entries[0].labReqReceived ).format( TIMESTAMP_FORMAT ),
                        'endDate': moment( entries[entries.length - 1].labReqReceived ).format( TIMESTAMP_FORMAT ),
                        'labMin': entries[0].labMin,
                        'labMax': entries[0].labMax
                    },

                    firstEntry = ( ( data && data.activities && data.activities[0] ) ? data.activities[0] : null ),
                    modalTitle = '({labHead}) {labTestLabel}, {labTestResultUnit}, im Zeitraum {startDate} - {endDate}';

                if ( firstEntry ) {
                    modalTitle = Y.Lang.sub( modalTitle, data );
                    modalTitle = Y.Lang.sub( modalTitle, firstEntry );
                    //  there is not always a unit
                    modalTitle = modalTitle.replace( ', {labTestResultUnit},', '' );
                }

                modalOptions.title = modalTitle;
                modalOptions.bodyContent = bodyContent;

                labDataChartModel = new LabDataChartModel( {
                    'data': data,
                    'activity': options.activity,
                    'formData': options.formData,
                    'title': modalTitle,
                    'onMediaAttached': options.onMediaAttached
                } );

                modal = new Y.doccirrus.DCWindow( modalOptions );

                ko.applyBindings( labDataChartModel, bodyContent.getDOMNode() );
            }

            function onModalRender() {
                var
                    modalBody = this,
                    modalBodyResizeHandler = function() {
                        modalBody.set( 'centered', true );
                        Y.fire( 'LabData:UpdateChart' );
                    };

                aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                modalBodyResizeHandler();
            }

            function onModalDestroy() {
                if( aDCWindowResizeEvent ) {
                    aDCWindowResizeEvent.detach();
                }
                if( labDataChartModel && labDataChartModel.dispose ) {
                    labDataChartModel.dispose();
                }
            }

            function onPrintButtonClick() {
                labDataChartModel.printAsPdf( );
            }

            function onSaveImageButtonClick() {
                labDataChartModel.saveAsImage( onCloseButtonClick );
            }

            /*
            function onSavePdfButtonClick() {
                labDataChartModel.saveAsPdf( onCloseButtonClick );
            }
            */

            function onCloseButtonClick() {
                modal.close();
            }

        };
        Y.namespace( 'doccirrus.modals' ).labDataChartModal = new LabDataChartModal();

    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow'
        ]
    }
);

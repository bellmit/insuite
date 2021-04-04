/**
 * User: pi
 * Date: 12/01/2017  10:50
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $, d3, nv, moment, async */

'use strict';

YUI.add( 'MedDataChartModal', function( Y, NAME ) {

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

        function MedDataChartModel( config ) {
            MedDataChartModel.superclass.constructor.call( this, config );
        }

        Y.extend( MedDataChartModel, Y.doccirrus.KoViewModel.getDisposable(), {


            initializer: function( config ) {
                var
                    self = this;

                self.chartData = ko.observable();

                self.initChartData( config.data );
                self.currentActivity = config.currentActivity || null;
                self.formData = config.formData || {};
                self.chartTitle = config.chartTitle || '';
                self.onMediaAttached = config.onMediaAttached || null;
                self.initChartBinding();
            },

            initChartData: function( data ) {
                var
                    self = this,
                    valueKey = data.valueKey || 'Data',
                    value2Key = data.value2Key || 'Data2',
                    values = data.datesData.filter( filterValidItems ).map( mapDateAndValue ),
                    values2 = data.datesData2.filter( filterValidItems ).map( mapDateAndValue );

                function filterValidItems( item ) {
                    if( !item.hasOwnProperty( 'value' ) || !Y.doccirrus.comctl.isNumeric( item.value ) ) {
                        Y.log( 'Removed invalid entry from chart: ' + item.timestamp, 'debug', NAME );
                        return false;
                    }
                    return true;
                }

                function mapDateAndValue( item ) {
                    return [moment( item.timestamp ).valueOf(), item.value];
                }

                self.chartData( {
                    data: [
                        {
                            "key": valueKey,
                            "color": '#FF0000',
                            "values": values
                        },
                        {
                            "key": value2Key,
                            "color": '#0000FF',
                            "values": values2
                        }
                    ]
                } );
            },

            initChartBinding: function() {

                var self = this;

                ko.bindingHandlers.medDataChart = {
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

                        Y.on( 'medData:UpdateChart', chart.update );
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
            getNvInstance: function() {

                var chart = nv.models.lineChart()
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
                    .tickValues( this.chartData().data[0].values.map( function( d ) {
                        return d[0];
                    } ) )
                    .tickFormat( function( d ) {
                        return moment( d ).format( TIMESTAMP_FORMAT );
                    } )
                    .rotateLabels( -90 );

                chart.yAxis
                    .tickFormat( d3.format( '.02f' ) );

                return chart;
            },

            getChartAsDataURI: function( callback ) {
                var
                    self = this,
                    jqSvg = $('#svgMeddataChart'),
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
                        //  temporary, testing only
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
                    jqSvg = $('#svgMeddataChart'),
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
                    jqSvg = $('#svgMeddataChart'),
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
                    Y.log( 'Could not attach meddata chart image to activity: ' + JSON.stringify( err ), 'warn', NAME );
                    //  TODO: consider popup notice here
                }

            }


        } );

        function MedDataChartModal() {

        }

        MedDataChartModal.prototype.showDialog = function( options/*, callback */ ) {

            var
                aDCWindowResizeEvent,
                data = options.data,
                modal;

            //  set date range
            data.datesData = data.datesData.sort( function( item1, item2 ) {
                return new Date( item1.timestamp ) - new Date( item2.timestamp );
            } );

            data.startDate = moment( data.datesData[0].timestamp ).format( TIMESTAMP_FORMAT );
            data.endDate = moment( data.datesData[data.datesData.length - 1].timestamp ).format( TIMESTAMP_FORMAT );

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/meddatachart_modal' } )
            ).then( function( response ) {
                return response && response.data;
            } ).then( function( template ) {
                var
                    bodyContent = Y.Node.create( template ),
                    medDataChartModel = new MedDataChartModel( options ),

                    //btnClose = Y.doccirrus.DCWindow.getButton( 'CLOSE' ),

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

                    modalConfig = {
                        className: 'DCWindow-meddataChartDialog',
                        bodyContent: bodyContent,
                        title: Y.Lang.sub( '({typeI18n}) im Zeitraum {startDate} - {endDate}', data ),
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
                            footer: [ btnSaveImage, btnPrintPdf, btnCancel ]
                        },
                        after: {
                            render: onAfterRender,
                            destroy: onModalDestroy
                        }
                    };

                modal = new Y.doccirrus.DCWindow( modalConfig );

                //  printed on chart when exporting to image/pdf
                medDataChartModel.chartTitle = modalConfig.title;

                ko.applyBindings( medDataChartModel, bodyContent.getDOMNode() );

                //  MODAL EVENT HANDLERS

                function onAfterRender() {
                    var
                        modalBody = this,
                        modalBodyResizeHandler = function() {
                            modalBody.set( 'centered', true );
                            Y.fire( 'medData:UpdateChart' );
                            // if( medDataChartModel.chart ) {
                            //     medDataChartModel.chart.update();
                            // }

                        };

                    aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                    modalBodyResizeHandler();
                }

                function onModalDestroy() {
                    if( aDCWindowResizeEvent ) {
                        aDCWindowResizeEvent.detach();
                    }
                    if( medDataChartModel && medDataChartModel.dispose ) {
                        medDataChartModel.dispose();
                    }
                }

                function onPrintButtonClick() {
                    medDataChartModel.printAsPdf( );
                }

                function onSaveImageButtonClick() {
                    medDataChartModel.saveAsImage( onCloseButtonClick );
                }

                function onCloseButtonClick() {
                    modal.close();
                }

            } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).medDataChartModal = new MedDataChartModal();

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

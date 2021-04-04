/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing text values
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $, async, ko */

YUI.add(
    /* YUI module name */
    'dcforms-chartmdeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        var i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms chart types.', 'debug', NAME);

        //var i18n = Y.doccirrus.i18n;

        /**
         *  Subdialog of the element properties, for changing default chart values
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Rendering context (edit/fill/renderpdf/etc)
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.chartMdEditor = function(domId, element, onChange) {
            var
                jq = { 'me': $('#' + domId) },                  //  cached jQuery selectors
                isRendered = false,
                callWhenChanged = onChange,                     //  general purpose 'onchange' event

                //  update element from controls in panel
                BIND_ELEMENTS = {
                    'txtChartMdXMin': 'xMin',
                    'txtChartMdXMax': 'xMax',
                    'selChartMdX': 'xDatum',
                    'txtChartMdYMin': 'yMin',
                    'txtChartMdYMax': 'yMax',
                    'selChartMdY': 'yDatum',
                    'txtChartMdPatientId': 'patientId',
                    'txtChartMdPatientDOB': 'patientDOB',
                    'txtChartMdTimestamp': 'timestamp'
                },

                //  magic (static) MD types used to measure chart axes
                AXIS_MEDDATA_TYPES = [
                    'DAY_PATIENT_AGE',
                    'DAY_SINCE_ACTIVITY'
                ];

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {

                var
                    //scaleOverflowLabel = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_SCALEOVERFLOW' ),
                    //maxLengthLabel = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_MAXLEN' ),
                    panelNode = Y.Node.create( '<div></div>' );

                async.series( [ loadPanelHtml, cacheJQuery, loadMedDataTypes, setupAxisTypes ], onAllDone );

                function loadPanelHtml( itcb ) {
                    //  clear any existing content
                    jq.me.html( '' );
                    isRendered = false;

                    //  load the panel template
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'editor_chartmd',
                        'FormEditorMojit',
                        {},
                        panelNode,
                        onPanelHtmlLoaded
                    );

                    //  add panel template to page
                    function onPanelHtmlLoaded( err ) {
                        if ( err ) { return itcb( err ); }
                        Y.one( '#' + domId ).append( panelNode );
                        itcb( null );
                    }
                }

                function cacheJQuery( itcb ) {
                    var
                        k;

                    for ( k in BIND_ELEMENTS ) {
                        if ( BIND_ELEMENTS.hasOwnProperty( k ) ) {
                            jq[ k ] = $( '#' + k );
                        }
                    }

                    jq.btnSelectChartImage = $( '#btnSelectChartImage' );

                    itcb( null );
                }

                function loadMedDataTypes( itcb ) {
                    Y.doccirrus.jsonrpc.api.meddata
                        .getAllMeddataTypes()
                        .then( onTypesLoaded )
                        .fail( itcb );

                    function onTypesLoaded( allMeddataTypes ) {
                        var html, k;

                        allMeddataTypes = allMeddataTypes.data ? allMeddataTypes.data : allMeddataTypes;

                        for ( k in allMeddataTypes ) {
                            if ( allMeddataTypes.hasOwnProperty( k ) ) {
                                html = '<option value="' + k + '">' + allMeddataTypes[k] + '</option>';
                                jq.selChartMdY.append( html );
                            }
                        }

                        itcb( null );
                    }
                }

                function setupAxisTypes( itcb ) {
                    var html, i;

                    for ( i = 0; i < AXIS_MEDDATA_TYPES.length; i++ ) {
                        html = '' +
                            '<option value="' + AXIS_MEDDATA_TYPES[i] + '">' +
                            i18n( 'v_meddata-schema.medDataTypes.' + AXIS_MEDDATA_TYPES[i] ) +
                            '</option>';

                        jq.selChartMdX.append( html );
                    }

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem initializing chart editor: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    function EditChartMDVM() {
                        var
                            self = this;

                        self.btnChooseImageI18n = i18n('FormEditorMojit.ctrl.BTN_CHOOSE_IMAGE');

                    }

                    ko.applyBindings( new EditChartMDVM(), document.querySelector( '#divElementEditPanelChartMD' ) );
                    isRendered = true;
                    updateFromElement();
                    subscribeToControls();
                }

            }

            /**
             *  Set the value of panel controls according to current values in form element renderer
             *  Assumes render is complete, and jq cache is ready
             */

            function updateFromElement() {
                if ( !isRendered ) { return; }

                var chartOpts = element.renderer.chartOpts;

                var k;
                for ( k in BIND_ELEMENTS ) {
                    if ( BIND_ELEMENTS.hasOwnProperty( k ) ) {
                        jq[k].val( chartOpts[ BIND_ELEMENTS[k] ] );
                    }
                }
            }

            function subscribeToControls() {
                function makeChartUpdateHandler( chartProperty, jqControl ) {
                    return function() {
                        var elementStringVal;
                        element.renderer.chartOpts[ chartProperty ] = jq[ jqControl ].val();
                        elementStringVal = element.renderer.chartOptsToString( element.renderer.chartOpts );
                        element.renderer.setValue( elementStringVal, callWhenChanged );
                    };
                }

                var k;
                for ( k in BIND_ELEMENTS ) {
                    if ( BIND_ELEMENTS.hasOwnProperty( k ) ) {
                        jq[k].off( 'change.element' ).on( 'change.element', makeChartUpdateHandler( BIND_ELEMENTS[k], k ) );
                    }
                }

                jq.btnSelectChartImage.off( 'click.element' ).on( 'click.element', function() { setChartImage(); } );
            }

            function setChartImage() {
                var
                    mmScale = element.mm.toScale( element.page.form.zoom );

                element.page.form.raise( 'requestImage', {
                    'ownerCollection': 'forms',
                    'ownerId': element.page.form.canonicalId,
                    'widthPx': mmScale.width,
                    'heightPx': mmScale.height,
                    'default': element.extra,
                    'onSelected': onChartImageChosen
                } );

                function onChartImageChosen( mediaObj, fixAspect ) {
                    var elementStringVal;

                    element.imgFixAspect = fixAspect;
                    element.extra = mediaObj && mediaObj._id ? mediaObj._id : '';

                    //  trigger save and redraw by (re)setting the value
                    elementStringVal = element.renderer.chartOptsToString( element.renderer.chartOpts );
                    element.renderer.setValue( elementStringVal, callWhenChanged );

                    //  TODO: migrate this to current modal
                    Y.dcforms.clearModal();
                }

            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue( newValue ) {
                Y.log( 'Setvalue not used for charts, only edited in control, newValue:' + JSON.stringify( newValue ) , 'debug', NAME );
            }

            /**
             *  Public method to get the value of this control (not used for this element type)
             *  @return {String}
             */

            function getValue() {
                return element.value;
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @param  newHandler  {Function}  of the form fn(txtSerializedList)
             */

            function setOnChanged(newHandler) {
                callWhenChanged = newHandler;
            }


            //  EVENT HANDLERS

            return {
                'render': render,
                'getValue': getValue,
                'setValue': setValue,
                'setOnChanged': setOnChanged
            };
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
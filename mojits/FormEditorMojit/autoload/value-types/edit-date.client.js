/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover date picker used in forms (hovers over canvas)
 */

/*jslint latedef:false */
/*global YUI, $, moment */



YUI.add(
    /* YUI module name */
    'dcforms-editvalue-date',

    /* Module code */
    function( Y , NAME ) {

        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        //  static width the KO datepicker will render to
        Y.dcforms.DATEPICKER_WIDTH = 265;

        Y.dcforms.createDateValueEditor = function(selectedOn, elem, callWhenChanged) {
            var
                //stageDomId = elem.page.getDomId(),
                stageDomId = 'divFloatEditor',
                self = {
                    //  public methods
                    'inRender': false,
                    'jqEditor': $('#' + stageDomId),
                    'jqFloat': null,
                    'jqTxt': null,
                    'bounds': null,
                    'setValue': setValue,
                    'reposition': reposition,
                    'destroy': destroy
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                var
                //    zoom = elem.page.form.zoom,
                    bounds = Y.dcforms.handle.getBounds(elem, selectedOn),
                    html = '' +
                        '<div ' +
                            'id="' + stageDomId + 'divFloatEditor" ' +
                            'style="position: absolute; left: ' + 0 + 'px;top: ' + 0 + 'px;" ' +
                            'class="controls input-group"' +
                        '>' +
                            '<div ' +
                                'id="' + stageDomId + 'VEDate" ' +
                                'class="input-append date"' +
                            '>' +
                                '<input id="' + stageDomId + 'VETxt" type="text" value="' + elem.value + '" style="z-index: 0; height: 1px; width: 1px;" />' +
                            '</div>' +
                        '</div>';

                //style="z-index: 0;"

                //console.log('creating date picker: ' + html);
                //i(data-time-icon='icon-time', )

                self.bounds = bounds;

                self.jqEditor.html(html).show();

                self.icoSpan = $('#' + stageDomId + 'icospan');
                self.icoSpan.addClass('add-on');

                self.jqIcon = $('#' + stageDomId + 'icon');

                self.jqIcon.attr('data-time-icon', 'icon-time');
                self.jqIcon.attr('data-date-icon', 'icon-calendar');

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');

                self.jqFloat.css('position', 'absolute');
                self.jqFloat.css('left', bounds.left + 'px');
                self.jqFloat.css('top', bounds.top + 'px');

                self.jqDatePicker = $('#' + stageDomId + 'VETxt');
                //self.jqDatePicker.attr( 'data-format', elem.extra );

                self.jqDatePicker.css('left', 0);
                self.jqDatePicker.css('top', 0 /* bounds.height */ );

                //self.jqDatePicker.css('left', bounds.left + 'px');
                //self.jqDatePicker.css('top', bounds.top + 'px');

                self.jqDatePicker.datetimepicker( );

                //  extended to also update color and font
                reposition();
                if( elem.page.form.isFromToolbox ) {
                    // remove scroll subscription from window and add add it on form div
                    $( window ).off( 'scroll.datevalueeditor' );
                    $( '#divFormFillToolBox' ).off( 'scroll.datevalueeditor' ).on( 'scroll.datevalueeditor', reposition );
                } else {
                    $( window ).off( 'scroll.datevalueeditor' ).on( 'scroll.datevalueeditor', reposition );
                }

                //self.jqDatePicker.focus();
                //alert('font: ' + toFont);
                //self.jqTxt.css('font', toFont);
                //self.jqTxt.css('line-height', (elem.mm.lineHeight * zoom) + 'px');

                self.jqDatePicker.off('keyup').on('keyup', onTaKeyUp);
                self.jqDatePicker.off('keydown').on('keydown', onTaKeyDown);
                self.jqDatePicker.off('change').on('change', onTaChange);

                self.jqDatePicker.off('dp.change').on('dp.change', onTaChange);
                self.jqDatePicker.off('dp.update').on('dp.update', onTaChange);

                if (elem.value && '' !== elem.value && moment( elem.value ).isValid() ) {
                    self.jqDatePicker.data( 'DateTimePicker' ).defaultDate( elem.renderer.parseDate( elem.value ) );
                    //self.jqDatePicker.setValue(elem.value);
                }
                self.jqDatePicker.data( 'DateTimePicker' ).show();

                self.jqDatePicker.css('width', '0px');
                self.jqDatePicker.css('height', '0px');
            }

            /**
             *  Convert moment format string to datetimepicker format string
             *
             *  DEPRECATED: not currently used due to changes in moment and datepicker
             *
             *  Conversions:
             *
             *      MOMENT      DATEPICKER      VALUE
             *      YYYY        yyyy            Year, eg, 2015
             *      YY          yy              Year, eg 15
             *      MMMM                        Full month name, eg, January, February
             *      MMM                         3 letter month name, eg Jan, Feb
             *      MM                          Two digit month number, eg 02, 02
             *      M                           Integer month number, eg, 1, 2
             *      Q                           Quarter, 1 2 3 4
             *      DD          dd              Two digit day of month, 01, 02
             *      D                           Integer day of month, 1, 2
             *      dddd                        Day of week, eg, Monday, Tuesday
             *      ddd                         Short day of week, eg Mon, Tue
             *      HH                          Hour, 00 - 23
             *      hh                          Hour, 01 - 12
             */

            /*
            function getPickerDateFormat(formatString) {

                formatString = formatString.replace('DD', 'dd');
                formatString = formatString.replace('YYYY', 'yyyy');
                formatString = formatString.replace('YY', 'yy');

                return formatString;
            }
            */

            function destroy() {
                $(window).off('scroll.datevalueeditor');

                //callWhenChanged(self.jqDatePicker.val());
                // previously a value was set by hide also when not shown before, to re-enable this uncomment following:
                // self.jqDatePicker.data( 'DateTimePicker' ).show();

                if (self.jqDatePicker.data( 'DateTimePicker' )) {
                    self.jqDatePicker.data( 'DateTimePicker' ).hide();
                }

                self.jqDatePicker.hide();
                self.jqFloat.hide();
                self.jqEditor.html('');
            }

            function onTaKeyUp() {
                callWhenChanged(self.jqDatePicker.val());
                self.jqDatePicker.data( 'DateTimePicker' ).show();
            }

            function onTaChange() {
                callWhenChanged(self.jqDatePicker.val());
                self.jqDatePicker.data( 'DateTimePicker' ).show();
            }

            /**
             *  Listen for control keys (tab, shift, etc)
             *
             *  credit: http://stackoverflow.com/questions/3362/capturing-tab-key-in-text-box
             */

            function onTaKeyDown(evt) {
                if (9 === evt.keyCode) {
                    //alert('tabnext');
                    elem.page.form.tabNext(selectedOn, elem.elemId);
                    if(evt.preventDefault) {
                        evt.preventDefault();
                    }
                    return false;
                }
            }

            /**
             *  Canvas position and style to move to match any changes to element
             */

            function reposition( /*timeout*/ ) {
                if ( !elem ) { return destroy(); }

                var
                    DATEPICKER_PADDING = 5,
                    bounds = Y.dcforms.handle.getBounds(elem, selectedOn);

                if ( !bounds.allOk && elem === elem.page.form.selectedElement ) {
                    //  render in progress or canvas not visible
                    Y.log('Could not get element bounds, waiting for canvas to be available', 'debug', NAME);
                    window.setTimeout( function() { reposition( ); }, 300 );
                    return;
                }

                //  element was deselected while waiting for render
                if (!elem.page.form.selectedElement || elem.elemId !== elem.page.form.selectedElement.elemId) {
                    return;
                }

                if ( ( bounds.left + Y.dcforms.DATEPICKER_WIDTH ) > ( $( window ).width() - DATEPICKER_PADDING ) ) {
                    bounds.left = ( $( window ).width() - ( Y.dcforms.DATEPICKER_WIDTH + DATEPICKER_PADDING ) );
                }

                self.jqFloat.css('left', bounds.left + 'px');
                self.jqFloat.css('top', bounds.top + 'px');
                self.jqFloat.css('width', bounds.width + 'px');
                self.jqFloat.css('height', bounds.height + 'px');

            }

            function setValue(newValue) {
                var datePicker;
                self.jqDatePicker.val( newValue );
                if (elem.value && '' !== elem.value) {
                    datePicker = self.jqDatePicker.data( 'DateTime' );

                    if ( datePicker ) {
                        datePicker.defaultDate( elem.renderer.parseDate( elem.value ) );
                    } else {
                        //  edge case when disposing a form
                        Y.log( 'Datepicker not available.', 'warn', NAME );
                    }
                }
            }

            render();

            return self;
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
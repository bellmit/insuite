/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing barcode elements
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-barcodeeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) {
            Y.dcforms = {};
        }
        if (!Y.dcforms.elements) {
            Y.dcforms.elements = {};
        }

        Y.log('Adding editor for dcforms barcode types.', 'debug', NAME);

        /**
         *  Subdialog of the element properties, for changing default text values
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Object with 'type' and 'code' properties
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.barcodeEditor = function (domId, initialValue, onChange) {
            var
                jq = {'me': $('#' + domId)},                            //  cached jQuery selectors
                txtValue = Y.dcforms.stripHtml(initialValue.code),      //  current value
                txtType = Y.dcforms.stripHtml(initialValue.type),       //  current selected barcode type
                txtOpts = Y.dcforms.stripHtml(initialValue.options),    //  type-specific barcode options
                callWhenChanged = onChange;                             //  general purpose 'onchange' event

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {

                var
                    safeValue = txtValue || '',
                    typeOpts = '<option value="pdf417">default (pdf417)</option>',
                    cloneTypes = Y.dcforms.barcodeTypes.slice(0),
                    i;

                cloneTypes.sort();

                for (i = 0; i < cloneTypes.length; i++) {
                    typeOpts = typeOpts + '<option value="' + cloneTypes[i] + '">' + cloneTypes[i] + '</option>';
                }

                jq.me.html(' ' +
                    '<textarea id="taBcTxt' + domId + '" style="width: 95%" rows="5" class="form-control"></textarea>' +
                    '<select id="selBcType' + domId + '" style="width: 95%" class="form-control">' + typeOpts + '</select>' +
                    '<input  id="txtOpts' + domId + '" type="text" class="form-control" style="width: 95%; display:none;" />' +
                    '<button id="btn' + domId + '" class="btn" style="width: 95%;">30.988 mm</button>'
                );

                jq.ta = $('#taBcTxt' + domId);
                jq.sel = $('#selBcType' + domId);
                jq.txt = $('#txtOpts' + domId);
                jq.btn = $('#btn' + domId);

                jq.ta.off('keyup.element').on('keyup.element', function () {
                    txtValue = jq.ta.val();
                    callWhenChanged(txtValue, txtType, txtOpts, false);
                });

                jq.txt.off('keyup.element').on('keyup.element', function () {
                    txtOpts = jq.txt.val();
                    callWhenChanged(txtValue, txtType, txtOpts, false);
                });

                jq.sel.off('change.element').on('change.element', function () {
                    txtType = jq.sel.val();

                    if (Y.dcforms.bcExampleValues.hasOwnProperty(txtType)) {
                        txtValue = Y.dcforms.bcExampleValues[txtType];
                        jq.ta.val(txtValue);
                    }
                    if (Y.dcforms.bcExampleOpts.hasOwnProperty(txtType)) {
                        txtOpts = Y.dcforms.bcExampleOpts[txtType];
                        jq.txt.val(txtOpts);
                    }

                    callWhenChanged(txtValue, txtType, txtOpts, false);
                });

                jq.btn.off('click.element').on('click.element', function() {
                    callWhenChanged(txtValue, txtType, txtOpts, true);
                });

                //  possible escaping here TODO: review best point for this
                //txtValue.replace('');

                jq.ta.val(safeValue);
                jq.sel.val(txtType);
                jq.txt.val(txtOpts);
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue(newValue) {
                txtValue = newValue;
                jq.ta.val(newValue);
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return txtValue;
            }

            /**
             *  Set a new event handler for when the value changes
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

        //  barcodes and their rendering modules can be very picky about input, these are some valid examples
        //  source: https://github.com/metafloor/bwip-js
        //  copyright Terry Burton, MIT Licence

        Y.dcforms.bcExampleValues = {
            'ean13':                            '2112345678900',
            'ean8':                             '02345673',
            'upca':                             '416000336108',
            'upce':                             '00123457',
            'isbn':                             '978-1-56581-231-4 52250',
            'ismn':                             '979-0-2605-3211-3',
            'issn':                             '0311-175X 00 17',
            'qrcode':                           'https://doc-cirrus.com/',
            'microqrcode':                      '1234',
            'azteccode':                        'This is Aztec Code',
            'aztecrune':                        '1',
            'azteccodecompact':                 '1234',
            'pdf417compact':                    'This is compact PDF417',
            'datamatrix':                       'This is Data Matrix!',
            'micropdf417':                      'MicroPDF417',
            'pdf417':                           'This is PDF417',
            'code128':                          'Count01234567^FNC2!',
            'code39':                           'THIS IS CODE 39',
            'code39ext':                        'Code39 Ext!',
            'code93':                           'THIS IS CODE 93',
            'code93ext':                        'Code93 Ext!',
            'interleaved2of5':                  '2401234567',
            'ean14':                            '(01) 0 46 01234 56789 3',
            'gs1datamatrix':                    '(01)03453120000011(17)120508(10)ABCD1234(410)9501101020917',
            'gs1qrcode':                        '(01)03453120000011(8200)http://www.abc.net(10)ABCD1234(410)9501101020917',
            'gs1-128':                          '(01)95012345678903(3103)000123',
            'itf14':                            '0 46 01234 56789 3',
            'sscc18':                           '(00) 0 0614141 123456789 0',
            'databarexpanded':                  '(01)95012345678903(3103)000123',
            'databarexpandedstacked':           '(01)95012345678903(3103)000123',
            'databarlimited':                   '(01)15012345678907',
            'databaromni':                      '(01)24012345678905',
            'databarstacked':                   '(01)24012345678905',
            'databarstackedomni':               '(01)24012345678905',
            'databartruncated':                 '(01)24012345678905',
            'auspost':                          '5956439111ABA 9',
            'identcode':                        '563102430313',
            'leitcode':                         '21348075016401',
            'japanpost':                        '6540123789-A-K-Z',
            'maxicode':                         '[)>^03001^02996152382802^029840^029001^0291Z00004951^029UPSN^02906X610^029159^0291234567^0291/1^029^029Y^029634 ALPHA DR^029PITTSBURGH^029PA^029^004',
            'symbol':                           'fima',
            'kix':                              '1231FZ13XHS',
            'royalmail':                        'LE28HS9Z',
            'onecode':                          '0123456709498765432101234567891',
            'planet':                           '01234567890',
            'postnet':                          '01234',
            'code32':                           '01234567',
            'pharmacode':                       '117480',
            'pzn':                              '123456',
            'pharmacode2':                      '117480',
            'hibccodablockf':                   'A123BJC5D6E71',
            'hibccode128':                      'A123BJC5D6E71',
            'hibccode39':                       'A123BJC5D6E71',
            'hibcdatamatrix':                   'A123BJC5D6E71',
            'hibcmicropdf417':                  'A123BJC5D6E71',
            'hibcpdf417':                       'A123BJC5D6E71',
            'hibcqrcode':                       'A123BJC5D6E71',
            'bc412':                            'BC412',
            'coop2of5':                         '01234567',
            'channelcode':                      '3493',
            'rationalizedCodabar':              'A0123456789B',
            'codablockf':                       'CODABLOCK F 34567890123456789010040digit',
            'code11':                           '0123456789',
            'code16k':                          'Abcd-1234567890-wxyZ',
            'code2of5':                         '01234567',
            'code49':                           'MULTIPLE ROWS IN CODE 49',
            'codeone':                          'Code One',
            'datalogic2of5':                    '01234567',
            'iata2of5':                         '01234567',
            'industrial2of5':                   '01234567',
            'msi':                              '0123456789',
            'matrix2of5':                       '01234567',
            'plessey':                          '01234ABCD',
            'posicode':                         'ABC123',
            'telepen':                          'ABCDEF',
            'telepennumeric':                   '01234567',
            'ean13composite':                   '2112345678900|(99)1234-abcd',
            'ean8composite':                    '02345673|(21)A12345678',
            'upcacomposite':                    '416000336108|(99)1234-abcd',
            'upcecomposite':                    '00123457|(15)021231',
            'databarexpandedstackedcomposite':  '(01)00012345678905(10)ABCDEF|(21)12345678',
            'databarexpandedcomposite':         '(01)93712345678904(3103)001234|(91)1A2B3C4D5E',
            'databarlimitedcomposite':          '(01)03512345678907|(21)abcdefghijklmnopqrstuv',
            'databaromnicomposite':             '(01)03612345678904|(11)990102',
            'databarstackedcomposite':          '(01)03412345678900|(17)010200',
            'databarstackedomnicomposite':      '(01)03612345678904|(11)990102',
            'databartruncatedcomposite':        '(01)03612345678904|(11)990102',
            'gs1-128composite':                 '(00)030123456789012340|(02)13012345678909(37)24(10)1234567ABCDEFG',
            'raw':                              '331132131313411122131311333213114131131221323',
            'daft':                             'FATDAFTDAD',
            'flattermarken':                    '11099',
            'ean2':                             '05',
            'ean5':                             '90200',
            'gs1-cc':                           '(01)95012345678903(3103)000123'
        };

        Y.dcforms.bcExampleOpts = {
            'ean13':                            'includetext guardwhitespace',
            'ean8':                             'includetext guardwhitespace',
            'upca':                             'includetext',
            'upce':                             'includetext',
            'isbn':                             'includetext guardwhitespace',
            'ismn':                             'includetext guardwhitespace',
            'issn':                             'includetext guardwhitespace',
            'qrcode':                           'eclevel=M',
            'microqrcode':                      '',
            'azteccode':                        'format=full',
            'aztecrune':                        '',
            'azteccodecompact':                 '',
            'pdf417compact':                    'columns=2',
            'datamatrix':                       '',
            'micropdf417':                      '',
            'pdf417':                           'columns=7 eclevel=4',
            'code128':                          'includetext parsefnc',
            'code39':                           'includetext includecheck includecheckintext',
            'code39ext':                        'includetext includecheck includecheckintext',
            'code93':                           'includetext includecheck',
            'code93ext':                        'includetext includecheck',
            'interleaved2of5':                  'height=0.5 includecheck includetext includecheckintext',
            'ean14':                            'includetext',
            'gs1datamatrix':                    '',
            'gs1qrcode':                        '',
            'gs1-128':                          'includetext',
            'itf14':                            'includetext',
            'sscc18':                           'includetext',
            'databarexpanded':                  '',
            'databarexpandedstacked':           'segments=4',
            'databarlimited':                   '',
            'databaromni':                      '',
            'databarstacked':                   '',
            'databarstackedomni':               '',
            'databartruncated':                 '',
            'auspost':                          'includetext custinfoenc=character',
            'identcode':                        'includetext',
            'leitcode':                         'includetext',
            'japanpost':                        'includetext includecheckintext',
            'maxicode':                         'mode=2 parse',
            'symbol':                           'backgroundcolor=DD000011',
            'kix':                              'includetext',
            'royalmail':                        'includetext barcolor=FF0000',
            'onecode':                          'barcolor=FF0000',
            'planet':                           'includetext includecheckintext',
            'postnet':                          'includetext includecheckintext',
            'code32':                           'includetext',
            'pharmacode':                       'showborder',
            'pzn':                              'includetext',
            'pharmacode2':                      'includetext showborder',
            'hibccodablockf':                   '',
            'hibccode128':                      'includetext',
            'hibccode39':                       'includetext',
            'hibcdatamatrix':                   '',
            'hibcmicropdf417':                  '',
            'hibcpdf417':                       '',
            'hibcqrcode':                       '',
            'bc412':                            'semi includetext includecheckintext',
            'coop2of5':                         'includetext includecheck includecheckintext',
            'channelcode':                      'height=0.5 includetext ',
            'rationalizedCodabar':              'includetext includecheck includecheckintext',
            'codablockf':                       'columns=8',
            'code11':                           'includetext includecheck includecheckintext',
            'code16k':                          '',
            'code2of5':                         'includetext includecheck includecheckintext',
            'code49':                           '',
            'codeone':                          'version=B',
            'datalogic2of5':                    'includetext includecheck includecheckintext',
            'iata2of5':                         'includetext includecheck includecheckintext',
            'industrial2of5':                   'includetext includecheck includecheckintext',
            'msi':                              'includetext includecheck includecheckintext',
            'matrix2of5':                       'includetext includecheck includecheckintext',
            'plessey':                          'includetext includecheckintext',
            'posicode':                         'version=b inkspread=-0.5 parsefnc includetext',
            'telepen':                          'includetext',
            'telepennumeric':                   'includetext',
            'ean13composite':                   'includetext',
            'ean8composite':                    'includetext',
            'upcacomposite':                    'includetext',
            'upcecomposite':                    'includetext',
            'databarexpandedstackedcomposite':  'segments=4 ',
            'databarexpandedcomposite':         '',
            'databarlimitedcomposite':          '',
            'databaromnicomposite':             '',
            'databarstackedcomposite':          '',
            'databarstackedomnicomposite':      '',
            'databartruncatedcomposite':        '',
            'gs1-128composite':                 'ccversion=c',
            'raw':                              'height=0.5',
            'daft':                             '',
            'flattermarken':                    'inkspread=-0.25 showborder borderleft=0 borderright=0',
            'ean2':                             'includetext guardwhitespace',
            'ean5':                             'includetext guardwhitespace',
            'gs1-cc':                           'ccversion=b cccolumns=4'
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
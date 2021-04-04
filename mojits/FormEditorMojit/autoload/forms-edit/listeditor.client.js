/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing lists of things
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, jQuery, $ */

YUI.add(
    /* YUI module name */
    'dcforms-listeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms dropdown and radio types.', 'debug', NAME);

        //  At present stringToList and listToString are not used by anything else
        //  PLANNED: these maybe moved to their own module or dcforms-utils, for use elsewhere

        //  dcList objects have the form { items: [], selected: -1 }, where default is the index of 
        //  the default selected element.  The serialization is as a newline delimited string with
        //  a star marking the default item.

        Y.dcforms.stringToList = function(txtList) {

            //  historical data could be delimited in more ways
            txtList = txtList.replace(new RegExp("<br/>", 'g'), '{newline}');
            txtList = txtList.replace(new RegExp("<br>", 'g'), '{newline}');
            txtList = txtList.replace(new RegExp("\n", 'g'), '{newline}');
            txtList = txtList.replace(new RegExp("\r", 'g'), '');
            txtList = txtList.replace(new RegExp("\t", 'g'), ' ');

            var 
                i,
                currPart,
                parts = txtList.split('{newline}'),
                dcList = {
                    'selected': -1,
                    'items': []            
                };

            for (i = 0; i < parts.length; i++) {
                currPart = jQuery.trim(parts[i]);
                if ('' !== currPart) {
                    if (-1 !== currPart.indexOf('*')) {
                        currPart = currPart.replace('*', '');
                        dcList.selected = dcList.items.length;                    
                    }
                    currPart = Y.dcforms.unescape(currPart);
                    dcList.items.push(currPart);
                }
            }
            
            return dcList;
        };

        /**
         *  Serialize a dcList object to a string
         *  Legacy text serialization from when form templates were stroed as Jade strings
         *  @param  dcList  {Object}    Has items array and selected index 
         */

        Y.dcforms.listToString = function(dcList) {
            var 
                i,
                txtList = '';

            for (i = 0; i < dcList.items.length; i++) {

                //if ('' === jQuery.trim(dcList.items[i])) {
                //    dcList.items[i] = '&nbsp;';
                //}

                if ('' !== jQuery.trim(dcList.items[i])) {
                    if (i === dcList.selected) {
                        txtList = txtList + '*';
                    }
                    txtList = txtList + dcList.items[i] + '{newline}';            
                }            
            }

            return txtList;
        };

        /**
         *  Render a widget to edit lists
         *  @param  domId           {String}        Dom ID to render this into
         *  @param  initialValue    {String}        Rendering context (edit/fill/renderpdf/etc)
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.listEditor = function(domId, initialValue, onChange) {
            var 
                //jqMe = $('#' + domId),
                dcList = Y.dcforms.stringToList(initialValue),
                callWhenChanged = onChange;

            /**
             *  Render table of items and controls
             */

            function renderItems() {
                var            
                    i,
                    chevron = '',
                    html = '';

                //  add existing values

                for (i = 0; i < dcList.items.length; i++) {

                    if (i === dcList.selected) {
                        chevron = '<i class="fa fa-hand-o-right"></i>';
                    } else {
                        chevron = '';
                    }

                    html = html + 
                        '<tr>' +
                          '<td id="tdSelect' + domId + i + '" width="45px">' +
                            '<button class="btn" id="btnSelect' + domId + i + '">' +
                              chevron +
                            '</button>' +
                          '</td>' + 
                          '<td>' +
                            '<input type="text" id="txtLI' + domId + i + '" value="' + dcList.items[i] + '" class="form-control" />' +
                          '</td>' +
                          '<td ' + 'width="30px">' +
                            '<button class="btn" id="btnDel' + domId + i + '">' +
                              '<i class="fa fa-trash-o"></i>' +
                            '</button>' +
                          '</td>' + 
                          '<td ' + 'width="30px">' +
                            '<button class="btn" id="btnUp' + domId + i + '">' + 
                              '<i class="fa fa-chevron-circle-up"></i>' +
                            '</button>' +
                          '</td>' + 
                        '</tr>';
                }

                if (0 === dcList.items.length) {
                    //  TODO: translateme
                    html = html + '<tr><td>(no value)</td></tr>';
                }

                html = '<table id="tblItems' + domId + '" width="100%">' + html + '</table>';

                $('#divItems' + domId).html(html);

                //  attach event listeners for the list items

                function addKeyUpHandler(txtDomId, index) {
                    $('#' + txtDomId).off('keyup').on('keyup', function() {
                        onListItemChanged(index);
                    });
                }

                function addDelButtonHandler(btnDomId, index) {                                
                    $('#' + btnDomId).off('click').on('click', function() {
                        onDeleteValue(index);                
                    });            
                }

                function addUpButtonHandler(btnDomId, index) {                                
                    $('#' + btnDomId).off('click').on('click', function() {
                        onPromoteValue(index);                
                    });            
                }

                function addSelectHandler(tdDomId, index) {
                    $('#' + tdDomId).off('click').on('click', function() {
                        onSetDefault(index);
                    });
                }

                for (i = 0; i < dcList.items.length; i++) {
                    addKeyUpHandler('txtLI' + domId + i, i);
                    addDelButtonHandler('btnDel' + domId + i, i);
                    addUpButtonHandler('btnUp' + domId + i, i);
                    addSelectHandler('btnSelect' + domId + i, i);
                }

            }

            /**
             *  Add the 'new item' form
             */

            function renderAddForm() {
                //  add 'new' form

                var html = ' ' +
                        '<table ' + 'width="100%">' +
                        '<tr>' +
                          '<td>' + 
                            '<input type="text" class="form-control" id="txtNew' + domId + '"/>' +
                          '</td>' +
                          '<td ' + 'width="30px">' +
                            '<button class="btn" id="btnAdd' + domId + '">' + 
                              '<i class="fa fa-plus"></i>' +
                            '</button>' +
                          '</td>' + 
                        '</tr>' + 
                        '</table>';
            
                $('#divAdd' + domId).html(html);

                $('#btnAdd' + domId).off('click.dcelement').on('click.dcelement', function() {
                    var jqTemp = $('#txtNew' + domId);
                    onAddItem(jqTemp.val());
                    jqTemp.val('');
                });

                $('#txtNew' + domId).keypress(function(e) {
                    if ((10 === e.which) || (13 === e.which)) {
                        var jqTemp = $('#txtNew' + domId);
                        onAddItem(jqTemp.val());
                        jqTemp.val('');
                    }
                });
            }

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {

                $('#' + domId).html(' ' +
                  '<div id="divItems' + domId + '"></div>' +
                  '<div id="divAdd' + domId + '"></div>'
                );
                
                renderItems();
                renderAddForm();
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list     
             */

            function setValue(newValue) {
                dcList = Y.dcforms.stringToList(newValue);
                renderItems();
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}     
             */

            function getValue() {
                return Y.dcforms.listToString(dcList);
            }

            /**
             *  Public method to get the value of the selected element
             *  @return {String}
             */

            function getSelectedValue() {
                if (-1 === dcList.selected) { return ''; }
                return dcList.items[dcList.selected];
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @param  newHandler  {Function}  of the form fn(txtSerializedList) 
             */

            function setOnChanged(newHandler) {
                callWhenChanged = newHandler;
            }

            /**
             *  Set the default item, if valid index
             *
             *  @param  txt     {String}    Value of default item
             *  @return         {Boolean}   True on success, false on failure
             */

            function setDefault(txt) {
                var i;

                txt = jQuery.trim(txt);
                txt = txt.replace('*', '');

                for (i = 0; i < dcList.items.length; i++) {
                    if (txt === dcList.items[i]) {
                        dcList.selected = i;
                        renderItems();
                        return true;
                    }                
                }
                return false;
            }

            //  EVENT HANDLERS

            function onListItemChanged(idx) {
                dcList.items[idx] = $('#txtLI' + domId + idx).val().trim();
                Y.log('Value ' + idx + ' changed to: ' + dcList.items[idx]);
                callWhenChanged(Y.dcforms.listToString(dcList));
            }

            /**
             *  Raised when a 'del' button is pressed
             *  @param  idx     {Number}    Index into dcList.items
             */

            function onDeleteValue(idx) {
                Y.log('deleting value ' + idx + ' -> ' + dcList.items[idx], 'info', NAME);
                dcList.items[idx] = '';

                var txtList = Y.dcforms.listToString(dcList);
                setValue(txtList);
                callWhenChanged(txtList);            
            }

            /**
             *  Raised when an item is added
             *  @param  txt {String}    New list item
             */

            function onAddItem(txt) {
                txt = jQuery.trim(txt);
                if ('' === txt) {
                    return;
                }

                //  prevent duplicates
                var i;
                for (i = 0; i < dcList.items.length; i++) {
                    if (dcList.items[i] === txt) {
                        Y.log('Option "' + txt + '" is already in list, not adding', 'info', NAME);
                        return;
                    }
                }
            
                dcList.items.push(txt);
                renderItems();

                callWhenChanged(Y.dcforms.listToString(dcList));
            }

            /**
             *  Promote an item in the list (move one step towards the top)
             *  @param  idx {Number}    Index of the item to promote
             */

            function onPromoteValue(idx) {

                idx = parseInt(idx, 10);

                if (0 === idx) {
                    return;
                }

                Y.log('Promoting value: ' + idx + ' (selected ' + dcList.selected + ')', 'info', NAME);

                var demoted = dcList.items[idx - 1];

                if (dcList.selected === idx) {

                    //  promoting selected item
                    dcList.selected = idx - 1;
                    Y.log('Selected now: ' + dcList.selected, 'info', NAME);

                } else {

                    if (dcList.selected === (idx - 1)) {
                        //  demoting selected item
                        dcList.selected = idx;
                        Y.log('Selected now: ' + dcList.selected, 'info', NAME);
                    }
                }

                dcList.items[idx - 1] = dcList.items[idx];
                dcList.items[idx] = demoted;

                renderItems();
                callWhenChanged(Y.dcforms.listToString(dcList));
            }

            /**
             *  Riased when an item is set to default in the display
             */

            function onSetDefault(idx) {
                Y.log('Setting default item: ' + idx, 'info', NAME);
                dcList.selected = idx;
                renderItems();
                callWhenChanged(Y.dcforms.listToString(dcList));
            }

            return {
                'render': render,                
                'getValue': getValue,
                'setValue': setValue,
                'setOnChanged': setOnChanged,
                'setDefault': setDefault,
                'getSelectedValue': getSelectedValue
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

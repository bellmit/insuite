/*
 * Copyright (c) 2015 Doc Cirrus GmbH
 * all rights reserved.
 */

/*jshint latedef:false */
/*eslint-disable no-unused-vars */
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    var formIcon = '&nbsp;<i class="fa fa-file-text-o"></i>&nbsp;&nbsp;';

    /**
     *  return constructor / desctructor for jadeLoader
     */

    return {

        koSubs: [],             //  KO subscriptions to be disposed when this view is destroyed

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            /*
             *  recover any location reference which was passed to this
             */

            if (!node.passToBinder || !node.passToBinder.location) {
                Y.log('Please pass location to this binder', 'warn', NAME);
                return;
            }

            var
                self = this,
                location = node.passToBinder.location,          //  LocationEdit ViewModel
                i18n = Y.doccirrus.i18n,

                formCats = [],                          //  form categories list
                forms = [],                             //  list of all forms
                assignments = {},

                printers  = Y.doccirrus.cachePrinters,  //  assumes this has been initialized by caller

                isDirty = false,                        //  outstanding changes to be saved

                randClassName = '',                     //  for repeated application of sortable plugin

                jqCache = {                             //  cached jQuery selectors
                    'txtFilter': $('#txtFilter'),
                    'divFormAssignments': $('#divFormAssignments')
                };

            initDisplay();

            /*
             *  load values from them element
             */

            function initDisplay() {

                self.koSubs.push( location.enabledPrinters.subscribe( onEnabledPrintersChange ) );
                self.koSubs.push( location.defaultPrinter.subscribe( onDefaultPrinterChange ) );

                //  Load list of form categories
                Y.dcforms.getFormCategories(true, onFormCatsLoaded);

                location.savePrinterAssignments = function( callback ) { saveAllAssignments( callback ); };
            }

            /**
             *  Post the complete set of assignments for this location back to the server
             */

            function saveAllAssignments( callback ) {

                Y.doccirrus.comctl.privatePost(
                    '/1/formprinter/:setdefaultassignments',            //  url
                    {                                                   //  args
                        'locationId': ko.unwrap( location._id ),
                        'assignments': packAssignments( assignments )
                    },
                    onAssignmentsSaved                                  //  callback
                );

                function onAssignmentsSaved(err) {
                    if (err) {
                        Y.log('Could not save form assignments: ' + JSON.stringify(err), 'debug', NAME);
                        callback(err);
                        return;
                    }

                    location.printerAssignmentsDirty( false );
                    isDirty = false;
                    callback(null);
                }
            }

            function packAssignments() {
                var k, objAry = [];
                for (k in assignments) {
                    if (assignments.hasOwnProperty(k)) {
                        if ('' !== assignments[k]) {
                            objAry.push(k + '::' + assignments[k]);
                        }
                    }
                }
                //console.log('Packed assignments: ', objAry);
                return objAry;
            }

            /**
             *  Load assignments and other configuration for this location and update UI
             */

            function reloadAssignments() {

                //  Load list of forms
                Y.dcforms.getFormList('', true, onFormsLoaded);

                function onFormsLoaded(err, result) {
                    if (err) {
                        onInitErr(err);
                        return;
                    }

                    forms = result;
                    //alert(JSON.stringify(forms));

                    var i;
                    for (i = 0; i < forms.length; i++) {
                        if (forms[i].category) {
                            forms[i].category = forms[i].category.replace(' ', '-');

                            if ('Archiv' === forms[i].category) {
                                forms[i].category = 'Hidden';
                            }
                        }
                    }

                    //  Load user printer mappings
                    Y.doccirrus.comctl.privateGet(
                        '/1/formprinter/:getassignments',
                        {
                            'locationId': ko.unwrap( location._id ),
                            'showFor': 'default'    //  only considering default assignments for this location
                        },
                        onAssignmentsLoaded
                    );
                }

                function onAssignmentsLoaded(err, result) {
                    if (err) {
                        onInitErr(err);
                        return;
                    }

                    assignments = expandAssignments(result.data);

                    updateForms();
                    renderAssignments();

                    jqCache.txtFilter.on('keyup', filterFormLists).on('change', filterFormLists);
                }
            }

            /**
             *  Update forms list with printer information and sort alphabetically
             */

            function updateForms() {
                var
                    enabledPrinters = ko.unwrap( location.enabledPrinters ),
                    printerName,
                    i;

                for (i = 0; i < forms.length; i++) {
                    forms[i].printerName = '';
                    if (location && assignments.hasOwnProperty(forms[i]._id)) {
                        printerName = assignments[forms[i]._id];

                        //  forms may be assigned to a printer which is no longer enabled at this location
                        //  if so, reset it to location default

                        if (-1 === enabledPrinters.indexOf(printerName)) {
                            Y.log('clearing assignment of ' + forms[i]._id + ' to ' + printerName + ' (not enabled)', 'debug', NAME);
                            isDirty = true;
                            location.printerAssignmentsDirty( true );
                            assignments[forms[i]._id] = '';
                        } else {
                            forms[i].printerName = assignments[forms[i]._id];
                        }
                    }
                }

                forms.sort(function (a, b) {
                    var
                        at = a.title.de.toLowerCase(),
                        bt = b.title.de.toLowerCase();

                    if (at < bt) { return -1; }
                    if (at > bt) { return 1; }
                    return 0;
                });
            }

            function expandAssignments(arrayData) {
                var i, parts, obj = {};

                for (i = 0; i < arrayData.length; i++) {
                    parts = arrayData[i].split('::');
                    if (2 === parts.length) {
                        obj[parts[0]] = parts[1];
                    }
                }

                //console.log('Expanded assignments: ', obj);
                return obj;
            }

            /**
             *  Create a table with one column per printer
             */

            function renderColumns() {

                if (!location || !location.defaultPrinter) {
                    //showConfigurationMessage();
                    return;
                }

                var
                    html = '' +
                        '<table><tr><td class="form_list_sortable">' +
                        '<div id="divForms">' + '<h4>' +
                        '<i>' +
                        i18n( 'FormEditorMojit.formprinters.labels.DEFAULT_PRINTER' ) + ' ' +
                        '</i>' +
                        '</h4>' +
                        '<hr/>',

                    printerName,
                    i;

                randClassName = 'olSortable' + Y.doccirrus.comctl.getRandId().substr(0, 8);

                for (i = 0; i < formCats.length; i++) {
                    if ('Archiv' !== formCats[i].canonical) {
                        html = html +
                            formCats[i].de + '<br/>' +
                            '<ol ' +
                                'class="form_list_sortable vertical '  + randClassName + '" ' +
                                'id="olC' + formCats[i].canonical + '" ' +
                                'toprinter="">' +
                            '</ol>';
                    }
                }

                html = html + '</div></td>';

                //  make a column for each printer, hide those not enabled
                //  this is to simplify making columns sortable as printers are enabled via select2

                for (i = 0; i < printers.length; i++) {
                    printerName = printers[i].name;
                    html = html +
                        '<td class="form_list_sortable" id="tdPrinter' + printerName + '">' +
                        '<div id="divP' + printerName  + '">' +
                        '<h4>' + printerName  + '</h4><hr/>' +
                        '<ol ' +
                            'class="form_list_sortable vertical ' + randClassName + '" ' +
                            'id="olP' + printerName  + '" ' +
                            'toprinter="' + printerName  + '"' +
                        '>' +
                        '</ol>' +
                        '</div>' +
                        '</td>';
                }

                html = html + '</tr></table>';

                jqCache.divFormAssignments.html('<div class="connected row">' + html + '</div>');
                jqCache.divForms = $('#divForms');
                //makeSortable('ol.form_list_sortable');
                updateColumns();
            }

            /**
             *  Show columns of enabled printers
             */

            function updateColumns() {
                var
                    enabledPrinters = ko.unwrap(location.enabledPrinters),
                    jqTemp,
                    i;

                for (i = 0; i < printers.length; i++) {

                    jqTemp = $('#tdPrinter' + printers[i].name);

                    if (-1 === enabledPrinters.indexOf(printers[i].name)) {
                        jqTemp.hide();
                    } else {
                        jqTemp.show();
                    }
                }
            }

            /**
             *  Hide forms not matching filter box
             */

            function filterFormLists() {
                var
                    filter = jqCache.txtFilter.val(),
                    parts = filter.toLowerCase().split(' '),
                    match, //
                    selector,
                    compare,
                    i, j;

                for (j = 0; j < parts.length; j++) {
                    parts[j] = $.trim(parts[j]);
                }

                for (i = 0; i < forms.length; i++) {
                    selector = 'liForm' + forms[i]._id;
                    match = true;

                    compare = /* forms[i].title.en + ' - ' + */ forms[i].title.de + ' - ' + forms[i].category;
                    compare = compare.toLowerCase();

                    //  forms must match all words in query
                    for (j = 0; j < parts.length; j++) {
                        if ('' !== parts[j] && -1 === compare.indexOf(parts[j])) {
                            //  there is a filter and it does not match this form
                            match = false;
                        }
                    }


                    if (match) {
                        //console.log('showing: ' + selector + ' (' + compare + ' -- ' + filter);
                        $('#' + selector).show();
                    } else {
                        //console.log('hiding: ' + selector + ' (' + compare + ' -- ' + filter);
                        $('#' + selector).hide();
                    }
                }
            }

            /**
             *  Fill lists with forms according to printerName field
             */

            function renderAssignments() {
                var
                    enabledPrinters = ko.unwrap(location.enabledPrinters),
                    printerName,
                    olItems,
                    i, j;

                if (!location || !enabledPrinters) {
                    //showConfigurationMessage();
                    return;
                }

                for (i = 0; i < formCats.length; i++) {

                    olItems = [];

                    for (j = 0; j < forms.length; j++) {
                        if ('' === forms[j].printerName && forms[j].category === formCats[i].canonical) {
                            olItems.push('<li id="liForm' + forms[j]._id + '">' + formIcon + forms[j].title.de + '</li>');
                        }
                    }

                    $('#olC' + formCats[i].canonical).html(olItems.join(''));

                }

                for (i = 0; i < enabledPrinters.length; i++) {

                    printerName = enabledPrinters[i];
                    olItems = [];

                    for (j = 0; j < forms.length; j++) {
                        if (printerName === forms[j].printerName) {
                            olItems.push(
                                '<li id="liForm' + forms[j]._id + '" formid="' + forms[j]._id + '">' +
                                formIcon +
                                forms[j].title.de +
                                '</li>'
                            );
                        }
                    }

                    $('#olP' + printerName).html(olItems.join(''));
                }

                makeSortable('ol.' + randClassName);
                randClassName = '';
            }

            /**
             *  Invoked after drop events or when a printer is disabled
             *
             *  @param formId
             *  @param printerName
             */

            function assignFormToPrinter(formId, printerName) {
                var i;

                Y.log('Assigning form ' + formId + ' to printer ' + printerName, 'debug', NAME);

                if ('olC' === printerName.substr(0, 3)) { printerName = ''; }

                for (i = 0; i < forms.length; i++) {
                    if (forms[i]._id === formId) {
                        forms[i].printerName = printerName;
                    }
                }

                assignments[formId] = printerName;

                isDirty = true;
                location.printerAssignmentsDirty( true );
            }


            /**
             *  Apply jQuery sortable extension
             *  @param selector
             */

            function makeSortable(selector) {
                var adjustment;

                //if (isSortable) { $(selector).sortable("disable"); }
                //if (isSortable) { return; }
                //isSortable = true;

                //  don't repat initialization on same set of ol elements
                if ('' === randClassName) { return; }

                //console.log('Making form lists sortable...');

                $(selector).sortable({
                    group: 'simple_with_animation_' + randClassName,
                    pullPlaceholder: false,
                    tolerance: 10,
                    // animation on drop
                    onDrop: function  ($item, container, _super) {
                        var
                            $clonedItem = $('<li/>').css({height: 0}),
                            printer,
                            formId;

                        $item.before($clonedItem);
                        $clonedItem.animate({'height': $item.height()});

                        $item.animate($clonedItem.position(), function  () {
                            $clonedItem.detach();
                            _super($item, container);
                        });

                        printer = $(container.el[0]).attr('id').replace('olP', '');
                        formId = $($item[0]).attr('id').replace('liForm', '');

                        assignFormToPrinter(formId, printer);
                    },

                    // set $item relative to cursor position
                    onDragStart: function ($item, container, _super) {
                        var offset = $item.offset(),
                            pointer = container.rootGroup.pointer;

                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };

                        _super($item, container);
                    },
                    onDrag: function ($item, position) {
                        $item.css({
                            left: position.left - adjustment.left,
                            top: position.top - adjustment.top
                        });
                    }
                });
            }

            //  Event handlers

            function onInitErr(err) {
                Y.log('Error initializing formprinters UI: ' + JSON.stringify(err), 'warn', NAME);
            }

            function onFormCatsLoaded(err, result) {
                if (err) {
                    onInitErr(err);
                    return;
                }

                formCats = result;

                var i;
                for (i = 0; i < formCats.length; i++) {
                    formCats[i].canonical = formCats[i].canonical.replace(' ', '-');
                }

                renderColumns();
                reloadAssignments();
            }

            function onEnabledPrintersChange() {
                Y.log('Set of enabled pritners has changed', 'info', NAME);
                updateColumns();
                updateForms();
                renderAssignments();
                filterFormLists();
            }

            function onDefaultPrinterChange() {
                Y.log('Default printer has changed', 'info', NAME);
                updateColumns();
                updateForms();
                renderAssignments();
                filterFormLists();
            }

            function FormPrintersAssingmentVM() {
                var
                    self = this;

                self.filterListI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.FILTER_LIST' );
                self.dragAndDropI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.DRAG_AND_DROP' );

            }

            ko.applyBindings( new FormPrintersAssingmentVM(), document.querySelector( '#divFormPrinterAssignments' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for formprinter_assign.js - ' + node.getAttribute('id'), 'debug', NAME);

            var i;

            for (i = 0; i < this.koSubs.length; i++) {
                this.koSubs[i].dispose();
            }
        }
    };

}
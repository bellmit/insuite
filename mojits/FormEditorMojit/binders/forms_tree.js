/**
 *  jadeLoaded version of the forms tree
 *
 *  The previous arrangement had become overcomplex an unreliable and bogged by legacy stuff which is no longer a
 *  concern - putting it into its own view and simplifying.
 *
 *  @author: strix
 *
 *  Copyright (c) 2012 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*exported _fn */
/*global $ */

function _fn(Y, NAME) {                         //  eslint-disable-line
    'use strict';

    return {

        //  Unique ID of this tree for event subscriptions and DOM (in case of multiple trees on page)

        UID: Y.doccirrus.comctl.getRandId(),   //  Uniquely identify this tree

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  private vars

            var
            //  myNode = node,                          //  YUI / DOM node this is rendered into
                userLang = Y.dcforms.getUserLang(),     //  user's language, may be overridden by template

                passed = node.passToBinder ? node.passToBinder : {},

                showDefaultForms = passed.hasOwnProperty('showDefaultForms') && passed.showDefaultForms,
                domPrefix = (showDefaultForms ? 'r' : 'u'),

                formList = null,
                formCats = null,

                openCats = [],
                selectedForms = [],

                // configuration

                maxTitleLength = 40,
                showSubforms = true,

                selector = ( passed.hasOwnProperty( 'selector' ) ? passed.selector : false ),
                customCategories = ( passed.hasOwnProperty( 'customCategories' ) ? passed.customCategories : false ),

                //  special folders
                showArchiv = ( passed.hasOwnProperty( 'showArchiv' ) ? passed.showArchiv : false ),
                showGHD = ( passed.hasOwnProperty( 'showGHD' ) ? passed.showGHD : true ),
                showInSight2 = ( passed.hasOwnProperty( 'showInSight2' ) ? passed.showInSight2 : false ),
                showEDMP = ( passed.hasOwnProperty( 'showEDMP' ) ? passed.showEDMP : true ),
                showEnvelopes = ( passed.hasOwnProperty( 'showEnvelopes' ) ? passed.showEnvelopes : true ),
                showTelekardio = ( passed.hasOwnProperty( 'showTelekardio' ) ? passed.showTelekardio : false ),
                showDOQUVIDE = ( passed.hasOwnProperty( 'showDOQUVIDE' ) ? passed.showDOQUVIDE : false ),
                showInGyn = ( passed.hasOwnProperty( 'showInGyn' ) ? passed.showInGyn : false ),
                showInPedia = ( passed.hasOwnProperty( 'showInPedia' ) ? passed.showInPedia : false ),
                showDQS = ( passed.hasOwnProperty( 'showDQS' ) ? passed.showDQS : false ),

                callOnSelect = null,
                callOnMultiSelect = null;

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if ( passed ) {


                if ( passed.hasOwnProperty( 'onSelect' ) ) {
                    callOnSelect = passed.onSelect;
                } else {
                    callOnSelect = onSelectDefault;
                }

                if ( passed.hasOwnProperty( 'onMultiSelect' ) ) {
                    callOnMultiSelect = passed.onMultiSelect;
                } else {
                    callOnMultiSelect = null;
                }

            }

            /*
             *  Cache Query selectors for controls
             */

            /*
             *  Subscribe to events which change the form tree
             */

            Y.dcforms.event.on('onNewFormCreated', 'formsTree' + this.UID, onFormsChange);
            Y.dcforms.event.on('onFormNameChanged', 'formsTree' + this.UID, onFormsChange);
            Y.dcforms.event.on('onNewVersionCreated', 'formsTree' + this.UID, onFormsChange);
            Y.dcforms.event.on('onFormImported', 'formsTree' + this.UID, onFormsChange);

            //  INITIALIZATION

            /**
             *  Set up event listeners and request forms list from server
             */

            function initFormsTree() {

                //  subscribe to form events (name change, etc)


                //  begin load and rendering process
                //   - get categories
                //   - get form list
                //   - render the tree

                formCats = Y.dcforms.getCategories( {
                    'withArchiv': showArchiv,
                    'withGHD': showGHD,
                    'withInSight2': showInSight2,
                    'withEDMP': showEDMP,
                    'withEnvelopes': showEnvelopes,
                    'withTelekardio': showTelekardio,
                    'withDOQUVIDE': showDOQUVIDE,
                    'withInGyn': showInGyn,
                    'withInPedia': showInPedia,
                    'withDQS': showDQS
                } );

                if(customCategories) {

                    Y.doccirrus.jsonrpc.api.formfolder.getFolders()
                        .then( function( res ) {
                            formCats = [].concat(formCats,res.data);
                            //  confinue to load forms list
                            Y.dcforms.getFormList('', false, onFormsListLoaded);
                        } ).fail( function( err ) {
                        Y.log( 'could not get folders. Error: ' + JSON.stringify( err ), 'debug', NAME );
                    } );
                }
                else {
                    //  confinue to load forms list
                    Y.dcforms.getFormList('', false, onFormsListLoaded);
                }

            }

            initFormsTree();

            //  PRIVATE METHODS

            /**
             *  Render initialize and set event handlers
             */

            function renderFormsTree() {

                var
                //    that = this,

                    i,                                      //% iterate over categories/folders [int]
                    j,                                      //% iterate over templates/items [int]
                    k,                                      //% iterate over domId => instanceId

                    html = '',                              //% temp string
                    subtree = '',                           //% temp string
                    subtreeCount = '',
                    domId = '',                             //% temp string
                    trimTitle = '',                         //% temp string
                    displayTitle = '',                      //% temp string
                    displayClass = '',                      //% temp string
                    formsInCategory,                        //% filtered form list

                    latestVersionIds = {},                  //% used to bind onClick
                    formIds = {};                           //% used to bind onClick

                //  First check that everything we need is loaded - try load it if not.

                if (!formCats || !formList) {
                    Y.log('Could not render forms list, not yet ready, waiting on data.', 'warn', NAME);
                    return;
                }


                //  Make a CSS tree from the categories and forms

                openCats = [];
                selectedForms = [];
                //html = html + '<div class="css-treeview"><ul>';

                for (i = 0; i < formCats.length; i++) {
                    subtree = '';

                    formsInCategory = filterFormList(formCats[i].canonical);

                    formCats[i].memberCount = formsInCategory.length;

                    for (j = 0; j < formsInCategory.length; j++) {

                        domId = 'dTree' + domPrefix + i + 'x' + j;

                        trimTitle = formsInCategory[j].title[userLang];
                        if (trimTitle.length > maxTitleLength) {
                            trimTitle = formsInCategory[j].title[userLang].substring(0, maxTitleLength) + '...';
                        }

                        displayTitle = trimTitle + ' <small>v' + formsInCategory[j].version + '</small>';

                        displayTitle = '<span class="forms-tree-node">' + displayTitle + '</span>';
                        displayClass = ('' === formsInCategory[j].defaultFor) ? 'forms-tree-leaf' : 'forms-tree-leaf-special';

                        displayTitle = '' +
                            '<div class="' + displayClass + '" id="' + domId + '">' +
                            '<span id="i' + domId + '"><i class="fa fa-file-text-o"></i>&nbsp;&nbsp;</span>' +
                            '<a ' +
                                'class="forms-tree-anchor" href="javascript:void(0);" ' +
                                'title="' + formsInCategory[j].tip + '">' +
                                displayTitle +
                            '</a>' +
                            '</div>';

                        subtree = subtree + displayTitle + '<div class="forms-tree-spacer"></div>';

                        formIds[domId] = formsInCategory[j]._id;
                        latestVersionIds[domId] = formsInCategory[j].latestVersionId;
                        selectedForms[formsInCategory[j]._id] = false;
                    }

                    subtreeCount = ' <small>(' + formCats[i].memberCount + ')</small>';
                    if (0 === formCats[i].memberCount) {
                        subtreeCount = '';
                    }

                    subtree = '' +
                        '<div id="cbT' + domPrefix +  i + '" class="forms-tree-root">' +
                          '<span id="cbTI' + domPrefix +  i  + '">' +
                            '<i class="fa fa-folder"></i>' +
                          '</span>' +
                          '&nbsp;&nbsp;' + formCats[i][userLang] + subtreeCount +
                          '<div id="cbTC' + domPrefix +  i + '" style="display:none;">' +
                            '<div class="forms-tree-spacer"></div>' +
                            subtree +
                          '</div>' +
                        '</div>' +
                        '<div class="forms-tree-spacer"></div>';

                    html = html + subtree;
                    openCats[i] = false;
                }

                //jqCache.divFormTreeContainer.html(html);
                node.setHTML(html);

                //  attach onClick events to form templates in tree

                for (i = 0; i < formCats.length; i++) {
                    $('#cbT' + domPrefix +  i).off('click').on('click', makeCatClickHandler(i));
                }

                for (k in formIds) {
                    if (formIds.hasOwnProperty(k)) {
                        attachTemplateOnClick(k, formIds[k], callOnSelect);
                    }
                }

                //  temporary MOJ-4125 - hide Archiv if not in debug mode
                //if (!jqDevOpts.length || !jqDevOpts.prop('checked')) {
                //    $('#cbT' + domPrefix + '5').hide();
                //}

            }

            function makeCatClickHandler(idx) {
                return function() {
                    if (openCats[idx]) {
                        openCats[idx] = false;
                        $('#cbTC' + domPrefix + idx).hide();
                        $('#cbTI' + domPrefix + idx).html('<i class="fa fa-folder"></i>');
                        $('#cbT' + domPrefix + idx).addClass('forms-tree-root').removeClass('forms-tree-root-x');
                    } else {
                        openCats[idx] = true;
                        $('#cbTC' + domPrefix + idx).show();
                        $('#cbTI' + domPrefix + idx).html('<i class="fa fa-folder-open"></i>');
                        $('#cbT' + domPrefix + idx).addClass('forms-tree-root-x').removeClass('forms-tree-root');
                    }

                };
            }

            /**
             *  Add event to handle user clicking on a form template in the tree
             *
             *  @param  anchorId    {string}    DOM ID of anchor
             *  @param  formId      {string}    ID of form template
             *  @param  onClick     {function}  Event to raise when clicked
             */

            function attachTemplateOnClick(anchorId, formId, onClick) {
                var formMetas = filterFormList(formId);

                if (1 === formMetas.length) {

                    //  open form when clicked
                    $('#' + anchorId).on('click', function(evt) {
                        evt.stopPropagation();
                        onClick(formMetas[0]);
                    });

                    //  select form when icon clicked
                    $('#i' + anchorId).on('click', function(evt) {

                        if (!callOnMultiSelect) {
                            return;
                        }

                        evt.stopPropagation();

                        if (selectedForms[formMetas[0]._id]) {
                            //  deselect the form
                            $('#i' + anchorId).html('<i class="fa fa-file-text-o"></i>&nbsp;&nbsp;');
                            selectedForms[formMetas[0]._id] = false;
                            $('#' + anchorId).removeClass('forms-tree-leaf-selected');
                            onMultiSelect();
                        } else {
                            //  form was not selected, select it
                            $('#i' + anchorId).html('<i class="fa fa-file-text"></i>&nbsp;&nbsp;');
                            selectedForms[formMetas[0]._id] = true;
                            $('#' + anchorId).addClass('forms-tree-leaf-selected');
                            onMultiSelect();
                        }
                    });
                }
            }

            /**
             *  Filter form list by _id or category
             *
             *  @param filter
             *  @returns {Array}
             */

            function filterFormList(filter) {
                var
                    i,
                    filtered = [];

                if (!formList) {
                    Y.log('Attempting to filter form list before data has loaded.', 'warn', NAME);
                    return filtered;
                }

                for (i = 0; i < formList.length; i++) {

                    if (formList[i].hasOwnProperty('_id') && (formList[i]._id === filter)) {
                        filtered.push(formList[i]);
                    }

                    if (formList[i].hasOwnProperty('category') && (formList[i].category === filter)) {
                        filtered.push(formList[i]);
                    }
                }

                //  sort the list by form title in current language

                filtered.sort(compareAlphabetical);

                function compareAlphabetical(a,b) {
                    if (a.title[userLang] < b.title[userLang]) {
                        return -1;
                    }
                    if (a.title[userLang] > b.title[userLang]) {
                        return 1;
                    }
                    return 0;
                }

                return filtered;
            }

            //  EVENT HANDLERS

           /**
             *  Callback from Y.doccirrus.getFormsList - has a flat list of forms
             *
             *  @param  err         {String}    AJAX error message
             *  @param  data        {Object}    Array of form template metadata objects
             */

            function onFormsListLoaded(err, data) {

                if (err) {
                    //  TODO: translateme
                    Y.doccirrus.comctl.setModal('Error', 'Could not load forms list');
                    return;
                }

                var
                //    isOK = true,
                    i;

                formList = [];


                for (i = 0 ; i < data.length; i++) {
                    if (data[i].isSubform && !showSubforms) {
                        Y.log('Not displaying subform: ' + data[i].title[userLang], 'debug', NAME);
                    } else {
                        if (data[i].isReadOnly === showDefaultForms) {
                            //Y.log('Displaying form: ' + data[i].title[userLang], 'debug', NAME);
                            formList.push(data[i]);
                        } //else {
                            //Y.log('Not displaying form: ' + data[i].title[userLang], 'debug', NAME);
                            //Y.log('prefix: ' + domPrefix + ' showDefault: ' + showDefaultForms, 'debug', NAME);
                        //}
                    }
                }

                renderFormsTree();
            }

            function onSelectDefault(formMeta) {
                Y.doccirrus.comctl.setModal(
                    'Notice',
                    'No select handler defined for form tree:<br/><pre>' + JSON.stringify(formMeta) + '</pre>',
                    true
                );
            }

            /**
             *  Raised when multiple selections of forms is changed
             */

            function onMultiSelect() {
                var selected = [], k;

                for (k in selectedForms) {
                    if (selectedForms.hasOwnProperty(k)) {
                        if (selectedForms[k]) {
                            selected.push(k);
                        }
                    }
                }

                callOnMultiSelect(showDefaultForms, selected);
            }

            /**
             *  Force update of cached form list
             */

            function onFormsChange() {
                Y.log('Updating forms tree after external event.', 'debug', NAME);
                Y.dcforms.getFormList('', true, onFormsListLoaded);
            }

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            /*
             *  Remove event listeners
             */

            Y.dcforms.event.off('*', 'formsTree' + this.UID);


            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }

    };

}
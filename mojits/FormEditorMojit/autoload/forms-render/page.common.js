/**
 *	Single pages of forms
 *
 *  Note that these are abstract objects, which may be represented in print with multiple PDF pages or on the
 *  screen by multiple sets of HTML canvasses
 */

/*global YUI, $, moment */
/*eslint prefer-template:0, strict:0 */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-page',

    /* Callback */

    function(Y, NAME) {
        if (!Y.dcforms) { Y.dcforms = {}; }

        var _async = Y.dcforms._async;

        /**
         *  Previous, unwrapped constructor for page type of object
         *
         *  @param  formtemplate        {Object}    Parent object
         *  @param  pageName            {String}    Legacy
         *  @param  serialized          {Object}    Plain JSON object
         *  @param  creationCallback    {Function}  Of the form fn(err)
         */

        function createTemplatePage(formtemplate, pageName, serialized, creationCallback) {

            /*
             *  Properties
             */

            var page;

            page = {

                'UID': formtemplate.UID + pageName,         //_ uniquely identifies page object

                'form': formtemplate,                       //_ parent object [object]
                'name': pageName,                           //_ just a label, eg 'cover', 'page2', etc [string]

                'elements': [],                             //_ set of form elements on the page [array:object]
                'clonedSubElements': [],                    //_ subelements copied onto multiple canvasses [array:object]
                'header': '',                               //_ subform id to use as page header [string]
                'footer': '',                               //_ subform id to use as page footer [string]
                'firstPageDifferent': false,                //_ use different headers and footers on overflow pages
                'headerOverflow': '',                       //_ subform id to use as page header on overflow pages [string]
                'footerOverflow': '',                       //_ subform id to use as page footer on overflow pages [string]
                'outstanding': 0,                           //_ number of panel downloads in progress DEPRECATED [int]
                'headerElem': null,                         //_ element instantiating header subform [object]
                'footerElem': null,                         //_ element instantiating footer subform [object]
                'bgElem': null,                             //_ element instantiating page background [object]
                'ready': false,                             //_ set to true when all panels loaded via REST [string]
                'mode': 'fill',                             //_ 'fill'|'edit' [string]
                'queued': false,                            //_ set to true when awaiting rendering [bool]

                'il8nDict': Y.dcforms.il8nDict,             //_ translation dict, DEPRECATED [object]

                'fgColor': 'rgba(50,50,50,1)',              //_ default fg color of new elements [string]
                'bgColor': 'rgba(255,255,255,1)',           //_ default page background color [string]
                'bgImg': '',                                //_ ID of background image (if any)
                'bgImgT': {'en': '', 'de': ''},             //_ Background images are now language sensistive
                'bgImgNameT': {'en': '', 'de': ''},         //_ Background images are now language sensistive
                'bgImgFixAspect': false,                    //_ scale if true, crop if false  [boolean]
                'bgImgMime': 'IMAGE_JPEG',                  //_ Friendly name of background image
                'bgImgName': '',                            //_ Friendly name of background image

                'resolution': -1,                           //_ dots per mm ~ 300dpi [float]
                'aspect': 0.707070707,                      //_ aspect ratio of paper [float]
                'pageNo': -1,

                //  millimeter dimensions of abstract page
                'mm': Y.dcforms.createSubElement( 0, 0, formtemplate.paper.width, formtemplate.paper.height ),

                //  pixel dimensions of pages
                'px': {
                    width: -1,
                    height: -1,
                    header: 0,
                    footer: 0,
                    content: -1
                },

                'scaleFont': 8,                             //_ default font size, used when none specified

                'canvasses': [],                            //_ html canvas elements used to display page background images, headers and footers
                'pdfPages': [],                             //_ references to HPDF.js page objects
                'tabMap': [],                               //_ relates element index to tab index

                'isCarbonCopy': false,                      //_ Carbon copy pages are not displayed in fill mode

                'controlledBy': '',                         //_ some dynamic pages are instantiated by other objects
                'overflowPages': [],
                'renderDivId': '',                          //_ if not form
                'forceParent': '',
                'isLast': false,                            //_ pages other than the last one need padding

                'isInDOM': false,                           //_ set to true when dom has been initialized
                'inRender': false,                          //_ true if a render operation is in progress
                'reRenderCount': 0,                         //_ used to allow rerender, but prevent too many of them
                'maxStack': 20,                             //_ Hack for Firefox, prevent stack exhaustion when drawing
                'isDirty': true,                            //_ prevent unnecessary redrawing of page,

                'abstract': {                               //_ measurements of form on elastic page
                    'height': formtemplate.paper.height,    //_ height of page content, including overflow (mm)
                    'header': 0,                            //_ height of page header (mm)
                    'footer': 0,                            //_ height of page footer (mm)
                    'usable': formtemplate.paper.height,    //_ space remaining after header and footer acounted for (mm)
                    'numFixed': 1                           //_ number of fixed pages needed to represent form content
                }
            };

            /**
             *  Add container elements for this page to the DOM, in parent's rendering div
             *  Note that some pages may be hidden
             */

            page.addToDOM = function() {
                if ( Y.dcforms.isOnServer )  {
                    Y.log('Form is on server, no DOM to insert into.', 'debug', NAME);
                    return false;
                }

                if ( page.isHidden() || page.form.isHidden ) {
                    Y.log( 'Not adding hidden page to DOM: ' + page.name, 'debug', NAME );

                    //  TODO: remove from DOM if already added
                    page.isInDOM = false;

                    return false;
                }

                /*
                if ( page.isInDOM || page.form.isChildForm) {
                    return;
                }
                */

                var
                    html = '' +
                        '<div id="' + page.getDomId( '' ) + '" style="position:relative;">' +
                        '<div id="' + page.getDomId( 'fixed' ) + '" style="border: 1px solid #666666;"></div>' +
                        //'<div id="' + page.getDomId('staging') + '">(staging)</div>' +
                        '<div id="' + page.getDomId( 'spacer' ) + '"><br/><br/></div>' +
                        '</div>',
                    i;

                //  create container divs
                page.form.jqSelf( 'pages' ).append( html );

                //  add fixed pages and arrange canvasses
                for ( i = 0; i < page.canvasses.length; i++ ) {
                    page.canvasses[i].addToDOM();
                }

                page.isInDOM = true;
                return true;
            };

            page.removeFromDOM = function() {
                var
                    container = page.jqSelf( '' ),
                    i;

                for ( i = 0; i < page.canvasses.length; i++ ) {
                    page.canvasses[i].removeFromDOM();
                }

                if ( container.length && container.get(0) ) {
                    container.remove();
                    page.isInDOM = false;
                    return true;
                }

                return false;
            };

            /**
             *  (Re)create fixed page canvas sets
             */

            page.createFixedCanvassses = function() {
                var
                    showInDOM = ( !Y.dcforms.isOnServer && !page.form.isChildForm && !page.form.isHidden ),
                    i, newCanvasSet;

                //  future versions may require a destructor
                page.canvasses = [];

                if ( showInDOM ) {
                    page.jqSelf('fixed').html('');
                }

                for (i = 0; i < page.abstract.numFixed; i++) {
                    newCanvasSet = Y.dcforms.createCanvasSet(page, i);
                    page.canvasses.push( newCanvasSet );
                    formtemplate.raise('createOverFlowPage', i);
                }

                if ( showInDOM ) {
                    for ( i = 0; i < page.canvasses.length; i++ ) {
                        page.canvasses[i].addToDOM();
                    }
                }
            };

            /**
             *  New render cycle, lay out and measure abstract canvas without drawing it to an actual canvas
             *
             *  Not all layers will require redraw in all cases
             *
             *  @param  layer   {Number}    As in Y.dcforms.LAYER_X enum
             */

            page.redraw = function(layer) {
                var i;

                //  measure page content and break into fixed pages
                page.setTabIndexes();
                page.initAbstract();
                page.layoutAbstract();
                page.measureAbstract();

                //  check that we have the correct number of fixed canvasses
                if (page.canvasses.length !== page.abstract.numFixed) {
                    page.createFixedCanvassses();
                }

                for (i = 0; i < page.canvasses.length; i++) {
                    page.canvasses[i].redraw(layer);
                }

                //  note that all elements have been drawn, no pending updates
                for (i = 0; i < page.elements.length; i++) {
                    page.elements[i].isDirty = false;
                }

            };

            /**
             *  Redraw any fixed pages which have been made dirty by events or user action
             *  (skip redraw if nothing has chaged)
             */

            page.redrawDirty = function() {
                var i;
                for (i = 0; i < page.elements.length; i++) {
                    if (page.elements[i].isDirty) {
                        //  only text layer is redrawn - changes to background image, headers, etc are special cases
                        page.redraw(Y.dcforms.LAYER_TEXT);
                        return;
                    }
                }
            };

            /**
             *  Assign subelements to fixed pages
             *
             *  Abstract layout should be possible without actually drawing anything
             *
             *  The boffset property of subelements is set here.  This is an additional vertical displacement
             *  used to prevent subelements from lying across a page break
             */


            page.layoutAbstract = function() {
                var
                    i,                  //  iterate over tab index
                    j,                  //  iterate over subelements
                    idx,                //  tab index of current element
                    elem,               //  current element
                    cmpElem,            //  compare element
                    subelem,            //  current subelement
                    voffset = 0,        //  running offset from content overflow (mm)
                    cloneable = [],     //  set of input elements which may be copied onto multiple pages
                    notCloneable = [],  //  set of all other subelements

                    onPage, cutBy,

                    tempOffset;         //

                //console.log( '(****) page.layoutAbstract, page.abstract: ', JSON.stringify( page.abstract ) );

                //  0.  experimental pass, find elements which are on the same level and compensate for overflow as a group

                page.inlineGroupHeight = {};
                page.inlineGroupStretch = {};
                //console.log( '(****) enter layoutAbstract: ', page.elements.length, page.tabMap.length );

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];
                    elem.mm.inlineOffset = 0;                                   //  reset inline offset
                    elem.mm.overflowHeight = elem.mm.overflowHeight || 0;       //  check overflow value exists
                    elem.mm.contentHeight = elem.mm.contentHeight || 0;         //  ...
                    elem.inlineGroup = null;                                    //  reset inline group
                    elem.updateBounds();
                }

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    if (!page.form.isFixed ) {

                        //  element has overflow, find all other elements on the same level, make height maps of inline groups
                        for ( j = i + 1; j < page.tabMap.length; j++ ) {
                            cmpElem = page.elements[page.tabMap[j]];

                            if (
                                !cmpElem.inlineGroup &&                                 // not already in a group
                                cmpElem.mm.top === elem.mm.top &&                       // at the same height as a previous element
                                cmpElem.mm.top < ( elem.mm.top + elem.mm.height )
                            ) {

                                //console.log( '(****) element on same level as ' + elem.elemId + ', checking group height ', elem.mm.height, elem.mm.contentHeight, cmpElem );
                                cmpElem.inlineGroup = elem.elemId;

                                if ( !page.inlineGroupHeight.hasOwnProperty( elem.elemId ) ) {
                                    //  start an inline group
                                    //console.log( '(****) start inline group: ', elem.elemId );
                                    page.inlineGroupHeight[elem.elemId] = elem.mm.top + elem.mm.height;
                                    page.inlineGroupStretch[elem.elemId] = elem.mm.top + elem.mm.contentHeight;
                                }

                                //  if the inline group is taller than previous elements because of this one
                                if ( cmpElem.mm.top + cmpElem.mm.height > page.inlineGroupHeight[elem.elemId] ) {
                                    page.inlineGroupHeight[elem.elemId] = cmpElem.mm.top + cmpElem.mm.height;
                                    //console.log('(****) increase inline group height by elem ' + cmpElem.elemId + ': ', page.inlineGroupHeight[elem.elemId] );
                                }

                                if ( cmpElem.mm.top + cmpElem.mm.contentHeight > page.inlineGroupStretch[elem.elemId] ) {
                                    page.inlineGroupStretch[elem.elemId] = cmpElem.mm.top + cmpElem.mm.contentHeight;
                                    //console.log('(****) increase inline stretch height by elem ' + cmpElem.elemId + ': ', page.inlineGroupStretch[elem.elemId] );
                                }

                                elem.inlineGroup = elem.elemId;
                                cmpElem.inlineGroup = elem.elemId;

                            } else {
                                break;
                            }
                        }
                    }
                }

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];
                    if ( page.tabMap[i+1] && page.elements[page.tabMap[i+1]]) {
                        cmpElem = page.elements[page.tabMap[i+1]];
                        if ( cmpElem.inlineGroup !== elem.inlineGroup ) {
                            elem.lastInGroup = true;
                        }
                    } else {
                        if ( elem.inlineGroup ) {
                            elem.lastInGroup = true;
                        }
                    }
                }

                //  1.  first pass, over element, add/reset voffset
                //  voffset is the ammount form elements are displaced down the page by content which has expanded above
                //  them - text, tables, etc:

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];


                    elem.mm.voffset = voffset - elem.mm.inlineOffset;

                    //console.log( '(****) setting ' + elem.elemId + ' element voffset: ', elem.mm.voffset, voffset, elem.mm.inlineOffset, elem.mm.overflowHeight, elem.inlineGroup, elem.lastInGroup );

                    if (!page.form.isFixed && !elem.inlineGroup && elem.mm.overflowHeight) {
                        voffset = voffset + elem.mm.overflowHeight;
                    }

                    if ( !page.form.isFixed && elem.inlineGroup && page.inlineGroupStretch[elem.inlineGroup] && elem.lastInGroup ) {
                        if ( page.inlineGroupStretch[elem.inlineGroup] > page.inlineGroupHeight[elem.inlineGroup] ) {
                            voffset = voffset + ( page.inlineGroupStretch[elem.inlineGroup] - page.inlineGroupHeight[elem.inlineGroup] );
                        }
                    }

                    //  remove selected empty elements from flow layout when making PDF
                    if ( Y.dcforms.isOnServer && elem.omitFromPDFIfEmpty && elem.renderer.isEmpty() ) {
                        Y.log( 'Adding negative offset for ' + elem.elemId + ': ' + elem.mm.height, 'debug', NAME );
                        voffset = voffset - elem.mm.height;
                    }
                }

                //  2. second pass, over subelements, note which fixed pages the top and bottom of the subelement occupies
                //  clear boffset at this point, will be set in next pass

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    for (j = 0; j < elem.subElements.length; j++) {
                        subelem = elem.subElements[j];

                        //  check that subelement is not larger than available space on a full page
                        if ( subelem.height > page.abstract.usable ) {
                            //  make slightly smaller than available space
                            subelem.height = page.abstract.usable - 5;
                        }

                        subelem.absTop = elem.mm.top + elem.mm.voffset + subelem.top /*- elem.mm.inlineOffset */;
                        subelem.absBottom = elem.mm.top + elem.mm.voffset + subelem.top + subelem.height /*- elem.mm.inlineOffset*/;

                        subelem.boffset = 0;
                        subelem.element = elem;

                        //  if subelem is past the usable space of the first page then bump to next, where them ammount
                        //  of usable space may be different due to different headers / footers.
                        subelem.onOverflow = ( subelem.absTop > page.abstract.usable );

                        if ( !subelem.onOverflow) {
                            //  on first page, element can stay where it is for now
                            subelem.fixedTop = subelem.absTop;
                            subelem.pageTop = 0;
                        } else {
                            //  on overflow page, subtract the usable space of the first page
                            subelem.fixedTop = subelem.absTop - page.abstract.usable;
                            //  then divide up into equal-sized overflow pages, and record which one this subelem falls on
                            subelem.pageTop =  Math.floor( subelem.fixedTop / page.abstract.usableOverflow ) + 1;
                            subelem.fixedTop = subelem.fixedTop % page.abstract.usableOverflow;
                        }

                        //  vertical position on fixed page
                        subelem.fixedLeft = (elem.mm.left + subelem.left);

                        //  collect elements which can be cloned across pages
                        if ( subelem.cloneable ) {
                            cloneable.push( subelem );
                        } else {
                            notCloneable.push( subelem );
                        }
                    }
                }

                //console.log( '(****) page.abstract: ', page.abstract );

                //  3. third pass, if any subelements lie on a page break, bump them down, along with all subelements
                //  which follow.  boffset is the collected displacement due to bumping down over page breaks

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    for (j = 0; j < elem.subElements.length; j++) {
                        subelem = elem.subElements[j];

                        subelem.fixedBottom = subelem.fixedTop + subelem.height;
                        subelem.pageBottom = subelem.pageTop;

                        if ( !subelem.onOverflow ) {
                            //  on first page, check if element straddles first page break
                            if ( subelem.fixedBottom  > page.abstract.usable ) {

                                // calculate the height of the element which extends past the bottom of the first page
                                tempOffset = subelem.height - ( page.abstract.usable - subelem.fixedTop );
                                // count how many additional pages it crosses
                                subelem.pageBottom = 1 + Math.floor( tempOffset / page.abstract.usableOverflow );
                                //  and where the bottom of the element is on the final page (for colored background, etc)
                                subelem.fixedBottom = ( tempOffset % page.abstract.usableOverflow );

                            }

                        } else {
                            //  subsequent pages, broken up into lengths of usableOverflow
                            if ( subelem.fixedBottom > page.abstract.usableOverflow ) {


                                // calculate the height of the element which extends past the bottom of the overflow page
                                tempOffset = subelem.height - ( page.abstract.usableOverflow - subelem.fixedTop );
                                // count how many additional pages it crosses
                                subelem.pageBottom = subelem.pageTop + 1 + Math.floor( tempOffset / page.abstract.usableOverflow );
                                //  and where the bottom of the element is on the final page (for colored background, etc)
                                subelem.fixedBottom = ( tempOffset % page.abstract.usableOverflow );

                            }
                        }

                        //  NOTE: for efficiency, it should be possible to remove bumpAbstractAfter and replace with
                        //  a running boffset and set of stored breaks, instead of multiple calls to this function.
                        //  Not implemented yet because performance gain would be modest compared vs complexity
                        //  introduced, but this may change for very large PDFs

                        if ( ( subelem.pageTop !== subelem.pageBottom ) && ( subelem.pageBottom > subelem.pageTop ) && !subelem.cloneable ) {
                            //  add boffset to bump subelement and everything below it
                            if ( !subelem.onOverflow ) {
                                tempOffset = ( page.abstract.usable - subelem.fixedTop );
                            } else {
                                tempOffset = ( page.abstract.usableOverflow - subelem.fixedTop );
                            }
                            if ( tempOffset > 0 ) {
                                page.bumpAbstractAfter( subelem.absTop, tempOffset + 1 );
                            }
                        }

                        subelem.fixedPage = subelem.pageTop;
                    }
                }

                //  4. fourth pass reposition cloneable input elements to cover their subelements on all pages, then
                //  copy onto all pages which contain them

                page.clonedSubElements = [];
                for ( i = 0; i < cloneable.length; i++ ) {

                    subelem = cloneable[i];

                    //  stretch the cloneable subelement around the content of text area / table cell
                    for ( j = 0; j < notCloneable.length; j++ ) {
                        if (
                            notCloneable[j].cloneInputGroup &&
                            ( cloneable[i].cloneInputGroup === notCloneable[j].cloneInputGroup ) &&
                            ( notCloneable[j].absBottom > cloneable[i].absBottom )
                        ) {
                            cloneable[i].absBottom = notCloneable[j].absBottom;
                            cloneable[i].height = cloneable[i].absBottom - cloneable[i].absTop;
                        }
                    }

                }

                for ( i = 0; i < cloneable.length; i++ ) {
                    subelem = cloneable[i];

                    if ( subelem.pageBottom > subelem.pageTop ) {

                        //  let tempOffset be the remaining height of the element to be recovered by cloned elements
                        if ( 0 === subelem.pageTop ) {
                            cutBy = ( page.abstract.usable - subelem.fixedTop );
                        }  else {
                            cutBy = ( page.abstract.usableOverflow - subelem.fixedTop );
                        }

                        page.cloneSubElem( subelem, subelem.pageTop, cutBy, subelem.fixedTop );
                        tempOffset = subelem.height - cutBy;

                        onPage = subelem.pageTop + 1;

                        while ( tempOffset > 0 ) {
                            if ( tempOffset > page.abstract.usableOverflow ) {
                                page.cloneSubElem( subelem, onPage, page.abstract.usableOverflow, 0 );

                            } else {
                                page.cloneSubElem( subelem, onPage, tempOffset, 0 );

                            }
                            tempOffset = tempOffset - page.abstract.usableOverflow;
                            onPage = onPage + 1;
                        }

                        //  hide the original subelement on canvas (is cloned in pieces)
                        subelem.hideOnCanvas = true;

                    } else {

                        //  show the original subelement if it shrinks or moves
                        subelem.hideOnCanvas = false;
                    }
                }

                //  5. fifth pass, locate subelements on fixed page and account for header

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    for (j = 0; j < elem.subElements.length; j++) {
                        subelem = elem.subElements[j];

                        //  special case for fixed pages and subforms, do not break across pages (MOJ-5396)
                        if ( page.form.isFixed || page.form.isSubform ) {
                            subelem.pageTop = 0;
                            subelem.pageBottom = 0;
                            subelem.fixedPage = 0;
                            subelem.absTop = elem.mm.top + subelem.top;
                            subelem.fixedTop = subelem.absTop + page.abstract.header;
                            subelem.boffset = 0;
                        } else {
                            //  vertical position on fixed page, bump by header
                            subelem.fixedTop = subelem.fixedTop + ( subelem.onOverflow ? page.abstract.headerOverflow : page.abstract.header );
                        }

                        subelem.magic = page.getMagicVars( subelem.pageTop );
                    }
                }

                //  account for header in cloned subelements
                for ( i = 0; i < page.clonedSubElements.length; i++ ) {
                    subelem = page.clonedSubElements[i];
                    if ( 0 === subelem.fixedPage ) {
                        subelem.fixedTop = subelem.fixedTop + page.abstract.header;
                    } else {
                        subelem.fixedTop = subelem.fixedTop + page.abstract.headerOverflow;
                    }
                }

            };

            /**
             *  Adjust subelements on abstract page so that they do not lie across a page break
             *
             *  @param  breakHeight {Number}    Element at or below this level will be bumped down
             *  @param  addBOffset  {Number}    Ammount to bump elements by
             */

            page.bumpAbstractAfter = function( breakHeight, addBOffset ) {
                var elem, subelem, i, j, idx, tempOffset;

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    for (j = 0; j < elem.subElements.length; j++) {
                        subelem = elem.subElements[j];

                        if ( subelem.absTop >= breakHeight ) {

                            //console.log( '(****) before bump subelem ' + breakHeight + ': ', subelem.fixedPage, subelem.pageTop, subelem.absTop, subelem.text);

                            subelem.absTop = subelem.absTop + addBOffset;
                            subelem.absBottom = subelem.absBottom + addBOffset;
                            subelem.boffset = subelem.boffset + addBOffset;
                            subelem.onOverflow = ( subelem.absTop > page.abstract.usable );

                            //console.log( '(****) subelem onOverflow: ', subelem.onOverflow, subelem.absTop, ' bump by: ', addBOffset );

                            //  reassign fixedTop and top page number

                            if ( !subelem.onOverflow ) {
                                //  on first page, element can stay where it is for now
                                //console.log( '(****) bumping element on first page: ', subelem.absTop, subelem.fixedTop, subelem.pageTop );
                                subelem.fixedTop = subelem.absTop;
                                subelem.pageTop = 0;

                                //console.log( '(****) bumped element on first page to second: ', subelem.fixedTop, subelem.absTop );
                            } else {
                                //console.log( '(****) bumping element on overflow page: ', subelem.fixedTop, subelem.pageTop );

                                //  on overflow page, subtract the usable space of the first page
                                subelem.fixedTop = subelem.absTop - page.abstract.usable;
                                //  then divide up into equal-sized overflow pages, and record which one this subelem falls on
                                subelem.pageTop =  Math.floor( subelem.fixedTop / page.abstract.usableOverflow ) + 1;
                                subelem.fixedTop = subelem.fixedTop % page.abstract.usableOverflow;
                                //console.log( '(****) bumped element on overflow page: ', subelem.absTop, subelem.fixedTop, subelem.pageTop );
                            }

                            //  reassign bottom page number

                            if ( !subelem.onOverflow ) {
                                //  on first page, check if element straddles first page break
                                if ( subelem.fixedTop + subelem.height > page.abstract.usable ) {

                                    // calculate the height of the element which extends past the bottom of the first page
                                    tempOffset = subelem.height - ( page.abstract.usable - subelem.fixedTop );
                                    // count how many additional pages it crosses
                                    subelem.pageBottom = 1 + Math.floor( tempOffset / page.abstract.usableOverflow );
                                    //  and where the bottom of the element is on the final page (for colored background, etc)
                                    subelem.fixedBottom = ( tempOffset % page.abstract.usableOverflow );

                                }
                            } else {
                                //  subsequent pages, broken up into lengths of usableOverflow
                                if ( subelem.fixedTop + subelem.height > page.abstract.usableOverflow ) {
                                    //subelem.pageBottom = subelem.pageTop + 1 + Math.floor( subelem.height / page.abstract.usableOverflow );

                                    // calculate the height of the element which extends past the bottom of the overflow page
                                    tempOffset = subelem.height - ( page.abstract.usableOverflow - subelem.fixedTop );
                                    // count how many additional pages it crosses
                                    subelem.pageBottom = subelem.pageTop + 1 + Math.floor( tempOffset / page.abstract.usableOverflow );
                                    //  and where the bottom of the element is on the final page (for colored background, etc)
                                    subelem.fixedBottom = ( tempOffset % page.abstract.usableOverflow );

                                }
                            }

                            subelem.fixedPage = subelem.pageTop;
                        }

                    }
                }

            };

            /**
             *  When a subelement on the abstract page splits across several fixed pages we may need to make copies,
             *  especially for interaction elements for large text elements and tables.
             *
             *  @param  subelem         {Object}    subelem to copy
             *  @param  toFixedPageIdx  {Number}    Fixed page number, integer
             *  @param  height          {Number}    Of new element, mm
             *  @param  top             {Number}
             */

            page.cloneSubElem = function( subelem, toFixedPageIdx, height, top ) {
                var
                    newSubElem = Y.dcforms.createSubElement(
                        subelem.left, subelem.top,
                        subelem.width, height,
                        subelem.lineHeight, subelem.text,
                        subelem.img
                    );

                newSubElem.element = subelem.element;
                newSubElem.pageTop = toFixedPageIdx;
                newSubElem.pageBottom = toFixedPageIdx;
                newSubElem.fixedPage = toFixedPageIdx;
                newSubElem.absTop = page.abstract.usable + ( page.abstract.usableOverflow * ( toFixedPageIdx - 1 ) );
                newSubElem.absBottom = newSubElem.absTop + height;
                newSubElem.fixedLeft = subelem.fixedLeft;

                newSubElem.top = ( newSubElem.absTop - newSubElem.boffset + newSubElem.element.mm.voffset );

                newSubElem.interactive = subelem.interactive;
                newSubElem.bgColor = subelem.bgColor;
                newSubElem.borderColor = subelem.borderColor;

                if ( subelem.hasOwnProperty( 'tableRow' ) && subelem.hasOwnProperty( 'tableCol' ) ) {
                    newSubElem.tableRow = subelem.tableRow;
                    newSubElem.tableCol = subelem.tableCol;
                }

                if ( top > 0 ) {
                    newSubElem.fixedTop = top;
                }

                newSubElem.isCloned = true;

                page.clonedSubElements.push( newSubElem );
            };

            /**
             *  Convert a pixel position on fixed canvas to mm position on abstract canvas
             *
             *  We need to subtract the usable height of any pages above this one and the height of any header
             *  on the fixed page.
             *
             *  Usable height is the mm paper size less the mm height of headers and footers.
             *
             *  @param  canvasSet   {Object}    Set of fixed canvasses from which measurement is taken
             *  @param  x           {Number}    Relative to canvas, px
             *  @param  y           {Number}    Relative to canvas, px
             */

            page.getAbstractPoint = function(canvasSet, x, y) {
                var
                    scaleBy = page.form.zoom,
                    headerY = (page.headerElem ? (page.headerElem.mm.height * scaleBy) : 0);

                return {
                    x: (x / scaleBy),
                    y: (canvasSet.idx * page.abstract.usable) + ((y - headerY) / scaleBy)
                };
            };

            /**
             *  Note available space after headers and footers are accounted for
             */

            page.initAbstract = function() {
                page.abstract.header = page.headerElem ? page.headerElem.mm.height : 0;
                page.abstract.footer = page.footerElem ? page.footerElem.mm.height : 0;

                page.abstract.headerOverflow = page.headerOverflowElem ? page.headerOverflowElem.mm.height : 0;
                page.abstract.footerOverflow = page.footerOverflowElem ? page.footerOverflowElem.mm.height : 0;

                //  secondary, overflow pages may have a different header and footer, so have different available space MOJ-3025
                page.abstract.usable = (page.form.paper.height - (page.abstract.header + page.abstract.footer));
                page.abstract.usableOverflow = ( page.form.paper.height - ( page.abstract.headerOverflow + page.abstract.footerOverflow ) );
            };

            /**
             *  Measure the height of page content and available space
             */

            page.measureAbstract = function() {
                var i, j, idx, elem, subElem, voffset = 0, maxPage = 0;

                page.abstract.height = 1;       //  page cannot have 0 abstract height, or blank pages won't be assigned

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    elem = page.elements[i];
                    elem.updateBounds();                    //  TODO: remove this when renderers stable
                    elem.mm.voffset = voffset;              //  offset due to content overflow

                    /*
                    console.log(        //jshint ignore:line
                        'element ' + elem.elemType + "\n" +
                        'mm.top: ' + elem.mm.top + "\n" +
                        'mm.left: ' + elem.mm.left + "\n" +
                        'mm.height: ' + elem.mm.height + "\n" +
                        'mm.contentHeight: ' + elem.mm.height + "\n" +
                        'mm.bottom: ' + elem.mm.bottom + "\n" +
                        'mm.overflowHeight: ' + elem.mm.overflowHeight + "\n" +
                        'voffset: ' + elem.mm.voffset
                    );
                    */

                    if ((elem.mm.bottom + voffset) > page.abstract.height) {
                        page.abstract.height = elem.mm.bottom + voffset;
                    }

                    if (!page.form.isFixed) {
                        voffset = voffset + elem.mm.overflowHeight;
                    }

                    for (j = 0; j < elem.subElements.length; j++) {
                        subElem = elem.subElements[j];
                        if ((subElem.pageBottom + 1) > maxPage) {
                            maxPage = (subElem.pageBottom + 1);
                        }
                        if ((subElem.pageTop + 1) > maxPage) {
                            maxPage = (subElem.pageTop + 1);
                        }
                    }
                }

                if ( page.abstract.usable < ( page.mm.height / 3 ) ) {
                    Y.log( 'Page does not have enough usable space after header and footer, adjusting.', 'debug', NAME );
                    page.abstract.usable = page.mm.height;
                }

                if (maxPage > page.abstract.numFixed ) {
                    page.abstract.numFixed = maxPage;
                }

                /*
                //  limit number of fixed canvasses per page
                //  MOJ-6188 prevent reports larger than 200 pages
                if (maxPage > Y.dcforms.MAX_PAGES) {
                    page.abstract.numFixed = Y.dcforms.MAX_PAGES;
                }
                */

                //console.log('set numFixed: ' + page.abstract.numFixed + ' abs.height: ' + page.abstract.height + ' abs.usable: ' + page.abstract.usable + ' maxPage: ' + maxPage);
                //Y.log('abstract page: ' + JSON.stringify(page.abstract), 'debug', NAME);
            };

            /**
             *  Set px size from template width (determines all other pixel sizes)
             */

            page.setPxWidth = function() {
                page.px = page.mm.toScale(page.form.zoom, true);

                //  rescale header and footer
                if (page.headerElem) { page.subformHeader.mapper.setWidth(); }
                if (page.footerElem) { page.subformFooter.mapper.setWidth(); }

                //  all subelement caches are now invalid (template zoom is part of hash)
            };

            /**
             *  Get the dom ID of div this page is rendered into (where canvasses are placed)
             *
             *  @param      append  {String}    Named child element of page div
             *  @returns            {string}
             */

            page.getDomId = function(append) {

                /*
                if ( !page.isInDOM && !page.form.isChildForm ) {
                    Y.log( 'Page not yet initialized in DOM', 'debug', NAME );
                }
                */

                append = append ? append : '';
                var postfix = pageName + (page.form.mode === 'pdf' ? 'canvas' : append);
                return 'divP'+ page.form.getDomId( postfix );
            };

            /**
             *  Return a jQuery selection of page page's container div
             *
             *  @param      append  {String}    Named child element of page div
             */

            page.jqSelf = function(append) {
                if ( page.form.isOnServer ) {
                    return null;
                }
                return $( '#' + page.getDomId( append || '' ) );
            };

            /**
             *  Get the parent dom element as a jQuery selection
             */

            page.jqParent = function() {
                //  if page has been instructed to render somewhere specific, and not follow parent
                if ('' !== page.forceParent) {
                    return $('#' + page.forceParent);
                }
                return $('#' + page.form.getDomId('pages'));
            };

            /**
             *  Convert to simple, minimal object for saving ack to database
             *  @return object
             */

            page.serialize = function() {
                var
                    i,
                    pageObj = {
                        'name': page.name,
                        'elements': [],
                        'header': page.header,
                        'footer': page.footer,
                        'headerOverflow': page.headerOverflow,
                        'footerOverflow': page.footerOverflow,
                        'firstPageDifferent': page.firstPageDifferent,
                        'fgColor': page.fgColor || 'rgba(50,50,50,1)',
                        'bgColor': page.bgColor || 'rgba(255,255,255,1)',
                        'bgImg': page.bgImg || '',
                        'bgImgName': page.bgImgName || '',
                        'bgImgFixAspect': page.bgImgFixAspect,
                        'bgImgT': {
                            'en': page.bgImgT.hasOwnProperty('en') ? page.bgImgT.en : '',
                            'de': page.bgImgT.hasOwnProperty('de') ? page.bgImgT.de : ''
                        },
                        'bgImgNameT': {
                            'en': page.bgImgNameT.hasOwnProperty('en') ? page.bgImgNameT.en : '',
                            'de': page.bgImgNameT.hasOwnProperty('de') ? page.bgImgNameT.de : ''
                        },
                        'isCarbonCopy': page.isCarbonCopy
                    };

                for (i in page.elements) {
                    if (page.elements.hasOwnProperty(i)) {

                        //  copy elements into page
                        pageObj.elements.push(page.elements[i].serialize());

                    }
                }

                return pageObj;
            };

            /**
             *  Load a plain JSON object into this and instantiate child elements
             *  @param  serialized  {object}    As generated by the function above
             *  @param  callback    {function}  Of the form fn(err)
             */

            page.unserialize = function(serialized, callback) {
                var
                    toCopyCommon = [
                        'bgImg', 'bgImgName', 'bgImgT', 'bgImgNameT', 'bgImgFixAspect',
                        'bgImgMime', 'bgColor', 'fgColor', 'header', 'footer'],
                    i,
                    toCopy;

                page.header = '';
                page.footer = '';
                page.elements = [];
                page.bgImgMime = 'IMAGE_JPEG';
                page.isCarbonCopy = false;

                //do not copy isCarbonCopy from sub form
                if( formtemplate && !formtemplate.isSubform ){
                    toCopy = toCopyCommon.concat( ['isCarbonCopy'] );
                } else {
                    toCopy = toCopyCommon;
                }

                for (i = 0; i < toCopy.length; i++) {
                    if (serialized.hasOwnProperty(toCopy[i])) {
                        page[toCopy[i]] = serialized[toCopy[i]];
                    }
                }

                //  show name of legacy / default images
                if (('' === page.bgImgName) && ('' !== page.bgImg)) { page.bgImgName = page.bgImg; }

                //  translate name of legacy / default images
                if (!serialized.bgImgT) { page.bgImgT = { 'en': page.bgImg, 'de': page.bgImg }; }

                if (!serialized.bgImgNameT) {
                    page.bgImgNameT = { 'en': page.bgImgName, 'de': page.bgImgName };
                }

                page.headerOverflow = serialized.hasOwnProperty( 'headerOverflow' ) ? serialized.headerOverflow : page.header;
                page.footerOverflow = serialized.hasOwnProperty( 'footerOverflow' ) ? serialized.footerOverflow : page.footer;

                if ( serialized.hasOwnProperty('firstPageDifferent') ) {
                    page.firstPageDifferent = serialized.firstPageDifferent;
                } else {
                    //  initialize for old / reimported forms
                    if ( page.headerOverflow !== page.header && page.footerOverflow !== page.footer ) {
                        page.firstPageDifferent = true;
                    }
                }

                if ( false === page.firstPageDifferent ) {
                    page.footerOverflow = page.footer;
                    page.headerOverflow = page.header;
                }

                //  called after all elements initialize

                function onBackgroundLoaded(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    //Y.log('loaded background image ' + page.bgImgT[page.form.userLang] + ' for page: ' + page.name, 'debug', NAME);
                    callback(null);
                }

                function onAllElementsCreated(err) {
                    if (err) {
                        Y.log('Error creating element: ' + err, 'warn', NAME);
                    }

                    page.setTabIndexes();

                    //  on server the user is needed to access media collection in database
                    //  on client/patient portal patientRegId allows loading of images through PUC proxy

                    if (page.bgImgT && page.bgImgT[page.form.userLang] && '' !== page.bgImgT[page.form.userLang]) {
                        page.loadBackgroundImage( onBackgroundLoaded );
                        return;
                    }

                    if ( page.bgImg && '' !== page.bgImg ) {
                        page.loadBackgroundImage( onBackgroundLoaded );
                        return;
                    }

                    return callback( null );
                }

                function onHeaderAndFooterLoaded(err) {
                    if (err) {
                        //alert('Cannot load header or footer');
                        Y.log('Cannot load header or footer', 'debug', NAME);
                    }

                    //  create elements and add them to the page
                    page.elements = [];
                    page.unserializeElements(
                        serialized.elements || [],
                        Y.dcforms.checkSingleCB(
                            onAllElementsCreated,
                            'page.common.js::unserialize()::onHeaderAndFooterLoaded()'
                        )
                    );
                }

                page.loadHeaderAndFooter( onHeaderAndFooterLoaded );
            };

            /**
             *  Unserializing these one at a time makes it easier to find errors in element initialization
             *
             *  @param  elementsJSON    {Object}    Array of serialized element objects
             *  @param  callback        {Function}  Of the form fn(err)
             */

            page.unserializeElements = function(elementsJSON, callback) {
                var nextIdx = 0;

                // MOJ-8269 _async.eachSeries is introducing delays by setting and waiting for timers
                Y.dcforms.eachSeries( elementsJSON, onUnserializeElement, callback );

                function onUnserializeElement(elemJSON, itcb) {
                    Y.dcforms.element.create(page, nextIdx, elemJSON, onElementCreated);
                    function onElementCreated(err, newElement) {
                        if (err) {
                            itcb('Could not create element: ' + err);
                            return;
                        }
                        page.elements.push(newElement);
                        nextIdx = nextIdx + 1;

                        /* deliberately slow PDF generation for testing
                        if ( Y.dcforms.isOnServer ) {
                            //console.log( '(----) slow down form load on server: ' + newElement.elemId );
                            setTimeout( itcb, 2000 );
                            return ;
                        }
                        */

                        itcb( null );
                    }
                }

            };

            /**
             *  Initialize subforms at top and bottom of page
             *
             *  TODO: deduplicate this
             *
             *  @param callback
             */

            page.loadHeaderAndFooter = function(callback) {

                //  subforms don't currently nest
                if ( true === page.form.isSubform ) { return callback(null); }

                //  nothing to do
                if ('' === ('' + page.header + page.footer)) {
                    callback(null);
                    return;
                }

                var
                    elemTemplate = {
                        'width': page.form.paper.width,
                        'height': 50,
                        'top': 0,
                        'left': 0,
                        'type': 'subform'
                    };

                Y.dcforms.runInSeries(
                    [
                        loadHeader,
                        loadFooter,
                        loadHeaderOverflow,
                        loadFooterOverflow
                    ],
                    onAllDone
                );

                //  (1) Load header subform
                function loadHeader(itcb) {
                    addDynamicSubform( page.header, 'headerElem', false, itcb );
                }

                //  (2) Load footer subform
                function loadFooter(itcb) {
                    addDynamicSubform( page.footer, 'footerElem', true, itcb );
                }

                //  (3) Load header subform for overflow pages, if set
                function loadHeaderOverflow( itcb ) {

                    if ( page.firstPageDifferent ) {
                        addDynamicSubform( page.headerOverflow, 'headerOverflowElem', false, itcb );
                    } else {
                        page.headerOverflowElem = page.headerElem;
                        return itcb( null );
                    }
                }

                //  (4) Load footer subform for for overflow, if set
                function loadFooterOverflow( itcb ) {
                    if ( page.firstPageDifferent ) {
                        addDynamicSubform( page.footerOverflow, 'footerOverflowElem', true, itcb );
                    } else {
                        page.footerOverflowElem = page.footerElem;
                        return itcb( null );
                    }
                }

                function addDynamicSubform( formId, elemId, isFooter, itcb ) {
                    if ( !formId || '' === formId ) {
                        onSubformCreated(null, null);
                        return;
                    }

                    //  if there is already a header then change it
                    if ( page[ elemId ] ) {
                        return page[ elemId ].setValue( formId, itcb );
                    }

                    //elemTemplate.id = page.name + 'header';
                    elemTemplate.id = '__' + elemId + page.pageNo;
                    elemTemplate.elemId = '__' + elemId + page.pageNo;

                    elemTemplate.value = formId;

                    Y.dcforms.element.create( page, -1, elemTemplate, onSubformCreated );

                    function onSubformCreated( err, newElem ) {
                        if ( newElem ) {
                            newElem.noSelect = true;
                            newElem.elemId = '__elemId' + page.pageNo;

                            if ( isFooter ) {
                                newElem.top = ( page.form.paper.height - newElem.height );
                            }

                        }

                        //  header or footer form was deleted, do not try and show it
                        if ( newElem && newElem.value && 'missing-subform' === newElem.value ) {
                            Y.log( 'Missing subform for header or footer: ' + formId, 'warn', NAME );
                            newElem = null;
                        }

                        page[ elemId ] = newElem || null;
                        itcb(err);
                    }
                }


                function onAllDone(err) {
                    if ( !err ) { Y.log( 'Header and footer loaded', 'debug', NAME ); }

                    //  record change to available space on form for layout
                    page.initAbstract();

                    callback( err );
                }
            };

            /**
             *  Make a map of element key => value pairs to submit as questionnaire
             *  @returns {object}
             */

            page.toDict = function() {
                var
                    i,
                    tempStr,
                    elemList = {},
                    elem;

                for (i = 0; i < page.elements.length; i++) {
                    elem = page.elements[i];

                    //Y.log('adding element: ' + elem.elemId + ' (' + elem.elemType + ')', 'debug', NAME);
                    switch(elem.elemType) {

                        case 'dropdown':
                            elemList[elem.elemId] = elem.renderer.unmap();
                            tempStr = elem.renderer.toDict();
                            tempStr = tempStr.replace( new RegExp( '\n', 'g' ), '{newline}' );   //  eslint-disable-line no-control-regex
                            elemList[elem.elemId + '__options'] = tempStr;
                            break;

                        case 'image':           /* deliberate fallthrough */
                        case 'label':           /* deliberate fallthrough */
                        case 'barcode':         /* deliberate fallthrough */
                        case 'audio':           /* deliberate fallthrough */
                        case 'video':           /* deliberate fallthrough */
                        case 'textarea':        /* deliberate fallthrough */
                        case 'textmatrix':      /* deliberate fallthrough */
                        case 'hyperlink':       /* deliberate fallthrough */
                        case 'reporttable':     /* deliberate fallthrough */
                        case 'input':
                            elemList[elem.elemId] = elem.value;
                            break;

                        case 'date':
                            //  value as shown in form, for backmapping
                            elemList[elem.elemId + '_formatted'] = elem.display;

                            //  actual value
                            elemList[elem.elemId] = elem.value;
                            break;

                        case 'checkbox':        /* deliberate fallthrough */
                        case 'checkboxtrans':   /* deliberate fallthrough */
                        case 'togglebox':       /* deliberate fallthrough */

                            //  default / simple serialization to restore form
                            elemList[elem.elemId] = elem.value;
                            if ( page.form.backmappingFields ) {
                                //  extra plaintext serialization for embedding in text (MOJ-6523)
                                elemList[elem.elemId + '_plaintext'] = elem.renderer.unmap() ? 'Ja' : 'Nein';
                                // ( ( -1 === elem.value.indexOf('*') ) ? 'Nein': 'Ja' );
                            }

                            break;

                        case 'radio':           /* deliberate fallthrough */
                        case 'radiotrans':      /* deliberate fallthrough */
                            //  default / simple serialization to restore form
                            elemList[elem.elemId] = elem.value;
                            //  extra plaintext serialization for embedding in text (MOJ-6523)
                            elemList[elem.elemId + '_plaintext'] = '';

                            if ( 'object' === typeof elem.unmap() && elem.unmap().value ) {
                                elemList[elem.elemId + '_plaintext'] = elem.renderer.unmap().value;
                            }
                            break;

                        case 'chartmd':
                            elemList[ elem.elemId ] = elem.value;
                            elemList[ elem.elemId + '_chartPoints' ] = elem.renderer.getChartPoints();
                            break;

                        case 'contacttable':       //  contacts saved in same format as labdata
                        case 'labdatatable':
                            elemList[ elem.elemId ] = elem.value;
                            elemList[ elem.elemId + '_labdata' ] = elem.renderer.unmap();
                            break;

                        case 'meddatatable':
                        case 'table':
                            elemList[elem.elemId] = elem.renderer.unmap();
                            break;

                        case 'subform':
                            if (elem.hasOwnProperty('renderer') && elem.renderer.hasOwnProperty('toDict64')) {
                                elemList[elem.elemId] = elem.renderer.toDict();
                            } else {
                                Y.log('Serializing form to dict before subform has loaded.', 'warn', NAME);
                            }
                            break;
                    }
                }

                if ( page.headerElem && page.headerElem.renderer && page.headerElem.renderer.toDict ) {
                    elemList['__headerPage' + page.pageNo ] = page.headerElem.renderer.toDict();
                }

                if ( page.headerOverflowElem && page.headerOverflowElem.renderer && page.headerOverflowElem.renderer.toDict ) {
                    elemList['__headerOverflowPage' + page.pageNo ] = page.headerOverflowElem.renderer.toDict();
                }

                if ( page.footerElem && page.footerElem.renderer && page.footerElem.renderer.toDict ) {
                    elemList['__footerPage' + page.pageNo ] = page.footerElem.renderer.toDict();
                }

                if ( page.footerOverflowElem && page.footerOverflowElem.renderer && page.footerOverflowElem.renderer.toDict ) {
                    elemList['__footerOverflowPage' + page.pageNo ] = page.footerOverflowElem.renderer.toDict();
                }

                //Y.log('Added all ' + page.elements.length + ' elements.', 'debug', NAME);
                return elemList;
            };

            /**
             *  Restore the form elements from dict values (reverse of toDict)
             *
             *  @param  dict        {Object}    Keys and values, indexed by elemId
             *  @param  callback    {Function}  Of the form fn(err)
             */

            page.fromDict = function __page_fromDict( dict, callback ) {
                var
                    allElements = page.collectAllElements(),
                    i, k, hiddenBFB;

                //  skip this if not elements to unserialize
                if ( 0 === allElements ) { return callback( null ); }

                Y.dcforms.runInSeries( [ checkBFBFields, unserializeAllElements ], onAllDone );

                function checkBFBFields( itcb ) {
                    //  set stored hidden states related to KBV certification
                    if ( dict.hasOwnProperty( 'hiddenBFB' ) ) {
                        hiddenBFB = dict.hiddenBFB.split( ',' );
                        for ( i = 0; i < page.elements.length; i++ ) {
                            page.elements[i].isHiddenBFB = ( -1 !== hiddenBFB.indexOf(page.elements[i].elemId ) );
                        }
                    }
                    itcb( null );
                }

                function unserializeAllElements() {
                    // MOJ-8269 _async.eachSeries is introducing delays by setting and waiting for timers
                    Y.dcforms.eachSeries( allElements, unserializeSingleElement, callback );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem unserializing page: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }
                    callback( null );
                }

                function unserializeSingleElement( elem, itcb ) {

                    for ( k in dict ) {
                        if ( dict.hasOwnProperty( k ) ) {

                            if ( k === elem.elemId ) {
                                //Y.log('Setting element: ' + elem.elemId + '  (' + k + ') to ' + (dict[k].toString()), 'debug', NAME);

                                switch( elem.elemType ) {

                                    case 'checkbox':        /* deliberate fallthrough */
                                    case 'checkboxtrans':   /* deliberate fallthrough */
                                    case 'togglebox':       /* deliberate fallthrough */

                                        elem.display = (-1 !== dict[k].indexOf('*')) ? 'true' : 'false';

                                        //  MOJ-8886 set checkbox state from document without size or label
                                        //  note that cb_plaintext is also available in document if necessary as substitutte

                                        return elem.map( elem.display, itcb );

                                    case 'dropdown':
                                        if ( dict[ k + '__options' ] ) {
                                            return elem.renderer.setValueAndSelected( dict[ k + '__options' ], dict[ k ], itcb );
                                        } else {
                                            elem.renderer.setSelected( dict[k] );
                                        }
                                        return itcb( null );

                                    case 'table':
                                    case 'meddatatable':
                                        return elem.renderer.map( dict[k], itcb );

                                    case 'contacttable':
                                    case 'labdatatable':
                                        if ( dict[k + '_labdata'] ) {
                                            elem.renderer.map( dict[k + '_labdata'], Y.dcforms.nullCallback ) ;
                                        }
                                        elem.renderer.setValue( dict[k],  itcb );
                                        return;

                                    case 'barcode':
                                        Y.log('Set value of barcode ' + k + ': ' + dict[k], 'debug', NAME);
                                        return elem.map( dict[k], itcb );

                                    case 'subform':
                                        if ( !elem.renderer || !elem.renderer.fromDict ) {
                                            Y.log( 'Subform renderer not instantiated, cannot unserialize element.', 'warn', NAME );
                                            return itcb( null );
                                        }

                                        if ('object' === typeof dict[k]) {
                                            return elem.renderer.fromDict( dict[k], itcb );
                                        }
                                        return elem.renderer.fromDict64( dict[k], itcb );

                                    case 'image':
                                        if ('' === dict[k]) {
                                            Y.log( 'Not blanking image on form restore, legacy support.', 'debug', NAME );
                                            return itcb( null );
                                        }
                                        return elem.setValue( dict[k], itcb );

                                    case 'chartmd':
                                        if ( dict.hasOwnProperty( k + '_chartPoints' ) ) {
                                            elem.renderer.setChartPoints( dict[ k + '_chartPoints' ] );
                                        }
                                        return elem.setValue( dict[k], itcb );

                                    default:
                                        //Y.log('Set values from dict: ' + k + ' -> ' + dict[k], 'debug', NAME);
                                        return elem.setValue( dict[k], itcb );

                                }
                            }
                        }
                    }

                    //  should not happen
                    Y.log( 'Could not unserialize element, not found in serialization: ' + elem.elemId + ' (' + elem.elemType + ')', 'warn', NAME );
                    itcb( null );
                }

                //if (!Y.dcforms.isOnServer) {
                //    Y.log('Setting values from dict: ' + JSON.stringify(dict) + "\n" + Y.dcforms.tidyStackTrace(new Error().stack), 'debug', NAME );
                //}
            };

            /**
             *  Map elements to schema bindings in a flat list (to validate dict)
             *  Note that reduced schemas will be phased out in favor of universal contextual mapper
             */

            page.getSchemaBindings = function() {
                var
                    i,
                    bindingList = [];

                for (i = 0; i < page.elements.length; i++) {
                    switch(page.elements[i].elemType) {
                        case 'label':       /*  do nothing */                                               break;
                        case 'image':       /*  do nothing */                                               break;

                        default:  bindingList[page.elements[i].elemId] = page.elements[i].schemaMember;     break;
                    }
                }

                return bindingList;
            };

            /**
             *  Return an object describing pixel dimensions of this page
             *  DEPRECATED: no longer needed
             *
             *  @return {Object}
             */

            page.toBox = function() {
                var
                    jqMe = page.jqSelf(),
                    offset = jqMe.offset();

                // add testing here for some of the buggier browsers / box model issues

                return {
                    'left': parseInt(offset.left, 10),
                    'top': parseInt(offset.top, 10),
                    'width': parseInt(jqMe.width(), 10),
                    'height': parseInt(jqMe.height(), 10)
                };
            };

            /**
             *  True if page is not displayed (BFB or CarbonCopy)
             *  @returns {boolean}
             */

            page.isHidden = function() {
                if (true === page.isCarbonCopy && !Y.dcforms.isOnServer) {
                    if ('fill' === page.form.mode || 'lock' === page.form.mode || 'locked' === page.form.mode) {
                        //Y.log('not showing: ' + page.name + ' (' + page.form.mode + ')', 'debug', NAME);
                        return true;
                    }
                }
                return false;
            };

            /**
             *  Server-side render to PDF pages according to subelement distribution on fixed canvasses
             *
             *  Sub-elements are arranged into a data structure according to the fixed page they belong to and
             *  passed back to server for compilation into PDF.
             *
             *  @param  pdf         {Object}    HPDF document handle
             *  @param  scaleBy     {Number}    Relates mm positions to Postscript Points
             *  @param  callback    {Function}  Of the form fn(err)
             */

            page.renderPdfServer = function(pdf, scaleBy, callback) {

                Y.log('Rendering ' + page.canvasses.length + ' PDF pages (' + scaleBy + ') from page ' + page.name, 'debug', NAME);

                var
                    clientBFB = !Y.dcforms.clientHasBFB(),
                    subForm,
                    subElem,
                    pdfSubElem,
                    newPage,
                    doPrintBg = true,
                    magicVars,
                    i, j;

                for (i = 0; i < page.canvasses.length; i++) {
                    Y.log('Adding new page to PDF setup: ' + i, 'debug', NAME);
                    newPage = {
                        fromCanvasId: page.canvasses[i].id,
                        fromAbstract: page.name,
                        pdfRotate: page.form.pdf.rotate,
                        pdfScale: page.form.pdf.scale,
                        pdfOffsetX: page.form.pdf.offsetx,
                        pdfOffsetY: page.form.pdf.offsetY,
                        svgFontAdjust: (page.form.paper.width / 210),  //  scale svg fonts relative to A4 width
                        subElements: []
                    };

                    magicVars = page.getMagicVars(i);

                    //  add page background if present and not suppressed in PDF
                    //  BFB do not print the background if at non-BFB practice(MOJ-4169)

                    if (!page.form.pdf.printBackground) {
                        doPrintBg = false;
                    }

                    if (page.form.isBFB && !Y.dcforms.clientHasBFB()) {
                        doPrintBg = false;
                    }

                    if (doPrintBg && page.bgElem && page.bgElem.subElements[1]) {
                        newPage.subElements.push(page.bgElem.subElements[1].toServer(scaleBy));
                    }

                    //  add page header (first page)
                    if (page.header && page.headerElem && i === 0 ) {
                        Y.log('Page has header, copying all subelements', 'debug', NAME);

                        for (j = 0; j < page.headerElem.subElements.length; j++) {
                            subElem = page.headerElem.subElements[j];
                            subElem.magic = magicVars;
                            subElem.hasHighlight = false;  // cannot edit subform elements
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }

                        subForm = page.headerElem.renderer.getSubElements();
                        for (j = 0; j < subForm.length; j++) {
                            subElem = subForm[j];
                            subElem.magic = magicVars;
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }
                    }

                    //  add page footer (first page)
                    if (page.footer && page.footerElem && i === 0) {
                        Y.log('Page has footer, copying all subelements', 'debug', NAME);

                        for (j = 0; j < page.footerElem.subElements.length; j++) {
                            subElem = page.footerElem.subElements[j];
                            subElem.magic = magicVars;
                            subElem.hasHighlight = false;  // cannot edit subform elements
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }

                        subForm = page.footerElem.renderer.getSubElements();
                        for (j = 0; j < subForm.length; j++) {
                            subElem = subForm[j];
                            subElem.magic = magicVars;
                            subElem.subformTop = (page.abstract.header + page.abstract.usable);
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }
                    }

                    //  add page header (overflow page)
                    if (page.headerOverflow && page.headerOverflowElem && i > 0 ) {
                        Y.log('Page has header, copying all subelements', 'debug', NAME);

                        for (j = 0; j < page.headerOverflowElem.subElements.length; j++) {
                            subElem = page.headerOverflowElem.subElements[j];
                            subElem.magic = magicVars;
                            subElem.hasHighlight = false;  // cannot edit subform elements
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }

                        subForm = page.headerOverflowElem.renderer.getSubElements();
                        for (j = 0; j < subForm.length; j++) {
                            subElem = subForm[j];
                            subElem.magic = magicVars;
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }
                    }

                    //  add page footer (overflow page)
                    if (page.footerOverflow && page.footerOverflowElem && i > 0) {
                        Y.log('Page has footer, copying all subelements', 'debug', NAME);

                        for (j = 0; j < page.footerOverflowElem.subElements.length; j++) {
                            subElem = page.footerOverflowElem.subElements[j];
                            subElem.magic = magicVars;
                            subElem.hasHighlight = false;  // cannot edit subform elements
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }

                        subForm = page.footerOverflowElem.renderer.getSubElements();
                        for (j = 0; j < subForm.length; j++) {
                            subElem = subForm[j];
                            subElem.magic = magicVars;
                            subElem.subformTop = (page.abstract.headerOverflow + page.abstract.usableOverflow);
                            newPage.subElements.push(subElem.toServer(scaleBy));
                        }
                    }

                    for (j = 0; j < page.canvasses[i].subElements.length; j++) {
                        subElem = page.canvasses[i].subElements[j];
                        //  do not include header and footer at this point
                        if (!subElem.hasOwnProperty('nopdf') && !subElem.element.noSelect) {

                            pdfSubElem = subElem.toServer(scaleBy);
                            //pdfSubElem.bgColor = elem.bgColor;
                            pdfSubElem.clipOverflow = subElem.element.clipOverflow;

                            pdfSubElem.noncontent = false;

                            if (subElem.noncontent) {
                                pdfSubElem.borderColor = subElem.element.borderColor;
                                pdfSubElem.noncontent = true;
                            }

                            if ( subElem.element.isBFB && clientBFB ) {
                                //  MOJ-4169: do not print BFB elements if practice does not have BFB certification
                                Y.log('Skipping BFB element at this practice: ' + subElem.element.elemId, 'debug', NAME);
                            } else {
                                //  Subelement should be shown
                                newPage.subElements.push(pdfSubElem);
                            }

                        }
                    }

                    pdf.pages.push(newPage);
                }

                //  development code to save canvas image and JSON PDF export for inspection
                /*
                function saveJSON(i, txt) {
                    var
                        fs = require('fs'),
                        fileName = Y.doccirrus.media.getTempDir() + page.name + '-' + i + '.json';

                    fs.writeFileSync(fileName, txt);
                }

                if (Y.dcforms.isOnServer) {

                    for (i = 0; i < page.pdfPages.length; i++) {
                        saveJSON(i, JSON.stringify(page.pdfPages[i], 'undefined', 2));
                    }

                    page.saveServerCanvas(callback);
                    return;
                }
                */

                //  done
                callback(null);
            };

            /**
             *  Development / debugging function to save contents of canvas as rendered on the server as .jpg
             */

            page.saveServerCanvas = function(callback) {

                if (!Y.dcforms.isOnServer) {
                    return;
                }

                var fs = require('fs'); //eslint-disable-line no-undef

                _async.forEachOf(page.canvassses, onSaveNextCanvas, callback);

                function onSaveNextCanvas(cnvSet, idx, itcb) {
                    var
                        fileName = Y.doccirrus.media.getTempDir() + 'page-' + page.name + '-' + idx + '.png',
                        out = fs.createWriteStream(fileName),
                        stream = cnvSet.bg.pngStream();

                    Y.log('Attempting canvas save: ' + fileName, 'debug', NAME);

                    stream.on('data', function(chunk){
                        out.write(chunk);
                    });

                    stream.on('end', function(){
                        Y.log( 'Saved form page as png: ' + fileName, 'info', NAME );
                        itcb();
                    });
                }
            };

            /**
             *  Arrange elements from the top and left of the page
             *
             *  TODO: make this more efficient, use an array sort on top and left
             */

            page.setTabIndexes = function() {

                var i, nextIndex, editException;

                //  clear existing tab indexes and map
                page.tabMap = [];
                for (i = 0; i < page.elements.length; i++) {
                    page.elements[i].tabIndex = -1;

                    editException = (page.form.isInEditor && 'edit' === page.form.mode);

                    if (page.elements[i].isHiddenBFB && false === editException) {
                        //  not selectable if hidden
                        page.elements[i].tabIndex = -2;
                    }
                }

                while ( true ) {                            //  eslint-disable-line
                    nextIndex = page.getNextTabIndex();
                    if (-1 === nextIndex) { break; }

                    if ( !page.form.maxTabIndex ) { page.form.maxTabIndex = 0; }

                    page.elements[nextIndex].tabIndex = parseInt( page.form.maxTabIndex, 10 );
                    page.tabMap.push( nextIndex );
                    page.form.maxTabIndex = parseInt( page.form.maxTabIndex, 10 ) + 1;
                }
            };

            /**
             *  Finds the element closest to the top, then left of the page with tabIndex -1
             *  @returns    {Number}    Element index or -1 if none found
             */

            page.getNextTabIndex = function() {
                var
                    nextIndex = -1,
                    minTop = -1,
                    minLeft = -1,
                    i;

                for (i = 0; i < page.elements.length; i++) {
                    if (-1 === page.elements[i].tabIndex) {
                        //  start somewhere
                        if (-1 === minTop) {
                            nextIndex = i;
                            minTop = page.elements[i].mm.top;
                            minLeft = page.elements[i].mm.left;
                        }
                        //  elements at same height tab from left to right
                        if (minTop === page.elements[i].mm.top) {
                            if (minLeft > page.elements[i].mm.left) {
                                nextIndex = i;
                                minTop = page.elements[i].mm.top;
                                minLeft = page.elements[i].mm.left;
                            }
                        }
                        //  otherwise tab from top to bottom
                        if (minTop > page.elements[i].mm.top) {
                            nextIndex = i;
                            minTop = page.elements[i].mm.top;
                            minLeft = page.elements[i].mm.left;
                        }
                    }
                }

                return nextIndex;
            };

            /**
             *  Height of page with element content overflow, px
             *
             *  Not used? TODO: check if this can be removed
             *
             *  Note that the lowest point on the page might not be the last element
             */

            page.getAbstractHeight = function() {
                var
                    minHeight = page.form.paper.height,
                    //minHeightOverflow = page.form.paper.height,
                    elem,
                    contentHeight,
                    totalOffsets = 0,       //  total overflow of elements, in mm
                    bottom,                 //  lowest point of this element
                    lowest = 0,             //  lowest point of any element
                    idx,
                    i;

                if ( page.header !== '' && page.headerElem ) {
                    minHeight = minHeight - page.headerElem.mm.height;
                }

                if ( page.footer !== '' && page.footerElem ) {
                    minHeight = minHeight - page.footerElem.mm.height;
                }

                /*
                if ( page.headerOverflow !== '' && page.headerOverflowElem ) {
                    minHeightOverflow = minHeightOverflow - page.headerOverflowElem.mm.height;
                }

                if ( page.footerOverflow !== '' && page.footerOverflowElem ) {
                    minHeightOverflow = minHeightOverflow - page.footerOverflowElem.mm.height;
                }
                */

                for (i = 0; i < page.tabMap.length; i++) {
                    idx = page.tabMap[i];
                    elem = page.elements[idx];

                    if (elem) {
                        contentHeight = elem.getContentHeight();

                        if (contentHeight > elem.mm.height) {
                            //Y.log( 'page.getAbstractHeight::' + elem.elemId + ', contentHeight > elem.mm.height: ' + contentHeight + ' > ' + elem.mm.height, 'debug', NAME );
                            bottom = elem.mm.top + contentHeight + totalOffsets;

                            if ('edit' === page.form.mode) {
                                elem.mm.height = contentHeight;
                            } else {
                                //Y.log( 'Increasing content offset by: ' + (contentHeight - elem.mm.height), 'debug', NAME );
                                totalOffsets = totalOffsets + (contentHeight - elem.mm.height);
                            }

                        } else {
                            //Y.log( 'page.getAbstractHeight, contentHeight <= elem.mm.height: ' + contentHeight + ' <= ' + elem.mm.height, 'debug', NAME );
                            bottom = elem.mm.top + elem.mm.height + totalOffsets;
                        }

                        if (bottom > lowest) {
                            lowest = bottom;
                        }
                    }
                }

                if (page.headerElem) {
                    lowest = lowest + page.headerElem.mm.height;
                }

                if (page.footerElem) {
                    lowest = lowest + page.footerElem.mm.height;
                }

                if (minHeight > lowest) {
                    lowest = minHeight;
                }

                return lowest;
            };

            /**
             *  (re)load any background image at the current render size
             *
             *  Once cached, this sould call back immediately unless a new image has to be loaded
             */

            page.loadBackgroundImage = function(callback) {

                //  try to use bg image localized to own language, if available
                var useBgImg = page.bgImgT[page.form.userLang];

                if ( !useBgImg || '' === useBgImg ) {
                    if ( page.bgImg && '' !== page.bgImg ) {
                        useBgImg = page.bgImg;
                    }
                    if ( 'en' === page.form.userLang && page.bgImgT.de && '' !== page.bgImgT.de ) {
                        useBgImg = page.bgImgT.de;
                    }
                    if ( 'de' === page.form.userLang && page.bgImgT.en && '' !== page.bgImgT.en ) {
                        useBgImg = page.bgImgT.en;
                    }
                }

                if ( !useBgImg || '' === useBgImg ) {
                    //Y.log('No page background image in this context, empty background image cache.', 'debug', NAME);
                    page.bgElem = null;
                    callback(null);
                    return;
                }

                //  skip download of background of hidden pages unless editing the form
                if ( !Y.dcforms.isOnServer && !page.form.isInEditor && page.isCarbonCopy ) {
                    Y.log( 'Not downloading background of hidden page: ' + page.name, 'debug', NAME );
                    page.bgElem = null;
                    return callback( null );
                }

                var
                    elemTemplate = {
                        'id': 'bgImg' + page.name,
                        'width': page.form.paper.width,
                        'height': page.form.paper.height,
                        'top': 0,
                        'left': 0,
                        'type': 'image',
                        'defaultValue': {
                            'en': page.bgImgT.en || useBgImg || '',
                            'de': page.bgImgT.de || useBgImg || ''
                        },
                        "translationDirty": {
                            "en": ( !page.bgImgT.en || '' === page.bgImgT.en ),
                            "de": ( !page.bgImgT.de || '' === page.bgImgT.de ),
                            "de_f": ( !page.bgImgT.de || '' === page.bgImgT.de ),
                            "de_m": ( !page.bgImgT.de || '' === page.bgImgT.de )
                        },
                        'imgFixAspect': page.bgImgFixAspect
                    };

                Y.dcforms.element.create(page, -1, elemTemplate, onElementCreated);

                function onElementCreated(err, elem) {
                    if (err) {
                        Y.log('Could not create background image: ' + JSON.stringify(err), 'warn', NAME);
                        return callback( err );
                    }
                    if (elem) {
                        elem.noSelect = true;
                    }
                    page.bgElem = elem;
                    page.bgElem.readonly = true;
                    page.bgElem.setValue( useBgImg, callback );
                }
            };

            /**
             *	Save everything on page
             */

            page.autosave = function() {
                Y.log('DEPRECATED: Please use page.form.autosave()', 'warn', NAME);
                page.form.autosave();
            };

            /**
             *  set fill / edit mode
             *  @param  mode        {string}    A valid form mode name (fill|edit|pdf|lock)
             *  @param  callback    {function}  Of the form fn(err)
             */

            page.setMode = function(mode, callback) {
                page.mode = mode;

                //  add pages to DOM if edit mode has changed
                if ( !Y.dcforms.isOnServer && page.form.isInDOM ) {
                    if ( !page.isHidden() && !page.isInDOM ) {
                        page.addToDOM();
                    }
                }

                _async.each(page.elements, onElementSetMode, callback);

                function onElementSetMode(elem, itcb) {
                    elem.setMode(mode, itcb);
                }
            };

            /**
             *  Pass an event to parent binder, after dealing with any events which need to handled by the page
             *
             *  DEPRECATED
             *
             *  @param  eventName   {string}    Name of binder event
             *  @param  eventData   {object}    Event details or payload
             */

            page.raiseBinderEvent = function __page_raiseBinderEvent(eventName, eventData) {
                Y.log('DEPRECATED: page.raiseBinderEvent("' + eventName + '", ' + eventData + ') stack trace follows', 'warn', NAME);
                console.log(new Error().stack);        //eslint-disable-line no-console
                //page.form.raiseBinderEvent(eventName, eventData);
            };

            /**
             *  Get all elements on the page, including those implicitly added
             *  @return {Array}
             */

            page.collectAllElements = function __page_collectAllElements() {
                //  TODO: add background, header and footer elements
                //  TODO: separate this and reuse for setLanguage, fromdict, etc

                var allElements = [], i;

                if ( page.bgElem ) { allElements.push( page.bgElem ); }
                if ( page.headerElem ) {
                    //  may be incorrectly named in legacy serialization
                    page.headerElem.elemId = '__headerPage' + page.pageNo;
                    allElements.push( page.headerElem );
                }
                if ( page.footerElem ) {
                    //  may be incorrectly named in legacy serialization
                    page.footerElem.elemId = '__footerPage' + page.pageNo;
                    allElements.push( page.footerElem );
                }

                if ( page.headerOverflowElem && page.headerOverflowElem !== page.headerElem ) {
                    //  may be incorrectly named in legacy serialization
                    page.headerOverflowElem.elemId = '__headerOverflowPage' + page.pageNo;
                    allElements.push( page.headerOverflowElem );
                }

                if ( page.footerOverflowElem && page.footerOverflowElem !== page.footerElem ) {
                    //  may be incorrectly named in legacy serialization
                    page.footerOverflowElem.elemId = '__footerOverflowPage' + page.pageNo;
                    allElements.push( page.footerOverflowElem );
                }

                for ( i = 0; i < page.elements.length; i++ ) {
                    allElements.push( page.elements[i] );
                }

                return allElements;
            };

            /**
             *  Map a plain javascript object into this page
             *
             *  @param  mObj        {object}    Keys should match a schema this form binds with
             *  @param  callback    {function}  Of the form fn(err)
             */

            page.map = function __page_map( mObj, callback ) {
                var
                    allElements = page.collectAllElements();

                // MOJ-8269 _async.eachSeries is introducing delays by setting and waiting for timers
                Y.dcforms.eachSeries( allElements, mapSingleElement, onAllDone );

                function mapSingleElement( elem, itcb ) {
                    var
                        defaultValue,
                        filledEmbeds,
                        schemaMember,
                        subType;

                    if ( !elem ) {
                        // should not happen, continue regardless (best effort)
                        Y.log( 'Invalid element on page: ', elem, 'warn', NAME );
                        return itcb( 'Invalid element' );
                    }

                    function onElementMapped( err ) {
                        if ( err ) {
                            Y.log( 'Problem mapping element ' + elem.elemId + ': ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue anyway, best effort
                        }

                        //  propagate mapping into subform if subform not bound to a specific schema member
                        if ( '' === schemaMember && 'subform' === elem.elemType ) {
                            //Y.log('mapping subform on page ' + page.name + ': ' + JSON.stringify(mObj), 'debug', NAME);
                            return elem.map( mObj, itcb );
                        }

                        itcb( null );
                    }

                    schemaMember = elem.schemaMember || '';
                    subType = elem.schemaMemberST || '';
                    defaultValue = elem.defaultValue[ elem.getBestLang() ];

                    //console.log( '(****) mapping page: ', page, mObj );

                    //  map element to value
                    if (schemaMember && '' !== schemaMember && mObj.hasOwnProperty(schemaMember)) {
                        if ('' === subType) {

                            //console.log( '(****) mapping element: ', page, mObj );

                            elem.map( mObj[schemaMember], onElementMapped );
                            return;
                        }
                    }

                    //  map element value if subType specified
                    if (schemaMember && subType && mObj.hasOwnProperty(schemaMember + ':' + subType)) {
                        elem.map( mObj[schemaMember + ':' + subType], onElementMapped );
                        return;
                    }

                    if ( -1 !== defaultValue.indexOf( '{{' ) ) {
                        filledEmbeds = replaceMappedValuesInText( defaultValue + '', elem.elemType );
                    } else {
                        filledEmbeds = defaultValue;
                    }

                    if ( filledEmbeds !== defaultValue ) {
                        //alert('txtReplace: setValue ' + defaultValue + ' in ' + elem.elemId, 'debug', NAME);
                        //Y.log('txtReplace: setValue ' + defaultValue, 'debug', NAME);
                        //Y.log('txtReplace: setValue from ' + JSON.stringify(mObj), 'debug', NAME);

                        if ( 'chartmd' === elem.elemType ) {
                            return elem.map( filledEmbeds, onElementMapped );
                        }

                        return elem.setValue( filledEmbeds, onElementMapped );
                    }

                    //  ensure that mapping is passed into subform
                    if ( '' === schemaMember && 'subform' === elem.elemType ) {
                        return onElementMapped( null );
                    }

                    //  skipping this element
                    itcb( null );
                }

                function replaceMappedValuesInText( defaultValue, elemType ) {
                    var embeds = Y.dcforms.getEmbeddedBindings( defaultValue + '' );
                    return Y.dcforms.matchEmbeds( defaultValue, embeds, mObj, elemType );
                } // end replaceMappedValuesInText

                function onAllDone( err ) {
                    if ( err ) { return callback( err ); }
                    callback( null );
                }

            };

            /**
             *  Replace any unmapped {{Schema_T.embeddedField}}s with the empoty string
             *
             *  DEPRECATED: to be removed
             *
             *  @param txt
             */

            page.cleanUnmappedEmbeds = function(txt) {
                txt = txt.replace(/(\{\{\S+\}\})/gmi, '');
                return txt;
            };

            /**
             *  To be rolled into global mapping system with upcoming changes
             */

            page.getMagicVars = function(canvasIdx) {

                var
                    //dateNow = new Date(),
                    //dateNowStr = dateNow.getDate() + '.' + dateNow.getMonth() + '.' + dateNow.getFullYear(),
                    aliasMoment = page.form.isOnServer ? require('moment') : moment,    //eslint-disable-line no-undef
                    dateNowStr = aliasMoment().format('DD.MM.YYYY'),
                    magic = {
                        '[[form_pageNo]]': 0,
                        '[[form_date]]': dateNowStr,
                        '[[form_pages]]': page.form.getPageCount()
                    },
                    i, j;

                //  count canvasses of preceeding pages
                for (i = 0; i < page.form.pages.length; i++) {
                    if (page.name === page.form.pages[i].name) {
                        break;
                    }

                    for (j = 0; j < page.form.pages[i].canvasses.length; j++) {
                        magic['[[form_pageNo]]'] = magic['[[form_pageNo]]'] + 1;
                    }
                }

                magic['[[form_pageNo]]'] = magic['[[form_pageNo]]'] + canvasIdx + 1;
                magic['[[form_pageOfPages]]'] = magic['[[form_pageNo]]'] + ' von ' + magic['[[form_pages]]'];
                return magic;
            };

            /**
             *  Safely unlink this page and all child objects and elements
             *  Unlink event handlers, etc here
             */

            page.destroy = function() {
                var i;
                for (i = 0; i < page.elements.length; i++) {
                    page.elements[i].destroy();
                }
            };

            /*----------------------------------------------------------------------------------------------
             *	MANAGE ELEMENTS
             */

            /**
             * Remove an element from page page
             * @param   elemId     {String}   Jade id of a specific instance of a panel (may be many)
             */

            page.removeElement = function(elemId) {
                var
                    i;

                for (i = (page.elements.length - 1); i >= 0; i--) {
                    if (page.elements[i].elemId === elemId) {
                        page.elements[i].mode = 'removed';
                        $('#' + page.elements[i].getDomId() + 'size').hide().attr('src', '');
                        $('#' + page.elements[i].getDomId()).html('').hide();
                        page.elements[i].domId = '';
                        page.elements.splice(i, 1);
                        break;
                    }
                }

                //  remove also from tab map
                page.setTabIndexes();

                page.redraw(Y.dcforms.LAYER_ALL);
                page.form.autosave();
            };

            /*----------------------------------------------------------------------------------------------
             *  GETTERS AND SETTERS
             */

            /**
             *  Returns element given its current (unique, temporary) DOM Id
             *
             *  @param  aDomId  {String}    Actual ID in the dom, not elemId
             */

            page.getElementByDomId = function(aDomId) {
                var i;
                for (i = 0; i < page.elements.length; i++) {
                    if (page.elements[i].domId === aDomId) {
                        return page.elements[i];
                    }
                }
                return null;
            };

            /**
             *  Allow external controls to set simple page properties in a way which triggers events
             *
             *  Only two settable properties for this element at present - in future may include page reordering
             *
             *  @param  propName    {String}
             *  @param  propVal     {String}
             *  @param  callback    {Function}  Optional, call after change applied or rendered
             */

            page.setProperty = function(propName, propVal, callback) {

                //var px = page.mm.toScale(page.form.zoom);

                if (!callback) {
                    callback = Y.dcforms.nullCallback;
                }

                switch (propName) {
                    case 'bgColor':
                        page.bgColor = propVal;
                        page.form.raise('layoutChanged', page.form);
                        page.redraw(Y.dcforms.LAYER_BG);
                        page.form.autosave(callback);
                        break;

                    case 'fgColor':
                        page.bgColor = propVal;
                        page.form.raise('layoutChanged', page.form);
                        page.redraw(Y.dcforms.LAYER_BG);
                        page.form.autosave(callback);
                        break;

                    case 'bgImgName':
                        page.bgImgName = propVal;
                        page.bgImgNameT[page.form.userLang] = propVal;
                        //  fall through to autosave
                        callback(null);         //  eslint-disable-line
                        break;

                    case 'bgImg':
                        page.bgImg = propVal;
                        page.bgImgT[page.form.userLang] = propVal;
                        page.loadBackgroundImage(callback);
                        break;

                    case 'fixAspect':
                        page.bgImgFixAspect = propVal;
                        page.loadBackgroundImage(callback);
                        break;

                    case 'header':
                        if (propVal !== page.header) {
                            page.header = propVal;
                            page.headerElem = null;
                            page.loadHeaderAndFooter(function onLoadHeader() {
                                page.form.render( callback );
                            });
                        } else {
                            //  fall through to autosave:
                            callback(null);     //  eslint-disable-line
                        }
                        break;

                    case 'footer':
                        if (propVal !== page.footer) {
                            page.footer = propVal;
                            page.footerElem = null;
                            page.loadHeaderAndFooter(function onLoadFooter() {
                                page.form.render( callback );
                            });
                        } else {
                            //  fall through to autosave:
                            callback(null);     //  eslint-disable-line
                        }
                        break;

                    case 'headerOverflow':
                        if (propVal !== page.headerOverflow) {
                            page.headerOverflow = propVal;
                            page.headerOverflowElem = null;
                            page.loadHeaderAndFooter(function onLoadHeaderOverflow() {
                                page.form.render( callback );
                            });
                        } else {
                            //  fall through to autosave:
                            callback(null);     //  eslint-disable-line
                        }
                        break;

                    case 'footerOverflow':
                        if (propVal !== page.footerOverflow) {
                            page.footerOverflow = propVal;
                            page.footerOverflowElem = null;
                            page.loadHeaderAndFooter(function onLoadFooterOverflow() {
                                page.form.render( callback );
                            });
                        } else {
                            //  fall through to autosave:
                            callback(null);     //  eslint-disable-line
                        }
                        break;

                    case 'firstPageDifferent':
                        if (propVal !== page.footerOverflow) {
                            page.firstPageDifferent = propVal;
                            if ( false === page.firstPageDifferent ) {
                                page.footerOverflow = page.footer;
                                page.headerOverflow = page.header;
                            }
                            page.loadHeaderAndFooter(function onLoadFooterOverflow() {
                                page.form.render( callback );
                            });
                        }
                        break;

                    case 'isCarbonCopy':
                        page.isCarbonCopy = propVal;
                        break;

                    case 'name':
                        //  page name is read-only at present
                        return callback( null );

                    default:
                        Y.log('unhandled property: ' + propName, 'warn', NAME);
                        return callback(new Error('unhandled property: ' + propName));
                }

                if ('edit' === page.form.mode) {
                    page.form.autosave( Y.dcforms.nullCallback );
                }
            };

            /**
             *  To create a cleaner API whih can be upgraded in future with less consequence to editor controls
             *
             *  @param  propName    {String}
             */

            page.getProperty = function(propName) {
                switch (propName) {
                    case 'bgColor':             return page.bgColor;
                    case 'fgColor':             return page.fgColor;
                    case 'bgImg':               return page.bgImgT[page.form.userLang];
                    case 'header':              return page.header || '';
                    case 'footer':              return page.footer || '';
                    case 'headerOverflow':      return page.headerOverflow || '';
                    case 'footerOverflow':      return page.footerOverflow || '';
                    case 'name':                return page.name;
                    case 'firstPageDifferent':  return page.firstPageDifferent;
                    case 'isCarbonCopy':        return page.isCarbonCopy;
                }
                Y.log( 'Requested unknown property: ' + propName, 'warn', NAME );
                return '';
            };

            /**
             *  Raised when resizing the form, reload all images
             */

            page.resize = function( callback ) {
                Y.log('Updating all elements, including headers, footers and page background', 'debug', NAME);

                var allElements = [], i;

                if ( page.headerElem ) { allElements.push( page.headerElem ); }
                if ( page.footerElem ) { allElements.push( page.footerElem ); }

                if ( page.headerOverflowElem ) { allElements.push( page.headerOverflowElem ); }
                if ( page.footerOverflowElem ) { allElements.push( page.footerOverflowElem ); }

                if ( page.bgElem ) { allElements.push( page.bgElem ); }

                for ( i = 0; i < page.elements.length; i++ ) {
                    allElements.push( page.elements[i] );
                }

                _async.each(allElements, onUpdateSingleElement, onAllElementsResized);

                function onUpdateSingleElement(elem, itcb) {
                    elem.isDirty = true;

                    //  skip this if renderer does not handle updates
                    if ( !elem.renderer || !elem.renderer.update ) { return itcb( null ); }

                    elem.renderer.update( itcb );
                }

                function onAllElementsResized( err ) {
                    if (err) {
                        callback( err) ;
                        return;
                    }
                    //Y.log( 'All  elements resized on page', 'debug', NAME );
                    _async.each( page.canvasses, resizeCanvasSet, onAllCanvassesResized );
                }

                function resizeCanvasSet(cnvSet, itcb) {
                    cnvSet.resize( itcb );
                }

                function onAllCanvassesResized(err) {
                    if ( err ) {
                        callback( err );
                        return;
                    }

                    callback( null );
                }

            };

            /*----------------------------------------------------------------------------------------------
             *	EVENT HANDERS
             */

            /**
             *	Legacy from previous image system, may still be necessary ffor PDF rendering
             *  TODO: investigate and remove if necessary
             */

            page.onBackgroundImageLoaded = function(dataURI) {
                var jqMe = page.jqSelf();
                dataURI = 'url(\'' + dataURI + '\') no-repeat fixed';
                jqMe.css('background-image', dataURI);
                jqMe.css('background-size', '100% 50%');
            };

            /**
             *  Called when the an element is shift-clicked
             *
             *  TODO: check if this is still needed, currently not working, may be removed in future
             *
             *  @param  serialized  {Object}    Seriaization of clicked element with new elemId (ie, a copy)
             */

            page.onShiftClick = function(serialized) {

                Y.log('Copying element: ' + serialized.id, 'info', NAME);

                function onElementCreated(err, newElement) {

                    function onNewElementRendered() {
                        //  return to previous edit mode and reset cursor
                        page.form.raise('elementSelected', newElement);
                    }

                    function onCurrentModeSet() {
                        newElement.render(onNewElementRendered);
                    }

                    if (err) {
                        Y.log('Could not create new form element: ' + err, 'warn', NAME);
                    } else {
                        page.elements.push(newElement);
                        newElement.setMode(page.form.mode, onCurrentModeSet);
                    }
                }

                serialized.id = serialized.type + Math.floor(Math.random() * 100000);
                Y.dcforms.element.create(page, page.elements.length, serialized, onElementCreated);

            };

            /**
             *  Respond to something being changed in the page properties form
             */

            page.onChange = function() {
                //  Now mostly handled by edit_page_properties.js binder

                if (false === page.form.isRendered) {
                    return;
                }

                page.redraw(Y.dcforms.LAYER_BG);
                page.form.autosave();
            };

            /**
             *  Called when something has changed while editing the page, trigger autosave
             */

            page.onDirty = function() {
                if ('edit' === page.form.mode) {
                    page.form.autosave();
                }
            };

            /**
             *	Remove page page from the form
             */

            page.onRemove = function() {
                page.mode = 'remove';
                $('#' + page.getDomId()).hide();
                page.form.removePage(page.name);
            };

            //  INITIALIZE

            if (serialized) {
                page.unserialize( serialized, Y.dcforms.checkSingleCB( onFirstUnserialize, 'page.common.js::createTemplatePage()' ));
            } else {
                Y.log('Created blank page: ' + page.name, 'info', NAME);
                creationCallback(null, page);
            }

            function onFirstUnserialize(err) {

                if (err) {
                    Y.log('Could not unserialize page: ' + JSON.stringify(err), 'warn', NAME);
                    creationCallback(err);
                    return;
                }
                creationCallback(null, page);
            }

        }

        Y.dcforms.page = {
            create: function(formtemplate, pageName, serialized, callback) {
                createTemplatePage(formtemplate, pageName, serialized, callback);
            }
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'dcforms-element',
            'dcforms-imagecache',
            'dcforms-subelement',
            'dcforms-canvas-box',
            'dcforms-canvas-set'
        ]
    }
);
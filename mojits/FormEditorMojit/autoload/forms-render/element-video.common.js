/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render html5 video elements and launch medimojit view to allow user upload of video
 *  Video files are stored in the database, and referred to in element values by their media _id
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, jQuery, $ */

YUI.add(
    /* YUI module name */
    'dcforms-element-video',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms video type.', 'debug', NAME);

        /**
         *  Factory method for video element renderers
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeVideoRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                lastMode = '',                          //  eslint-disable-line no-unused-vars
                isInitialized = false,
                isRendered = false,
                isPlaying = false,
                isLoading = false,                      //  eslint-disable-line no-unused-vars
                domId = element.getDomId('videos'),     //  maintained in staging div and floated over subelement
                html5Video = null,
                seBox = null,
                pubMethods;

            function getDOMVideo() {
                if (html5Video) {
                    return html5Video;
                }

                element.page.jqSelf('abstract').append('<video id="' + domId + '"></video>');
                html5Video = $('#' + domId);

                html5Video[0].controls = true;
                html5Video[0].muted = false;

                Y.log('Returning new HTML5 video element: ' + html5Video.attr('id'), 'debug', NAME);
                return html5Video;
            }

            /**
             *  Relates previous modal call to current standard, add upload button to frame of modal
             */

            function getModalVideoRecord() {
                if( getModalVideoRecord.instance ) {
                    return getModalVideoRecord.instance;
                }
                getModalVideoRecord.instance = new Y.doccirrus.DCWindow( {
                    title: 'Video',
                    bodyContent: Y.Node.create( '<div id="divVideoUploadModal"></div>' ),
                    render: document.body,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    resizeable: false,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                label: '#{BTN_UPLOAD_AUDIO}',
                                name: 'btnUpload',
                                classNames: 'btn-primary'
                            }
                        ]
                    }
                } );
                getModalVideoRecord.instance.close = function() {
                    getModalVideoRecord.instance = null;
                    Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
                };
                getModalVideoRecord.instance.getButton( 'close', 'header' ).hide();
                return getModalVideoRecord.instance;
            }

            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {
                //  will create HTML5 video element in staging area if not present
                getDOMVideo();
                isInitialized = true;
            }

            /**
             *  Refresh the display of this element in the DOM, but only if necessary
             *  @param  callback    {function}  Of the form fn(err)
             */

            function render(callback) {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }

                if (false === isInitialized) {
                    initialize();
                }

                var
                //    isEditable = element.canEdit(),
                    safeValue = jQuery.trim(element.value || ''),
                    jqMe = element.jqSelf();

                switch (element.page.form.mode) {
                    //case 'fill':    safeValue = element.replaceMagic(safeValue);                    break;
                    case 'edit':    safeValue = element.defaultValue[element.page.form.userLang] || '';     break;
                    default:        safeValue = element.replaceMagic(safeValue);                            break;
                }

                safeValue = safeValue.replace('"', '&quot;').replace('\'', '&#39;');   //  hinder XSS

                showButton(safeValue);
                jqMe.attr('contentEditable', false);

                isRendered = true;
                if ( callback ) { return callback(null); }
            }

            function renderAbstract(voffset, callback) {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }

                //Y.log('Rendering video element placeholder on abstract canvas, voffset: ' + voffset, 'debug', NAME);

                var
                    ctx = element.page.canvasElastic.getContext('2d'),
                    zoom = element.page.form.zoom,
                    subElem,
                    i;

                //  value not set
                if (0 === element.subElements.length) {
                    Y.log('rendering video element before value has been set', 'warn', NAME);
                }

                //console.log('Rendering into: ', pxBox);

                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    subElem.renderToCanvas(ctx, zoom, element.mm.left, element.mm.top, voffset, true, 'abstract');
                }

                if ('edit' === element.page.form.mode) {
                    handleReposition('abstract');
                }

                isRendered = true;
                callback(null);
            }

            /**
             *  Draw player controls
             */

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return;
                }

                var newSubElem;

                element.subElements = [];

                //  add a single subelement for the background and border
                newSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );
                newSubElem.noncontent = true;
                newSubElem.bindmark = true;
                newSubElem.bgColor = element.bgColor;
                newSubElem.borderColor = element.borderColor;
                seBox = newSubElem;
                element.subElements.push(newSubElem);

                if (!element.value || '' === element.value) {

                    //  no video linked, add upload button
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.lineHeight, element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', Y.dcforms.assets['fa-microphone']
                    );
                    if (element.canEdit()) {
                        newSubElem.action = 'record';
                        newSubElem.cursor = 'pointer';
                    }
                    element.subElements.push(newSubElem);

                } else {
                    //  video linked, add placeholder for html5 vdeo element
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.lineHeight, element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', (isPlaying ? Y.dcforms.assets['fa-stop'] : Y.dcforms.assets['fa-play'])
                    );
                    newSubElem.action = (isPlaying ? 'stop': 'play');
                    element.subElements.push(newSubElem);

                    //  TODO: ownership logic to check if this can be deleted
                    newSubElem = Y.dcforms.createSubElement(
                        element.mm.lineHeight, 0,
                        element.mm.lineHeight, element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', Y.dcforms.assets['fa-trash']
                    );
                    newSubElem.action = 'delete';
                    element.subElements.push(newSubElem);

                }

            }

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback(null); }
            }

            function showButton(recordingId) {

                if ('pdf' === element.page.form.mode) {
                    return;
                }

                var
                    jqMe = element.jqSelf(),
                    iMicId = element.getDomId() + 'mic';
                //    iTrashId = element.getDomId() + 'trash',

                if (!recordingId || '' === recordingId) {
                    //  if there is no recording we can make one
                    jqMe.html(
                        '<span id="' + iMicId + '" style="cursor: pointer; cursor: hand;">' +
                            '<i class="fa fa-microphone"></i>' +
                            '</span>&nbsp;'
                    );

                    $('#' + iMicId).off('click.video').on('click.video', function() { onUploadClick(); });
                } else {


                    if (jqMe && jqMe[0]) {
                        //  if there is a recording we can play and maybe delete it

                        if ('' === element.page.form.patientRegId || !element.page.form.patientRegId) {
                            loadVideoElemDirect(recordingId);
                        } else {
                            addVideoElemProxy(element.page.form.patientRegId, jqMe, recordingId);
                        }
                    }

                    //if (element.canEdit()) {
                    //    jqMe.append('<i id="' + iTrashId + '" class="fa fa-trash-o"></i>&nbsp;');
                    //}
                }

            }

            function loadVideoElemDirect(recordingId) {
                var
                //  TODO: incorporate HTML5 media streaming API
                    videoUrl = '/media/' + recordingId + '_original.VIDEO_MP4.mp4',
                    videoElem = getDOMVideo()[0];

                isLoading = true;

                //  set the playhead back to the start at end of file
                $(videoElem).off('ended').on('ended', function() {

                    Y.log('Reached end of video stream, resetting...', 'debug', NAME);
                    videoElem.currentTime = 0;
                    videoElem.load();

                    isPlaying = false;
                    generateSubElements();
                    if (isRendered) {
                        element.isDirty = true;
                        element.page.redrawDirty();
                    }

                }).off('canplay').on('canplay', function() {

                        isLoading = false;
                        generateSubElements();
                        if (isRendered) {
                            element.isDirty = true;
                            element.page.redrawDirty();
                        }

                }).off('load').on('load', function() {
                        Y.log('HTML5 Video element loaded: ' + videoElem.src, 'debug', NAME);
                });

                videoElem.src = Y.doccirrus.infras.getPrivateURL(videoUrl);
            }

            function addVideoElemProxy(patientRegId, jqMe, recordingId) {

                var
                //  videoUrl = '/1/media/:download?_id=' + recordingId + '&mime=VIDEO_MP4',
                    videoElem  = document.createElement('video'),
                    params = {
                        'action': 'download64',
                        'id': recordingId,
                        'mime': 'VIDEO_MP4',
                        'transform': 'original'
                    };

                function onMp3Loaded(err, data) {
                    if (err) {

                        if (err.hasOwnProperty('responseText') && 'string' === typeof err.responseText) {
                            onMp3Loaded(null, err.responseText);
                            return;
                        }

                        Y.log('Could not load video from (v)prc: ' + JSON.stringify(err), 'warn', NAME);
                        return;
                    }

                    data = (data && data.data) ? data.data : data;

                    if (!data || !data.substring) {
                        Y.log('Could not load video file: ' + JSON.stringify(data), 'debug', NAME );
                        return;
                    }

                    if (data && data.substring && 'data:application/binary;' === data.substring(0, 24)) {
                        data = data.replace('data:application/binary;', 'data:video/mp4;');
                    }

                    Y.log('Loaded mp4 video from (v)prc, ' + data.length + 'bytes: ' + data.substring(0, 50), 'debug', NAME);

                    videoElem.controls = true;
                    videoElem.src = data;

                    //  set the playhead back to the start at end of file
                    $(videoElem).off('ended').on('ended', function() {
                        Y.log('Reached end of video stream, resetting...', 'debug', NAME);
                        videoElem.currentTime = 0;
                        videoElem.load();
                    });

                    jqMe.html('');
                    jqMe[0].appendChild(videoElem);

                }

                jqMe.html(Y.doccirrus.comctl.getThrobber());

                //  TODO: use binary / streaming API
                Y.doccirrus.blindproxy.getSingle(patientRegId, '/media/:download64', params, onMp3Loaded);
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                lastMode = newMode;

                if (true === isRendered) {
                    return render( callback );
                } else {
                    return callback( null );
                }
            }

            /**
             *  Called by canvas renderer
             *  So far this is the only element which uses this
             *
             *  @param  savedAs {String}    Key to saved element position on a canvas
             */

            function handleReposition(savedAs) {

                if (!seBox || !seBox.saved || !seBox.saved[savedAs]) { return; }

                var
                    jqPlayer = $(html5Video),
                    save = seBox.saved[savedAs],
                    zoom = element.page.form.zoom,
                    px = element.mm.toScale(zoom),
                //  offset = $(element.page.canvasElastic).offset(),
                    videoLeft = parseInt(px.left, 10), // + offset.left,
                    videoTop = parseInt(px.top, 10); // + offset.top;

                if (!element.value || '' === element.value) {
                    jqPlayer.hide();
                    return;
                }

                if( Y.config.debug ) {
                    Y.log('repositioning html5 video: ' + videoLeft + ',' + videoTop + ' ' + JSON.stringify(save), 'debug', NAME);
                }
                jqPlayer.show();
                jqPlayer.css('position', 'absolute');
                jqPlayer.css('left', videoLeft + 'px');
                jqPlayer.css('top', videoTop + 'px');
                jqPlayer.css('width', parseInt(px.width, 10) + 'px');
                jqPlayer.css('height', parseInt(px.top, 10) + 'px');
                html5Video.width = px.width;
                html5Video.height = px.height;
                jqPlayer.css('z-index', 1024);
            }

            /**
             *  Set a value according to schema binding
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map(newValue, callback) {
                element.value = newValue;
                if (isRendered) {
                    render(callback);
                    return;
                }
                callback(null);
            }

            /**
             *  Get value for schema binding
             */

            function unmap() {
                return element.value;
            }

            /**
             *  Called before unlinking this renderer
             */

            function destroy() {
                //  remove and unlink the HTML5 player
                $('#' + domId).html();
            }

            //  EVENT HANDLERS

            function handleKeyDown(e) {
                //  TODO: play or pause with space button

                //  parent object handles general key events
                element.onKeyDown(e);
            }

            function onVideoChanged(newValue) {
                getModalVideoRecord().setAttrs( { title: 'Done', bodyContent: 'Video is now: ' + newValue } );
                getModalVideoRecord().close();
                Y.log('Set video source to: ' + newValue, 'debug', NAME);
                setValue(newValue, Y.dcforms.nullCallback);
            }

            function onUploadClick() {
                function onModalVisible() {
                    //var formNode = myNode.one('#divEditForm');
                    var uploadNode = Y.one('#divVideoUploadModal');

                    uploadNode.passToBinder = {
                        'modal': getModalVideoRecord(),
                        'ownerCollection': element.page.form.ownerCollection,
                        'ownerId': element.page.form.ownerId,
                        'label': 'video',
                        'patientRegId': element.page.form.patientRegId || '',
                        'onChanged': onVideoChanged
                    };

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'upload_video',
                        'MediaMojit',
                        {},
                        uploadNode,
                        function onRecorderLoaded() {
                            Y.log('CALLBACK: loaded video recorder dialog', 'debug', NAME);
                        }
                    );
                }

                getModalVideoRecord();
                onModalVisible();
                //Y.doccirrus.comctl.setModal('Video Upload', '<div id="divVideoUploadModal"></div>', true, null, onModalVisible);
            }

            /**
             *  Set the value of this element and update player controls
             *
             *  @param  newValue
             *  @param  callback
             */

            function setValue(newValue, callback) {
                //  will initialize HTML5 video element in staging area behind canvas
                getDOMVideo();

                element.value = newValue;
                if (newValue && '' !== newValue) {
                    loadVideoElemDirect(newValue);
                }
                generateSubElements();
                callback(null);
            }

            /**
             *  Return the vavlue of this element, no transformations
             */

            function getValue() {
                return element.value;
            }

            function startPlayback() {
                //if (true === isPlaying || false === isLoading) {
                //    return;
                //}

                var videoElem = getDOMVideo();

                //Y.log('play: ' + videoElem[0].volume + ' ' + domId + ' ' + videoElem[0].src, 'debug', NAME);
                videoElem[0].play();
                isPlaying = true;
                generateSubElements();
                if (isRendered) {
                    element.isDirty = true;
                    element.page.redrawDirty();
                }
            }

            function stopPlayback() {
                //if (true === isPlaying || false === isLoading) {
                //    return;
                //}

                var videoElem = getDOMVideo();

                //Y.log('stop: ' + videoElem[0].volume + ' ' + domId + ' ' + videoElem[0].src, 'debug', NAME);
                videoElem.stop();

                isPlaying = true;
                generateSubElements();
                if (isRendered) {
                    element.isDirty = true;
                    element.page.redrawDirty();
                }

            }

            /**
             *  Draw video frame into element
             */

            //function crossBlit() {
            //
            //}

            /**
             *  Called by the page when one of out subelements is under a mousedown
             *  @param  localized   {Object}    Mouse click localized to canvas
             */

            function handleClick(localized) {

                //  may be hidden where client does not have KBV certification, and therefore should not affect mouse
                if (true === element.isHiddenBFB) {
                    return;
                }

                if (localized.subElem && localized.subElem.action) {
                    if (localized.subElem.action) {
                        Y.log('Action: ' + localized.subElem.action, 'debug', NAME);

                        switch(localized.subElem.action) {
                            case 'play':
                                startPlayback();
                                break;

                            case 'stop':
                                stopPlayback();
                                break;

                            case 'delete':
                                //deleteRecording();
                                break;

                            case 'record':
                                onUploadClick();
                                break;

                        }

                    }

                    //generateSubElements(element.lastOffset);
                    //renderAbstract(element.lastOffset, Y.dcforms.nullCallback);
                }
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            pubMethods = {
                'render': render,
                'renderAbstract': renderAbstract,
                'setValue': setValue,
                'getValue': getValue,
                'setMode': setMode,
                'destroy': destroy,
                'handleClick': handleClick,
                'handleReposition': handleReposition,
                'handleKeyDown': handleKeyDown,
                'map': map,
                'unmap': unmap,
                'update': update,
                'countTabStops': countTabStops
            };

            creationCallback( null, pubMethods );
        };


        //  EMBEDDED ASSETS USED BY THIS PLAYER
        //  Source / copies of these are available in ../images/ for use by PDF renderer on server

        if (!Y.dcforms.assets) { Y.dcforms.assets = {}; }

        Y.dcforms.assets['fa-upload'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAE3CAYAAAAg4G0MAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWX' +
            'MAAAsTAAALEwEAmpwYAAAAB3RJTUUH3goYAx4k0fnVeQAAEQdJREFUeNrt3V1oHOUex/F/W5VWdtM0BkQhdU1as17Yzb6KLZSmiO' +
            'ulIG2CwQsLetEKQiGCUm9Wq0XTixYSpYgIviTxpRK8iaZtomKjJmma0JAZst0su7BCTQtt1qTVdPdcnBNPj6e22WTe9pnvB/bOTG' +
            'eemf35/z/zzOyqYrFYFABQyGqGAADBBgAEGwAQbABAsAEAwQaAYAMAgg0ACDYAINgAgGADQLABAMEGAAQbABBsAECwASDYAIBgAw' +
            'CCDQAINgAg2ACAYANAsAEAwQYAlruDIYBVLly4IMeOHZN0Oi3Dw8MyNjYmgUBAQqGQhMNhaWpqkurqagYKK7aKX4KHFd544w157b' +
            'XXbvvfvf7663LgwAEGDAQbnCuXy0lLS4sMDAws+W+2b98uXV1dct999zGAINjgLFNTUxIKhSSfz5f8tx6PR4aGhsTv9zOQINjgDK' +
            'lUSgKBwLJC7cZwGx0dlU2bNjGgKAl3RWE4XddXHGoiIvl8XoLBoGiaxqCCig32hlokEllxqP29chsbG5Pa2loGGFRssNbk5KThob' +
            'ZYuQUCASo3ULHBWslkUoLBoOGhRuUGKjbYQtM000PtxsptcnKSQQcVG8q7UrtZ5XbmzBnZvHkzJwBUbDDWxMSE5aG2WLmFQiHm3E' +
            'DFBuPbz2g0anmo/b1yGx4elvr6ek4ICDaszEqeKCDcQCsKx9F13TGhttiWRiIRSSaTnBwQbFheqJmxTs2IcOMJBRBsKJlZi2+NDL' +
            'doNCq6rnOywBwbbs+OJR3LxVIQULHhtlKpVNmE2mLlFgqFWMRLsAE3Z9RbOuwIt1gsJlNTU5xEgg3431Bz8pzaUis35tzciTk2/B' +
            '8nrVNbKda5UbEBommaMqG2WLlFIhHaUoINbg41ux+TMrMtZZ0brShcptzn1JbalrIUhIoNLpFMJpUPtRsrN5aCEGxwQaVWTuvUjA' +
            'i3WCzG3VKCDVRq6oVbJBKRiYkJLgJFMcfmUqreKCgFv1tKxQbF2k+3h9pi5RYMBmlLqdhQ7tLptDzyyCOuD7W/V278+hUVG8q4/S' +
            'TUbl65BQIBKjeCDbSf6oVbJBIh3GhFUS7K6X1qTmhLebaUig0ONzU1RahRuRFsUKv9VOmBdsINBJvLaZrmysW3Rocbj1+VJ+bYFD' +
            'Q9PS1btmwh1AzAg/NUbHBI+0moGVu5hUIhfreUYIOdoUb7aU648YQCrShsoNLrvGlLQcUG5V7n7fS2lNeME2ywoFLjiQLrw427pQ' +
            'QbTMI6NfvCLRaL8RsKDsYcWxmHGjcK7MWcGxUbDDQ5OUmo0ZaCio1KDVRuVGwg1FBy5cY6Nyo2lIh1alRuoGJTSjKZJNTKqHI7d+' +
            '4cg0HFBtpP9So3XlZJsIFQUzLc+Gk/WlEQasq1pcFgkMevqNiwiPep0ZaCik0pmqYRaopVbrxmnGBzffvJA+3qhhvPlhJsrgw15t' +
            'TUDrdoNCoTExMMhgWYYyPUYCHm3Ag2V+CJAsINtKKEGpRoS5lzI9iUxGNShFs0GiXcCDZ16LouwWCQUCPcJBqNsoiXYFMj1LhRgB' +
            'vDjVceEWxljTff4p/CLRKJ8KPMBFv5mZqaklgsRqjhH8ONH2Um2Mqu/eRGAZZaufE+t5VjHZsFlRqhhlKwzo2KzdFSqRShhmVXbv' +
            'z6FcHmOJqmSSAQINSw7HCLxWKSSqUYDILNGZLJJG/pgCHhFggEuKFAsNmPxbcwoy1lES/BZpupqSnWqcGUcGMRL8FmC03TuFEA0y' +
            's3wm1pWO5hkAceeEAymQwDAVNt3LhRdF2XtWvXMhhUbOZ66qmnCDVYIpPJSEtLCwNBsJmrq6tLenp6GAhY5vjx49Le3s5A0Iqax+' +
            'v1Mq8Gy3k8HpmdnWUgqNiMp+s6oQZb5PN5biQQbOYYGBhgEGCb7777jkEg2Iw3OjrKIMA2IyMjDALBZjzevgA7+f1+BoFgM15lZS' +
            'WDANts2LCBQfgH3BVdgfn5ebn77rsZCNhibm5O1q1bx0BQsRlr3bp1Eg6HGQhYzufzEWoEm3k+++wzBgFcdwSbWmprayUejzMQsE' +
            'w8HpdoNMpA3AJzbAapqKhgJThM5/V6JZ1OS1VVFYNBxWa+XC4nXq+XgYCpoZbL5Qg1gs06Ho9HcrkcbSlMaz9zuZx4PB4Gg1bUPi' +
            '+99JLoui66rks6nWZAUBKfzyf19fVSX18vR44cYUAINpSqo6ND9u3b55rjbW9vl71793LiaUWhst9//91Vx3v16lVOOsEG1a1Zs4' +
            'ZBAMEGlLNCocAgEGzgi67YRb+ay55gA190ghwEG/iiOxsLAQg2QDncLCHYQCsKEGwAQLDBdm6bY+PmAcEGF3DbZDqtN8EGF1i1ah' +
            'WDAIINAAg2wEGYYyPY4IaLwGVzTsyxEWwAQLCB1ozjBcEG0IqCYAMAgg1UMP+DdXsEG6CchYUFBoFgA9TCa4sINkA53BUl2AD1Ln' +
            'ruihJsAECwgdaM4wXBBlozjhcEG6hgAIINuNH169cZBIINtGZqYR0bwQYABBsAEGwAQLDBaKxjA8EG9S4C1nWBYAMIchBsAK0oCD' +
            'bwRTdTsVjkpBNsgFp4NTjBBjdcBMw5gWADrShAsIGKjeMFwQZrMecEgg3K4TU+INhAawYQbKBiAwg2WMxtL17kLjDBBr7otN4g2M' +
            'AXHSDYACpUEGzgi06FCoINAMEGAAQbaM1ovUGwgS86QQ6CDQAINlDBgGCDq/HaIhBsUA4PwYNgA61omeOuKMEGvugEOQg2lB+3vb' +
            'YIBBtcwG0/IEwrSrCBLzqtKAg28EUHCDZQsXG8INhAxcbxgmADFQwVG8EGKjaOFwQbylxdXZ2rjreqqoqTTrBBdT6fz1XHGwqFOO' +
            'mKW1V02+pM3PxCcNEbPrjkqdjgEuFwmOMEFRvUkkqlXDHXdv78eamtreWEU7HBDWprayWRSCh9jIlEglCjYoMbPfjgg5JOp5U7Lp' +
            '/PJ9PT05xgKja40fT0tMTjcaWOKR6PE2oEG9yut7dXuru7xev1lvVxeL1e6e7ult7eXk4qrSjwXydOnJDBwUH58ccf5ZtvvimL6m' +
            'zbtm3y2GOPyeOPP84JJNicZ2ZmRrq7u+WLL76QQqEg33//PWfsBp2dndLc3MxA2KSjo0P27dvHQNxg+/btsnr1atm1a5c8/fTTcu' +
            '+999qzI0UHOn36dDEQCBRFhM8tPhs3bizCPj6fj+vwNp8dO3YUf/jhB8vPjaOC7dq1a8UdO3ZwQZTw+fbbb0kYG3zyySdcfyUG3L' +
            'Vr1yw7P45pRTVNk2g0Kvl8nnq+BI2NjXLq1CkGwmLBYFDOnj3LQJSgpqZGTp48KZs3bzb933LEXdHBwUFCbZn6+/ulr6+PgbDQxx' +
            '9/TKgtQzablVAoJJOTk+rfPDh37pxs3bpVZmdnOfPL5PF45LfffpO1a9cyGBbwer38T3iF1+vw8LDU19erWbEVi0V59tlnCbUVyu' +
            'fz3B21yM6dOwk1A67XpqYmdVvRQ4cOUdIbpKenR9rb2xkIEx08eFD6+/sZCAOMjY3JwYMH1WtFC4WCVFZWUq0ZTNM0U0t8t9J1Xf' +
            'x+PwNhcEt/6dIlueOOO9Sp2N58801CzQRPPPEEg2DC/4QZV+PNzs7Ku+++q1Yr+uWXX3JmTZDJZCQQCMgff/zBYBgkGAxKJpNhIE' +
            'zQ09OjTitaKBRkzZo1nFUTbdmyRc6ePeuqV34b7ddff5Unn3xSxsfHGQyT88Do69SWim1kZISzabLx8XGpqKgQTdMYjGVIJpPy0E' +
            'MPEWoWGBoaUqMV5d1Y1sjn8xKNRkXXdQajxC9aMBhkWYdFzOjebAk2Fd/Q6uRw8/v9LAVZoo6ODonFYoSahcx4csaWYDPj9i5u7c' +
            'UXX5RAICDJZJLBuAlN06ShoYHXENngrrvuUiPYCoUCZ9MG4+PjsnnzZmltbZWFhQUG5D/XYmtrqzz88MMyNjbGgCiCV4O7UFtbm2' +
            'zYsEGee+45186/pVIpef7552X9+vXS1tbGRUGwQQX5fF4+/PBD8fv90tjYKJ2dnXLx4kWlj3lmZkY6OzulsbFR6urq5P3332cuTV' +
            'FMdkEGBgZkYGBARP79zqxYLCY7d+6UhoYGufPOO6WioqKsHtPSNE0uX74sf/75p4yNjcmpU6dkaGhIstksJ9uh0wFKBBuLc50rm8' +
            '1KNpvlyRDQipaKiWsAf4XQauNjyJZgo2IDoFzFBgCLzJhjYx0bAFpRpx4IACo2KjYAjmDGm9MonQDYSpm3e9CKAjA1YxgCAASbAZ' +
            'hjA2BmHtgSbDb/+DwAJ1VXqiz34AdGACjXigIAwQZAWcrMsbHcA4CZeUDCAKAVdWrpCYBWlIoNAK0oANCKWpzQgNP4fD5JJBLS19' +
            'cnc3NzUiwWZW5uTvr6+iSRSIjP52P/xKR1rUUbHD58uCgifPgo+0kkEkv6LiQSCVv2r7293TH79/bbbxueMQQbHz4Gfnw+XzGTyZ' +
            'T0fchkMkWv1+va/Tt8+LDhGcPvigIG8Xq9Mj09XfLf1dTUSC6Xk/vvv19mZ2cdu39er9eU/eKuKOBgx44dW/bfejyeFf29FfvX3d' +
            '1dNnPuBBtggGeeeUaam5tXtI3m5maJx+OO3b/du3ebtn9KBBsLdKGao0ePGrKdTz/91JT9O3LkiCHb6erqohW1svQE7HTPPfcYsp' +
            '2qqipT9q+6utqQ7VRWVtKKUrHBDYxuz9y2PWVaUUAlsViM7a3A9evXaUUBp1lYWHB0R+P0/VPm5/cAlfzyyy+Gbu/nn3929P799N' +
            'NPtKKA6k6ePGno9k6cOOHo/TN6ewQb4FCaphmynWQyacr+6bpuyHbS6XRZnA/uigIGePXVVw3ZzgsvvODo/duzZ09Z5AE3DwADfP' +
            'XVV/LRRx+taBtHjx6V/v5+U/bv+PHj0tvbu6JtvPfee6btH60o4FB79+6VS5cuLetvL1y4IAcOHDB1/3bt2rXsO6QXL16Ul19+uW' +
            'wKHYINMEg+n5eGhoaS70IODg5KJBIx9c0ei/tXV1cnp0+fLunvRkZGJBQKmbZ/yrSizLFBVdlsVh599NElVTeFQkFaW1tl69atks' +
            '1mLdm/TCYj27Ztk0OHDt32v52fn5f9+/dLJBKRTCZj2j4Vi0XDt8n72AATvPPOO9LV1SVNTU0SCoUkGAyK3++XoaEhOX/+vJw5c0' +
            'a6u7tNDYxbeeWVV6Sjo+Ov/QuFQlJfXy8jIyMyOTkpo6Oj8vnnn1sSuGa8GtyWYOPmAdxSvbW1tbF/dmQMrSgAgo2KDYDD88CWhD' +
            'Hl57YAwM5gM+M1JQBAKwqAYDOS3b+ADcA5zHgjry3BtmnTJs4mABERuXr1quHbXFU0Y9nvUv5hbiAAEHOePLBtsiscDnNGAdpQU7' +
            'ZrW7Dt37+fswq4XEtLizkdoV2tqIhIRUWF6W80AOBMXq9Xrly5olbFJiLy1ltvcXYBlzLz+29rxSYiEolEZGRkhLMMuEg4HJbh4W' +
            'F1g+3y5ctSU1NDSwrQgqrRioqIrF+/XsbHx8Xr9XLGAReEWi6XM/3fccSzTT6fT3K5HOEGKGzxe+7xeNwRbCIiHo9Hrly5Ytq6Fg' +
            'D2icfjMj09bUmoOSrYFvX29komk2EBL6BIoGUymRX/9F+pbL95cCvz8/Py9ddfywcffCAzMzPcPQUcLhwOS3V1tezZs0d2795t23' +
            '44OtgAQIlWFAAINgAg2AAQbABAsAEAwQYABBsAEGwACDYAINgAgGADAIINAAg2AAQbABBsAECwAQDBBgAEGwAQbAAINgAg2ACAYA' +
            'MAgg0ACDYABBsAEGwAQLABAMEGAAQbAIINAAg2ACDYAIBgAwCCDQDBBgAq+Rd35vpRJQ8ttwAAAABJRU5ErkJggg==');

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            //  these are only used on the client
            //'node-event-simulate',
            //'DCWindow'
        ]
    }
);
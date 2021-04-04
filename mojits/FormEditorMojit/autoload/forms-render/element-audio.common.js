/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI module to render html5 audio elements and launch medimojit view to record or upload them
 *  Audio files are stored in the database, and referred to in element values by their media _id
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-audio',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms audio type.', 'debug', NAME);

        /**
         *  Factory method for audio element renderers
         *
         *  @param  {Object}    element             A dcforms-element object to be rendered into a page
         *  @param  {Function}  creationCallback    Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeAudioRenderer = function(element, creationCallback) {

            var
                //isRendered = false,
                //isLoading = false,
                //domId = element.getDomId('auel'),
                //html5Audio,
                //lastMode = '',
                isPlaying = false,
                pubMethods;

            /** currently handled by modal
            function getDOMAudio() {

                if (Y.dcforms.isOnServer) {
                    return {};
                }

                if (html5Audio && html5Audio.length) {
                    Y.log('Returning existing DOM audio (' + html5Audio.length + '): ' + html5Audio.id, 'debug', NAME);
                    return html5Audio;
                }

                element.page.jqSelf('staging').append(
                    '<audio id="' + domId + '"></audio>'
                );

                html5Audio = $('#' + domId);
                html5Audio.controls = true;
                html5Audio.muted = false;

                return html5Audio;
            }
            */

            /**
             *  Draw player controls
             */

            function generateSubElements() {
                var
                    offsetLeft = 0,
                    bgSubElem,
                    fgSubElem,
                    uploadSubElem,
                    recordSubElem,
                    deleteSubElem,
                    playPauseSubElem;

                    //  testing
                    //textSubElems,
                    //textSubElem,
                    //i;

                element.subElements = [];

                //  add a single subelement for the background and border
                bgSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );
                bgSubElem.bgColor = element.bgColor;
                bgSubElem.borderColor = element.borderColor;
                bgSubElem.noncontent = true;
                bgSubElem.bindmark = true;                     //  show binding

                bgSubElem.special = 'bgse';
                bgSubElem.cursor = 'pointer';
                element.subElements.push( bgSubElem );

                if ( 'pdf' === element.page.form.mode ) {
                    //  do not show player controls in PDF
                    return;
                }

                //  if user can upload or record audio

                if ( element.canEdit() ) {
                    //  can change value of element, add upload/select button
                    uploadSubElem = Y.dcforms.createSubElement(
                        offsetLeft, 0,
                        element.mm.lineHeight,      //  square
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', Y.dcforms.assets['fa-cloud-upload']
                    );

                    uploadSubElem.action = 'upload';
                    uploadSubElem.cursor = 'pointer';
                    uploadSubElem.imgId = ':cloud-upload.png';
                    uploadSubElem.interactive = true;

                    element.subElements.push(uploadSubElem);
                    offsetLeft = offsetLeft + element.mm.lineHeight;
                }

                if ( element.canEdit() ) {
                    //  can change value of element, add record button
                    recordSubElem = Y.dcforms.createSubElement(
                        offsetLeft, 0,
                        element.mm.lineHeight,      //  square
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', Y.dcforms.assets['fa-microphone']
                    );

                    recordSubElem.action = 'record';
                    recordSubElem.cursor = 'pointer';
                    recordSubElem.imgId = ':fa-microphone.png';
                    recordSubElem.interactive = true;

                    element.subElements.push( recordSubElem );
                    offsetLeft = offsetLeft + element.mm.lineHeight;
                }

                //  if audio exists to be played back

                if ( element.value && '' !== element.value && matchMediaId( element.value ) ) {
                    //  audio linked, we can play|stop
                    playPauseSubElem = Y.dcforms.createSubElement(
                        offsetLeft, 0,
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', (isPlaying ? Y.dcforms.assets['fa-stop'] : Y.dcforms.assets['fa-play'])
                    );
                    playPauseSubElem.action = (isPlaying ? 'stop': 'play');
                    playPauseSubElem.cursor = 'pointer';
                    playPauseSubElem.imgId = ':audio-' + playPauseSubElem.action + '.png';
                    playPauseSubElem.interactive = true;

                    element.subElements.push( playPauseSubElem );
                    offsetLeft = offsetLeft + element.mm.lineHeight;
                }

                //  if audio exists and can be deleted
                if ( element.value && '' !== element.value  && element.canEdit() ) {
                    deleteSubElem = Y.dcforms.createSubElement(
                        offsetLeft, 0,
                        element.mm.lineHeight,      //  square
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        '', Y.dcforms.assets['fa-trash']
                    );
                    deleteSubElem.action = 'delete';
                    deleteSubElem.cursor = 'pointer';
                    deleteSubElem.imgId = ':audio-delete.png';
                    deleteSubElem.interactive = true;

                    element.subElements.push( deleteSubElem );
                    //offsetLeft = offsetLeft + element.mm.lineHeight;
                }

                //  test / development - show text
                //------------------------------------ START TEST
                /*
                textSubElems = Y.dcforms.markdownToSubElements(
                    element.value + 'xxx',                          //  markdown text
                    element.font,                                   //  typeface name
                    ( element.mm.lineHeight ),                      //  line height
                    parseFloat( element.mm.lineSpace ),             //  leading factor
                    0,                                              //  x offset (mm)
                    element.mm.lineHeight,                          //  y offset (mm)
                    element.align,                                  //  text alignment (left / right / center)
                    element.mm.width,                               //  wrapping width (mm)
                    element.isBold,                                 //  make bold
                    element.isItalic,                                 //  make italic
                    element.isUnderline                             //  make underlined
                );

                for ( i = 0; i < textSubElems.length; i++ ) {
                    textSubElem = textSubElems[i];
                    textSubElem.fgColor = element.fgColor;       //  fix inclusion of foreground color
                    textSubElem.align = element.align || 'left';
                    textSubElem.cloneInputGroup = element.elemId + 'input';

                    if ( element.clipOverflow ) {
                        //  elements are given +1 mm to prevent slight rendering variations from dropping lines
                        if ( ( textSubElem.top + textSubElem.height ) < ( element.mm.height + 1 ) ) {
                            element.subElements.push( textSubElem );
                        }
                    } else {
                        element.subElements.push( textSubElem );
                    }
                }
                */
                //------------------------------------ END TEST

                //  interaction layer
                if ( element.canEdit() ) {
                    fgSubElem = Y.dcforms.createSubElement(
                        0, 0,                                           //  left, top
                        element.mm.width, element.mm.height,            //  width, height
                        element.mm.lineHeight, '', null                 //  lineheight, text, image
                    );

                    fgSubElem.cursor = 'pointer';
                    fgSubElem.hasHighlight = !element.readonly;         //  hint for touch devices
                    fgSubElem.interactive = true;
                    fgSubElem.noncontent = true;
                    fgSubElem.bindmark = true;                          //  show binding
                    fgSubElem.special = 'itse';

                    element.subElements.push( fgSubElem );
                }
            }

            /**
             *  Check that the value looks like a media _id before showing play button, MOJ-10088
             *
             *  @param  {String}    value
             *  @return {Boolean}
             */

            function matchMediaId( value ) {
                if ( 'string' !== typeof value ) { return false; }
                var checkId = value.match(  /[A-Fa-f0-9]{24}/ );
                return ( checkId && 1 === checkId.length );
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *
             *  Audio element currently does not have special behavior in edit mode, may in future
             *
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                //lastMode = newMode;
                callback(null);
            }

            /**
             *  Set a value according to schema binding
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map(newValue, callback) {
                element.page.isDirty = true;
                element.value = newValue;
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
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            //  EVENT HANDLERS

            function handleKeyDown(e) {
                //  parent object handles general key events
                element.onKeyDown(e);
            }

            function onUploadClick() {

                if ( 'locked' === element.page.form.mode ) {
                    Y.log('Cannot change audio, form is locked.', 'warn', NAME);
                    return;
                }

                if ( 'edit' === element.page.form.mode ) {
                    //  default audio is set in the element panel
                    return;
                }

                var
                    requestAudioOptions = {
                        'ownerCollection': element.page.form.ownerCollection,
                        'ownerId': element.page.form.ownerId,
                        'currentValue': element.value,
                        'defaultValue': element.defaultValue[ element.getBestLang() ],
                        'fixAspect': false,
                        'behavior': element.extra,
                        'onSelected': onAudioFileSelected
                    };

                element.page.form.raise( 'requestAudioFile', requestAudioOptions );
            }

            function onMicrophoneClick() {
                var
                    requestMicOptions = {
                        'ownerCollection': element.page.form.ownerCollection,
                        'ownerId': element.page.form.ownerId,
                        'patientRegId': element.page.form.patientRegId || '',
                        'currentValue': element.value,
                        'defaultValue': element.defaultValue[ element.getBestLang() ],
                        'behavior': element.extra,
                        'onAdd': onAudioFileSelected
                    };

                element.page.form.raise('requestAudioRecord', requestMicOptions );
            }

            function onAudioFileSelected( media ) {
                var newValue = media && media._id ? media._id : '';

                //  ignore selection of attachments which cannot be played as audio
                if ( 'audio' !== Y.doccirrus.media.getCategory( media.mimeType ) ) {
                    Y.log( 'Selected media is not audio: ' + media.mimeType, 'debug', NAME );
                    return;
                }

                if ( !media || !media._id || '' === media._id ) {
                    //  allows user images to bump text beneath them according to aspect
                    element.imgFixAspect = !element.readonly;
                    element.setValue( '', onSetValue );
                    Y.doccirrus.comctl.clearModal();
                    return;
                }

                element.setValue( newValue, onSetValue );
                Y.doccirrus.comctl.clearModal();

                function onSetValue() {
                    element.page.form.raise( 'valueChanged', element );

                    Y.log('Changed audio element value to: ' + element.value, 'info', NAME);
                    element.isDirty = true;
                    window.setTimeout( function() { element.page.redraw(); }, 500 );
                }
            }

            function onPlayClick() {
                if ( !element.value || '' === element.value ) { return; }
                element.page.form.raise( 'requestAudioPlayback', { 'mediaId': element.value } );
            }

            //  currently does not delete linked audio from database, or remove from current activity
            //  note that audio element may be set to some other media from the same patient
            function onDeleteClick() {
                setValue( '', onAudioCleared );
                function onAudioCleared() {
                    element.page.form.raise( 'valueChanged', element );
                    Y.log( 'Cleared audio element value: ' + element.value, 'info', NAME );
                    element.isDirty = true;
                    window.setTimeout( function() { element.page.redraw(); }, 500 );
                }
            }

            /**
             *  Set the value of this element and update player controls
             *
             *  @param  newValue
             *  @param  callback
             */

            function setValue( newValue, callback ) {

                if ( newValue === element.value ) { return callback( null ); }

                element.value = newValue;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[ element.getCurrentLang() ] = newValue;
                }

                generateSubElements();
                callback( null );
            }

            /**
             *  Return the value of this element, no transformations
             */

            function getValue() {
                return element.value;
            }

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback( null ); }
            }

            /**
             *  Called by the page when one of out subelements is under a mousedown
             *  @param  localized   {Object}    Mouse click localized to canvas
             */

            function handleClick( localized ) {

                //  in edit mode, click opens the element properties
                if ( 'edit' === element.page.form.mode ) {
                    element.page.form.setSelected( 'fixed', element );
                    return;
                }

                //  if click within element is not localized to a control subelement then no action need be taken
                if ( !localized.subElem || !localized.subElem.action ) { return; }

                Y.log( 'Audio element received action: ' + localized.subElem.action, 'debug', NAME );

                switch(localized.subElem.action) {
                    case 'play':
                        onPlayClick();
                        break;

                    //  not currently used
                    //case 'stop':  stopPlayback();         break;

                    case 'delete':  onDeleteClick();        break;
                    case 'upload':  onUploadClick();        break;
                    case 'record':  onMicrophoneClick();    break;

                }
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  TODO: tab stops for player / attached media controls
             *
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            pubMethods = {
                'setValue': setValue,
                'getValue': getValue,
                'update': update,
                'setMode': setMode,
                'destroy': destroy,
                'handleClick': handleClick,
                'handleKeyDown': handleKeyDown,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops
            };

            creationCallback( null, pubMethods );
        };

        //  EMBEDDED ASSETS USED BY THIS PLAYER
        //  Source / copies of these are available in ../images/ for use by PDF renderer on server

        if (!Y.dcforms.assets) { Y.dcforms.assets = {}; }

        Y.dcforms.assets['fa-cloud-upload'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAABuCAYAAADGWyb7AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWX' +
            'MAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsMAhIEpfs58gAADThJREFUeNrtXXtQU1ce/p2bFxeCTQIECIp10LIsgiJVXEUQrFtr0K' +
            '2uaNnVoVLbxdaZdbTt+GIg1kqdurN0d0e7zk53ajuzPoba0uLu4mMEXZCRDmJpIfKqSnmElxCSkMe9Z/8wcdRCSCCPGzzfzJ0h4e' +
            'bec853v9/rnHsvgOuBwPvgQhsIyAVCQEBAQEBsPBkLAgICAgICAgICAt8JgRHHwmnEkbGY0qBIGziMbdu2Obxvfn4+TCEF+16Dni' +
            'AAAADi4+PDxWLxEqFQ+DIAbKQoKpPH42UEBQUlJScny542cpAbj4vtfLb7m+nTpytGRkaeNZlMaywWS7rRaJzPMAwAAGvd8CO/oQ' +
            'CAx+fzLQKBoCogIOAyQujfMpnsnlqt7plku701FtxHSEjIw79jY2N/IxaLL/F4vGaKogYBYAAA+gCg18GtHwDuUxQ1wOPxGqRSac' +
            'nSpUuTbMcvLCzkullDnD/54sWLAQCgqKhIEBcXlx4UFFQHAHonSHJk60MIGUJCQi7Ex8fPxxgjAIBVq1aRkH4i2LVrFwAA5OTkxE' +
            'kkkiqKovqdVJazWz+Px+sJDg4uO3jw4HQAgL179/o0H16Rplqt5m3YsCG7oaHhzxaLxezJQRGJRNScOXO237p16yxFUQyJ2x2IFO' +
            'VyOXz99dcChUJRQlHUfTcqzO5GUdSAQqH46vbt2/ygoKBRo1iCR8L7LVu2SGfOnPk/a9DR6+VtIDIysnrjxo1BY6UgvuzvkCtIk8' +
            'lkkJWVJZNKpTc5QtpD3yeVSuuzsrJCHEjgEZf48Ehjjh49Sh87dqy6tbV1ujUP41TpbObMmT3btm17Pi8vT+vhfG/Cx3Ercbm5uR' +
            'AbG+t3+PDh0s7OzgUAwNVggAoLC7u1e/fuVa2trSPHjx/nvGnkufPgNTU1oNFoDjQ3N/8WY2zh8DhgvV4f0d/fLygpKbniCz7Nrd' +
            'XtzMzMrJs3b+5mWdbM9YFgWdZcW1u7a/Pmzes5Xl1xL3E7duyQlZWVFTAMY/SVyIxhGOP58+cPvfvuu9M2bNjw8PtNmzY9VCYAgE' +
            'KhCBQIBMEURYX4+fkFxcTE0I8eJyMjw/fC0ry8PAAASE5O3o8Q4lIE6XCOt2LFiu1PRplbt25VyOXyQoFAcJWiqFoA+AEAGhBC9R' +
            'RF3aBp+j8RERFvYYz5AACrV6/2vXLXxYsXJa+88kpXb2/vsC/mRBEREfz29vYghBCTmJgY3dnZWdDd3b2RYRgtANjz1SKhUIhnzJ' +
            'hRKJfLT1RVVfWtX78evvjiC98ITtRq9fGmpqbZ4KPTF1qtlnf9+nUJRVEpjY2NRYODgzEYY70DqQzDMAwzMDCQ2t/fn7l8+fLG0t' +
            'LStjVr1sDt27c9rjiHc428vDwYHh4OPnHixFWdThfiy5UIPp/Pt1gseDIpjEgkkiUlJW2rqKj4JDMzE86ePesqzrBLFVdRUQFCoT' +
            'Dx3r17rzMM4w21CQBgmrVzk0o/WJZlJ2sxGIYxdHR0vJiWltb1zTff1L355ptw48YNt0aVTvs+myNnGOZVo9HzgSRFUSguLu7vAM' +
            'BXKpVZNE2buBC+m81mtqqq6pOcnJzFx44dc5lldHnH5syZ09fU1ORptYlTU1OPlJeXPwwDlUrl85cvXy4xGAwCLhAolUrbt2zZki' +
            'qVSgdVKhW38rhTp05Ft7W1iT2tNBtpSqXy4felpaU12dnZW2iaNnOBOK1WO6u2tlapUqm4NxOxadOmrQCg9WDeNZKamqqyKuyxtt' +
            'g+K5XK52ma7gCAHi/niH3R0dF3OVk5uXv37oLJBgUTUdqyZcugtLT0sf/bPnNIeVitVoccOnQomXPEmUym2eCZGQDxsmXL/mYj7e' +
            'rVq2PuqFQq4eOPP76Unp6+lqZpo5dzS2NZWdlazhGn1WppT/s0e6RxUHkWrVY7j1PEYYyRTqfjeUppSqXyZ+bRHriivL6+PhpjzC' +
            '3FWVcbe0RpzpDGJeWZzWbkivO6jDiEEPb392fcqLS/TpQ0LilPLBazCCHMGeJWrFgRAgB+blLaB+Xl5QUZGRmTIo0DykMymUzjVR' +
            '/3qJ2ePXv2++Xl5ZWtra1z3OTTCjIyMmB42HWzRF5SnnDGjBmXHS1ruRyxsbEAAJCcnBwdFhZWAwBD4PoJzb6xkmtnrnBHdsrNzV' +
            '1hTdLduQy+NzAwcKS9vT3YK/HsrFmzAABg6dKl20UiUSc8uEPGYxURV5PmwQpLf1JS0hkAgH379nmOsPz8fIiPjweMMSQmJh4GAC' +
            'O4Z+mAK5Q2IbhTeTRNd6elpf0CAGDPnj2e61R6ejoAACxcuLAIIdQPbq49vvTSSx4lbfv27W5VnkQi+WHBggVptvOlpKS4PvJ58o' +
            'udO3faTrYfAAzuVppUKvVqNd9NyusDAIOfn19PZGTkgcjIyJm2841zvx6asIm0KmCZSCTyeJXfnf7Niz7vvkAg6AgJCfnqyJEjYQ' +
            'AABQUFrr8CL1686B8REaFxh+2nKKo3JSXloDd8mgPmM52m6W43Rpp9IpFoIC4uLgtj7LoqVn5+PmCM0XPPPfelm6LHXolE8m1JSY' +
            'nfunXrOEWa7SJavnz5doSQW+/loyhqYPr06ecqKir4iYmJDlkLyh5pKpUKXnjhhYQ7d+78Ctx0lw1FUTg2NhafO3duwmbcHbBVWF' +
            'iWdfuMB8uyTHt7e1pOTk7pmjVr/CblCzDGgBCCefPmXairq0t0J3HBwcH/1Wg0XzpayQkICBD09vaetS4IcrTSg+Ry+a97enqecf' +
            'Qn4eHhiX19fa+aTCa+h4TODw0Nrc3NzV3d2NhoOH369MSceF5e3qLCwsJrFotlyM0NpgBA6OjO06ZNCxgcHAxACOnH6BMehTgqPD' +
            'z8eldX1y+daJcFPDSj/7DxCAnmzp176rvvvvuDvX7ZvcLPnTu3z2KxaD3QXhYARpzY7N39g8cWHTY6eR6P3xqGMTbX19f/LiUlJc' +
            '9ev6ixfMfOnTtDWltbo2EqPAXHx4AxNlZXV7+emZkZNZaFHJU4lUoFVVVVCoxxKBlG78BoNAa2tLR8AADwzjvv/Ex1lB0/km4wGK' +
            'bSY/0QQj71SEimvr7+5QMHDiz88MMPHU8HNBpNMnDvRvvJVEewK9Z6eBImk2nozJkzBQ7lcbbcyGg0LuS4f8NTXHEAAPjevXvRmz' +
            'dvVjyZs/JH829WtsMBYJAozrtgWTa4ra0t6vPPP+8Y11RijPlDQ0OcvxqfkiAFi0SitY76OKHJZCJpAEdE19XVtfRJS0ONYXIYPp' +
            '8/1Z7K7av9wWazee6TloYazeQghIxisXjKPU7dB4MTAADQ6XT+DqcDNE3rppiCfDI4sRLHYoz9HUoHrM/y4HIC/tT4YGseY79WaU' +
            'sHQkNDa4G8zI4T8Pf3Rwghg0OmkmGY80KhkEeGzfsQi8UjDvm4/Px8oGm6ic/n3596Fsf32s3j8W45RJxKpYLPPvvsJ4lE0sXhwM' +
            'RZH+erPpEKDw+/7nBUGRoaap4/f/5pABBxrScGg8Hy/vvvxzjzmytXrvgZjcYAX2NNKBQio9H4ldMhdWRkZO/du3c5p7jAwMAOlm' +
            'U/0ul049bmEEKsXC7fpNFoltteGuFDgcng2rVrU6Kjo3969PkoY3bCtspr5cqVOZcuXfoTy7JcfCyvyInI1wTcnqYa9ZqLioq60d' +
            'LSssphU6lSqSA3NxeWLFlyRiaTdXC0Y86sIfE10oCiqMDMzMzDE64+vPbaa6s//fTTUxaLxQQEHuMtISGhsra2NuPtt9+Go0ePPv' +
            'bPcfM0uVwO165da1q0aJG5s7MzDWPMkjH1gA8QiQxJSUm/b2ho6KusrASHTaUNGo0G9uzZA++9995HCoXiGowy+Urg8oRTlJCQ8M' +
            '/i4mK1vXzIYRQXFwv3799f1tjYOA+4+w4BX4cgNjb2zPfff/+6vZ2cKmnpdDo2LS3tjFqtflGn04X7osPnOPihoaE333jjjc0Sic' +
            'TS0NAAzihu3KrEwYMH/U+ePHm8paVlvXV1MIELSIuOjq7Ozs5et2/fPv14fIzm48YtDVVWVuqbm5uzo6KiTvD5fAuQ1ypPNuznRU' +
            'REXCoqKlLW1NQYHOFj0lWEhISEhPb29pM9PT3PWvMqAifiEIFAwIuJiXmrrq7uXwghh10Pb7LkdXV1den1+uMxMTGmoaGhKACQWm' +
            'eayWIjO+PO5/MtMpns2x07diiLi4uvAgAuLy93WEwueT+crYa2ePHiZ+7cuTPXaDT+cWhoaIPFYjHAg1ITiUAfiEQoFArZsLCwfx' +
            'iNxr90d3e3AQCsXLkSLly44JxU3dnSsLCwdXq9/sXh4eFojHEAANC2V5g8JfkYgxAawRjrAgMDG+VyeWlzc3MJAEBSUhJUV1dP/N' +
            'jj/A9PVoU2REVF0d3d3X56vZ7/4JH+DrcPT6BP2PucISwUCtnw8HDDjz/++NgNmHv37h3vneRO94sLr5fkjGA4MBYTbgNZLMStsS' +
            'B8EBAQEFNFOkLGgoCAgICAOH3CB7kQCMgFQkBAQEBAbDwZCwICAgICgimG/wPaklaMLaXt5QAAAABJRU5ErkJggg==');

        Y.dcforms.assets['fa-microphone'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAE2CAYAAADrvL6pAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB94KFwkOEO97ph0AABQpSURBVHja7Z1t0B5VeYCv04BSnARsUKLQhK' +
            '+StiMYMEHRH0bkI7TaFhQIE2prVRQyI9MRWqVO+kNqsVVHGWGYqVQ7EvmQj051KIFW40wVhVDQTltCoLzJWAUBqW86YrFw98ezr5' +
            'PCm+T9OGf37D7XNfOOOAzn2b3ve6+9z+7Z3RQRiIgMiV8wBCKi2EREFJuIiGITEVFsIiKKTUSGLbZXH5KWGwYRGRLJdWwi4lRURE' +
            'SxiYgoNhERxSYiothERLGJiCg2ERHFJiKi2EREFJuIKDYREcUmIqLYREQUm4iIYhMRxSYiothERBSbiIhiExGZA/sYApkPKaWVwJ' +
            'HAEcAq4KXNvzoCWDrNf7ID+I/mn58C7gYmgEeA70TET42qzLsu/ZiLzEJiS4A3AicAJwPHFviZ+4E7m7/NEfEzIy+KTXLL7CDgbO' +
            'A9wIoONuG7wDXAxoh40oyIYpP5CO0c4H3A6oo262+BGyPiOjMkik1mKrMXAZcA5zP99bFa2A58DPh8RDxt5kSxyXRCW9AI7VJgYY' +
            '82fSfw58AnIuIZMymKTaakdjpwdeUd2kw6uPdGxCYzKoptvIV2MPBF4KQB7dZmYF1EfN8Mjzcu0B1PqV0IPDowqcHoRscDKaULzL' +
            'Idm1EYH6HtC1wPnDkGu3srcFZEPGvmFZsMV2rHAF+h39fSZssO4JSIeNAKcCoqw5PaOkYLXZeO2a4vBbY2+y92bDIgqa0FXNAK50' +
            'XERsNgxyb9l9pfKLWfc21K6UOGwY5N+i21vwLebSRewGcj4j2GQbFJ/6T2WeBdRmK3fD4i3mkYFJv0R2rrgGuNxF45NyKuNwzDxG' +
            'tsw5LaeUptxlyXUjrXMNixSd1SOw243UjMmhMi4h7DoNikPqkdDGyjX2/mqIWdwBER8YShcCoqdXG7UpszCxm9hlwUm1TUrX2Cbl' +
            '7ZPSRWNHEUp6JSgdROB24zEtl4fUTcZRgUm3QntX0ZXVdbZjSysR040jeCOBWV7rhYqWVnGfBHhmEAJ/5jX8ny7/xnbDUUverWDg' +
            'G+ZySK8fKIeNwwOBWVdsX2Ner6LN7Q+GpEvNkwKDZpT2qvBb5lJIpzYkQY557iNbb+8VFD0AqXGAI7NmmnW1sOPGAkWuMVEfGoYb' +
            'Bjk7JcbAha5TJDYMcmZbu1/YCnjUTr7OO6Njs2KcfvGIJOONsQKDYphwtHu8E3ETsVlULT0CXAD4xEZyyJiMcMgx2b5OW3DYGXAU' +
            'SxDY2zDEGnnGwInIpK/qnoj4FFRqIzJiPiAMNgxyb5pLZcqXXOopTS0YZBsUk+VhuCKniTIVBskg/fMlEHxxkCxSb5ONAQVMFRhq' +
            'A/ePOg9gSlZILqwBsIik0ySW1f4BkjUQcRkYyCU1GZP35Wr64TzSqjoNhk/vyvITAfotjMj5gPMVGVc4ohqIqVhkCxyfzxxkFdLD' +
            'QEik1kaDxnCBSbmB/zISZK7BDMhyg2ERHFJiKKTcyPmA8TJZnxmo75EMUmIqLYRESxiYgoNhERxSbmx3yIiRo23oUzH6LYREQUm/' +
            'kR82GixKmP+RDFJiKi2MT8mA8xUU59xHyIYjM/Yj5MlNghiPlQbCIiik3Mj/kQE+XUR8yHKDbzI+bDRIkdgpgPxSYiotjE/JgPMV' +
            'EiIoptIHhNx3yIYjM/Yj7ERNkhiPlQbNIyYQjMhyi2obHAEJgPUWwiIopNRBSbtMuzhsB8iGIbGl7TMR+i2AaHywvMhyg28yPmQ0' +
            'yUiCg2ERHFJvPDazrmQxSbiIhiMz9iPkyUOPUxH6LYREQUm4iIYhMRUWwiotjE/Ij56Bn7GIIXklJ6JfA2YAWwEjgW2Aw8BHwX+G' +
            'JEPGmkpFD9HQScDRwPrGrq76vAvcB9wNcj4vtGSrHNpqguAD4GLHzev1rd/AH8WUrpQxFxZeHNcXlBXTzXQv1dCFw+Tf2d1PwB7E' +
            'wpXRARG02JrfXeCmrflNLXgKumKarnsxD4TErp5pTSfkZPMtTfgqb+rpxh/V3b1F8yeoptt1IDtu3Skc2UM4Fvp5ReZH48XubJP8' +
            '+x/u43LR44u+NjwLI5/rfHApc5FXUqOo8T6yebOppT/aWUPmxqfh5LUkqKLaV0IvCH8xzmkmYcTzw2Al3U30cK1Z+J6jG5bgBcVc' +
            'K7pqeu82CBMXN1+x+1SUmKbReOyzTOigLb5leR6qJEPk7KNM5qpWbHNhWMNxSYVojMtF5+LfN4y5WaYgN4VebxjvFwlVnw6kpnH7' +
            '2WmmKDRZnHOyDzeF4qqIvc+fjlzOMtNUUeOJD/mknu8VzuURfPVV4vYbem2Nx/GVr9hSH1wDaeMrQO0G7NA7EXU0dFOewTl/m1wy' +
            'jCgsrj6Rl92B3Wc9ZL/m5NsVlYInZs7n/vO0AZ9lTUejEQRTosl3tYL9LxNFSxeaIQRemB6P63juuSzIeiVGyDw29SDDsfnrgUWy' +
            '/OcLVfs5O68uH79hRbL/bfu1zWi/lVbHaALY8n5kOxWagi1p9iExfoerw4tVVsgyP3XS7P6MPusLx0odicWojHn8ezgRhCPBcY0q' +
            'rInQ+X8yi2sdx/C3/Y+cgtSmcMig1wgaR0iyJSbL04A59gSQ2aH1Xesf3IFCk2gHszj3dg5vHusEQHXS9HZh5viylSbAD/nXm83M' +
            's99rNEq+LFmcc7wnpRbCVIYzae1JWP3CdCbzYpNqDy5RQRcY8laj48ng3EbHkm83ivtaRkFvxS5vG8y6rYAJjIPN6iAtu4yTKtgh' +
            'J5WJm5o7zPNCk2IuKp3GOmlFZlHvIpy7QKnspcJ4sNqWLrU9eWezrw96aoCnLn4ajK61ix9ZwHM493aubxnF7UwebM4x1TeR0rtp' +
            '6zLfN4CzNPl//FFHXOZETsyDzmgZXXsWLrOQ9lHq/EY1XeQOiWLxcYc03m8R42TYptV7ZnHm9VgW38gmnqlBKPth2eebwJ06TYSp' +
            '7pFqWUlmce81bT1ClfyjlYSull5H+c6hHTpNh+TkR8t8CwJ2Xexp/gA85dsSUins485skF6vh+U6XYSrfxbyqwjZ8yTZ3wpwXGXJ' +
            '1bvqZJsU1H7ovDpxU4I280TZ109LcVGDb3kqBvmynF1sYZb1FK6ZgC23mFqWqV7PFOKR0MHJZ52LtNlWKbjhKLYF9VYMyrTVWrfL' +
            'QH09BS9avYBjDdKLEI9l0FtvPfcU1bW2yKiMcKjPv2ntRvr0kRYRRGU4R7yPy2BeAVEfFo5u38FXx8pg2OjohtmXP3IuB/Cgh4zR' +
            'gdp3Zss6TEw+ZnFDg7b7Nra6VbK/GI0jsLjPkt02XHtqczwa8D/5p52HsjYmWBbV0MPGHWil2aSIVqbAvwmszDLik0ZbZjG0gx/x' +
            'swmXnY1zRTx9zb+iSw3qwVYX2hA/KQAlKbHCepzQbF9v/5mwJjvruQiK/C5wNzM9HEtQTv6Em9Zu2upvtTbO1zQ4Ex35dS2r/Q9p' +
            '5tynoTz/MLjHljzUKb679XbPm7oG8UGHYRZS4aT301aYOZy8KGUl+hSin9HvkX5RIR/2TadhNzbx68oAivBdYVmOIcXnCbSyxVGS' +
            'e2RMSqgvmZAJZlHnZjRJxXY7c2SzkXGd+O7YV8scCYh6WUihVhc1BOmro5MVlYaucWkBrAdabOjm22xfhj8n9Kb3tEHFZwm1cCfm' +
            'B59qyKiC0F81KiW5uMiAMqPXbs2CqmxN2mZSmldaU2uDk4TzV1s+LUwlJbV6hb+6Sps2ObS0G+DPhhgaG3M3pU55mC234hcKVZ3C' +
            'vrCy7tmMrFIxS4aQC8uGQN2bENlIh4nDKPLS0D/rjwtl+FrzfaG1e0ILUPF5LaplqlZsfWj67tdOC2QsO/vJFnye3/NPB+Mzmt1C' +
            '4qHPuDGb2oYFGB4X+z0MsvB9WxKbY9B/HHhYpzc0S8qYXtV24tS62J+z+S+bsXDdXeNHAq2i8uLTTu6pTSb7Qwpb4IbyhMcWpLUn' +
            'trIamVrEenonZt2dgOHBERz7WwD6dQ5tuYfZLanS3EeV9GX2QvcSe0+m7Njs2ujab4b2pjB5qD+iWM30PzE8BL2pBaw2cKSc1uzY' +
            '6tV10btLDs4Hn7UuKRsRpp9ZGjlNL6Rmwl6EW3Zsdm17YrVxb4cvyeCuk8YO3A87W2ZaktLyg1uzU7tt52bduBX42In7a8T7dT4B' +
            'uoHdL6+/8LX1eDwi9QsGOT9xYcexllHr7fW1GtAY6n/9feJoDjO/qoyQ0FpVa67gaLYpu5BK4vLIAzUkoXdLBf9zUdwXr694aQSU' +
            'bXKA+PiNa/rdlcVzuj4E9MRMQdHn1ORUsX8pHAQ4V/5ncj4toO9/Ec4HLKPA6Us0M7v8W7ndPFaR1QOk9HRcTDPTtG5nJydSracd' +
            'f2MOWfw/xC8w6vrvbxhqaDOxXYWFkKNjJak3Z4x1Jb24LUNvRNanZs/e/cSt5ImJpinRARWyvZ33OAi+nmLb1bgI9HxA2VxGI58E' +
            'DpKXZflnfU2rEptrklr42XOu4EVkbEg5Xt+3HAW4DfKiS6LcDfAV/p4rrZXvb96Gb7Fhb+qaIvv1RssqcAt7FUYmdT5FsrjsNSYD' +
            'FwIrC8+ZvixOd1tpPAXbv8/63N313AkxGxo+L9bEtqVX7LQLE5JS0ht9dExDYj3un0854WpNbbKWhtYvPmwfw4q4XfWAjcW+KL8l' +
            'KV1ADebMTzSFCxzS/Id9DOdz2n5PYOo96q1NYxulHQhtQ29PW6WpW5cyqa5QBo87ue50XERqNePKfn0t7TIEW/a1r7VLTEdFSx5U' +
            'toG9fbpvh8RLzTqBfL5eeA32/p53p/XS2H3BRbvcls+7ue9zNaDvKs0c+Ww32Bu4EVLf7s4RExodjyPgzvNbZMNNdHNrT4kyuAp1' +
            'JKJxr9LAfja4EnW5ba+qFJrRYUW165fYR2H0NaCHwzpfQnRn9eUvtL4Fu0c5Ngio1tvmB0aF3e3jo8p6JlktTmzYQpNgPnRsSjZm' +
            'DGeVoM/EPLXRoM6GZBrqlo7umoHVuZzm0V7b8CaDXwA7u3GR0QC1JKHwSe6EBqE0OW2lwEVeJ37NjKHTwLge/R3p3SXdnB6PXYd5' +
            'mJF+TldcD1lH055O6YBJZFxH85tcwnxel+y46t3NlkJ3Ao3by8cSmja283p5ReZjZGX2dPKd3C6LnUrqR26DhIrQYU23DlBnAm8M' +
            'OU0udSSkvGVGhLUkrXAI9S9m23M5HazjGq/dY6vel+y6no8Kelu/LXwKUR8dgYxPwgRm8CflfHmzJ2UutiOvr831Ns4yc3gGuAa4' +
            'Z4Da5Z1/du4A8q2JyxlVrXclNs4ys3GN1k+DhwdUT8rMdx3b/pzC5mdH2xBsZeal2Ibeo3FZtym+IW4FZG3+Z8vAdxXAK8ETib0b' +
            'XEmlBq8xTbvOWm2DpLeBeLeGfK/cCNwC01vb23eYvtWY3Mjq00dluGvk6tD3JTbN0m/FpgXQ829auMXou9Gbg7Ip5sITaLGX0p6/' +
            'jm76QexKnXr/WuUWxzlZti6z7pnwbe38NN39z87x2Mlg3dBzwG7APsExHf2M3+LgB27Whe2ojrwF062NU9jMcVEXGRFV1H16bY6k' +
            'j6KY0gpJ+c2uV3Tu3aFFvNiT+u6YIWGY3eMAmsru0zgcrNJw+qISLua96kuslo9IJNEXGAUis7pZyrGBVbfclfA6w1ElWztsmTVN' +
            'r1ORWtN4H7A1+n3iUh48gW4I0R8RND0d2UdCbdnx1bvZ3bT5r1UBuMRhVsiIhVSq37KelM5GjH1o8z3FLgZru3zrq0t0XEDkNRV9' +
            'e2J0kqtn4VwynATXjntA0mgbe7jKN+uU0nOKei/Wrh72zunDo9Lcv65o6nUqt8Sro7Sdqx9fuMdztwmpHIxibvdg6jc7Nj6/cZbw' +
            '2j11y79m2eQmP0LQKlNoDOLaWk2AZQFDsiYk1EJOAKIzIrroiI1MTPmwMDkZsd2/CK46JGcOvp7jsLtTPJ6Bpa8qH1AXduXmMbLi' +
            'mlcxi9VdZlIqNlGx+PiBsMRfV1q9hkVpK7HDhMmcnQ5abYxq9g9gc+wOhjJ0OU3ASjr3F9wqcExlduik3JvXWXvz4u/J0Evjz1p8' +
            'yUm2KTPopuAviGIlNuik3mU1RLgbcAi4E3ACe2JLwJYGsjsQeBu1ySoeAUm7QhvA+Q93sNVzC6NqbAZF5ycx2bzIlGPo/k7tKUmu' +
            'yl7ma03k2xyXzIXT8LDKnkEJxik5p4zhDIbAU3HfsYGhlwByhjJrepa3CKTUQGJznPkOJUVGz9RawfsTDFDktEsYn1I2JhiogoNq' +
            'l2Kmo9ioUkgyMZAlFsMjSeNQSi2MR6FLGQxPoRC1Nkz7iOTRSbyF7w5oEoNhkc3jwQxSaDqx/rUSwkGRxes5Ms+DGXmpKR0sHAmc' +
            'BK4HhghVGpjvsZfWH+PuBLEfG4ISl+XCi2Hifv/cBlwEKj0Rt2Ah+MiKsMRR1CU2z1JG8xcBOw2mj0ls3A2oh4zFAoNhOX0i8CDw' +
            'BLjUb/p6gRcZxh6F5q4M2DrrlMqQ2GFSmlTxqGSsRox9bZGel1wF1GYnCcEBH3GAY7tnHFC87D5HJDYMc2zmckAz9QIsJHw+zYxn' +
            'YaKsPN73Kj0C2KrRsONQSDxoXV8+96FZtIZfgwf8dyU2zdsNUQDBrvinYsN28edIQ3DwZ9MHrzoGPs2LpjiyEYJJsMQQWNgx1bZx' +
            '3bkcBDRmJwHB0R2wyDHdu4TlceBjYYiUGxXqnZscmoc3sEOMxI9J4tEbHKMNixyahzOxyvy/SdjUpNsckL5bYGWAtMGo1eMcnoPW' +
            'znGQqnorLnqek5wOubv5VGpL4pJ/BN4JsRcYPhUGwiIk5FRUQUm4iIYhMRxSYiothERBSbiIhiExFRbCKi2EREFJuIiGITEVFsIi' +
            'KKTUQUm4iIYhMRUWwiIopNRESxiYhiExFRbCIiik1EpC3+D82q3ZXzkwORAAAAAElFTkSuQmCC');

        Y.dcforms.assets['fa-trash'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAE1CAYAAABtKMwHAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB94KFwkMLhws2TQAAA2kSURBVHja7d1fqGVXfQfw75qbmZoSw6SaNi' +
            '0thkRU8iKJMWksPtRmxtjal4iMmNoaRcQk0FKoSDGKUItQKGVoQ1tqHozTxOe2ZkjUp1LFaxTfKm0m/nnQ1pgZgigl3Pn1YS71T4' +
            '3O3Lv3uWvv9fnAvAzMnrV/a+3v/q1z9jmnVVUA1uSQEgCCDUCwAQg2AMEGINgAwQYg2AAEG4BgAxBsgGADEGwAgg1AsAEINkCwAQ' +
            'g2AMEGINgABBuAYAMEG4BgAxBsAIINQLABgg1AsAEINgDBBiDYAMEGINgABBuAYAMQbIBgAxBsAIINQLABCDYAwQYINgDBBiDYAC' +
            'ZwmRKwF621Vyf5rSTHk7QkNyW5ckWn+GySJ5JUkseTPFZVXzTzC1mfVaUKXGyYvSLJe5PcPXAZPprkL6rqK1aEYGPZgXZbkg8n+U' +
            '3V+D+fSfL+qvqsUgg2lhVo1yT5myR3qsbzejDJn1bVfymFYKP/UDuR5O+zrtfN5vJskndX1SNK0QfvivLjgXaktfYPSR4Rahftyi' +
            'QPt9Y+2lo7ohw6NvoKtSuS/GuSV6rGnn0pyW9U1feVQrDRQaeW5HNJblSNScLt1qp6TilsRTm4ULs8yeeF2mRuTLLdWjusFIKNg/' +
            'OQ7efkXpkLr1Mi2DiAbu09Sd6kErO4s7V2nzIcwLr2GtvQoXZNkm+qxOyurqqnlUHHxmZ8RAnUWceGbo29+sWq+rYy6NiY1x8rwU' +
            'b9iRLo2Ji3W7siyTeSHFWNjTlXVVcpg46N+bxRqG3c0dbaW5VBx8Z8HdsTufDFkGzWF6vqVcqgY2P6ULtNqB2Ym1prNyiDYGN6dy' +
            'vBgfojJbAVZdpu7ZeSfGumw99bVQ+sqFb35MKXbM7hBVX1P1akjo1pvGOm4x5fU6glye75XDvT4T1qo2Njwi7kySTXTXzY7aq6Zc' +
            'U1+3iSuyY+7Jmqut6K1LGx/wv0rhlCLUk+tPLSzdGJXtda+x2rUsfG/oPtsSTHJj7sEA+dztTpfqqqjlmZOjb2fmG+eIZQS5K/Gq' +
            'SE989wzNtba79qdQo29u4jCztuV6rqH2c6tDcRBBt77NYOZ54vkjw12CMLJ2c45t2ttS2rVLBx6d6ceT4X+sBgdfy7GY55NMkJS3' +
            'SGG7o3D1bfsT2V6Z/HGvJxhZneRPD5UR0bl3gh3pJ5HjK9f9CSzvH7BTe11l5rtQo2Lt575zjojC+md62qHk1yboZDv81SFWxcXL' +
            'd2TeZ50+Dk4KV9aIZjvqu1drVVK9j42d4+03H/fPC6fnim477bkp3wxu7Ng9V2bGcz/buhq/5c6CXU9tEkd0x8WJ8f1bHxMy6838' +
            '88j3h8UHWTJH89wzGv2/08Lzo2nifYHk9y+8SH9WMk83fEPj+qY+N5LrgbZgi1ZJzPhR5kPW7ffdMHHRs/FmwPZp6v//atrz9a58' +
            'uTfG+GQz9YVe9UYR0bP7jYjswUaqeE2o+qqu8nOT3Doe9srbkudWz7DoPDufDd9jcnudGSgEl8Ocmnk7yvqp4TbJsNtZcn+XySK6' +
            '1DmMXXktxcVU/bim7Ow0INZvWSJJ/Y9H86bLC11m619YSNeN2mP+g/csfm19Bhc35FsG3GFdYabMy1gg1Ymx3BtsJCw+DOCzZgbQ' +
            '6t9j8budCgY3NxAxoJwQbo2ATbhgsNCDbnDri4AQRb8ozph435qmDbjCesNdiYJwXbBlTVl5NsW28wu9O719vGjP5Fk1clOZN5fq' +
            'oOuHB9vbQ2HDRDv3lQVWd3f1LuZOb5/noYtktL8oGqur4OoHvyK1XTdX/35MJvJ8Aa3FtVDyx18B73mM4LlADrWbCtjVqyJuViJP' +
            'ERLdZlS7ABCDbADkSwAbaigg3Yl0X/JohgA1aXDYJNLeEn8Rob4EZt8ACCTesOCDZg4Bu1YAN0bKgl1rPBa90BwQYg2NQSpucjVd' +
            'iKsjo+BM+iankuyfEkL6yqdrF/krwwyVt2/73x9Ts+BNtwHdt2VV1VVY9X1Xcv5R9W1Xer6hO7v+p1xvj2NT6/ZyvY1HJCr5/oOM' +
            'dmGt8dEx3neOf1e73LxcXINE5X1dkpDlRVZzL977CerqpnJhrfkzONb6r6nU3/v2Prkwcswn9OfLypt3vbnZ/vdufHQ7DNonU+vq' +
            'mDaOrgeHbi4z018fHOdX482SDYZtH7cz9bnR/v/GD16/3asxUFNy4Em1quwfnO62dt24oyQOt+3nwYn1RmbbU85HzVz8WIDuGna5' +
            '2Pb7Tj6SgFm5vYBMpa1PEavIXqDmw+Rp4Pk28rOuRc73Q+H4fMh2Bzk1h/8E59vN4fgB3tNTbfx4atheAwH4JtnbYGm+vej7c12P' +
            'nKBsE2Cx+56atD6P01Ox2bYFNLF6b5QLCxvAuz97VYg82vrSiLUEqwL5eZD8Gmg+lPG6x+vb9m16xnwaaWxud41otgc4czH+ZXl4' +
            'EL3ficr60o/48HdNc9H76PTbANqfd3uUbbmpX6CTbWv1BH6zh824pgY4Ba7piPrra2PoIn2Ojwwhztkwc7nc+HbBBstsodaubDfA' +
            'g2C3VtHcKO+Vj1fAg2ZlHWovmwFUVHae3Meb4e9xBsi9D71qIGuzBHmw8E25ALtQ02vt6DvFkvgm3Erd5oRvv5vdHmQ7Ax5NrpfS' +
            '0282vwsLaOt8yHYNPBrH98Povp2lPcAdiq9HW8ZknairJ/o32oebTfKPBFmILNHW4AnpzH5LO6jnLLWlx1h28ryiL0/rVF582Hra' +
            'hgw4UJgm34O1zvL873/jiKx2UEG26KblxYnCxvrr3Gtu5rz2ts6DgEkfkQbFg7OhjZYPCYa/OB4qrl8jqO8+bD+ASbhXCpyoXZ1b' +
            'Xiq8EFGxPwEai+gtIDzoINaxHzYTGxvA7G4w/rnl/Bxiym/giU14j6mg8E25C1nPobZbfMR1fzgWAz17aOB14/155go8Mg8q6oG4' +
            'Ngs/BXZ8d8INjUcm3aYPPhWnExYu1cMl+V3ZctixNb7/3z+EhfFj0fgk2H1cvxbG370ix2RtyqjPYDx94cEmw6Iuerw8Li1MEsb3' +
            'yj/QrUaB2gD8EzZAdjPsyH4urYjG/h5+sjaYKNAWwNdqG7MQg2BgiiGmwtjvZAstfYWITeH6cYrYPxfWyCTS11HOYDxV3DHb338d' +
            'Vg5+vNA8GGIHehm1/B5iaxvPGNdrzz1ouLER3W2jqE0baiOjZ0qG4MWJwWvrle3nyU+RBsail41xYcW+bDxahjM9eCw3woLrPzpL' +
            'v5sH1idfxYSl9BZD4EGwMs/N4v9K3B5tdWFN3+AFszv3kg2BjgwvQk/rqD0icPUEtBaT5cjKxhrv0KlA7V4LEVVb+h6yfYLHxzbT' +
            '5QXNawdgSRG4PJAhc6gk0tR3vcw5cSDJwNgs0dXXBgcQIINrU0vouzYz5WPR+Kays6pN6/j+2Q+RBsOrb12zEfmHwd29rGd9lg5+' +
            'uTB4JNLXVs5gOTz/x6/3GO0Z7rMh+CjQk0a6erC71ZkoJtxODofa57f9ex9yD3OIrBL8JovzrUe1BOPR+jdVi2ouDGhWBTS3d0Wz' +
            '3r2eC17qNvLcwHgk0tdUR+48HFiA5hD1rn4/PJg4E7SsHmJrZXZS3qeA3eQnUHNh8jz4fJtxUdcq53Op+PQ+ZDsLlJ9Oe6iY/30o' +
            'mPd/XEx3vZxMf7hYmPd7Tz9eL72FhExzZ1EE0dlDcPNr5brGfBtgS93+GOtdZeMcWBWmuvTXJshvHd0Pn4Xj7R+G6YYXyyQbDNYg' +
            'mvSZxqrR3e50X5y0k+NtP4Hmqt/fw+x3fNjON7uLV2ZJ/jO5Tk43Yggk0tp3NTkqdbaydaa7dd4gV5a2vtniT/nuTaGcf3zd3x3X' +
            'qJ43v17vi+MuP4bkzy7dba2/Ywvte01u5Lcnb3OMzoMiUYzpVJHtm92Ixvb+P7WMfj0/To2ACpzE/jgUusZ8HmJgHWs8G7wwGCDb' +
            'AVZX+2lAAE29qUEoBg07oDgk0tARfjZj2mBKzIpwQbSfJzSsCKXC7YSPygLuvynGAjSZ5SAlbkq0sefKvylMJkxWxNMVmFqlr0V5' +
            'fo2KZ1RglYge2ln4Bgm9a/KAEr8EnBxg/7ghKwAp9e+gl4jW3KYrb2a0m+rhIs2dJfX9OxTb8gvpHknEqwYNtrOAnBNj2vs7Fkn1' +
            'zDSdiKTr8dfWOSf1IJFupIVT239JPQsU2/Hf3neOyDZTq1hlATbPO5XwlYoD9bzc7JVnS2LenZJEdVgoU4U1XXr+VkdGzzeUgJWJ' +
            'D7VtVY6Nhm69gOJ/lvXRsLcLqq3rCmE9KxzWT3Rdj3qASdO5fkt9d2UoJt3nB7JMlplaBj99cKt222ovNvSVuSZ2xJ6dB2Vd2yxh' +
            'PTsc3ftZUtKZ1uQe9Y68kJts1tSU+qBB15SVU9I9jYb7j9oXCjE8er6tk1n6BgE26MF2qPr/0kBZtwQ6itjndFD6rwrZ1I8rfxbi' +
            'nzO5PkdVX1tWGuL8F24AH3aFb87hQH7lRV/d5oJ20revBb0zckuTe+eZfpu7RXjRhqOrb+urdjSf4gyV2qwR6dTPKXI207BduyQu' +
            '5Ekhcl+d3dv/r1eD2OHziX5HNJvpPk35L8xyhvDAg2YEheYwMEG4BgAxBsAIINQLABgg1AsAEINgDBBiDYAMEGINgABBuAYAMQbI' +
            'BgAxBsAIINQLABCDaAJP8LiXMAYggHA5YAAAAASUVORK5CYII=');

        Y.dcforms.assets['fa-play'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAE2CAYAAADrvL6pAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB94KFwkNIZWI9eQAAAt1SURBVHja7d1NqOVlHQfw7y9fUOv2giOFyB' +
            '3cFG1kNpJR4MGFvW1UAg1dORJki0gm0UbaOChlthBso66yNCTdVCQiBkWKCFOrIipPSuS7NoabGP8tzrnNJcdxZu7cM+f8/p/PNq' +
            'e5z3PP/8vz/L/zPKeGYQhAJ+8zBYBgAxBsAIINQLABCDZAsAEINgDBBiDYAAQbINgABBuAYAMQbACCDRBsAIINQLABCDYAwQYg2A' +
            'DBBiDYAAQbgGADEGyAYAMQbACCDUCwAQg2QLABCDYAwQYg2AAEGyDYAAQbgGADEGwAgg1AsAGCDWAlnGoKZqrqE0k+nOTPwzC8bk' +
            'bAim2VA+2TVbU/yZ+SPJXktao6UFU3V5UVLazicz0Mw5hD7eNJnkmy9i7/yZtJbk/y/WEY/uPjAoJtFYJtf5JdR/GfPpdkzzAMD/' +
            'nIgGBb5lA7J8lLx/jHfp/ka8MwPOWjA8trzO+QLj2OP7MryZNV9URVnefjA4Jt2Zy7hT87SfJ8Vd1bVaf5GIFgWxYHT8D/x+4kr8' +
            '4bVAEHgq2NtSS3JflLVV1tOkCwdbKe5P6q+kNVfdZ0gGDr5IIkv6mqx6vqbNMBgq2TS5K8Mi8YTjEdINg6jX13ktfnBYOAA8G2rW' +
            'qBf9dGwfC3qvqKjx0Itu1y8CT8netJfjIvGC708QPB1mnsFyR5en6CYYePIQi2TiZJXlYwgGDraKNg2OsOOBBsW1FL9vOsJdmX5F' +
            'kFAwi243VwSX+uzQXDp31EQbB1GvsFSX7nBAMItmPx9or8nBsnGO6rqjN8ZEGwdXJtkpfmBcNZpgMEW5exbxQMf6yqq3x8QbCt6l' +
            'b0cNaTPKBgAMHW0UbB8ISCAQRbt7FPcqhgcIIBwWYr2sq1mZ1guMkJBgQbnaxl9u31TjAg2Iy9nY0TDPsVDHi46WZXDhUMHzUdCL' +
            'be3h7ZeCdJXpgXDKf76CPY6OTazBpU38GAYDP2VjZ/B8M1HgM83HSynuRH8xMMnzEdCLbV97Zf//9ckOS384LhPNOBYKOTSZLnq+' +
            'qeqjrNdCDY6OS6JK/Or0g603Qg2Iy9i81XJF1pOvBwrwbv2I7OziQPVtWvFQwINrq5OLOC4WFXJCHY6ObyzP6B753evyHY6OaGJC' +
            '9W1c2mAsFGJ2tJbquqv7siCcFGNxtXJD1RVZ8yHQg2OpkkeaqqflZVO0wHgm3x3Gyxfa5I8nJV3eGKJATbYg1+/dtuT2YN6i2mAs' +
            'G2GOXXvxBrSW6dFwxOMCDYttlBv/6FWs/sBMMTVXWR6UCw0ckkyZNV9UhVnWM6EGzG3sllSV6an2BQ5ODhppUbMvuS572mAsFGJ2' +
            'tJ9ikYEGxb59qi5bO5YHCCAcFm7K1MMjvB8LAvecbDTTeXZ/Ylz3dUlc8qgo1W9iR5wxVJCDa62bgiaVpVV5sOBNvhKQ9W084k98' +
            '8LhgtNB4LN2DuZJHl6fkWSEwx4uK3YWrkisxMMP6iqM0wHVi108s15wDnBgGCjlc0nGHwHg2AbJRdN9uU7GATbaLlRor9JDn0Hg4' +
            'JBsEErGwXDHa5IEmzdaUXHZ09mVyTdZCoEm60onawluV3BINi68p0H46ZgEGzGTluTzAqGR6rqXNPh4V513rGx2WVJ/lFV36uqM0' +
            '2HYDN2OvlWkhddkeThhm42rkhSMAg2aEfBINhWjndsHK1JDp1g8B0Mgg1auSKz72C4s6pOMx2Czdjp5IYkr7oiycMN3Wy+Iukq0y' +
            'HYoJP1JA/MC4aLTIdgO9kcqeJEmiR5cv4lz+eZDsF2sjgEz3a4PMnz8yuSFAyCDVrZk1nB4ASDYINWNn/J85WmQ7BBJzuTPKhgEG' +
            'yL4OQBizbJoYLhI6ZDsEEnlyd5bV4wuCJJsBk7rezJ7IqkW0yFh9tWlE7WktzqiiTBBh25IkmwGTttTTK7IumhqjrbdHi4oZMvJ3' +
            'llXjCcYToEG3SyJ7NvsXdFkmA7KsoDVsXmK5K+YDoEm7HTyXqSXzrB4OGGjiaZnWC4V8Eg2P6f+9hYdbszKxj2VtXppkOwJe5jo4' +
            '9984C73lQINuUBnawluXteMHxRsBk7dLKe5BdjP8FgxQY9TTI7wXDvGK9IsmqB3nZndkXS3jGdYLAVhXHYl9kJhus93EAnmwuG1i' +
            'cYvGOD8Wl/gsFWFMZrktkJhvuq6hwPN9DJtZnfIFJVJdhsRaGTfUn+1aFgsGIDNttcMHxJsAGdrCf5eVU9voonGAQbcCSXZHaC4Z' +
            '6q+phgAzq5Lsk/q+rGqlr63PDPPYBj8d0kbyx7wTDmh7t8RuG4bBQM02U9weAGXeB47cyhEwxLVTDYigJbNcmhK5J2eLiBTnYneX' +
            'l+guEswQZ0si/JC1X1OcG2eMoD2D5rSX5VVfcKtsVSHsACtqdVtVewGTt0c2NVnebhXgy3e8BifDDJLsEGdDMINmOHTg4k2e/hth' +
            'WFTr49DMNCyzqrFmA73TUMw92L/ktPtRUFtmn7ORmGYb+H21YUOgTa14dh+NDJCrWxr9iAE7/t/MYy/CC2osBWPZrkimEY3lqWH8' +
            'iKDThe0yQXD8PwnFXL8vCODY7PgSSXDsNw/jKGmu0YcKyBtlEMPLbMP6h3bMDRWJpiQLABW7V0xYBgOzLv2ODdTbOkxYDtGHCslr' +
            '4YEGzAsQTaShQDtqJCHY7GShUDgu3IvGNj7FayGBBswOFM54G2v+sAbcdgPA4kuWpeDOzvPFDBBuOwUQz8dAyDFWzQ213DMNQwDD' +
            '8c06C9Y4OeHk3y1VX+t2iCDdgwTfNiwFb0yE7xDNDIaIoBwXZkg2eBJkZVDAi2Iyu/flbcKIuBozHmd2wH/fpZUaMuBgQb9DKNYs' +
            'BW1NhpQjHg4YZWFAOCDdpQDGyBa4tguSgGBJvVKm1MoxjwcEMTigHBBq0oBgQbtKEY2GbKA1gcxYBgs1qljWkUAx5uKzaaUAwINm' +
            'hFMSDYoA3FwBIY8zs2F01yIikGBNtScDU4J8I0igFbUWhCMSDYlpJWlOOlGBBstqK0oRhYEb7zAN6bYkCwWa3SxjSKAQ/3ivGOjX' +
            'ejGBBsxk4rigEPN7ShGGjE94oydooBwdaKd2zjNo1iwFYUmlAMCDZjpxXFgIcb2lAMjIzygM4UA4JtdByp6msaxYCt6Eg5BN+PYo' +
            'DRBxu9KAYQbLShGOAdlAesKsUAgu0wnDxYTdMoBrAVpQnFAILN2FtRDODhthVtQzHAcVEesIwUAwg2q9U2pvNAe8xU4OFm1R3I7D' +
            '3a+UINwUYH35kXA96jYSt6AigPTq4fD8NwjWnAis3YO3g0yU6hhhUbHUyjGMCqZdu5j20xFAMItgVyH9v2UwxgK7pgyoPtoxjAis' +
            '3Y21AMYMVmxdbGNIoBrFpoQjGAYDP2VhQD2IrShmIAq5Yl5h3bsVEMYMUm1NuYRjGAh5smFAMINlvRVhQD2IrShmIAKzbaUAxgxU' +
            'Yb0ygGsGKjCcUAgs3YW1EMYCvaWI1svIoBrFpGYCw36CoGsGIT6m1MoxjAw00TigEEmyloRTEAUR50oRgAK7YkPcoDxQBYsbUJ9W' +
            'kUA2DFdhireLuHYgAEWyuKAbAVbRPqigGwYmuzFVUMgBVbG9MoBsCKrcnYFQMg2FptRRUDYCvahmIArNjajF0xAFZsbUyjGAArtm' +
            '20yHdsigEQbK0oBsBWtE2oKwbAiq0NxQBYsZ00J/od2zSKAbBia0IxAIKtFcUA2IoulWe38GcVA7DEahiGcQ686gNJ3jzGP/ZoZu' +
            '/RnvPRAVvRpTMMw7+TPHOU//k0yaXDMHxeqIFgW3ZXvcf/rhgAwbZyq7a/Jnn/fEV2uEBTDMAKGu07tndMRNVZSXYkeWUYhrfMCA' +
            'g2AFtRAMEGINgAwQYg2AAEG4BgAxBsAIINEGwAgg1AsAEINgDBBgg2AMEGINgABBuAYAMEG8BK+y+h+CyDAbVoXwAAAABJRU5Erk' +
            'Jggg==');

        Y.dcforms.assets['fa-stop'] = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAE2CAYAAADrvL6pAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB94KFwkND0le+CsAAAZ1SURBVHja7d0xq5xFFAbgM+4lYJHSRlEMKO' +
            'kSI14UK8HGWgTzC9L4FySt4B9RK0tJZxUEQ2LsVESblIok9d6TIgEJuV/uflx2mTnzPGBlmhlmXs673+53W2YGQCUv2QJAsAEINg' +
            'DBBiDYAAQbUDvYrr7WLtsGoJLme2yAKgog2AAEG4BgAxBsgGADEGwAgg1AsAEINkCwAQg2AMEGINgABBsg2AAEG4BgAxBsAIINQL' +
            'ABgg1AsAEINgDBBiDYAMEGINgABBuAYAMQbIBgAxBsAIINQLABCDZAsAEINgDBBnAgR7bgea21VyLi44h4NyKOI+IjuwIH9WNE3I' +
            'uIuxHxQ2b+s+oOZ6YtfDbUvoiIryLiot2ALjyKiBuZ+a1gWx9oFyLim4j41G5Al76PiM8y80Sw7RZqLSL+jog3nB3o2q+ZefWsf+' +
            'ThwRNfCzUYwpXW2pdnDitXXo3L9x/kbxNPa+9HxE/OCwzlODPvqKLLwXYvIt5xTmAov2TmNcG2HGw+ZIQBZWZb+n9Tf8bWWvvA8Y' +
            'B693f2hwevOx4wrGuC7XSXnA0Y1suCbaGmOxtQz+zBtnUEQLBZP+BiAxw6vwQbYGIrpjkCMKwTwXY6Dw9AFTWxAv03rtkv9omzAc' +
            'NKwQaoYtYPuNiqKNDJ/TWxACY26wdcbFUUEGwAgs36wf11sYESPBVduzGAKgagigp2QBUFMLGcL/EBwQbQTX4JNqBc4/LwAHCxZ0' +
            'l8QLABCDYAwQawY34JNmBUnooCRjkAVXRQG2cDVNFq0tkAVbSa5giAKlrN1tkAVRTAxKaKAyY2ABMLIL8E206jLKCKmlgBExuAiQ' +
            '1AFQNUUaMsYGKzfqDPwcTEBqiiACY2gP1IwbZyY4DubQTbyo0BxqWKAoKtGE9FYVxbwaaKwjT31988AMo1Lr88AMrdX5+xASYW6w' +
            'dcbIADNy7BBpjYZkl8YNz8MrEBqqiJFXCxAQQbgGA7Dz+pAsFWjh/BQ8H8UkUBExtAJ3zdAzCxTZ/4wLj5ZWIDVFETK2BiU0WB/W' +
            'iCDajGX6myfnCxAQQbQC/55eEBUO7++owNcLEBBFvfvI8NCuaX97EBo/IZ29qNAVRR6wdUURMboIoCqGLWD8Wliw1UcyTYVnZ0oH' +
            'teW2T9MM/9dbGBco1LFQVUMQBVFEAVBVBFgTltBJv1QzW+x7agORtgYpkm8QHBZv2Aiw2wr/wSbICJrRgPD2BcvqC7wMMDUEVNrE' +
            'D/jcvbPYBReTU4oIpZP+Biq6JAL/fXxAKY2KwfcLFVUUCwAQg26wf318UGSvBUdO3GAKoYgCoq2AFVFMDEcr7EBwQbQDf5JdiAco' +
            '3LwwPAxZ4l8QHBBiDYAAQbwI75JdiAUXkqChjlAFTRQW2cDVBFq0lnA1TRapojAKpoNVtnA1RRABObKg6Y2ABMLID8Emw7jbKAKm' +
            'piBUxsACY2AFUMUEWNsoCJzfqBPgcTExugigKY2AD2IwXbyo0BurcRbCs3BhiXKgoItmI8FYVxbQWbKgrT3F9/8wAo17j88gAod3' +
            '99xgaYWKwfcLEBDty4BBtgYpsl8YFx88vEBqiiJlbAxQYQbACC7Tz8pAoEWzl+BA8F80sVBUxsAJ3wdQ/AxDZ94gPj5peJDVBFTa' +
            'yAiU0VBfajCTagGn+lyvrBxQYQbAC95JeHB0C5++szNsDFBhBsffM+NiiYX97HBozKZ2xrNwZQRa0fUEVNbIAqCqCKWT8Uly42UM' +
            '2RYFvZ0YHueW2R9cM899fFBso1LlUUUMUAVFEAVRRAFQXmtBFs1g/V+B7bguZsgIllmsQHBJv1Ay42wL7yS7ABJrZiPDyAcfmC7g' +
            'IPD0AVNbEC/Tcub/cARuXV4IAqZv2Ai62KAr3cXxMLYGKzfsDFVkUBwQYg2Kwf3F8XGyjBU9G1GwOoYqP61xGAYf0n2E5319mAYf' +
            '289D9aZk69M621dD5gPJnp7R4vcMcWQK17a2Jr7e2I+N05gaG8lZl/mtiWx9k/IuKmcwLDuPmiUDOxPTu5/RURb9oJ6LuCZubxWf' +
            '/IZ2z/T26XIuKWnYBu3dol1ATb8+H2SURctxPQlYcRcf3p/dytgamii9X084j48Ol/79kROGzljIjbEXE7M79bfX8FG1CNKgoINg' +
            'DBBiDYAAQbgGADBBuAYAMQbACCDUCwAYINQLABCDYAwQYg2ADBBiDYAAQbgGADEGwAEfEYjMkDpsJklN8AAAAASUVORK5CYII=');

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            //  these are only used on the client, included by parent binder where needed
            //'node-event-simulate',
            //'microphoneinputmodal',
            //'DCWindow'
        ]
    }
);
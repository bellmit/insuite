/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery, $, moment, CodeFlask, FileReader, qq */
'use strict';

YUI.add( 'ko-bindingHandlers', function( Y, NAME ) {
    /**
     * @module ko-bindingHandlers
     */

    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        ONE_MONTH = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.button.ONE_MONTH' ),
        THREE_MONTHS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.button.THREE_MONTHS' ),
        SIX_MONTHS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.button.SIX_MONTHS' );

    /**
     * retrieves bindings from a node
     * @param {jQuery} $element element that has a data-bind
     * @return {[{node:jQuery, context:ko.contextFor, accessors:object}]}
     */
    function $getBindings( $element ) {
        return $element.map( function() {
            var node = this,
                context = ko.contextFor( node ),
                bindings = ko.bindingProvider.instance.getBindingAccessors( node, context );
            return { node: node, context: context, accessors: bindings };
        } ).get();
    }

    /**
     * ko console bindingHandler
     * - does a console.warn for provided valueAccessor
     * - 1. parameter: type ['init', 'update']
     * - 2. parameter: element bind to
     * - 3. parameter: ko.toJS(valueAccessor())
     * - 4. parameter: valueAccessor()
     *
     * @type {object}
     * @example
     * <pre>input(data-bind="console: foo")</pre>
     * @example
     * <pre>input(data-bind="console: [foo, bar, $data]")</pre>
     * @example
     * <pre>input(data-bind="console: { foo: bar }")</pre>
     */
    ko.bindingHandlers.console = {
        init: function( element, valueAccessor ) {
            var
                value = valueAccessor(),
                toJS = 'error toJs'; // main reason is DOMNode involved

            try {
                toJS = ko.toJS( value );
            }
            catch( ex ) { //eslint-disable-line no-empty
            }

            console.warn( 'init', element, toJS, value ); //eslint-disable-line no-console
        },
        update: function( element, valueAccessor ) {
            var
                value = valueAccessor(),
                toJS = 'error toJs'; // main reason is DOMNode involved

            try {
                toJS = ko.toJS( value );
            }
            catch( ex ) { //eslint-disable-line no-empty
            }

            console.warn( 'update', element, toJS, value ); //eslint-disable-line no-console
        }
    };

    /**
     * ko element bindingHandler
     * @param {ko.observable|ko.computed} valueAccessor a ko.isWriteableObservable observable
     */
    ko.bindingHandlers.element = {
        init: function( element, valueAccessor ) {
            if( ko.isWriteableObservable( valueAccessor() ) ) {
                valueAccessor()( element );
            }
        }
    };

    /**
     * ko readOnly bindingHandler
     * - transforms a field/action at runtime into readonly mode
     * - supports prevent click binding
     *
     * ViewModel._runBoilerplate generates for each field it makes observable also a readOnly observable, which is
     * accessible via observable.readOnly it is used for setting individual fields readOnly, if that observable is
     * not written it observes _isModelReadOnly as default, if it got written it get decoupled from _isModelReadOnly
     *
     * @type {object}
     * @example
     * <pre>input(data-bind="readOnly: _isModelReadOnly")</pre>
     * @example
     * <pre>input(data-bind="value: myValue, readOnly: myValue.readOnly")</pre>
     * @see ViewModel._isModelReadOnly
     */
    // init readOnly before click handler
    if( ko.bindingHandlers.click ) {
        ko.bindingHandlers.click.after = ko.bindingHandlers.click.after || [];
        if( -1 === ko.bindingHandlers.click.after.indexOf( 'readOnly' ) ) {
            ko.bindingHandlers.click.after.push( 'readOnly' );
        }
    }
    ko.bindingHandlers.readOnly = {
        /**
         * @param {ko.observable} valueAccessor an observable returning boolean
         */
        init: function( element, valueAccessor, allBindings ) {
            var
                readOnlyMayPreventClick = null;
            // handle click event
            if( allBindings.has( 'click' ) ) {
                readOnlyMayPreventClick = function readOnlyMayPreventClick( $event ) {
                    var readOnly = ko.utils.peekObservable( valueAccessor() );
                    if( readOnly ) {
                        $event.stopImmediatePropagation();
                        return false;
                    }
                };
                jQuery( element ).on( 'click.readOnly.binding', readOnlyMayPreventClick );

                ko.utils.domNodeDisposal.addDisposeCallback( element, function readOnlyDisposeCallback() {
                    jQuery( element ).off( 'click.readOnly.binding', readOnlyMayPreventClick );
                } );
            }
        },
        update: function( element, valueAccessor, allBindings ) {
            var $element = $( element ),
                readOnly = ko.utils.unwrapObservable( valueAccessor() );
            // handle click event
            if( allBindings.has( 'click' ) ) {
                if( 'A' === element.tagName ) {
                    if( readOnly ) {
                        $element.addClass( 'ko-readOnly' );
                    } else {
                        $element.removeClass( 'ko-readOnly' );
                    }
                }
            }
            ko.bindingHandlers.enable.update( element, function() {
                return !readOnly;
            } );
        }
    };

    ko.bindingHandlers.inputmask = {
        init: function( element, valueAccessor ) {

            var mask = valueAccessor();

            var observable = mask.value;

            if( ko.isObservable( observable ) ) {

                $( element ).on( 'focusout change', function() {

                    if( $( element ).inputmask( 'isComplete' ) ) {
                        observable( $( element ).val() );
                    }
                    else {
                        observable( null );
                    }

                } );
            }

            $( element ).inputmask( mask );

        },
        update: function( element, valueAccessor ) {
            var mask = valueAccessor();

            var observable = mask.value,
                valuetoWrite;

            if( ko.isObservable( observable ) ) {

                valuetoWrite = observable();

                if( valuetoWrite && valuetoWrite.value ) {
                    $( element ).val( valuetoWrite.value );
                } else {
                    $( element ).val( valuetoWrite );
                }
            }
        }
    };

    /**
     * ko select2 bindingHandler
     * supports readOnly binding
     * @type {object}
     * @example
     * <pre>select(data-bind="select2: _select2Cfg, options: _aValueList(), optionsValue: 'val', optionsText: 'i18n', value: _aValue</pre>
     * @example
     * <pre>input(type="hidden", data-bind="select2: _select2Cfg, readOnly: _isReadOnly")</pre>
     * @see jQuery.select2
     */
    ko.bindingHandlers.select2 = {
        after: [ 'value', 'readOnly', 'disable', 'enable', 'hasFocus' ],
        /**
         * @param {object} valueAccessor
         * @param {object|ko.observable} valueAccessor.select2 wrapped select2 constructor config object
         * @param {ko.computed} [valueAccessor.data] for read access uses select2.('data', *) and for write access subscribes to 'change'
         * @param {ko.computed} [valueAccessor.val] for read access uses select2.('val', *) and for write access subscribes to 'change'
         * @param {ko.observable} [valueAccessor.placeholder] Administrate the placeholder for select2 via an observable
         * @param {function} [valueAccessor.init] gets called on binding init
         * @param {function} [valueAccessor.update] gets called on binding update
         */
        init: function( element, valueAccessor, allBindings/*, viewModel, bindingContext*/ ) {
            var
                $element = $( element ),
                config = ko.unwrap( valueAccessor() ) || {},
                select2Cfg = ko.unwrap( config.select2 ) || {},
                $select2 = null,
                observablePlaceholder = config.placeholder || null,
                subscriptions = [],
                hasBindingReadOnly = allBindings.has( 'readOnly' ),
                getPlaceholder,
                positionDropdown,
                lang = Y.doccirrus.comctl.getUserLang(),
                select2Events = {
                    open: 'select2-open',
                    close: 'select2-close',
                    choiceSelected: 'choice-selected',
                    blur: 'select2-blur'
                },
                fullViewClass = 'select2-full-view',
                fullViewClassOpened = 'select2-full-view--opened';

            if( !jQuery.fn.select2 ) {
                Y.log( '(select2) jQuery select2 not available', 'error', NAME );
                return;
            }

            select2Cfg.containerCssClass = select2Cfg.containerCssClass || 'ko-select2-container';
            select2Cfg.dropdownCssClass = select2Cfg.dropdownCssClass || 'ko-select2-drop';

            if( ko.isObservable( observablePlaceholder ) ) {
                select2Cfg.placeholder = observablePlaceholder();
            }

            if( select2Cfg.allowClear && !select2Cfg.placeholder && !element.placeholder && !ko.isObservable( observablePlaceholder ) ) {
                // in case of observable placeholder, we hope you know what you do
                Y.log( 'bindingHandlers.select2 needs a "placeholder" when using "allowClear" > ' + element.name, 'warn', NAME );
            }

            $element.select2( select2Cfg );
            $.extend($element.select2.defaults, $element.select2.locales[lang]);
            $select2 = $element.data( 'select2' );

            if ( select2Cfg.multiple && select2Cfg.fullView ) {
                $select2.container.addClass(fullViewClass);

                $element.off(select2Events.open).on(select2Events.open, function () {
                    $select2.container.addClass(fullViewClassOpened);
                });

                $element.off(select2Events.close).on(select2Events.close, function () {
                    $select2.container.removeClass(fullViewClassOpened);
                });

                $element.off(select2Events.choiceSelected).on(select2Events.choiceSelected, function () {
                    $select2.container.addClass(fullViewClassOpened);
                });

                $element.off(select2Events.blur).on(select2Events.blur, function () {
                    $select2.container.removeClass(fullViewClassOpened);
                });


                /**
                 * When multiple flag is true, we need to overwrite
                 * the positionDropdown so its executions is deferred to the end of the stack.
                 * So the container which is in a one line component, changes to position absolute and the height auto.
                 * And we need to wait until that height is taken before the dropdown is positioned.
                 * @type {positionDropdown|*}
                 */
                positionDropdown = $select2.positionDropdown;

                $select2.positionDropdown = function () {
                    setTimeout(function () {
                        positionDropdown.apply( this );
                    }.bind(this), 0);
                };
            }

            // try to do observable placeholder
            getPlaceholder = $select2.getPlaceholder;
            if( getPlaceholder ) {
                // overwrite select2 getPlaceholder, which may be triggered under some circumstances from select2
                $select2.getPlaceholder = function() {
                    var
                        result = getPlaceholder.apply( this, arguments );

                    // MOJ-2223 ~ do not show placeholder for readOnly
                    if( hasBindingReadOnly && peek( allBindings.get( 'readOnly' ) ) ) {
                        result = '';
                    }

                    return result;
                };
            }
            if( ko.isObservable( observablePlaceholder ) ) {

                ko.computed( function() {
                    var
                        placeholder = observablePlaceholder();

                    // MOJ-2223 ~ do not show placeholder for readOnly
                    if( hasBindingReadOnly && unwrap( allBindings.get( 'readOnly' ) ) ) {
                        placeholder = '';
                    }

                    if( $select2 ) {
                        // try to set a "placeholder" via select2 for the appropriate state of select2
                        select2Cfg.placeholder = placeholder;
                        $select2.opts.element.attr( 'placeholder', placeholder );
                        if( !$select2.val().length ) {
                            if( $select2.setPlaceholder ) { // single
                                $select2.setPlaceholder();
                            }
                            else { // multi
                                if( $select2.search ) {
                                    $select2.search.val( placeholder );
                                }
                            }
                        }
                    }
                }, null, {
                    disposeWhenNodeIsRemoved: element
                } ).extend( {
                    rateLimit: 0
                } );
            }

            if( config.init ) {
                config.init.apply( this, arguments );
            }

            if( config.data ) {
                if( ko.isObservable( config.data ) ) {
                    ko.computed( function() {
                        $element.select2( 'data', config.data() );
                    }, null, { disposeWhenNodeIsRemoved: element } );
                    if( ko.isWriteableObservable( config.data ) ) {
                        $element.on( 'change.select2.binding', function( $event ) {
                            config.data( $event );
                        } );
                    }
                } else {
                    $element.select2( 'data', config.data );
                }
            }

            if( config.val ) {
                if( ko.isObservable( config.val ) ) {
                    ko.computed( function() {
                        $element.select2( 'val', config.val() );
                    }, null, { disposeWhenNodeIsRemoved: element } );
                    if( ko.isWriteableObservable( config.val ) ) {
                        $element.on( 'change.select2.binding', function( $event ) {
                            config.val( $event );
                        } );
                    }
                } else {
                    $element.select2( 'val', config.val );
                }
            }

            // handle readOnly binding
            if( hasBindingReadOnly ) {
                subscriptions.push( allBindings.get( 'readOnly' ).subscribe( function( value ) {
                    $element.select2( 'enable', !value );
                } ) );
            }
            // handle disable binding
            if( allBindings.has( 'disable' ) ) {
                ko.computed( function() {
                    $element.select2( 'enable', !ko.unwrap( allBindings.get( 'disable' ) ) );
                }, null, { disposeWhenNodeIsRemoved: element } );
            }
            // handle enable binding
            if( allBindings.has( 'enable' ) ) {
                subscriptions.push( allBindings.get( 'enable' ).subscribe( function( value ) {
                    $element.select2( 'enable', value );
                } ) );
            }
            // handle hasFocus binding
            if( allBindings.has( 'hasFocus' ) ) {
                if( allBindings.get( 'hasFocus' ) ) {
                    ko.computed( function() {
                        if( ko.unwrap( allBindings.get( 'hasFocus' ) ) ) {
                            $select2.focus();
                        }
                    }, null, { disposeWhenNodeIsRemoved: element } ).extend( { rateLimit: 0 } ); // select2 3.5.2 focusser visibility may be delayed
                }
            }

            ko.utils.domNodeDisposal.addDisposeCallback( element, function select2DisposeCallback() {
                Y.Array.invoke( subscriptions, 'dispose' );
                $element.off( 'change.select2.binding' );
                $element = null;
                $select2.destroy();
                $select2 = null;
            } );

        },
        update: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var /*$element = $(element ),*/
                value = ko.unwrap( valueAccessor() ) || {}/*,
                 select2Cfg = ko.unwrap(value.select2) || {}*/;
            if( value.update ) {
                value.update.apply( this, arguments );
            }
        }
    };

    /**
     * labelFor bindingHandler
     * binding that manages to make a 'for' attribute by name or other configuration
     *
     * @param {String|Object} config a name of a nearby field or a configuration object
     * @param {String} [config.name] if set, a name of a nearby field will be used. Same as setting config to a string
     */
    ko.bindingHandlers.labelFor = {

        init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                $element = jQuery( element ),
                config = ko.unwrap( valueAccessor() ) || {},
                name = Y.Lang.isString( config ) ? config : ko.unwrap( config.name ),
                nameSelector = '[name=' + name + ']',
                $elementTmp = $element,
                $elementFor;
            // handle by name if given
            if( name ) {
                $elementFor = $element.find( nameSelector );
                // find the element by walking upwards
                while( !$elementFor.length ) {
                    $elementTmp = $elementTmp.parent();
                    if( $elementTmp.is( document.body.parentNode ) ) {
                        Y.log( name + ' not found! [ko.bindingHandlers.labelFor]', 'warn', NAME );
                        break;
                    }
                    $elementFor = $elementTmp.find( nameSelector );
                }

                if( $elementFor.length ) {
                    // handle Non-HTMLElements
                    if( Y.Object.owns( $getBindings( $elementFor )[ 0 ].accessors, 'select2' ) ) {
                        // we have to register to some kind of event to know about select2 instantiation
                        $elementFor.parent().on( 'DOMNodeInserted.labelFor.binding', function( $event ) {
                            var $eventTarget = jQuery( $event.target ),
                                $self = jQuery( this );
                            if( $eventTarget.is( 'label' ) ) {
                                // then get the id of the element to focus
                                $element.attr( 'for', $elementFor.data( 'select2' ).search.attr( 'id' ) );
                                $self.off( 'DOMNodeInserted.labelFor.binding' );
                            }
                        } );
                    } else {
                        // generate and/or take an id and use that
                        $element.attr( 'for', Y.one( $elementFor.get( 0 ) ).generateID() );
                    }
                }

            }

            ko.utils.domNodeDisposal.addDisposeCallback( element, function labelForDisposeCallback() {
                if( $elementFor.length ) {
                    $elementFor.parent().off( 'DOMNodeInserted.labelFor.binding' );
                }
                $elementFor = null;
            } );

        }

    };

    /**
     * datetimepicker binding
     *
     * binding config:
     * - value: by default an observable that hold an ISOString or a 'valueReset'
     * - valueReset: The value to use as reset value, defaults to empty String
     * - valueFormat: A String describing the format to use for value when is not an ISOString
     * - options: Plugin config - See below
     * - onInit: Callback to call with plugin instance on initialisation
     * - onDispose: Callback to call with plugin instance on disposing
     *
     * Plugin config with 'options':
     * - If options.format contains a time part, a time picker is provided
     * - options properties can be observables, when changing these the plugin will update
     *
     * @see assets/lib/bootstrap/bootstrap-datetimepicker/4.7.14/js/bootstrap-datetimepicker-defaults.js
     * @see http://eonasdan.github.io/bootstrap-datetimepicker/
     * @example data-bind="datetimepicker: { value: patient.dob }")
     * @example data-bind="datetimepicker: { options: { format: 'HH:mm' }, value: patient.dob, valueFormat: 'HH:mm' }")
     * @example data-bind="datetimepicker: { value: patient.dob, onInit: onInitHandler, onDispose: onDisposeHandler }")
     */
    ko.bindingHandlers.datetimepicker = {
        after: [ 'readOnly' ],
        /**
         * creates two computed which will handle date and time separation for an observable date.
         *
         * changes to 'nameDate' and 'nameTime' will be written back to 'nameFrom'
         * and changes to 'nameFrom' will be written to 'nameDate' and 'nameTime'
         *
         * @method createComputedForObservableDate
         * @param {Object} parameters configuration
         * @param {Object} parameters.context the context to apply the computed to
         * @param {Object} parameters.nameFrom the name of property in context to take as date
         * @param {Object} parameters.nameDate
         * @param {Object} parameters.nameTime
         */
        createComputedForObservableDate: function createComputedForObservableDate( parameters ) {
            var
                context = parameters.context,
                nameFrom = parameters.nameFrom,
                nameDate = parameters.nameDate,
                nameTime = parameters.nameTime;

            context[ nameDate ] = ko.computed( {
                read: function() {
                    var
                        from = context[ nameFrom ](),
                        fromMom;
                    if( from ) {
                        fromMom = moment( context[ nameFrom ]() );
                        fromMom
                            .hour( 0 )
                            .minute( 0 )
                            .second( 0 )
                            .millisecond( 0 );
                        return fromMom.toISOString();
                    } else {
                        return null;
                    }
                },
                write: function( value ) {
                    var
                        from = context[ nameFrom ](),
                        fromMom,
                        dateMom;
                    if( value ) {
                        dateMom = moment( value );
                        if( from ) {
                            fromMom = moment( from );
                            fromMom
                                .date( dateMom.date() )
                                .month( dateMom.month() )
                                .year( dateMom.year() );
                            context[ nameFrom ]( fromMom.toISOString() );
                        } else {
                            fromMom = dateMom.clone();
                            fromMom
                                .hour( 0 )
                                .minute( 0 )
                                .second( 0 )
                                .millisecond( 0 );
                            context[ nameFrom ]( fromMom.toISOString() );
                        }
                    } else {
                        context[ nameFrom ]( null );
                    }
                },
                pure: true
            } );
            context[ nameTime ] = ko.computed( {
                read: function() {
                    var
                        from = context[ nameFrom ]();
                    if( from ) {
                        return moment( context[ nameFrom ]() ).toISOString();
                    } else {
                        return null;
                    }
                },
                write: function( value ) {
                    var
                        from = context[ nameFrom ](),
                        fromMom,
                        timeMom;
                    if( from ) {
                        fromMom = moment( from );
                        fromMom
                            .second( 0 )
                            .millisecond( 0 );
                        if( value ) {
                            timeMom = moment( value );
                            fromMom
                                .hour( timeMom.hour() )
                                .minute( timeMom.minute() );
                        } else {
                            fromMom
                                .hour( 0 )
                                .minute( 0 );
                        }
                        context[ nameFrom ]( fromMom.toISOString() );
                    } else {
                        context[ nameFrom ].valueHasMutated();
                    }
                },
                pure: true
            } );

        },
        init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {

            var
                bindingOptions = valueAccessor() || {},
                // the observable to care about
                valueBinding = bindingOptions.value,
                valueUpdate = bindingOptions.valueUpdate,
                // the format of value to care about
                valueFormat = bindingOptions.valueFormat || moment.defaultFormat,
                // used unset value - handles backward compatibility to previous datepicker bindings (some null, some ''[default])
                valueReset = ('valueReset' in bindingOptions ? peek( bindingOptions.valueReset ) : ''),
                // initial value
                valueInitial = peek( valueBinding ) || valueReset,
                // onInit function
                onInit = bindingOptions.onInit,
                // onDispose function
                onDispose = bindingOptions.onDispose,
                // aggregate opitons from defaults and provided
                options = Y.aggregate( {
                    format: jQuery.fn.datetimepicker.defaults.format,
                    locale: Y.doccirrus.comctl.getUserLang()
                }, bindingOptions.options, true ),
                // determine add-on icon
                faIcon = Y.doccirrus.utils.hasDateDatepicker( peek( options.format ) ) ? 'fa-calendar' : 'fa-clock-o',
                // vars for determining who set value
                HOST = 'host',
                rawValue = ko.observable( valueBinding() ),
                CLIENT = 'client',
                updateFrom = HOST,
                // jQuery references
                $element = jQuery( element ),
                $parentElement = jQuery( element.parentElement ),
                $datetimepicker = null,
                $addon = null,
                // other references
                momentValue = null,
                textValue = null,
                customButtons = [],
                textValueComputed = null,
                getValue = function() {
                    var
                        value = valueBinding();

                    if( valueFormat !== moment.defaultFormat ) {
                        value = moment( value, valueFormat ).toISOString();
                    }

                    return value;
                },
                getInitialTextValue = function() {
                    if( valueInitial ) {
                        if( valueFormat !== moment.defaultFormat ) {
                            return moment( valueInitial, valueFormat ).format( peek( options.format ) );
                        }

                        //  may already be in this format, not the default format
                        if (  options && options.format && options.format.length === valueInitial.length ) {
                            return moment( valueInitial, options.format ).format( peek( options.format ) );
                        }

                        return moment( valueInitial ).format( peek( options.format ) );
                    }
                    else {
                        return '';
                    }
                },
                setValue = function( mom ) {
                    if( valueFormat !== moment.defaultFormat ) {
                        valueBinding( mom.format( valueFormat ) );
                    }
                    else {
                        valueBinding( mom.toISOString() );
                    }
                },
                resetValue = function() {
                    valueBinding( valueReset );
                };


            // click hanlder for 'monthsButtons' custom buttons in datepicker
            window.monthClick = function( e ) {

                if( $( e ).hasClass( 'oneMonth' ) ) {
                    textValueComputed( moment().add( 1, 'month' ) );
                }
                if( $( e ).hasClass( 'threeMonths' ) ) {
                    textValueComputed( moment().add( 3, 'month' ) );
                }
                if( $( e ).hasClass( 'sixMonths' ) ) {
                    textValueComputed( moment().add( 6, 'month' ) );
                }
                $('.bootstrap-datetimepicker-widget').hide();
                element.blur();
                return true;
            };

            // only apply datetimepicker once
            if( $parentElement.data( 'DateTimePicker' ) ) {
                return true; // exit
            }

            // markup setup
            $parentElement.addClass( 'date' );
            $addon = $( '<span class="input-group-addon"><span class="fa ' + faIcon + '"></span></span>' );
            $addon.insertAfter( $element );

            if( options.buttons && options.buttons.length ) {
                // add new custom buttons here
                if( options.buttons.indexOf( 'monthsButtons' ) > -1 ) {
                    customButtons = [
                        $( '<td>' ).append( $( '<a>' ).addClass( 'addToNow oneMonth' ).append( '<span class = "addToNow oneMonth" onclick="monthClick(this)" >' + ONE_MONTH + '</span>' ) ),
                        $( '<td>' ).append( $( '<a>' ).addClass( 'addToNow threeMonths' ).append( '<span class = "addToNow threeMonths" onclick="monthClick(this)">' + THREE_MONTHS + '</span>' ) ),
                        $( '<td>' ).append( $( '<a>' ).addClass( 'addToNow sixMonths' ).append( '<span class = "addToNow sixMonths" onclick="monthClick(this)">' + SIX_MONTHS + '</span>' ) )
                    ];
                }

                // delete this property from original options as they are passed to build jquery datetimepicker
                delete options.buttons;
            }

            function yearAutocomplete( year ) {
                var
                    curYr, curCent;
                if( !year ) {
                    return moment().year();
                }
                if( year.length === 2 ) {
                    curYr = moment().year().toString();
                    curYr = Number( curYr.slice( 2 ) );
                    curCent = (curYr + 10) < Number( year ) ? '19' : '20';
                    return curCent + year;
                }
                return year;
            }

            // client listener
            textValue = ko.observable( getInitialTextValue() );
            textValueComputed = ko.computed( {
                read: function() {
                    return unwrap( textValue );
                },
                write: function( value ) {
                    var date, _value,
                        BKdatetimepicker = peek( options.parseInputDate ) && peek( options.parseInputDate ).name === "parseInputDateBK";
                    // NB: datetimepickers in the DMP BK form need some different parsing, given by the parseInputDateBK
                    // function in the DmpBkEditorModel, those cases are thus filtered out below.
                    if (BKdatetimepicker) { return; }
                    if( !valueUpdate && 0 <= peek( options.format ).indexOf( 'DD.MM.YYYY' ) ) {
                        if( /^\d{1,8}$/.exec( value ) ) {
                            _value = value + '';

                            date = moment( peek( options.format )
                                .replace( 'DD', _value.slice( 0, 2 ) )
                                .replace( 'MM', _value.slice( 2, 4 ) || moment().format( 'MM' ) )
                                .replace( 'YYYY', yearAutocomplete( _value.slice( 4, 8 ) ) )
                                .replace( 'HH:mm', moment().format( 'HH:mm' ) ), peek( options.format ), true );
                        } else if( /^\d{2}\.\d{2}\.\d{2}$/.exec( value ) ) {
                            _value = value + '';

                            date = moment( peek( options.format )
                                .replace( 'DD', _value.slice( 0, 2 ) )
                                .replace( 'MM', _value.slice( 3, 5 ) || moment().format( 'MM' ) )
                                .replace( 'YYYY', yearAutocomplete( _value.slice( 6 ) ) )
                                .replace( 'HH:mm', moment().format( 'HH:mm' ) ), peek( options.format ), true );

                        } else {
                            date = moment( value, peek( options.format ) ); // do a non-strict parse
                        }
                    } else {
                        date = moment( value, peek( options.format ), true );
                    }

                    // keep client always in sync
                    textValue( value );
                    // update value only with valid
                    updateFrom = CLIENT;
                    if( date.isValid()) {
                        setValue( date );
                    } else {
                        // If the format is different try to parse once more
                        date = moment( value );
                        if( date.isValid() ) {
                            setValue( date );
                        } else {
                            // NB: datetimepickers in the DMP BK form need some different parsing, given by the parseInputDateBK
                            // function, those cases are thus filtered out here again
                            resetValue();
                        }
                    }
                },
                disposeWhenNodeIsRemoved: element
            } );

            // attach input event for client events
            if( !valueUpdate ) {
                $element.on( 'input.datetimepicker.binding', function( $event ) {
                    rawValue( $event.target.value );
                } );
            } else {
                // attach input event for client events
                $element.on( 'input.datetimepicker.binding', function( $event ) {
                    textValueComputed( $event.target.value );
                } );
            }

            if( !valueUpdate ) {
                $element.on( 'blur keyup', function( e ) {
                    var rv = peek( rawValue );
                    if( rv && (e.type === 'blur' || e.keyCode === 13) ) {
                        textValueComputed( rv );
                    }
                } );
            }

            // widget initialisation
            $parentElement.datetimepicker( ko.toJS( options ) );
            $datetimepicker = $parentElement.data( 'DateTimePicker' );
            if( Y.Lang.isFunction( onInit ) ) {
                onInit( $datetimepicker );
            }

            if( customButtons && customButtons.length ) {
                // add custom buttons at the bottom of datetimepicker-widget on click on calendar-icon(input-group-addon)

                $( '.input-group-addon' ).on( 'click', function() {
                    if( !$( '.bootstrap-datetimepicker-widget ul' ).find( '.customLi' ).length ) {
                        $( '.bootstrap-datetimepicker-widget ul' ).append( $( '<li>' )
                            .addClass( "customLi picker-switch" ).append( $( '<table>' )
                                .addClass( 'table-condensed' ).append( $( '<tbody>' )
                                    .append( $( '<tr>' ).append( customButtons ) ) ) ) );
                    }
                } );
            }

            // value listener, allows the host to update value
            ko.computed( function() {
                var
                    value = getValue(),
                    text = textValueComputed();

                if( value ) {
                    momentValue = moment( value, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true ); // Date.toJSON
                    if( momentValue.isValid() ) {
                        $datetimepicker.date( momentValue );
                    } else {
                        momentValue = moment( value, peek( options.format ), true ); // try optional format if not iso string
                        if( momentValue.isValid() ) {
                            $datetimepicker.date( momentValue );
                        }
                    }
                } else {
                    if( updateFrom !== CLIENT || text === '' ) {

                        $datetimepicker.date( null );
                    }
                }

            }, null, {
                disposeWhenNodeIsRemoved: element
            } ).extend( {
                rateLimit: 0
            } );

            // widget listener
            $parentElement.on( 'dp.change.datetimepicker.binding', function( e ) {
                updateFrom = HOST;
                if( e.date === null || e.date === false ) {
                    resetValue();
                    rawValue( '' );
                } else {
                    setValue( e.date );
                    rawValue( '' );
                }
            } );

            $parentElement.on( 'dp.error.datetimepicker.binding', function() {
                var
                    date = $datetimepicker.date(),
                    options = $datetimepicker.options(),
                    keepInvalid = options.keepInvalid;

                // care about keepInvalid option, notify about the change which is triggered by reverting

                if( keepInvalid ) {
                    return;
                }

                updateFrom = HOST;
                if( null === date ) {
                    resetValue();
                } else {
                    setValue( date );
                }

            } );

            // observable options
            ko.computed( function() {
                var
                    optionsComputed = ko.toJS( options );

                if( ko.computedContext.isInitial() ) {
                    return;
                }

                $datetimepicker.options( optionsComputed );

            }, null, {
                disposeWhenNodeIsRemoved: element
            } );

            // disposal
            ko.utils.domNodeDisposal.addDisposeCallback( element, function datetimepickerDisposeCallback() {
                if( Y.Lang.isFunction( onDispose ) ) {
                    onDispose( $datetimepicker );
                }
                $element.off( 'input.datetimepicker.binding' );
                $parentElement.off( 'dp.change.datetimepicker.binding' );
                $parentElement.off( 'dp.error.datetimepicker.binding' );
                $datetimepicker.destroy();
                $addon = null;
                $parentElement = null;
                $element = null;
                textValue = null;
            } );

        }
    };

    ko.bindingHandlers.daterangepicker = {
        init: function( element, valueAccessor ) {

            var $element = jQuery( element ),
                bindingOptions = valueAccessor() || {},
                options = Y.aggregate( {
                    autoClose: true,
                    language: Y.doccirrus.comctl.getUserLang(),
                    separator: ' - '
                }, bindingOptions.options, true );

            if( options.autoCompleteDateRange ) {
                $element.inputmask( {
                    mask: '99.99.9999 - 99.99.9999',
                    jitMasking: true
                } );
            }

            $element.dateRangePicker( ko.toJS( options ) );

            $element.bind( 'datepicker-change', function( event, obj ) {
                var value = bindingOptions.value;
                if( options.autoCompleteDateRange ) {
                    obj.date1 = moment( obj.date1 ).startOf( 'hour' ).set( 'hour', 0 ).toDate();
                    obj.date2 = moment( obj.date2 ).endOf( 'hour' ).set( 'hour', 23 ).toDate();
                }
                value( obj );
            } );

            function setElementValue( value ) {
                var dates;
                if( !value ) {
                    $element.data( 'dateRangePicker' ).clear();
                } else {
                    dates = value.replace( / /g, '' ).split( '-' );
                    if( dates.length === 2 ) {
                        $element.data( 'dateRangePicker' ).setDateRange( dates[ 0 ], dates[ 1 ], false );
                    } else if( dates.length === 1 ) {
                        $element.data( 'dateRangePicker' ).setDateRange( dates[ 0 ], dates[ 0 ], false );
                    }
                }
            }

            $element.on( 'blur keyup', function( e ) {
                var value,
                    val;
                if( e && (e.type === 'blur' || e.keyCode === 13) ) {
                    value = bindingOptions.value;
                    val = $element.val();

                    if( val === ko.unwrap( value ).value ) {
                        return;
                    }

                    setElementValue( val );

                    if( !val ) {
                        value( val );
                    }
                }
            } );

            ko.computed( function() {
                var
                    val = bindingOptions.value();
                setElementValue( val.value );
            }, null, {
                disposeWhenNodeIsRemoved: element
            } ).extend( {
                rateLimit: 0
            } );

            ko.utils.domNodeDisposal.addDisposeCallback( element, function() {
                $element.off( 'blur keyup' );
                $element.inputmask( 'remove' );
                $element.data( 'dateRangePicker' ).destroy();
            } );
        }
    };

    ko.bindingHandlers.dmpField = {
        HINT_LEVELS: {
            OPTIONAL: 'optional'
        },
        init: function( element, valueAccessor ) {
            var HINT_LEVELS = ko.bindingHandlers.dmpField.HINT_LEVELS,
                accessor = valueAccessor().field,
                hintLevel = ko.unwrap( accessor.hintLevel ),
                hint = ko.unwrap( accessor.hint ),
                dmpIcon = document.createElement( 'i' ),
                i18n = ko.unwrap( accessor.i18n );

            dmpIcon.classList.add( 'dc-info-icon' );

            if( HINT_LEVELS[ hintLevel ] ) {
                dmpIcon.classList.add( 'dc-info-icon-' + HINT_LEVELS[ hintLevel ] );
            }

            dmpIcon.addEventListener( 'click', onHintClick );

            element.appendChild( dmpIcon, element );

            ko.utils.domNodeDisposal.addDisposeCallback( element, function() {
                dmpIcon.removeEventListener( 'click', onHintClick );
            } );

            function showHint( message, title ) {
                new Y.doccirrus.DCWindow( {// eslint-disable-line no-new
                    title: title,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    bodyContent: message,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    render: document.body,
                    maximizable: true,
                    modal: true,
                    resizeable: false,
                    visible: true,
                    centered: true,
                    alignOn: [],
                    dragable: false,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    e.preventDefault();
                                    this.hide( e );
                                }
                            } )
                        ]
                    }
                } );
            }

            function onHintClick() {
                showHint( hint, i18n );
            }

        },

        update: function( element, valueAccessor ) {

            var HINT_LEVELS = ko.bindingHandlers.dmpField.HINT_LEVELS,
                accessor = valueAccessor().field,
                hintLevel = ko.unwrap( accessor.hintLevel ),
                dmpIcon = element.querySelector( '.dc-info-icon' );

            dmpIcon.className = '';
            dmpIcon.classList.add( 'dc-info-icon' );

            if( HINT_LEVELS[ hintLevel ] ) {
                dmpIcon.classList.add( 'dc-info-icon-' + HINT_LEVELS[ hintLevel ] );
            }

        }
    };

    /**
     * corresponding hasFeedback extender to get used elements
     * @param target
     * @param element
     * @see http://stackoverflow.com/questions/9465200/get-element-an-observable-is-bound-to-with-knockout
     */
    ko.extenders.hasFeedback = function( target, element ) {
        target.hasFeedback = target.hasFeedback || [];
        target.hasFeedback.push( element );
    };
    /**
     * hasFeedback bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.field a _runBoilerplate created field to apply to or a key-name in applied ViewModel
     * @param {ko.observable|String|Boolean} config.toggle an observable or a key-name in ViewModel that return Boolean to show hasFeedback
     * @param {ko.observableArray|Array} config.messages an observableArray or Array of String that will be the messages in the popover
     * @param {Object} [config.popover] config object for popover options. Check bootstrap popover options documentation.
     * @param {ko.observable|String} [config.type=error] the type of feedback to display ['success','warning','error']
     * @see http://getbootstrap.com/javascript/#popovers-options
     */
    (function createBindingHandlerHasFeedback( bindingHandlers ) {
        var
            /** binding to create */
            hasFeedback,
            /** binding class name */
            hasFeedbackClass = 'hasFeedback',
            /** bootstrap class name */
            bsFeedbackClass = 'has-feedback',
            /**
             * available bootstrap validation state class names
             * @type {{success: string, warning: string, error: string}}
             */
            bsFeedbackClasses = {
                success: 'has-success',
                warning: 'has-warning',
                error: 'has-error'
            },
            /** binding popover class name */
            hasFeedbackPopoverClass = hasFeedbackClass + '-popover',
            /**
             * available popover class names
             * @type {{success: string, warning: string, error: string}}
             */
            bsPopoverClasses = {
                success: 'alert-success',
                warning: 'alert-warning',
                error: 'alert-danger'
            },
            /**
             * Collection of popovers
             * @private
             * @type {{$elements: jQuery, clear: function}}
             */
            popovers = {
                $elements: jQuery(),
                clear: function() {
                    var $elements = popovers.$elements;
                    $elements.popover( 'destroy' );
                    $elements.data( 'bs.popover', null );
                    $elements.splice( 0 );
                }
            },
            /** binding icon class name */
            hasFeedbackIconClass = hasFeedbackClass + '-icon',
            /** binding container class name */
            hasFeedbackContainerClass = hasFeedbackClass + '-container',
            /**
             * available icon class names
             * @type {{success: string, warning: string, error: string}}
             */
            bsIconClasses = {
                success: 'glyphicon-ok',
                warning: 'glyphicon-warning-sign',
                error: 'glyphicon-ban-circle'
            };

        /**
         * @param {Object} [parameters=Object]
         * @param {String} [parameters.type='error']
         * @param {String} [parameters.iconClass='glyphicon-ban-circle']
         * @param {Boolean} [parameters.inputGroupAddon=false]
         * @param {Boolean} [parameters.isHeader=false]
         * @return {string} resulting markup
         * @privat
         */
        function createIconMarkup( parameters ) {
            parameters = parameters || {};
            var
                inputGroupAddon = parameters.inputGroupAddon,
                isHeader = parameters.isHeader,
                markup = '<span class="glyphicon form-control-feedback"></span>';

            if( isHeader ) {
                markup = '<span class="glyphicon" style="float: right"></span>';
            }
            if( inputGroupAddon ) {
                markup = '<span class="input-group-addon">' + markup + '</span>';
            }
            return markup;
        }

        /**
         * @param {Object} [parameters=Object]
         * @param {String} [parameters.type='error']
         * @param {String} [parameters.popoverClass='alert-danger']
         * @return {string} resulting markup
         * @privat
         */
        function createPopoverMarkup( parameters ) {
            parameters = parameters || {};
            var
                type = parameters.type || 'error',
                popoverClass = parameters.popoverClass || bsPopoverClasses[ type ],
                markup = '<div class="' + [ 'popover alert', hasFeedbackPopoverClass, popoverClass ].join( ' ' ) + '"><div class="arrow"></div><div><h3 class="popover-title"></h3><div class="popover-content"></div></div></div>';

            return markup;
        }

        /**
         * make a consistent config object
         * @return {{type: observable, field: observable, toggle: observable, messages: observable}}
         */
        function makeConfig( element, valueAccessor, allBindings, viewModel/*, bindingContext*/ ) {
            var
                config = { type: 'error', field: null, toggle: false, messages: [] },
                accessor = valueAccessor(),
                subscriptions = [];

            // handle type
            if( Y.Object.owns( accessor, 'type' ) ) {
                if( Y.Lang.isString( accessor.type ) ) {
                    config.type = ko.observable( accessor.type );
                    subscriptions.push( config.type );
                }
                else if( ko.isObservable( accessor.type ) ) {
                    config.type = accessor.type;
                    subscriptions.push( config.type );
                }
            }
            else {
                config.type = ko.observable( config.type );
                subscriptions.push( config.type );
            }

            // handle field
            if( Y.Object.owns( accessor, 'field' ) ) {
                if( Y.Lang.isString( accessor.field ) ) {
                    config.field = viewModel[ accessor.field ];
                }
                else if( ko.isObservable( accessor.field ) ) {
                    config.field = accessor.field;
                }
            }
            else {
                config.field = ko.observable( config.field );
                subscriptions.push( config.field );
            }

            // handle toggle
            if( Y.Object.owns( accessor, 'toggle' ) ) {
                if( Y.Lang.isString( accessor.toggle ) ) {
                    config.toggle = viewModel[ accessor.toggle ];
                }
                else if( ko.isObservable( accessor.toggle ) ) {
                    config.toggle = accessor.toggle;
                }
            }
            else {
                config.toggle = ko.observable( config.toggle );
                subscriptions.push( config.toggle );
            }

            //handle messages
            if( Y.Object.owns( accessor, 'messages' ) ) {
                if( Y.Lang.isArray( accessor.messages ) ) {
                    config.messages = ko.observableArray( accessor.messages );
                    subscriptions.push( config.messages );
                }
                else if( ko.isObservable( accessor.messages ) ) {
                    config.messages = accessor.messages;
                }
            }
            else {
                config.messages = ko.observableArray( config.messages );
                subscriptions.push( config.messages );
            }

            config.popover = Y.merge( {
                html: true,
                placement: 'auto top',
                trigger: 'manual'
                //container:'body'
            }, accessor.popover );

            ko.utils.domNodeDisposal.addDisposeCallback( element, function hasFeedbackConfigDisposeCallback() {
                Y.Array.invoke( subscriptions, 'dispose' );
            } );

            return config;
        }

        function hasFeedbackInit( element, valueAccessor, allBindings, viewModel, bindingContext ) {
            var
                $element = jQuery( element ),

                config = makeConfig.apply( undefined, arguments ),
                type = config.type,
                field = config.field,
                toggle = config.toggle,
                messages = config.messages,

                $bindings = jQuery( '[data-bind]', $element ),
                bindingsMap = $getBindings( $bindings ),

                // TODO: make config property ~multiple
                isArrayOf = Boolean( field._arrayOf ),

                $formControl = jQuery( '.form-control', $element ),
                isFormControl = Boolean( $formControl.length ) && !isArrayOf,

                $header = jQuery( $element ).filter(":header"), // WORK HERE
                isHeader = Boolean( $header.length ) && !isArrayOf,

                $selectionButton = jQuery( '[type=checkbox],[type=radio]', $element ),
                isSelectionButton = Boolean( $selectionButton.length ) && !isArrayOf,

                $inputGroup = $formControl.parents( '.input-group' ),
                isInputGroup = Boolean( $inputGroup.length ) && !isArrayOf,

                select2Binding = Y.Array.find( bindingsMap, function( item ) {
                    return Y.Object.owns( item.accessors, 'select2' );
                } ),
                $select2 = jQuery( Boolean( select2Binding ) ? select2Binding.node : undefined ),
                isSelect2 = Boolean( $select2.length ) && !isArrayOf,

                data = {
                    type: type,
                    field: field,
                    toggle: toggle,
                    messages: messages,
                    bindings: bindingsMap,

                    $element: $element,
                    isArrayOf: isArrayOf, // currently unsupported

                    isFormControl: isFormControl,
                    $formControl: $formControl,

                    isHeader: isHeader,
                    $header: $header,

                    isSelectionButton: isSelectionButton,
                    $selectionButton: $selectionButton,

                    isInputGroup: isInputGroup,
                    $inputGroup: $inputGroup,

                    isSelect2: isSelect2,
                    $select2: $select2
                },
                $elements = popovers.$elements,
                updateInitialized = false;

            /**
             * make involved elements available
             * @see ko.extenders.hasFeedback
             * @see http://stackoverflow.com/questions/9465200/get-element-an-observable-is-bound-to-with-knockout
             */
            field.extend( { hasFeedback: element } );

            if( isArrayOf ) {
                data.$iconContainer = $element;
            }
            else if( isFormControl ) {
                data.$iconContainer = $formControl.parent();
            }
            else if( isHeader ) {
                data.$iconContainer = $header;
            }
            else if( isSelectionButton ) {
                data.$iconContainer = $selectionButton.parent().last();
            }
            else if( isSelect2 ) {
                data.$iconContainer = $select2.parent();
            }

            data.$iconWrapper = $( createIconMarkup( { inputGroupAddon: isInputGroup, isHeader: isHeader } ) );
            if( isInputGroup ) {
                data.$icon = data.$iconWrapper.find( '.glyphicon' );
            }
            else {
                data.$icon = data.$iconWrapper;
            }
            data.$icon.addClass( hasFeedbackIconClass );

            $element.data( 'hasFeedback', data );

            // register to type updates
            ko.computed( function() {
                // update on these changes
                type();
                // do not update on binding init
                if( !updateInitialized ) {
                    updateInitialized = true;
                } else {
                    hasFeedback.update( element, valueAccessor, allBindings, viewModel, bindingContext );
                }
            }, null, { disposeWhenNodeIsRemoved: element } );

            if( Y.Lang.isUndefined( field.i18n ) ) {
                // TODO: move schema mixing?
                Y.log( '[hasFeedback] missing i18n for: ' + [ String( (field.propertyName ? field.propertyName : field._arrayOf) ), '>', $element.attr( 'data-bind' ) ].join( ' ' ), 'warn', NAME );
            }

            data.$icon.on( 'click.hasFeedback.binding', function( $event ) {
                $event.preventDefault();
                if( !$element.data( 'bs.popover' ) ) {
                    popovers.clear();
                    $element.popover( Y.merge( config.popover, {
                        content: function() {
                            var contents = Y.Array.map( ko.unwrap( messages ), function( message ) {
                                    //TODO: "label for"-handling?
                                    return Y.Lang.sub( message, { PATH: field.i18n } );
                                } ),
                                markup = Y.Array.map( contents, function( content ) {
                                    return '<p class="hasFeedback-popover-message">' + content + '</p>';
                                } );
                            return markup.join( '' );
                        },
                        //container:'body',
                        template: createPopoverMarkup( { type: type() } )
                    } ) );
                    $elements.push( $element );
                    $element.popover( 'show' );
                } else {
                    $element.popover( 'toggle' );
                }
            } );

            /*console.warn( 'hasFeedback', field.i18n, {
             type: type,
             'i18n': field['i18n'],
             field: field,
             messages: messages,
             toggle: toggle,
             data: data
             } );*/

            ko.utils.domNodeDisposal.addDisposeCallback( element, function hasFeedbackDisposeCallback() {
                data.$icon.off( 'click.hasFeedback.binding' );
            } );

        }

        function hasFeedbackUpdate( element/*, valueAccessor, allBindings, viewModel, bindingContext*/ ) {
            var
                $element = jQuery( element ),
                data = $element.data( 'hasFeedback' ) || {};

            // update the bootstrap feedback classes
            ko.bindingHandlers.css.update( element, function() {
                var classNames = {};
                Y.each( bsFeedbackClasses, function( cls ) {
                    classNames[ cls ] = false;
                } );
                classNames[ bsFeedbackClasses[ data.type() ] ] = data.toggle;
                return classNames;
            } );

            // handle icon if available
            if( data.$iconContainer && data.$icon && !data.isArrayOf ) {

                Y.doccirrus.jQueryUtils.removeClassBeginsWith( data.$icon, 'glyphicon-' )
                // handle icon class by type
                    .addClass( bsIconClasses[ data.type() ] );

                popovers.clear();

                // just hiding would be nicer, but is restricted as of bootstrap doesn't care for hidden elements
                if( ko.unwrap( data.toggle ) ) {
                    data.$iconWrapper.appendTo( data.$iconContainer );
                    data.$iconContainer.addClass( hasFeedbackContainerClass );
                    $element.addClass( [
                        hasFeedbackClass,
                        bsFeedbackClass
                    ].join( ' ' ) );
                } else {
                    data.$iconWrapper.detach();
                    data.$iconContainer.removeClass( hasFeedbackContainerClass );
                    $element.removeClass( [
                        hasFeedbackClass,
                        bsFeedbackClass
                    ].join( ' ' ) );
                }

            }
        }

        // create the bindingHandler
        hasFeedback = bindingHandlers.hasFeedback = {
            after: [ 'foreach' ],
            init: hasFeedbackInit,
            update: hasFeedbackUpdate
        };

        return hasFeedback;

    })( ko.bindingHandlers );

    /**
     * Knockout error highlighting binder. Just wraps Knockout's css binder.
     * Sets error class on if the value's hasError observable gets true.
     */
    ko.bindingHandlers.highlightError = {
        /**
         * @see ko.extenders.highlightError
         * @see http://stackoverflow.com/questions/9465200/get-element-an-observable-is-bound-to-with-knockout
         */
        init: function( element, valueAccessor ) {
            valueAccessor().extend( { highlightError: element } );
        },
        update: function( element, valueAccessor ) {
            ko.bindingHandlers.css.update( element, function() {
                return { 'has-error': valueAccessor().hasError };
            } );
        }
    };
    /**
     * corresponding extender to get used elements
     * @param target
     * @param element
     * @see http://stackoverflow.com/questions/9465200/get-element-an-observable-is-bound-to-with-knockout
     */
    ko.extenders.highlightError = function( target, element ) {
        target.highlightError = target.highlightError || [];
        target.highlightError.push( element );
    };

    /**
     * textareaRows bindingHandler
     *
     * Sync number of rows of a textarea to provided options
     *
     * @param {Object} config configuration object
     * @param {ko.observable|Number|Null} [config.value=3] if "value" is given will precede "from", if neither is given will default to 3
     * @param {ko.observable|String|Null} [config.from] extract the number of lines split by "delimiter" and use that as "value"
     * @param {ko.observable|String} [config.delimiter=\n] delimiter to split lines of "from" by
     * @param {ko.observable|Number|Null} [config.minRows] number of minimum rows to preserve
     * @param {ko.observable|Number|Null} [config.maxRows] number of maximum rows to preserve
     */
    ko.bindingHandlers.textareaRows = {
        update: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                $element = jQuery( element ),
                options = Y.merge( {
                    minRows: null,
                    maxRows: null,
                    from: null,
                    delimiter: "\n",
                    value: null
                }, ko.toJS( valueAccessor() ) ),
                minRows = options.minRows,
                maxRows = options.maxRows,
                from = options.from,
                value = options.value;

            if( !$element.data( 'binding-textareaRows' ) ) {

                if( null === minRows && $element.attr( 'rows' ) ) {
                    minRows = parseInt( $element.attr( 'rows' ), 10 );
                    options.minRows = minRows;
                }

                $element.data( 'binding-textareaRows', {
                    initial: Y.clone( options, true )
                } );

                // disposal
                ko.utils.domNodeDisposal.addDisposeCallback( element, function collapseDisposeCallback() {
                    $element.data( 'binding-textareaRows', null );
                } );

            }

            if( null === value ) {
                if( null === from ) {
                    value = 3;
                }
                else {
                    value = String( from ).split( options.delimiter ).length;
                }
            }

            value = parseInt( value, 10 );

            if( null !== minRows && value < minRows ) {
                value = minRows;
            }

            if( null !== maxRows && value > maxRows ) {
                value = maxRows;
            }

            $element.attr( 'rows', value );

        }
    };

    /**
     * overwriting ko native enable binding in order to get it working with no input elements to ( i.e <a> )
     * @param {Object} valueAccessor
     */
    ko.bindingHandlers.enable = {
        'update': function( element, valueAccessor ) {
            var value = ko.utils.unwrapObservable( valueAccessor() );
            if( value && element.disabled ) {
                element.removeAttribute( "disabled" );
                element.disabled = false;
            } else if( (!value) && (!element.disabled) ) {
                element.setAttribute( "disabled", "disabled" );
                element.disabled = true;
            }
        }
    };

    /**
     * focusOnRemove bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.parent A css-selector to use for finding a parent element from which the 'find'-parameter is used
     * @param {ko.observable|String} config.find A css-selector that is used from the parent-element to focus the find-element
     */
        // we need this stuff because the binding could be removed multiple times at once, and then there are problems deciding what to focus
        // this approach waits a short time and then looks which elements are still in the document, and haven't been removed … that element will receive focus
    var
        focusOnRemoveBuffer = [],
        focusOnRemoveTimeoutInstance = null,
        focusOnRemove = function( item ) {
            focusOnRemoveBuffer.push( item );
            clearTimeout( focusOnRemoveTimeoutInstance );
            focusOnRemoveTimeoutInstance = setTimeout( function() {
                Y.each( focusOnRemoveBuffer, function( $el ) {
                    if( jQuery.contains( document, $el.get( 0 ) ) ) {
                        $el.focus();
                        return false;
                    }
                } );
                focusOnRemoveBuffer.splice( 0 );
            }, 10 );
        };
    ko.bindingHandlers.focusOnRemove = {
        init: function( element, valueAccessor ) {
            var
                options = ko.toJS( valueAccessor() ),
                $el = jQuery( element ),
                $find;

            if( !options.parent ) {
                Y.log( 'focusOnRemove: invalid parent property', 'error', NAME );
            }

            if( !options.find ) {
                Y.log( 'focusOnRemove: invalid find property', 'error', NAME );
            }

            ko.utils.domNodeDisposal.addDisposeCallback( element, function focusOnRemoveDisposeCallback() {
                $find = $el.parents( options.parent ).first().find( options.find ).first();
                if( $find.length ) {
                    focusOnRemove( $find );
                }
                $el = null;
            } );

        }
    };

    /**
     * ko tooltip bindingHandler
     * - adds tooltip to element
     * - uses tooltip.js
     *
     * Default placement is bottom and trigger - hover
     * @type {object}
     * @example
     * <pre>input(data-bind="tooltip: {title: 'test tooltip'}")</pre>
     * @example
     * <pre>input(data-bind="tooltip: {title: 'test tooltip', placement: 'top', trigger:'focus'}")</pre>
     * @example
     * <pre>span(data-bind="tooltip: {title: 'test tooltip', placement: 'right', trigger:'click'}") Some text</pre>
     */
    ko.bindingHandlers.tooltip = {
        init: function( element, valueAccessor ) {
            var value = ko.unwrap( valueAccessor() ),
                options = {};

            ko.utils.extend( options, ko.bindingHandlers.tooltip.options );
            ko.utils.extend( options, value );
            $( element ).tooltip( options );

            ko.utils.domNodeDisposal.addDisposeCallback( element, function tooltipDisposeCallback() {
                $( element ).tooltip( "destroy" );
            } );
        },
        options: {
            placement: "bottom",
            trigger: "hover"
        }
    };

    /**
     * ko caretPosition bindingHandler
     * - store last caret position
     * - if property 'setPosition' is not defined, binder will create it.
     *
     * @type {object}
     * @example
     * <pre>input(data-bind="caretPosition: foo}")</pre>
     */
    ko.bindingHandlers.caretPosition = {
        init: function( element, valueAccessor ) {
            var value = valueAccessor(),
                range;

            if ( !value ) {
                Y.log( 'KO binding handler for docTree / Textbausteine was not properly disposed.', 'warn', NAME );
                return;
            }

            function setCurrentPosition( newStart ) {
                value.current( newStart );
            }

            function setCurrentExtent( newExtent ) {
                if ( value.extent ) {
                    value.extent( newExtent );
                }
            }

            function getCaretPosition( input ) {
                var selStart = 0,                   //  offset where cursor is or selection begins
                    selExtent = 0,                  //  length of selection
                    selection;
                // IE Support
                if( document.selection ) {
                    input.focus();
                    selection = document.selection.createRange();
                    selection.moveStart( 'character', -input.value.length );
                    selStart = selection.text.length;
                } else if( input.selectionStart || input.selectionStart === '0' ) {
                    selStart = input.selectionStart;
                    selExtent = ( input.selectionEnd - input.selectionStart );
                }

                return [ (selStart), (selExtent) ];
            }

            if( !value.setPositionAndFocus ) {
                value.setPositionAndFocus = function( position ) {
                    var caretPosition = position || ko.utils.peekObservable( value.current() );
                    if( element.createTextRange ) {
                        range = element.createTextRange();
                        range.move( 'character', caretPosition );
                        range.select();
                    }
                    else {
                        if( element.setSelectionRange || element.selectionStart ) {
                            element.focus();
                            element.setSelectionRange( caretPosition, caretPosition );
                        }
                        else {
                            element.focus();
                        }
                    }
                    value.current( caretPosition );
                };
            }

            setCurrentPosition( element.value.length, 0 );
            jQuery( element ).on( 'keyup.caretPosition.binding', function( event ) {
                checkPositionEvt( event );
            } );

            jQuery( element ).on( 'click.caretPosition.binding', function( event ) {
                checkPositionEvt( event );
            } );

            jQuery( element ).on( 'select.caretPosition.binding', function( event ) {
                checkPositionEvt( event );
            } );

            function checkPositionEvt( event ) {
                var caretPos = getCaretPosition( event.target );
                setCurrentPosition( caretPos[0] );
                setCurrentExtent( caretPos[1] );
            }

            ko.utils.domNodeDisposal.addDisposeCallback( element, function caretPositionDisposeCallback() {
                jQuery( element ).off( 'keyup.caretPosition.binding' );
                jQuery( element ).off( 'click.caretPosition.binding' );
            } );
        }
    };

    /**
     * minicolors bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.value the value/observable to use for read/write
     * @param {ko.observable|Object} [config.config] minicolors config (see: http://labs.abeautifulsite.net/jquery-minicolors/)
     */
    ko.bindingHandlers.minicolors = {
        init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor() || { config: {} },
                config = bindingOptions.config,
                $element = jQuery( element );

            if( !jQuery.fn.minicolors ) {
                Y.log( '(minicolors) jQuery minicolors not available', 'error', NAME );
                return;
            }

            config = Y.aggregate( {
                change: function( hex/*, opacity*/ ) {
                    if( !hex ) {
                        // because of weird change handling
                        return;
                    }
                    if( ko.isObservable( bindingOptions.value ) ) {
                        bindingOptions.value( hex );
                    }
                    else {
                        bindingOptions.value = hex;
                    }
                }
            }, ko.toJS( config ), true );

            //  placeholders, initializing without a color can cause failure in current version
            if( !config.defaultValue ) {
                config.defaultValue = '#ff0000';
            }
            if( !config.value ) {
                config.value = '#000000';
            }

            $element.minicolors( config );

            ko.computed( function() {
                var
                    value = ko.unwrap( bindingOptions.value ) || '';

                $element.minicolors( 'value', value );

            }, null, { disposeWhenNodeIsRemoved: element } );

            // handle minicolors weird change handling
            $element.on( 'input.minicolors.binding blur.minicolors.binding', function() {
                if( !$element.val() ) {
                    if( ko.isObservable( bindingOptions.value ) ) {
                        bindingOptions.value( '' );
                    }
                    else {
                        bindingOptions.value = '';
                    }
                }
            } );

            // disposal
            ko.utils.domNodeDisposal.addDisposeCallback( element, function minicolorsDisposeCallback() {
                $element.minicolors( 'destroy' );
                $element.off( 'input.minicolors.binding blur.minicolors.binding' );
            } );

        }
    };

    /**
     * collapse bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.expanded the value/observable to use for read/write expanded state
     * @param {ko.observable|Boolean} config.disabled disable toggling by toggler
     * @param {String} config.toggler the selector to use to find the elements down from the bound element that will trigger toggling
     * @param {String} config.toggles the selector to use to find the element down from the bound element that will be toggled
     * @param {ko.observable|Object} [config.config] collapse config (see: http://getbootstrap.com/javascript/#collapse)
     * @beta
     */
    ko.bindingHandlers.collapse = {
        init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor() || { config: {} },
                config = bindingOptions.config,
                $element = jQuery( element ),
                $toggler, $toggles;

            if( !jQuery.fn.collapse ) {
                Y.log( '(collapse) jQuery collapse not available', 'error', NAME );
                return;
            }

            config = Y.aggregate( {
                toggle: false
            }, ko.toJS( config ), true );

            if( Y.Lang.isString( bindingOptions.toggles ) ) {
                $toggles = jQuery( bindingOptions.toggles, $element );
            }
            if( Y.Lang.isString( bindingOptions.toggler ) ) {
                $toggler = jQuery( bindingOptions.toggler, $element );
            }

            $toggles.collapse( config );

            $toggler.on( 'click.collapse-binding', function() {
                if( !ko.unwrap( bindingOptions.disabled ) ) {
                    $toggles.collapse( 'toggle' );
                }
            } );

            if( 'expanded' in bindingOptions ) {

                $toggles.on( 'show.bs.collapse.collapse-binding hide.bs.collapse.collapse-binding', function( $event ) {
                    var
                        expanded = Boolean( 'show' === $event.type );

                    if( ko.isObservable( bindingOptions.expanded ) ) {
                        bindingOptions.expanded( expanded );
                    }
                    else {
                        bindingOptions.expanded = expanded;
                    }
                    $event.stopPropagation();
                } );

                ko.computed( function() {
                    if( ko.unwrap( bindingOptions.expanded ) ) {
                        $toggles.collapse( 'show' );
                    }
                    else {
                        $toggles.collapse( 'hide' );
                    }
                }, null, { disposeWhenNodeIsRemoved: element } );

            }

            // disposal
            ko.utils.domNodeDisposal.addDisposeCallback( element, function collapseDisposeCallback() {
                $toggler.off( 'click.collapse-binding' );
                $toggles.off( 'show.bs.collapse.collapse-binding hide.bs.collapse.collapse-binding' );
            } );

        }
    };

    /**
     * panelCollapse bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.name associate a name with
     * @param {ko.observable|Boolean} [config.initialCollapsed=false] initially collapsed
     * @param {ko.observable|Boolean} [config.isToggle=false] The data bind is on the toggle which markup is already present
     * @beta
     */
    ko.bindingHandlers.panelCollapse = {
        init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor() || { config: {} },
                name = unwrap( bindingOptions.name ),
                isToggle = Boolean( unwrap( bindingOptions.isToggle ) ),
                initialCollapsed = Boolean( unwrap( bindingOptions.initialCollapsed ) ),
                $element = jQuery( element ),
                $group, $body, $heading, $toggler, $collapse,
                isGroup, collapsed, localSetting;

            if( !jQuery.fn.collapse ) {
                Y.log( '(collapse) jQuery collapse not available', 'error', NAME );
                return;
            }

            if( isToggle ) {
                $toggler = $element;
                $element = $element.parents( '.panel' ).first();
            }

            localSetting = Y.doccirrus.utils.localValueGet( 'widget_' + name );

            $group = $element.parent( '.panel-group' );
            isGroup = Boolean( $group.length );
            $body = $element.children( '.panel-body' ).first();
            $collapse = $element.children( '.panel-collapse' ).first();
            $heading = $element.children( '.panel-heading' ).first();

            if( !($heading.length && ($body.length || $collapse.length)) ) {
                Y.log( '(panelCollapse) panel-collapse/panel-body/panel-heading not found', 'error', NAME );
                return;
            }

            if( !$collapse.length ) {
                $collapse = $body.wrap( '<div class="panel-collapse collapse in"></div>' ).parent();
            }

            if( !$collapse.hasClass( 'collapse' ) ) {
                $collapse.addClass( 'collapse' );
            }

            if( $collapse.hasClass( 'in' ) ) {
                initialCollapsed = false;
            }
            else {
                if( !('initialCollapsed' in bindingOptions) ) {
                    initialCollapsed = true;
                }
            }

            if( '' === localSetting ) {
                collapsed = initialCollapsed;
            }
            else {
                collapsed = JSON.parse( localSetting );
                collapsed = Boolean( collapsed && collapsed.minimized );
            }

            if( collapsed ) {
                $collapse.removeClass( 'in' );
            }
            else {
                $collapse.collapse('show');
            }

            if( !isGroup ) {
                if( !$toggler ) {
                    $toggler = $heading
                        .append( '<span class="pull-right"><a data-toggle="collapse" tabindex="-1" style="cursor: pointer"><i class="fa fa-chevron-down dc-panel-toggle"></i></a></span>' )
                        .find( '[data-toggle=collapse]' );
                }

                $toggler.on( 'click.panelCollapse-binding', function() {
                    $collapse.collapse( 'toggle' );
                } );

                $collapse.on( 'show.bs.collapse.panelCollapse-binding hide.bs.collapse.panelCollapse-binding', function( $event ) {
                    var
                        data = Object.assign(JSON.parse( localSetting || '{}' ), { minimized: 'show' !== $event.type });

                    Y.doccirrus.utils.localValueSet( 'widget_' + name, JSON.stringify( data ) );
                } );

                // disposal
                ko.utils.domNodeDisposal.addDisposeCallback( element, function collapseDisposeCallback() {
                    $toggler.off( 'click.panelCollapse-binding' );
                    $collapse.off( 'show.bs.collapse.panelCollapse-binding hide.bs.collapse.panelCollapse-binding' );
                } );
            }
            else {
                /** NOTE: Group currently doesn't persist toggle state **/

                // ensure ids on elements
                Y.DOM.generateID( $group[ 0 ] );
                Y.DOM.generateID( $collapse[ 0 ] );

                if( !$toggler ) {
                    $toggler = $heading
                        .append( '<span class="pull-right"><a data-toggle="collapse" data-parent="#' + $group.attr( 'id' ) + '" href="#' + $collapse.attr( 'id' ) + '" tabindex="-1" style="cursor: pointer"><i class="fa fa-chevron-down dc-panel-toggle"></i></a></span>' )
                        .find( '[data-toggle=collapse]' );
                }

            }

        }
    };

    /**
     * sideBar bindingHandler
     *
     * @param {Object} config configuration object
     * @param {ko.observable|String} config.name associate a name with
     * @param {ko.observable|String} config.side associate a side with [left, right]
     * @param {ko.observable|String} config.panelHeading set a heading text for the panel
     * @param {ko.observable|Function} config.onPin a method to invoke on pin status change
     * @param {ko.observable|Function} config.onInit a method to invoke on init of SideBar
     * @param {ko.observable|Function} config.onDestroy a method to invoke on destroy of SideBar
     * @param {ko.observable|Boolean} [config.initialPinned=false] if SideBar should be initially pinned
     * @param {ko.observable|String} [config.gestureProtected=null] protect certain elements from gesture-event invocation (comma separated string of css-selectors)
     * @beta
     */
    (function() {
        var
            sideBarManager = [];

        /**
         * Adds a SideBar to manager
         * @param {SideBar} sideBar
         */
        sideBarManager.add = function( sideBar ) {
            sideBarManager.push( sideBar );
        };
        /**
         * Removes a SideBar from manager
         * @param {SideBar} sideBar
         */
        sideBarManager.remove = function( sideBar ) {
            var
                i = sideBarManager.indexOf( sideBar );

            if( i > -1 ) {
                sideBarManager.splice( i, 1 );
            }
        };
        /**
         * Returns other SideBars in manager except the given
         * @param {SideBar} sideBar
         * @returns {Array}
         */
        sideBarManager.othersThan = function( sideBar ) {
            return sideBarManager.filter( function( item ) {
                return item !== sideBar;
            } );
        };

        /**
         * @extends Y.Base
         * @constructor
         */
        function SideBar() {
            SideBar.superclass.constructor.apply( this, arguments );
        }

        Y.extend( SideBar, Y.Base, {
            side: null,
            name: null,
            onPin: null,
            $element: null,
            $container: null,
            $panel: null,
            $panelBody: null,
            $pin: null,
            $close: null,
            $toggle: null,
            initialPinned: null,
            isTouch: Y.UA.touchEnabled,
            gestureProtectedDefault: 'a, input, textarea, select, button',
            gestureProtected: null,
            /** @private */
            initializer: function() {
                var
                    self = this,
                    element = self.get( 'element' ),
                    valueAccessor = self.get( 'valueAccessor' ),

                    bindingOptions = valueAccessor() || {},
                    side = peek( bindingOptions.side ),
                    name = peek( bindingOptions.name ),
                    panelHeading = peek( bindingOptions.panelHeading ),
                    onPin = bindingOptions.onPin,
                    onInit = bindingOptions.onInit,
                    onDestroy = bindingOptions.onDestroy,
                    initialPinned = Boolean( peek( bindingOptions.initialPinned ) ),
                    gestureProtected = peek( bindingOptions.gestureProtected ) || SideBar.prototype.gestureProtected,

                    $element = jQuery( element ),
                    $contents = $element.contents(),

                    toggleMarkup, $toggle,
                    containerMarkup, $container,
                    panelMarkup, $panel, $panelBody,
                    $pin, $close,
                    icon,
                    textSide = 'text-right';

                self.getManager().add( self );

                if( -1 === [ 'left', 'right' ].indexOf( side ) ) {
                    throw new Error( 'bindingHandlers.sideBar: invalid side' );
                }

                if( 'left' === side ) {
                    icon = 'fa-chevron-right';
                    textSide = 'text-left';
                } else if( 'right' === side ) {
                    icon = 'fa-chevron-left';
                }

                toggleMarkup = Y.Lang.sub( '<div style="width: 22px; height: 40px; padding-top: 10px" class="dc-SideBar-toggle dc-SideBar-toggle-{side} {textSide}"><span class="fa {icon}"></span></div>', {
                    side: side,
                    icon: icon,
                    textSide: textSide
                } );

                panelMarkup = Y.Lang.sub( [
                    '<div class="dc-SideBar-panel panel panel-default">',
                    '<div class="panel-heading"><span>{panelHeading}</span><span class="dc-SideBar-controls pull-right"><a name="SideBar-pin" href="javascript:;" tabindex="-1"><span class="fa fa-thumb-tack"></span></a><a name="SideBar-close" href="javascript:;" tabindex="-1"><span class="fa fa-close"></span></a></span></div>',
                    '<div class="panel-body"></div>',
                    '</div>'
                ].join( '' ), {
                    panelHeading: panelHeading
                } );

                containerMarkup = Y.Lang.sub( '<div class="dc-SideBar-container dc-SideBar-container-{side}"></div>', {
                    side: side
                } );

                $container = jQuery( containerMarkup );
                $panel = jQuery( panelMarkup ).appendTo( $container );
                $pin = $panel.find( '[name="SideBar-pin"]' );
                $close = $panel.find( '[name="SideBar-close"]' );
                $panelBody = $panel.find( '.panel-body' );
                $contents.appendTo( $panelBody );
                $container.appendTo( $element );
                $toggle = jQuery( toggleMarkup ).appendTo( $element );

                self.side = side;
                self.name = name;
                self.onPin = onPin;
                self.onDestroy = onDestroy;
                self.$element = $element;
                self.$container = $container;
                self.$panel = $panel;
                self.$panelBody = $panelBody;
                self.$pin = $pin;
                self.$close = $close;
                self.$toggle = $toggle;
                self.initialPinned = initialPinned;
                self.gestureProtected = gestureProtected;
                self.isVisible = ko.observable( false );

                element.style.display = null;

                if( Y.Lang.isFunction( onInit ) ) {
                    onInit( self );
                }

                self.attachEvents();
                self.initPinned();

                // disposal
                ko.utils.domNodeDisposal.addDisposeCallback( element, function sideBarDisposeCallback() {
                    self.destroy();
                } );
            },
            /** @private */
            destructor: function() {
                var self = this;

                self.getManager().remove( self );
                self.detachEvents();
                if( Y.Lang.isFunction( self.onDestroy ) ) {
                    self.onDestroy( self );
                }
            },
            getManager: function() {
                return sideBarManager;
            },
            events: null,
            attachEvents: function() {
                var self = this,
                    side = self.side,
                    MIN_SWIPE_X = 20,
                    MAX_SWIPE_Y = 20,
                    capturedNode = Y.one( 'doc' ),
                    swipeStartX = null,
                    swipeStartY = null,
                    gestureProtected = [];

                if( self.gestureProtectedDefault ) {
                    gestureProtected.push.apply( gestureProtected, self.gestureProtectedDefault.split( /\s*,\s*/ ) );
                }

                if( self.gestureProtected ) {
                    gestureProtected.push.apply( gestureProtected, self.gestureProtected.split( /\s*,\s*/ ) );
                }

                if( self.isTouch ) {

                    self._capturedNode_gesturemovestart = capturedNode.on( 'gesturemovestart', function( e ) {
                        var
                            target = e.target;

                        // prevent gesture on these areas
                        if( target.ancestor( gestureProtected.join( ', ' ), true ) ) {
                            swipeStartX = null;
                            swipeStartY = null;
                        }
                        else {
                            swipeStartX = e.pageX;
                            swipeStartY = e.clientY;
                        }

                    } );

                    self._capturedNode_gesturemoveend = capturedNode.on( 'gesturemoveend', function( e ) {
                        if( null === swipeStartX && null === swipeStartY ) {
                            return;
                        }
                        var swipeEndX = e.pageX,
                            swipeEndY = e.clientY,
                            isSwipeLeft = (swipeStartX - swipeEndX) > MIN_SWIPE_X,
                            isSwipeRight = (swipeEndX - swipeStartX) > MIN_SWIPE_X,
                            isBelowMovementY = Math.abs( swipeStartY - swipeEndY ) <= MAX_SWIPE_Y,
                            otherSidebars = self.getManager().othersThan( self );

                        if( !isBelowMovementY ) {
                            return;
                        }

                        if( otherSidebars.some( function( other ) {
                                return other.open;
                            } ) ) {
                            return;
                        }

                        if( 'left' === side ) {
                            if( isSwipeLeft ) {
                                self.hideSideBar();
                            }
                            if( isSwipeRight ) {
                                self.showSideBar();
                            }
                        }
                        else {
                            if( isSwipeLeft ) {
                                self.showSideBar();
                            }
                            if( isSwipeRight ) {
                                self.hideSideBar();
                            }
                        }

                    }, { standAlone: true } );

                }

                self.$toggle.on( 'click.SideBar', function() {
                    self.showSideBar();
                } );
                self.$close.on( 'click.SideBar', function() {
                    self.hideSideBar();
                } );
                self.$pin.on( 'click.SideBar', function() {
                    self.togglePinned();
                } );

            },
            detachEvents: function() {
                var self = this;

                self.detachOutsideEvents();
                if( self._capturedNode_gesturemoveend ) {
                    self._capturedNode_gesturemoveend.detach();
                }
                if( self._capturedNode_gesturemovestart ) {
                    self._capturedNode_gesturemovestart.detach();
                }

                self.$toggle.off( 'click.SideBar' );
                self.$close.off( 'click.SideBar' );
                self.$pin.off( 'click.SideBar' );
            },
            attachOutsideEvents: function() {
                var self = this,
                    yContainer = Y.one( self.$container[ 0 ] ),
                    hideOutside = function() {
                        self.hideSideBar( true );
                    };

                self.events = {};
                self.events.mousedownoutside = yContainer.on( 'mousedownoutside', hideOutside );
                self.events.keydownoutside = yContainer.on( 'keydownoutside', hideOutside );
                self.events.focusoutside = yContainer.on( 'focusoutside', hideOutside );

                self.$container.on( 'click.SideBar', function( event ) {
                    if( jQuery( event.target ).is( self.$container ) ) {
                        hideOutside();
                    }
                } );
            },
            detachOutsideEvents: function() {
                var self = this;

                if( self.events ) {
                    Y.each( self.events, function( event, key ) {
                        if( event ) {
                            event.detach();
                            self.events[ key ] = null;
                        }
                    } );
                }
                self.$container.off( 'click.SideBar' );
            },
            pinned: null,
            initPinned: function() {
                var self = this,
                    localSetting = Y.doccirrus.utils.localValueGet( 'widget_' + self.name );

                if( localSetting ) {
                    localSetting = JSON.parse( localSetting );
                    self.setPinned( localSetting.pinned );
                }
                else {
                    self.setPinned( self.initialPinned );
                }
            },
            setPinned: function( pinned, omitLocalStorage ) {
                var self = this;

                self.pinned = pinned;
                self.$container.css( self.side, '' );
                if( pinned ) {
                    self.$pin.css( 'color', 'red' );
                    self.isVisible( true );
                    self.$toggle.hide();
                    self.$container.show();
                    self.open = true;
                    self.$container.css( 'height', window.innerHeight - 130 );
                    self.$container.addClass( 'dc-SideBar-container-pinned fullPageHeight' ).removeClass( 'dc-SideBar-container-unpinned' );
                    self.detachOutsideEvents();
                }
                else {
                    self.$pin.css( 'color', 'green' );
                    self.isVisible( false );
                    self.$toggle.show();
                    self.$container.hide();
                    self.open = false;
                    self.$container.addClass( 'dc-SideBar-container-unpinned' ).removeClass( 'dc-SideBar-container-pinned fullPageHeight' );
                    self.attachOutsideEvents();
                }
                if( !omitLocalStorage ) {
                    Y.doccirrus.utils.localValueSet( 'widget_' + self.name, JSON.stringify( {pinned: pinned} ) );
                }
                if( Y.Lang.isFunction( self.onPin ) ) {
                    self.onPin( pinned, self );
                }
            },
            togglePinned: function() {
                var self = this;

                self.setPinned( !self.pinned );
            },
            animate: null,
            open: false,
            showSideBar: function() {
                var self = this,
                    width, animation;

                if( self.pinned || self.animate || self.open ) {
                    return false;
                }

                self.$toggle.hide();
                self.$container.show();
                self.isVisible( true );
                width = self.$container.outerWidth();
                self.$container.css( self.side, -1 * width );
                animation = {};

                animation[ self.side ] = 0;

                self.animate = self.$container.animate( animation, {
                    complete: function() {
                        self.animate = null;
                        self.open = true;
                    }
                } );

                return true;
            },
            hideSideBar: function( immediately ) {
                var self = this,
                    complete = function() {
                        self.animate = null;
                        self.open = false;
                        self.isVisible( false );
                        self.$container.hide();
                        self.$toggle.show();
                    },
                    animation;

                if( self.pinned || !self.open ) {
                    return false;
                }

                if( immediately ) {
                    if( self.animate ) {
                        self.animate.stop( true );
                    }
                    complete();
                    return true;
                }

                if( self.animate ) {
                    return false;
                }

                animation = {};

                animation[ self.side ] = -1 * self.$container.outerWidth();

                self.animate = self.$container.animate( animation, {
                    complete: complete
                } );

                return true;
            },
            toggleSideBar: function() {
                var self = this;

                if( self.open ) {
                    self.hideSideBar();
                }
                else {
                    self.showSideBar();
                }
            }
        }, {
            ATTRS: {
                element: {
                    value: null
                },
                valueAccessor: {
                    value: null
                }
            },
            create: function( element, valueAccessor ) {
                return new SideBar( {
                    element: element,
                    valueAccessor: valueAccessor
                } );
            }
        } );

        ko.bindingHandlers.sideBar = {
            init: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
                var
                    sideBar = SideBar.create( element, valueAccessor );

                function resizeContainer() {
                    sideBar.$container.css( 'height', window.innerHeight - 130 );
                }

                jQuery( window ).on( 'resize', resizeContainer );
                ko.utils.domNodeDisposal.addDisposeCallback( element, function() {
                    jQuery( window ).off( 'resize', resizeContainer );
                } );
            }
        };
    })();

    /**
     * fullCalendar bindingHandler
     *
     * - to be able to get the fullCalendar instance, a "getInstance"-method is written inside the main configuration property
     *
     * @param {Object} config configuration object
     * @param {ko.observable|Object} [config.config] fullCalendar config (see: http://fullcalendar.io/docs/)
     * @param {ko.observableArray} [config.eventSources] if observable fullCalendar "eventSources" config,
     *                   should have ko.bindingHandlers.fullCalendar.EventSource instances or extended of those as items
     * @param {Function} [config.bgeventMouseMove] "mousemove"-callback for "background"-events
     * @param {Boolean} [config.goToWeekOnWeekNumberClick=true] go to 'agendaWeek'-view with the pressed week-number from 'month-view'
     * @param {Boolean} [config.goToDayOnDayNumberClick=true] go to 'agendaDay'-view with the pressed day-number from 'month-view'
     * @param {Function} [config.dayViewIsInResourceMode] returning boolean determining to show 'verticalResourceView', when 'changeView' to a day-like view is triggered
     * @param {Boolean|Object} [config.eventPopOver=true] display bootstrap Popover for an event
     * @param {Function} [config.eventPopOver.getTitle] return a Popover title for an event
     * @param {Function} [config.eventPopOver.getContent] return a Popover content for an event
     * @param {Function} [config.eventPopOver.getTitleCss] return a Popover title css object for an event
     */
    (function() {

        if( !jQuery.fn.fullCalendar ) {
            ko.bindingHandlers.fullCalendar = {
                init: function( /*element, valueAccessor, allBindings, viewModel, bindingContext*/ ) {

                    if( !jQuery.fn.fullCalendar ) {
                        Y.log( '(fullCalendar) jQuery fullCalendar not available', 'error', NAME );
                        return;
                    }
                }
            };
            return;
        }

        (function() {
            // workaround for "goToDayOnDayNumberClick" (fullCalendar@2.3.2):
            var
                setElementOrigProtoMethod = jQuery.fullCalendar.Grid.prototype.setElement;

            jQuery.fullCalendar.Grid.prototype.setElement = function setElement_goToDayOnDayNumberClick( el ) {
                var
                    self = this,
                    options = self.view.calendar.options;

                if( options.goToDayOnDayNumberClick ) {
                    // quote from fullCalendar author: "// jQuery will take care of unregistering them when removeElement gets called."
                    el.on( 'mousedown.goToDayOnDayNumberClick.fullCalendar.binding', '.fc-day-number', function( $event ) {
                        var
                            $currentTarget = jQuery( $event.currentTarget ),
                            $date = $currentTarget.data( 'date' );

                        if( $date ) {
                            $event.stopImmediatePropagation();

                            if( Y.Lang.isFunction( options.dayViewIsInResourceMode ) ) {
                                if( options.dayViewIsInResourceMode() ) {
                                    self.view.calendar.changeView( 'verticalResourceView' );
                                }
                                else {
                                    self.view.calendar.changeView( 'agendaDay' );
                                }
                            }
                            else {
                                self.view.calendar.changeView( 'agendaDay' );
                            }

                            self.view.calendar.gotoDate( $date );
                        }
                    } );
                }
                setElementOrigProtoMethod.apply( this, arguments );
            };
        })();

        /**
         * Abstract class for the "ko.bindingHandlers.fullCalendar" observable "eventSources" config option
         * @class EventSource
         * @constructor
         */
        function EventSource() {
            var
                self = this;

            self.initEventSource();
        }

        /**
         * @method initEventSource
         */
        EventSource.prototype.initEventSource = function() {
            var
                self = this;

            self.eventSource = {};
            self.eventSource.instanceOf = self.constructor;
            self.eventSource.className = 'EventSource';

        };

        /**
         * Initializes config option eventPopOver handling
         * @param {Object} parameters
         * @param {Object} parameters.eventPopOver
         * @param {HTMLElement} parameters.element
         */
        function initEventPopOver( parameters ) {
            var
                eventPopOver = parameters.eventPopOver,
                element = parameters.element,
                $element = jQuery( element ),
                currentEventSegment,
                $popOver = $( '<div style="display: none"></div>' )
                    .appendTo( 'body' )
                    .popover( {
                        title: 'title',
                        content: 'content',
                        trigger: 'manual',
                        html: true,
                        animation: false
                    } )
                    .data( 'bs.popover' );

            $popOver.getTitle = function() {
                var
                    title = '&nbsp;';

                if( currentEventSegment ) {
                    if( eventPopOver.getTitle ) {
                        title = eventPopOver.getTitle( currentEventSegment.event );
                        if( title ) {
                            return title;
                        }
                    }
                    title = currentEventSegment.event.start.format( 'H:mm' ) + ' - ' + currentEventSegment.event.end.format( 'H:mm' );
                }
                return title;
            };

            $popOver.getContent = function() {
                var
                    content = '&nbsp;';

                if( currentEventSegment ) {
                    if( eventPopOver.getContent ) {
                        content = eventPopOver.getContent( currentEventSegment.event );
                        if( content ) {
                            return content;
                        }
                    }
                    content = currentEventSegment.event.title;
                }
                return content;
            };

            $popOver.show = function() {
                this.constructor.prototype.show.apply( this, arguments );
                var
                    $tip = this.tip(),
                    $popoverTitle = $tip.find( '.popover-title' ),
                    css;

                this.$arrow.hide();
                $tip.removeClass( 'top bottom left right' );

                if( currentEventSegment && eventPopOver.getTitleCss ) {

                    $popoverTitle.css( {
                        color: null,
                        backgroundColor: null
                    } );
                    css = eventPopOver.getTitleCss( currentEventSegment.event );
                    if( css ) {
                        $popoverTitle.css( css );
                    }
                }

            };

            $popOver.updatePosition = function( $event ) {
                var
                    $tip = this.tip();

                $tip.css( {
                    top: $event.pageY + 10,
                    left: $event.pageX + 20
                } );
            };

            $element.on( 'mouseenter.eventPopOver.fullCalendar.binding', '.fc-event', function( $event ) {
                var
                    eventSegments = $element.fullCalendar( 'getView' ).getEventSegs();

                currentEventSegment = Y.Array.find( eventSegments, function( eventSegment ) {
                    return $event.currentTarget === eventSegment.el[ 0 ];
                } );

                if( currentEventSegment ) {
                    $popOver.show();
                    $popOver.updatePosition( $event );
                }
            } );

            $element.on( 'mouseleave.eventPopOver.fullCalendar.binding', '.fc-event', function() {
                $popOver.hide();
            } );

            $element.on( 'mousemove.eventPopOver.fullCalendar.binding', function( $event ) {
                $popOver.updatePosition( $event );
            } );

            // disposal
            ko.utils.domNodeDisposal.addDisposeCallback( element, function popOverDisposeCallback() {
                var
                    $boundEl = $popOver.$element;

                $element.off( 'mousemove.eventPopOver.fullCalendar.binding' );
                $element.off( 'mouseenter.eventPopOver.fullCalendar.binding' );
                $element.off( 'mouseleave.eventPopOver.fullCalendar.binding' );

                $popOver.destroy();
                $boundEl.remove();
            } );

        }

        ko.bindingHandlers.fullCalendar = {
            init: function( element/*, valueAccessor, allBindings, viewModel, bindingContext*/ ) {
                var
                    $element = jQuery( element );

                // disposal
                ko.utils.domNodeDisposal.addDisposeCallback( element, function fullCalendarDisposeCallback() {
                    $element.off( 'mousemove.fullCalendar.binding' );
                    $element.off( 'click.goToWeekOnWeekNumberClick.fullCalendar.binding' );
                    $element.off( 'mousedown.goToDayOnDayNumberClick.fullCalendar.binding' );
                    if( $element.data( 'fullCalendar' ) ) {
                        $element.fullCalendar( 'destroy' );
                    }
                } );

            },
            update: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
                var
                    bindingOptions = valueAccessor() || { config: {} },
                    config = bindingOptions.config,
                    eventSources = bindingOptions.eventSources,
                    bgeventMouseMove = bindingOptions.bgeventMouseMove,
                    goToWeekOnWeekNumberClick = Y.Lang.isUndefined( bindingOptions.goToWeekOnWeekNumberClick ) ? true : peek( bindingOptions.goToWeekOnWeekNumberClick ),
                    goToDayOnDayNumberClick = Y.Lang.isUndefined( bindingOptions.goToDayOnDayNumberClick ) ? true : peek( bindingOptions.goToDayOnDayNumberClick ),
                    eventPopOver = Y.Lang.isUndefined( bindingOptions.eventPopOver ) ? true : peek( bindingOptions.eventPopOver ),
                    $element = jQuery( element ),
                    instance = null;

                instance = $element.data( 'fullCalendar' );

                // ??: jQuery.fullCalendar.Calendar.defaults
                config = Y.aggregate( {
                    schedulerLicenseKey: '0249084691-fcs-1448374622',
                    lang: Y.doccirrus.i18n.language,
                    theme: false, // default: false
                    eventColor: '#757575', // default: "#3a87ad"
                    eventBorderColor: '#000000', // default: "#3a87ad"
                    timeFormat: 'H:mm', // default: "h:mm", for agendaWeek and agendaDay; "h(:mm)t", for all other views (The default value depends on the current lang)
                    allDayText: i18n( 'ko-bindingHandlers.fullCalendar.config.allDayText' ), // default: "all-day", "Ganztägig"
                    axisFormat: 'H:mm', // , default: "h(:mm)a" (The default value depends on the current lang)
                    //slotDuration: '00:05:00', // default: "00:30:00" (v1 > slotMinutes)
                    slotDuration: '00:30:00', // default: "00:30:00" (v1 > slotMinutes)
                    slotLabelInterval: '00:01:00',
                    minTime: '00:00:00', // default: "00:00:00"
                    maxTime: '23:59:00', // default: "24:00:00"
                    // defaultEventMinutes: 30, // v2 > not found
                    weekNumbers: true, // default: false
                    // weekends: false, //default: true removes weekends from calendar
                    defaultView: 'agendaWeek', // default: "month"
                    firstDay: 1, // start week with Monday // default: 0 (Sunday), 1 (Monday)
                    scrollTime: moment().format( 'HH:00:00' ), // default: "06:00:00" (v1 > firstHour)
                    buttonText: {
                        basicDay: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.basicDay' ),
                        basicWeek: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.basicWeek' ),
                        agendaDay: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.agendaDay' ),
                        today: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.today' ),
                        agendaWeek: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.agendaWeek' ),
                        month: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.month' )
                    },
                    buttonIcons: {
                        prev: 'prev fa fa-chevron-left', // work around incompatible class-names
                        next: 'next fa fa-chevron-right' // work around incompatible class-names
                    },
                    //monthNames: moment.months(), // The default value will change based on the current lang
                    //monthNamesShort: moment.monthsShort(), // The default value will change based on the current lang
                    //dayNames: moment.weekdays(), // The default value will change based on the current lang
                    //dayNamesShort: moment.weekdaysShort(), // The default value will change based on the current lang
                    titleFormat: {
                        //month: 'MMMM YYYY', // September 2009 // default: "MMMM YYYY" (like 'September 2009', for month view)
                        week: '(ddd D.) MMM YYYY', // 7. - 13. Sep 2009 // default: "MMM D YYYY" (like 'Sep 13 2009', for week views)
                        day: 'dddd, DD.MM.YYYY' // 13. Sep 2009 // default: "MMMM D YYYY" (like 'September 8 2009', for day views)
                    },
                    columnFormat: {
                        //month: 'ddd', // Mon // default: "ddd" (like 'Mon', for month view)
                        week: 'ddd D.M.', // Mon 3.12. // default: "ddd M/D" (like 'Mon 9/7', for week views)
                        day: 'ddd D.M.'   // Monday 3.12. // default: "dddd" (like 'Monday', for day views)
                    },
                    header: {
                        left: 'prev today next basicDay basicWeek',
                        center: 'title',
                        right: 'agendaDay agendaWeek month'
                    },
                    views: {
                        /**
                         * The "verticalResourceView".
                         * - In fullcalendar (2.5.0 beta) and (scheduler 1.1.0 beta) having resources transform "basicDay" & "agendaDay" into ResourceViews
                         * -- Which is not the desired behaviour:
                         * --- "agendaDay" and "basicDay" should behave like without "resources"
                         * This introduces this view - for which, when rendered "resources" are made up
                         */
                        verticalResourceView: {
                            type: 'agenda',
                            duration: { days: 1 },
                            buttonText: i18n( 'ko-bindingHandlers.fullCalendar.config.buttonText.verticalResourceView' )
                        }
                    },
                    selectable: true, // default: false
                    selectHelper: true, // default: false
                    editable: true, // default: false
                    eventLimit: false, // default: false (allow "more" link when too many events)
                    timezone: 'local' // default: false
                }, ko.toJS( config ), true );

                // @see: workaround for "goToDayOnDayNumberClick"
                config.goToDayOnDayNumberClick = goToDayOnDayNumberClick;

                if( instance ) {
                    if( !bindingOptions.config.defaultView ) {
                        // preserve the current view
                        config.defaultView = $element.fullCalendar( 'getView' ).name;
                    }
                    if( !bindingOptions.config.scrollTime ) {
                        config.scrollTime = moment().format( 'HH:00:00' );
                    }
                    $element.fullCalendar( 'destroy' );
                    instance = $element.data( 'fullCalendar' );
                }
                else { // only called initially

                    bindingOptions.getInstance = function() {
                        return $element;
                    };

                    if( bgeventMouseMove ) {
                        $element.on( 'mousemove.fullCalendar.binding', '.fc-bgevent', function( $event ) {
                            var
                                pageX = $event.pageX,
                                pageY = $event.pageY,
                                result = [];

                            jQuery( '.fc-bgevent', $element ).each( function() {
                                var
                                    $self = jQuery( this ),
                                    offset = $self.offset(),
                                    left = offset.left,
                                    top = offset.top,
                                    width = $self.width(),
                                    height = $self.height();

                                if( pageX > left && pageX < left + width ) {
                                    if( pageY > top && pageY < top + height ) {
                                        result.push( this );
                                    }
                                }
                            } );
                            bgeventMouseMove( $event, result );
                        } );
                    }

                    if( eventPopOver ) {
                        initEventPopOver( {
                            eventPopOver: eventPopOver,
                            element: element
                        } );
                    }

                    if( goToWeekOnWeekNumberClick ) {
                        $element.on( 'click.goToWeekOnWeekNumberClick.fullCalendar.binding', '.fc-month-view .fc-week-number', function( $event ) {
                            var
                                $date = jQuery( $event.target ).parents( '.fc-week-number' ).next( '.fc-day-number' ).data( 'date' );

                            if( $date ) {
                                $event.stopImmediatePropagation();
                                $element.fullCalendar( 'changeView', 'agendaWeek' );
                                $element.fullCalendar( 'gotoDate', $date );
                            }

                        } );
                    }

                    if( eventSources ) {
                        eventSources.subscribe( function( actions ) {
                            if( !instance ) {
                                return;
                            }
                            Y.each( actions, function( action ) {
                                var
                                    eventSource = action.value.eventSource;

                                if( 'deleted' === action.status ) {
                                    $element.fullCalendar( 'removeEventSource', eventSource );
                                }
                                if( 'added' === action.status ) {
                                    $element.fullCalendar( 'addEventSource', eventSource );
                                }
                            } );
                        }, null, "arrayChange" );
                    }

                }

                $element.fullCalendar( config );
                instance = $element.data( 'fullCalendar' );

                // remove these icon class-names
                jQuery( '.fc-icon-prev, .fc-icon-next', element ).removeClass( 'fc-icon fc-icon-next fc-icon-prev' );

                if( eventSources ) {
                    peek( eventSources ).forEach( function( eventSource ) {
                        $element.fullCalendar( 'addEventSource', eventSource.eventSource );
                    } );
                }

            }
        };

        ko.bindingHandlers.fullCalendar.EventSource = EventSource;
    })();

    /**
     * notifyBind bindingHandler
     *
     * @param {Object} config configuration object
     * @param {Function|String} config.method a function reference or a method name in namespace
     * @param {Object} [config.namespace] namespace object
     */
    ko.bindingHandlers.notifyBind = {
        init: function( element, valueAccessor, allBindings, viewModel/*, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor() || { namespace: null, method: null },
                method = bindingOptions.method,
                namespace = bindingOptions.namespace || viewModel;

            if( Y.Lang.isFunction( method ) ) {
                method = bindingOptions.method;
            }
            else if( Y.Lang.isString( method ) && namespace ) {
                method = namespace[ method ];
            }

            if( Y.Lang.isFunction( method ) && namespace ) {
                method.call( namespace, element );
            }
        }
    };
    ko.virtualElements.allowedBindings.notifyBind = true;

    /**
     * notifyDispose bindingHandler
     *
     * @param {Object} config configuration object
     * @param {Function|String} config.method a function reference or a method name in namespace
     * @param {Object} [config.namespace] namespace object
     */
    ko.bindingHandlers.notifyDispose = {
        init: function( element, valueAccessor, allBindings, viewModel/*, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor() || { namespace: null, method: null },
                method = bindingOptions.method,
                namespace = bindingOptions.namespace || viewModel;

            ko.utils.domNodeDisposal.addDisposeCallback( element, function() {
                if( Y.Lang.isFunction( method ) ) {
                    method = bindingOptions.method;
                }
                else if( Y.Lang.isString( method ) && namespace ) {
                    method = namespace[ method ];
                }

                if( Y.Lang.isFunction( method ) && namespace ) {
                    method.call( namespace, element );
                }
            } );
        }
    };
    ko.virtualElements.allowedBindings.notifyDispose = true;

    /**
     * mediaSetImgFromDefault bindingHandler
     *
     * @param {Object} config configuration object
     * @param {String} config.ownerCollection
     * @param {*} config.ownerId
     * @param {String} config.label
     * @param {Number} config.widthPx
     * @param {Number} config.heightPx
     * @param {String} [config.domId]
     * @param {Function} [config.callback]
     * @see Y.doccirrus.media.setImgFromDefault
     */
    ko.bindingHandlers.mediaSetImgFromDefault = {
        update: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor(),
                ownerCollection = unwrap( bindingOptions.ownerCollection ),
                ownerId = unwrap( bindingOptions.ownerId ),
                label = unwrap( bindingOptions.label ),
                widthPx = unwrap( bindingOptions.widthPx ),
                heightPx = unwrap( bindingOptions.heightPx ),
                domId = unwrap( bindingOptions.domId ) || Y.DOM.generateID( element ),
                callback = unwrap( bindingOptions.callback ) || function() {

                };

            Y.doccirrus.media.setImgFromDefault(
                domId,
                ownerCollection,
                ownerId,
                label,
                widthPx,
                heightPx,
                callback
            );
        }
    };

    /**
     * mediaAddEditor bindingHandler
     *
     * @param {Object} config configuration object
     * @param {Object} config.settings
     * @param {String} [config.domId]
     * @param {Function} [config.callback]
     * @see Y.doccirrus.media.addEditor
     */
    ko.bindingHandlers.mediaAddEditor = {
        update: function( element, valueAccessor/*, allBindings, viewModel, bindingContext*/ ) {
            var
                bindingOptions = valueAccessor(),
                settings = ko.toJS( bindingOptions.settings ),
                domId = unwrap( bindingOptions.domId ) || Y.DOM.generateID( element ),
                callback = unwrap( bindingOptions.callback ) || function() {

                };

            Y.doccirrus.media.addEditor( settings, domId, callback );
        }
    };

    var getFirstRealElement = function( element ) {
        return ko.utils.arrayFirst( ko.virtualElements.childNodes( element ) || [], function( el ) {
            return el.nodeType === 1;
        } );
    };

    // Custom  binding that makes elements shown/hidden via jQuery's fadeIn()/fadeOut() methods
    ko.bindingHandlers.fadeVisible = {
        init: function( element, valueAccessor ) {
            // Initially set the element to be instantly visible/hidden depending on the value
            var value = valueAccessor(),
                child = getFirstRealElement( element );

            $( child ).toggle( ko.utils.unwrapObservable( value ) ); // Use "unwrapObservable" so we can handle values that may or may not be observable
        },
        update: function( element, valueAccessor, allBindings ) {
            // Whenever the value subsequently changes, slowly fade the element in or out
            var value = valueAccessor(),
                child = getFirstRealElement( element );

            if( ko.unwrap( value ) ) {
                $( child ).fadeIn( allBindings.get( 'fadeDuration' ) || 'fast' );
            } else {
                $( child ).fadeOut( allBindings.get( 'fadeDuration' ) || 'fast' );
            }
        }
    };

    ko.virtualElements.allowedBindings.fadeVisible = true;

    ko.bindingHandlers.syntaxHighlight = {

        init: function( element, valueAccessor ) {
            var flask = new CodeFlask(),
                params = valueAccessor();

            flask.run( '#' + element.id, { language: params.lang || 'lua' } );
            flask.update( ko.unwrap( params.value ) || '' );

            flask.onUpdate( function( code ) {
                params.value( code );
            } );
        }
    };

    ko.bindingHandlers.fileUploader = {
        init: function( element, valueAccessor ) {
            var
                $element = jQuery( element ),
                bindingOptions = ko.unwrap( valueAccessor() ) || {},
                currentAcceptValue = bindingOptions.acceptFiles || element.getAttribute( 'accept' ),
                currentFileTypesValue = bindingOptions.fileTypes || Y.doccirrus.media.types.getAllExt(),
                uploadURL = bindingOptions.uploadUrl && Y.doccirrus.infras.getPrivateURL( bindingOptions.uploadUrl ) || Y.doccirrus.infras.getPrivateURL( '/1/media/:uploadchunked' ),
                generateDataURL = bindingOptions.generateDataURL,
                callbacks = bindingOptions.callbacks || {},
                inProgressMap = {},
                fineUploader = new qq.FineUploaderBasic( {
                    request: {
                        endpoint: uploadURL
                    },
                    thumbnails: {
                        placeholders: {
                            waitingPath: '/static/dcbaseapp/assets/lib/fine-uploader/placeholders/waiting-generic.png',
                            notAvailablePath: '/static/dcbaseapp/assets/lib/fine-uploader/placeholders/not_available-generic.png'
                        }
                    },
                    validation: {
                        acceptFiles: currentAcceptValue,
                        allowedExtensions: currentFileTypesValue
                    },
                    chunking: {
                        enabled: true,
                        partSize: (1024 * 1024)
                    },
                    cors: {
                        expected: true,
                        sendCredentials: true,
                        allowXdr: true
                    },
                    callbacks: {
                        onComplete: function( id, name, responseJSON, xhr ) {
                            deleteFile( id );
                            if( 'function' === typeof callbacks.onComplete ) {
                                callbacks.onComplete( {
                                    id: id,
                                    name: name,
                                    response: responseJSON,
                                    xhr: xhr,
                                    element: element
                                } );
                            }
                        },
                        onProgress: function( id, name, uploadedBytes, totalBytes ) {
                            if( inProgressMap[ id ] ) {
                                inProgressMap[ id ].inProgress( Math.round( uploadedBytes / totalBytes * 100 ) );
                            }
                            if( 'function' === typeof callbacks.onProgress ) {
                                callbacks.onProgress( {
                                    id: id,
                                    name: name,
                                    uploadedBytes: uploadedBytes,
                                    totalBytes: totalBytes,
                                    element: element
                                } );

                            }
                        },
                        onUpload: function( id, name ) {
                            readFile( fineUploader.getFile( id ), id );
                            if( 'function' === typeof callbacks.onUpload ) {
                                callbacks.onUpload( {
                                    id: id,
                                    name: name,
                                    element: element
                                } );

                            }
                        },
                        onError: function( id, name, errorReason, xhr ) {
                            if( 'function' === typeof callbacks.onError ) {
                                callbacks.onError( {
                                    id: id,
                                    name: name,
                                    reason: errorReason,
                                    xhr: xhr,
                                    element: element
                                } );
                            }
                        },
                        onCancel: function( id, name ) {
                            deleteFile( id );
                            if( 'function' === typeof callbacks.onCancel ) {
                                callbacks.onCancel( {
                                    id: id,
                                    name: name,
                                    element: element
                                } );
                            }
                        },
                        onAllComplete: function( succeeded, failed ){
                            if( failed.length === 0 ) {
                                element.value = '';
                            }
                        }
                    }
                } );

            function handler() {
                var i,
                    files = [];
                for( i = 0; i < element.files.length; i++ ) {
                    files.push( element.files[ i ] );
                }
                uploadFiles( files );
            }

            function uploadFiles( files ) {
                fineUploader.addFiles( files );
            }

            function readFile( file, id ) {
                var
                    reader,
                    item;
                if( generateDataURL ) {
                    reader = new FileReader();
                    reader.onload = function( e ) {
                        var
                            result = e.target.result;
                        item = {
                            dataURL: result,
                            name: file.name,
                            inProgress: ko.observable(),
                            id: id
                        };
                        inProgressMap[ id ] = item;
                        bindingOptions.filesInProgress.push( item );

                    };
                    reader.readAsDataURL( file );
                } else {
                    item = {
                        name: file.name,
                        inProgress: ko.observable(),
                        id: id
                    };
                    inProgressMap[ id ] = item;
                    bindingOptions.filesInProgress.push( item );
                }
            }

            function deleteFile( id ) {
                bindingOptions.filesInProgress.remove( function( file ) {
                    return file.id === id;
                } );
            }

            element.setAttribute( 'accept', currentAcceptValue );
            bindingOptions.filesInProgress = bindingOptions.filesInProgress || ko.observableArray( [] );

            bindingOptions.cancel = function( fileDesc ) {
                fineUploader.cancel( fileDesc.id );
            };
            bindingOptions.uploadFiles = function( files ) {
                if( files.length ) {
                    uploadFiles( files );
                }
            };

            ko.utils.registerEventHandler( element, 'change.fileUploader.binding', handler );

            ko.utils.domNodeDisposal.addDisposeCallback( element, function() {
                $element.off( 'change.fileUploader.binding' );
                fineUploader.cancelAll();
            } );

        }
    };

    ko.bindingHandlers.fileDrop = {
        init: function( element, valueAccessor ) {
            var
                value = valueAccessor() || ko.observableArray(),
                $element = jQuery( element );
            element.ondragover = element.ondragleave = element.ondrop = function( e ) {
                var files,
                    fileArray,
                    i;
                e.stopPropagation();
                e.preventDefault();
                if( 'dragover' === e.type ) {
                    $element.addClass( 'hover' );
                } else {
                    $element.removeClass( 'hover' );
                }
                if( 'drop' === e.type && e.dataTransfer ) {
                    files = e.dataTransfer.files;
                    fileArray = [];
                    if( files.length ) {
                        for( i = 0; i < files.length; i++ ) {
                            fileArray.push( files[ i ] );
                        }
                    }
                    value( fileArray );
                }
            };
        }
    };

    // https://stackoverflow.com/questions/42295879/auto-grow-textarea-with-knockout-js
    function resizeToFitContent( el ) {
        // hack to fix text area height is initially set to 0
        if( el.scrollHeight <= 0 ) {
            setTimeout( function() {
                resizeToFitContent( el );
            }, 100 );
            return;
        }
        // http://stackoverflow.com/a/995374/3297291
        el.style.height = "1px";
        el.style.height = el.scrollHeight + "px";
    }

    /**
     * Adds binding that auto resizes textarea element according to its content.
     *
     * @type {*}
     */
    ko.bindingHandlers.autoResize = {
        update: function( element, valueAccessor ) {
            ko.unwrap( valueAccessor() );
            resizeToFitContent( element );
        }
    };

    /**
     * Knockout validation extender sets up validation functionality
     * @param target
     * @param options
     * @returns {*}
     */
    ko.extenders.validate = function( target, options ) {

        /**
         * Validates target with its current value or with a specified value
         * @param {*} value
         * @returns {Object}
         */
        target.validateNow = function( value ) {
            var valid = true,
                messages = [],
                validation,
                validationArgument,
                plainTargetContext;

            if( Y.Lang.isArray( target.validationFunction ) ) {

                validationArgument = Y.Lang.isUndefined( value ) ? target() : value;
                if( Y.doccirrus.KoViewModel && target.context instanceof Y.doccirrus.KoViewModel.getBase() ) {
                    plainTargetContext = target.context.toJSON();
                } else {
                    plainTargetContext = ko.toJS( target.context );
                }

                Y.each( target.validationFunction, function( validatorObject ) {
                    if( validatorObject.validator ) {
                        validation = validatorObject.validator.call( plainTargetContext, validationArgument );
                        if( !validation ) {
                            valid = false;
                            messages.push( validatorObject.msg );
                        }
                    }
                } );

            }

            return {
                valid: valid,
                messages: messages
            };
        };

        target.required = (options && options.required) ? true : false;
        target.propertyName = options.propertyName;
        target.hasError = ko.observable( false );
        target.validationMessages = ko.observableArray();

        if( options && options.validators ) {
            target.validationFunction = options.validators;
            target.context = (options.context) ? options.context : {};
        }

        target._validateTimeoutInstance = null;
        /**
         * Validates the Observable
         * @param value
         */
        target.validate = function( value ) {
            if( !target._validatable() ) {
                return;
            }
            clearTimeout( target._validateTimeoutInstance );
            target._validateTimeoutInstance = setTimeout( function() {
                var validation = target.validateNow( value );
                target.validationMessages( validation.messages );
                target.hasError( !validation.valid );
            }, ko.extenders.validate.VALIDATE_TIMEOUT );
        };

        target._validatable = ko.observable( false );
        target._validatable.subscribe( function( val ) {
            if( val ) {
                target.__validationSubscription = target.subscribe( target.validate );
                target.validate( target() );
            } else {
                if( target.__validationSubscription ) {
                    target.__validationSubscription.dispose();
                }
            }
        } );

        //target.validate( target() );
        //target.subscribe( target.validate );
        return target;
    };


    //  Content editable binding for WYSWYG editor
    //  credit Tomalack on this stack overflow thread:
    //  https://stackoverflow.com/questions/19370098/knockout-contenteditable-binding

    ko.bindingHandlers.htmlLazy = {
        init: function (element, valueAccessor) {
            var
                value = ko.unwrap( valueAccessor() );
            element.innerHTML = value;
        },
        update: function (element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            if (!element.isContentEditable) {
                element.innerHTML = value;
            }
        }
    };

    ko.bindingHandlers.contentEditable = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var
                value = ko.unwrap( valueAccessor() ),           //  eslint-disable-line no-unused-vars
                htmlLazy = allBindingsAccessor().htmlLazy;

            $(element).on("input", function () {
                if (this.isContentEditable && ko.isWriteableObservable(htmlLazy)) {
                    htmlLazy(this.innerHTML);
                }
            });
        },
        update: function (element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            element.contentEditable = value;

            if (!element.isContentEditable) {
                $(element).trigger("input");
            }
        }
    };

    // timeouts in ms to prevent multiple calls in one thread
    ko.extenders.validate.VALIDATE_TIMEOUT = 250; // for validate
    ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT = 225; // for dependencies
    ko.extenders.validate.REVALIDATE_TIMEOUT = 200; // for revalidate

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'jQueryUtils',
        'dcutils'
    ]
} );

/*global jQuery */
(function() {
    'use strict';
    if (!(jQuery && jQuery.fn.datetimepicker)) {
        return;
    }
    // overwrite some project wide defaults
    jQuery.fn.datetimepicker.defaults.locale = 'de';
    jQuery.fn.datetimepicker.defaults.format = 'DD.MM.YYYY';
    jQuery.fn.datetimepicker.defaults.useStrict = true;
    // ignore format and set time workaround for bootstrap-datetimejs version : 4.7.14
    jQuery.fn.datetimepicker.defaults.showTodayButton = false; // keep this false, using will ignore format and set time also
    jQuery.fn.datetimepicker.defaults.useCurrent = false; // keep this false, using will ignore format and set time also
    // keyBinds workarounds for bootstrap-datetimejs version : 4.7.14
    if( jQuery.fn.datetimepicker.defaults.keyBinds ) {
        // just don't use these
        jQuery.fn.datetimepicker.defaults.keyBinds.up = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.down = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds['control up'] = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds['control down'] = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.left = false; // issue #1014
        jQuery.fn.datetimepicker.defaults.keyBinds.right = false; // issue #1014
        jQuery.fn.datetimepicker.defaults.keyBinds.pageUp = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.pageDown = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.enter = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.t = false; // ignore format and set time workaround
        jQuery.fn.datetimepicker.defaults.keyBinds.delete = false; // unexpected behaviour
    }
})();
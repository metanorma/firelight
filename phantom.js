// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

$(document).ready(function () {
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    /*
        
        <div class="phantom">...</div>
        
        becomes:
        <div class="phantom__wrapper">
            <span class="phantom__toggle">...</span>
            <div class="phantom">...</div>
        </div>

    */

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    const showAction = 'Show More &#x25B6;';
    const hideAction = 'Hide &#x25B2;';

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Initally wrap everything up, include a toggle and hide it
    $('.phantom').each(function () {
        const $phantom = $(this);
        $phantom
            .wrap('<div class="phantom__wrapper"></div>')
            .hide()
            .parent()
            .prepend(
                `<span class="phantom__toggle phantom__toggle--closed">${showAction}</span>`
            );
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    $('.phantom__form td').map(function () {
        const $td = $(this);
        const $phantomWrapper = $td.find('.phantom__wrapper').first();
        if ($phantomWrapper) {
            const $phantomToggle = $phantomWrapper
                .children('.phantom__toggle')
                .first();
            const $phantom = $phantomWrapper.children('.phantom').first();
            if ($phantomToggle && $phantom) {
                $phantomToggle
                    .html($phantom.is(':hidden') ? hideAction : showAction)
                    .toggleClass('phantom__toggle--closed')
                    .toggleClass('phantom__toggle--open');
                $phantom.toggle();
            }
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    $('input[type="checkbox"]').each(function () {
        const $checkbox = $(this);
        $checkbox
            .wrap('<div class="phantom__checkbox__wrapper"></div>')
            .hide()
            .parent()
            .prepend(
                '<i class="phantom__checkbox phantom__checkbox--unchecked far fa-square"></i>'
            );
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Checkbox
    $('.phantom__checkbox').on('click', function () {
        const $phantomCheckbox = $(this);
        const $checkbox = $phantomCheckbox
            .parent()
            .children('input[type=checkbox]');
        if ($checkbox) {
            $checkbox.prop('checked', !$checkbox.is(':checked'));
            $phantomCheckbox
                .toggleClass('phantom__checkbox--unchecked')
                .toggleClass('phantom__checkbox--checked')
                .toggleClass('far fa-square')
                .toggleClass('fa fa-check-square');
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Toggle
    $('.phantom__toggle').on('click', function () {
        const $toggle = $(this);
        const $phantom = $toggle.parent().children('.phantom');
        if ($phantom) {
            $toggle
                .html($phantom.is(':hidden') ? hideAction : showAction)
                .toggleClass('phantom__toggle--closed')
                .toggleClass('phantom__toggle--open');
            $phantom.toggle();
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

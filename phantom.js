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

    var phantomWizardStepLength = $('.phantom__wizard__step').length;

    $('.phantom__wizard__step').each(function (i, step) {
        const $step = $(step);
        const tFoot = `<tfoot><th colspan="3" class="phantom__wizard__step__nav">
            <button${
                i === 0 ? ' disabled' : ''
            } class="phantom-step__nav__button phantom-step__nav__button--previous">Previous</button>
            <button${
                i === phantomWizardStepLength - 1 ? ' disabled' : ''
            } class="phantom-step__nav__button phantom-step__nav__button--next">Next</button>
        </th></tfoot>`;
        if (i === 0) {
            $step.append(tFoot);
        } else {
            $step.hide().append(tFoot);
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Next button
    
    $('.phantom-step__nav__button--next').on('click', function () {
        const $button = $(this);
        const $step = $button.closest('.phantom__wizard__step');
        const $nextStep = $step.next('.phantom__wizard__step');
        const $panel = $('#js-phantom__wizard__panel');
        if ($step && $nextStep && $panel) {
            $step.hide();
            $nextStep.show();
            $panel.scrollTop(0);
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Previous button

    $('.phantom-step__nav__button--previous').on('click', function () {
        const $button = $(this);
        const $step = $button.closest('.phantom__wizard__step');
        const $previousStep = $step.prev('.phantom__wizard__step');
        const $panel = $('#js-phantom__wizard__panel');
        if ($step && $previousStep && $panel) {
            $step.hide();
            $previousStep.show();
            $panel.scrollTop(0);
        }
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

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

    const showAction = 'Show &#x25B6;';
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

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

document.addEventListener('DOMContentLoaded', function () {
    const body = document.querySelector('#fireball__body');
    const header = document.querySelector('#fireball__header');
    const mainbar = document.querySelector('#fireball__mainbar');
    const sidebar = document.querySelector('#fireball__sidebar');
    const showSidebar = document.querySelector('#fireball__open-sidebar');
    const closeSidebar = document.querySelector('#fireball__close-sidebar');
    const toggleSidebar = document.querySelector('#fireball__toggle-sidebar');
    const modal = document.querySelector('#fireball__modal');
    const modalOverlay = document.querySelector('#fireball__modal-overlay');
    const closeButton = document.querySelector('#fireball__close-modal');
    const openButtons = document.querySelectorAll('.fireball__open-checklist');
    const checkboxes = document.querySelectorAll('.fireball__a-checkbox');
    const totalCheckboxes = checkboxes.length;
    const measureOutputs = document.querySelectorAll(
        '.fireball__measure__output'
    );
    const measureProgresses = document.querySelectorAll(
        '.fireball__measure__progress'
    );
    const targetWatch = document.querySelector('#fireball__target__watch');
    const targetReveal = document.querySelector('#fireball__target__reveal');

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    function updateMeasure() {
        let checkedCheckboxes = 0;
        checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
                checkedCheckboxes++;
            }
        });

        measureOutputs.forEach((measureOutput) => {
            measureOutput.innerHTML = `${checkedCheckboxes} / ${totalCheckboxes}`;
        });

        measureProgresses.forEach((measureProgress) => {
            measureProgress.value = checkedCheckboxes;
            measureProgress.max = totalCheckboxes;
        });
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    toggleSidebar.onclick = () => {
        sidebar.classList.toggle('fireball__concealed');
        body.classList.toggle('fireball__concealed');
    };

    showSidebar.onclick = () => {
        sidebar.classList.toggle('fireball__exposed');
    };

    closeSidebar.onclick = () => {
        sidebar.classList.toggle('fireball__exposed');
    };

    modalOverlay.onclick = () => {
        modal.classList.toggle('fireball__closed');
        modalOverlay.classList.toggle('fireball__closed');
    };

    closeButton.onclick = () => {
        modal.classList.toggle('fireball__closed');
        modalOverlay.classList.toggle('fireball__closed');
    };

    openButtons.forEach((openButton) => {
        openButton.onclick = () => {
            modal.classList.toggle('fireball__closed');
            modalOverlay.classList.toggle('fireball__closed');
        };
    });

    checkboxes.forEach((checkbox) => {
        checkbox.onchange = () => {
            updateMeasure();
        };
    });

    mainbar.onscroll = function () {
        const targetRect = targetWatch.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        if (targetRect.top + targetRect.height < headerRect.height) {
            targetReveal.classList.add('reveal');
            targetReveal.classList.remove('cloak');
        } else {
            targetReveal.classList.add('cloak');
            targetReveal.classList.remove('reveal');
        }
    };

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // entry point
    updateMeasure();

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

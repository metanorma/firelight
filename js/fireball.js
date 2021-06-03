// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

document.addEventListener('DOMContentLoaded', function () {
    const body = document.querySelector('#body');
    const sidebar = document.querySelector('#sidebar');
    const showSidebar = document.querySelector('#open-sidebar');
    const closeSidebar = document.querySelector('#close-sidebar');
    const toggleSidebar = document.querySelector('#toggle-sidebar');
    const modal = document.querySelector('#modal');
    const modalOverlay = document.querySelector('#modal-overlay');
    const closeButton = document.querySelector('#close-modal');
    const openButtons = document.querySelectorAll('.open-checklist');
    const checkboxes = document.querySelectorAll('.a-checkbox');
    const totalCheckboxes = checkboxes.length;
    const measureOutputs = document.querySelectorAll('.measure__output');
    const measureProgresses = document.querySelectorAll('.measure__progress');

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
        sidebar.classList.toggle('concealed');
        body.classList.toggle('concealed');
    };

    showSidebar.onclick = () => {
        sidebar.classList.toggle('exposed');
    };

    closeSidebar.onclick = () => {
        sidebar.classList.toggle('exposed');
    };

    modalOverlay.onclick = () => {
        modal.classList.toggle('closed');
        modalOverlay.classList.toggle('closed');
    };

    closeButton.onclick = () => {
        modal.classList.toggle('closed');
        modalOverlay.classList.toggle('closed');
    };

    openButtons.forEach((openButton) => {
        openButton.onclick = () => {
            modal.classList.toggle('closed');
            modalOverlay.classList.toggle('closed');
        };
    });

    checkboxes.forEach((checkbox) => {
        checkbox.onchange = () => {
            updateMeasure();
        };
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // entry point
    updateMeasure();

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

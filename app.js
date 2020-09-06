window.onload = function() {

    var view = {

        el: {
            inputOriginal:  document.getElementsByName('original')[0],
            inputModified:  document.getElementsByName('modified')[0],
            outputDiff:     document.getElementById('diff'),
            btnDemo:        document.getElementById('btn-demo'),
            btnClear:       document.getElementById('btn-clear')
        },

        renderDiff: function() {
            var diff = new sDiff(
                view.el.inputOriginal.value,
                view.el.inputModified.value,
                {
                    replacements: [ { search: '\n', replacement: '[NEWLINE]'} ],
                    noDiffMessage: '<div class="no-diff">The texts are identical! <span>✓</span></div>'
                }
            );

            view.el.outputDiff.innerHTML = diff.render();
        },

        showDemoText: function() {
            view.el.inputOriginal.value = 'This is a (quite simple) demonstration.';
            view.el.inputModified.value = 'Note: This is a hopefully useful demonstration.';
            view.renderDiff();
        },

        clear: function() {
            view.el.inputOriginal.value = '';
            view.el.inputModified.value = '';
            view.el.outputDiff.innerHTML = '';
        },

        initialize: function() {
            view.el.inputOriginal.addEventListener('keyup', view.renderDiff);
            view.el.inputModified.addEventListener('keyup', view.renderDiff);
            view.el.btnDemo.addEventListener('click', view.showDemoText);
            view.el.btnClear.addEventListener('click', view.clear);
        }
    };

    view.initialize();
}